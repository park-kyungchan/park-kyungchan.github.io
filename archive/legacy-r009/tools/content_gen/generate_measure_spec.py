#!/usr/bin/env python3
"""Deterministic generator for the P1-3 measurement spec (window.P003_MEASURE).

Every number in the spec is computed here from two upstream sources and is
never hand-typed:

    src/20_data_script_open_r009_exact.js.part   window.P003_R009_EXACT
                                                 (revolution profile dimensions)
    data/P003_FAMILY_SOLIDS.json                 family_params of the eight
                                                 polyhedron-family records

Cases whose dimensions belong to a revolution profile carry the reference
(``dims.source``) AND the resolved numeric copies, so a consumer never has to
join two payloads at runtime and a validator can prove the copy still matches
its source.

Exact/display separation: ``value`` is the full-precision float, ``expr`` is the
Korean-textbook display string with π kept symbolic ("13.5π"). Display code
formats ``expr``; arithmetic uses ``value``; nothing measures the render mesh.

Two sinks, written from the same in-memory document:

    src/25_data_measure.js.part    embedded payload
    data/P003_MEASURE_SPEC.json    pretty twin

Stdlib only.

Usage:
    python3 tools/content_gen/generate_measure_spec.py            # write both sinks
    python3 tools/content_gen/generate_measure_spec.py --check    # verify, write nothing
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PART20 = ROOT / "src" / "20_data_script_open_r009_exact.js.part"
PART25 = ROOT / "src" / "25_data_measure.js.part"
FAMILY_TWIN = ROOT / "data" / "P003_FAMILY_SOLIDS.json"
TWIN = ROOT / "data" / "P003_MEASURE_SPEC.json"

PART20_PREFIX = "window.P003_R009_EXACT="
PART25_PREFIX = "window.P003_MEASURE = "
SCHEMA_VERSION = "P003-MEASURE-001-SURFACE-VOLUME"
GENERATED_BY = "tools/content_gen/generate_measure_spec.py"

PI = math.pi
TOL = 1e-12


# ---------------------------------------------------------------------------
# display-string helpers (exact where an exact form exists, decimal otherwise)


def _close(a, b):
    return abs(a - b) <= TOL * max(1.0, abs(a), abs(b))


def short_decimal(x):
    """Shortest <=6dp decimal string that is exactly x, else None."""
    for dp in range(0, 7):
        rounded = round(x, dp)
        if _close(rounded, x):
            text = f"{rounded:.{dp}f}"
            if dp:
                text = text.rstrip("0").rstrip(".")
            return text or "0"
    return None


def small_fraction(x):
    frac = Fraction(x).limit_denominator(64)
    if frac.denominator == 1 or not _close(float(frac), x):
        return None
    return f"{frac.numerator}/{frac.denominator}"


def exact_expr(value, pi=False):
    """Best exact display form for value (optionally value = c*pi), else None."""
    base = value / PI if pi else value
    suffix = "π" if pi else ""

    text = short_decimal(base)
    if text is not None:
        if pi and text == "1":
            return "π"
        return text + suffix

    text = small_fraction(base)
    if text is not None:
        return f"({text}){suffix}" if pi else text

    if base > 0:
        for k in range(2, 401):
            root = math.sqrt(k)
            quotient = short_decimal(base / root)
            if quotient is not None:
                head = "" if quotient == "1" else quotient
                return f"{head}√{k}{suffix}"
        square = short_decimal(base * base)
        if square is not None:
            return f"√{square}{suffix}"
    return None


def num(value, formula, pi=False, fallback=None):
    """A measured quantity: display formula, display expression, exact float."""
    expr = exact_expr(value, pi=pi)
    if expr is None:
        expr = fallback if fallback is not None else repr(value)
    return {"formula": formula, "expr": expr, "value": value}


def sum_expr(*parts):
    return " + ".join(part["expr"] for part in parts)


# ---------------------------------------------------------------------------
# upstream sources


def load_r009_profiles():
    for line in PART20.read_text(encoding="utf-8").split("\n"):
        if line.startswith(PART20_PREFIX):
            payload = json.loads(line[len(PART20_PREFIX) : -1])
            return payload["revolution_profiles"]
    raise SystemExit(f"FAIL: {PART20.name} does not define {PART20_PREFIX}")


def load_family_params():
    twin = json.loads(FAMILY_TWIN.read_text(encoding="utf-8"))
    return {sid: record["family_params"] for sid, record in twin["solids"].items()}


def referenced_dims(profile_key, exact, fields):
    """dims block for a case whose dimensions live in R009_EXACT."""
    dims = {"source": f"R009_EXACT.revolution_profiles.{profile_key}.exact"}
    for name in fields:
        dims[name] = exact[name]
    return dims


# ---------------------------------------------------------------------------
# plane geometry of the regular n-gon


def polygon_area(n, edge):
    return n * edge * edge / (4.0 * math.tan(PI / n))


def polygon_apothem(n, edge):
    return edge / (2.0 * math.tan(PI / n))


POLYGON_KOREAN = {3: "정삼각형", 4: "정사각형", 5: "정오각형", 6: "정육각형"}


# ---------------------------------------------------------------------------
# surface-area cases


def sa_prism(case_id, solid_id, params):
    n, edge, height = params["n"], params["base_edge"], params["height"]
    base = polygon_area(n, edge)
    lateral_each = edge * height
    lateral = n * lateral_each
    base_total = 2.0 * base
    total = base_total + lateral
    base_q = num(base, "n a² / (4 tan(π/n))")
    base_total_q = num(base_total, "2 × 밑넓이")
    lateral_q = num(lateral, "(밑면 둘레) × h = n a h")
    return {
        "id": case_id,
        "solid": solid_id,
        "family": "prism",
        "scope": "core",
        "dims": {"n": n, "base_edge": edge, "height": height},
        "base_count": 2,
        "base_area": base_q,
        "base_area_total": base_total_q,
        "lateral_area": lateral_q,
        "total_area": num(
            total,
            "2 × 밑넓이 + 옆넓이",
            fallback=sum_expr(base_total_q, lateral_q),
        ),
        "piece_breakdown": [
            {
                "face_kind": "regular_polygon_base",
                "korean_label": f"{POLYGON_KOREAN[n]} 밑면",
                "count": 2,
                "area_each": base_q,
            },
            {
                "face_kind": "rectangle_lateral",
                "korean_label": "직사각형 옆면",
                "count": n,
                "area_each": num(lateral_each, "a × h"),
            },
        ],
    }


def sa_pyramid(case_id, solid_id, params):
    n, edge, height = params["n"], params["base_edge"], params["height"]
    apothem = polygon_apothem(n, edge)
    slant = math.sqrt(height * height + apothem * apothem)
    base = polygon_area(n, edge)
    lateral_each = 0.5 * edge * slant
    lateral = n * lateral_each
    total = base + lateral
    base_q = num(base, "n a² / (4 tan(π/n))")
    lateral_q = num(lateral, "n × (1/2) a l")
    return {
        "id": case_id,
        "solid": solid_id,
        "family": "pyramid",
        "scope": "core",
        "dims": {"n": n, "base_edge": edge, "height": height},
        "base_count": 1,
        "base_apothem": num(apothem, "a / (2 tan(π/n)) = 밑면 중심에서 한 변까지의 거리"),
        "slant_height": num(slant, "√(h² + m²), m = 밑면 중심에서 한 변까지의 거리"),
        "base_area": base_q,
        "base_area_total": base_q,
        "lateral_area": lateral_q,
        "total_area": num(
            total, "밑넓이 + 옆넓이", fallback=sum_expr(base_q, lateral_q)
        ),
        "piece_breakdown": [
            {
                "face_kind": "regular_polygon_base",
                "korean_label": f"{POLYGON_KOREAN[n]} 밑면",
                "count": 1,
                "area_each": base_q,
            },
            {
                "face_kind": "isosceles_triangle_lateral",
                "korean_label": "이등변삼각형 옆면",
                "count": n,
                "area_each": num(lateral_each, "(1/2) a l"),
            },
        ],
    }


def sa_pyramid_frustum(case_id, solid_id, params):
    n = params["n"]
    bottom, top, height = params["base_edge"], params["top_edge"], params["height"]
    offset = polygon_apothem(n, bottom) - polygon_apothem(n, top)
    slant = math.sqrt(height * height + offset * offset)
    bottom_area = polygon_area(n, bottom)
    top_area = polygon_area(n, top)
    lateral_each = 0.5 * (bottom + top) * slant
    lateral = n * lateral_each
    base_total = bottom_area + top_area
    total = base_total + lateral
    base_total_q = num(base_total, "아랫면 넓이 + 윗면 넓이")
    lateral_q = num(lateral, "n × (1/2)(a + b) l")
    return {
        "id": case_id,
        "solid": solid_id,
        "family": "frustum_pyramid",
        "scope": "enrichment",
        "dims": {"n": n, "base_edge": bottom, "top_edge": top, "height": height},
        "base_count": 2,
        "slant_height": num(slant, "√(h² + (m − m')²), m, m' = 두 밑면 중심에서 한 변까지의 거리"),
        "base_area": num(bottom_area, "n a² / (4 tan(π/n))"),
        "top_area": num(top_area, "n b² / (4 tan(π/n))"),
        "base_area_total": base_total_q,
        "lateral_area": lateral_q,
        "total_area": num(
            total,
            "두 밑넓이 + 옆넓이",
            fallback=sum_expr(base_total_q, lateral_q),
        ),
        "piece_breakdown": [
            {
                "face_kind": "regular_polygon_base",
                "korean_label": f"{POLYGON_KOREAN[n]} 아랫면",
                "count": 1,
                "area_each": num(bottom_area, "n a² / (4 tan(π/n))"),
            },
            {
                "face_kind": "regular_polygon_top",
                "korean_label": f"{POLYGON_KOREAN[n]} 윗면",
                "count": 1,
                "area_each": num(top_area, "n b² / (4 tan(π/n))"),
            },
            {
                "face_kind": "trapezoid_lateral",
                "korean_label": "사다리꼴 옆면",
                "count": n,
                "area_each": num(lateral_each, "(1/2)(a + b) l"),
            },
        ],
    }


def sa_cylinder(profiles):
    exact = profiles["cylinder"]["exact"]
    r, h = exact["radius"], exact["height"]
    base = PI * r * r
    base_total = 2.0 * base
    lateral = 2.0 * PI * r * h
    total = base_total + lateral
    base_q = num(base, "π r²", pi=True)
    base_total_q = num(base_total, "2 π r²", pi=True)
    lateral_q = num(lateral, "2 π r h", pi=True)
    return {
        "id": "SA-CYLINDER",
        "solid": "R009_CYLINDER",
        "family": "cylinder",
        "scope": "core",
        "dims": referenced_dims("cylinder", exact, ["radius", "height"]),
        "base_count": 2,
        "base_area": base_q,
        "base_area_total": base_total_q,
        "lateral_area": lateral_q,
        "lateral_development": {
            "kind": "rectangle",
            "korean_label": "옆면을 펼치면 직사각형",
            "width": num(2.0 * PI * r, "2 π r (밑면 둘레)", pi=True),
            "height": num(h, "h"),
        },
        "total_area": num(
            total, "2 π r² + 2 π r h", pi=True, fallback=sum_expr(base_total_q, lateral_q)
        ),
        "piece_breakdown": [
            {
                "face_kind": "circle_base",
                "korean_label": "원 밑면",
                "count": 2,
                "area_each": base_q,
            },
            {
                "face_kind": "rectangle_lateral_development",
                "korean_label": "직사각형으로 펼쳐지는 옆면",
                "count": 1,
                "area_each": lateral_q,
            },
        ],
    }


def sa_cone(profiles):
    exact = profiles["cone"]["exact"]
    r, h = exact["base_radius"], exact["height"]
    slant = math.sqrt(r * r + h * h)
    sector_angle = 2.0 * PI * r / slant
    base = PI * r * r
    lateral = PI * r * slant
    total = base + lateral
    slant_q = num(slant, "√(r² + h²)")
    base_q = num(base, "π r²", pi=True)
    lateral_q = num(
        lateral, "π r l", pi=True, fallback=f"{short_decimal(r)}×{slant_q['expr']}×π"
    )
    return {
        "id": "SA-CONE",
        "solid": "R009_CONE",
        "family": "cone",
        "scope": "core",
        "dims": referenced_dims("cone", exact, ["base_radius", "height"]),
        "base_count": 1,
        "slant_height": slant_q,
        "base_area": base_q,
        "base_area_total": base_q,
        "lateral_area": lateral_q,
        "lateral_development": {
            "kind": "circular_sector",
            "korean_label": "옆면을 펼치면 부채꼴",
            "sector_radius": slant_q,
            "sector_arc_length": num(2.0 * PI * r, "2 π r (밑면 둘레)", pi=True),
            "sector_angle_rad": num(
                sector_angle,
                "2 π r / l",
                fallback=f"2π×{short_decimal(r)}÷{slant_q['expr']}",
            ),
            "sector_angle_deg": num(
                math.degrees(sector_angle),
                "360° × r / l",
                fallback=f"360°×{short_decimal(r)}÷{slant_q['expr']}",
            ),
        },
        "total_area": num(
            total, "π r² + π r l", pi=True, fallback=sum_expr(base_q, lateral_q)
        ),
        "piece_breakdown": [
            {
                "face_kind": "circle_base",
                "korean_label": "원 밑면",
                "count": 1,
                "area_each": base_q,
            },
            {
                "face_kind": "sector_lateral_development",
                "korean_label": "부채꼴로 펼쳐지는 옆면",
                "count": 1,
                "area_each": lateral_q,
            },
        ],
    }


def sa_sphere(profiles):
    exact = profiles["sphere"]["exact"]
    r = exact["radius"]
    total = 4.0 * PI * r * r
    total_q = num(total, "4 π r²", pi=True)
    return {
        "id": "SA-SPHERE",
        "solid": "R009_SPHERE",
        "family": "sphere",
        "scope": "core",
        "dims": referenced_dims("sphere", exact, ["radius"]),
        "base_count": 0,
        "base_area": None,
        "base_area_total": None,
        "lateral_area": total_q,
        "total_area": total_q,
        "note": "A sphere has no base and no development; 겉넓이 is the whole surface.",
        "piece_breakdown": [
            {
                "face_kind": "sphere_surface",
                "korean_label": "구의 겉면",
                "count": 1,
                "area_each": total_q,
            }
        ],
    }


def sa_cone_frustum(profiles):
    exact = profiles["frustum"]["exact"]
    R, r, h = exact["bottom_radius"], exact["top_radius"], exact["height"]
    slant = math.sqrt((R - r) ** 2 + h * h)
    bottom_area = PI * R * R
    top_area = PI * r * r
    lateral = PI * (R + r) * slant
    base_total = bottom_area + top_area
    total = base_total + lateral
    slant_q = num(slant, "√((R − r)² + h²)")
    base_total_q = num(base_total, "π R² + π r²", pi=True)
    lateral_q = num(
        lateral,
        "π (R + r) l",
        pi=True,
        fallback=f"{short_decimal(R + r)}×{slant_q['expr']}×π",
    )
    return {
        "id": "SA-FRUSTUM-CONE",
        "solid": "R009_FRUSTUM",
        "family": "frustum_cone",
        "scope": "enrichment",
        "dims": referenced_dims(
            "frustum", exact, ["bottom_radius", "top_radius", "height"]
        ),
        "base_count": 2,
        "slant_height": slant_q,
        "base_area": num(bottom_area, "π R²", pi=True),
        "top_area": num(top_area, "π r²", pi=True),
        "base_area_total": base_total_q,
        "lateral_area": lateral_q,
        "total_area": num(
            total,
            "π R² + π r² + π (R + r) l",
            pi=True,
            fallback=sum_expr(base_total_q, lateral_q),
        ),
        "piece_breakdown": [
            {
                "face_kind": "circle_base",
                "korean_label": "원 아랫면",
                "count": 1,
                "area_each": num(bottom_area, "π R²", pi=True),
            },
            {
                "face_kind": "circle_top",
                "korean_label": "원 윗면",
                "count": 1,
                "area_each": num(top_area, "π r²", pi=True),
            },
            {
                "face_kind": "sector_ring_lateral_development",
                "korean_label": "부채꼴 띠로 펼쳐지는 옆면",
                "count": 1,
                "area_each": lateral_q,
            },
        ],
    }


# ---------------------------------------------------------------------------
# volume cases


def volume_case(case_id, solid_id, family, scope, dims, base_area_q, height, volume_q, **extra):
    case = {
        "id": case_id,
        "solid": solid_id,
        "family": family,
        "scope": scope,
        "dims": dims,
        "base_area": base_area_q,
        "height": num(height, "h") if height is not None else None,
        "volume": volume_q,
    }
    case.update(extra)
    return case


def v_prism(case_id, solid_id, params):
    n, edge, height = params["n"], params["base_edge"], params["height"]
    base = polygon_area(n, edge)
    volume = base * height
    base_q = num(base, "n a² / (4 tan(π/n))")
    return volume_case(
        case_id,
        solid_id,
        "prism",
        "core",
        {"n": n, "base_edge": edge, "height": height},
        base_q,
        height,
        num(volume, "밑넓이 × h"),
    )


def v_pyramid(case_id, solid_id, params, prism_case_id):
    n, edge, height = params["n"], params["base_edge"], params["height"]
    base = polygon_area(n, edge)
    volume = base * height / 3.0
    base_q = num(base, "n a² / (4 tan(π/n))")
    return volume_case(
        case_id,
        solid_id,
        "pyramid",
        "core",
        {"n": n, "base_edge": edge, "height": height},
        base_q,
        height,
        num(volume, "(1/3) × 밑넓이 × h"),
        one_third_of=prism_case_id,
    )


def v_cylinder(profiles):
    exact = profiles["cylinder"]["exact"]
    r, h = exact["radius"], exact["height"]
    return volume_case(
        "V-CYLINDER",
        "R009_CYLINDER",
        "cylinder",
        "core",
        referenced_dims("cylinder", exact, ["radius", "height"]),
        num(PI * r * r, "π r²", pi=True),
        h,
        num(PI * r * r * h, "π r² h", pi=True),
    )


def v_cone(profiles):
    exact = profiles["cone"]["exact"]
    r, h = exact["base_radius"], exact["height"]
    return volume_case(
        "V-CONE",
        "R009_CONE",
        "cone",
        "core",
        referenced_dims("cone", exact, ["base_radius", "height"]),
        num(PI * r * r, "π r²", pi=True),
        h,
        num(PI * r * r * h / 3.0, "(1/3) π r² h", pi=True),
        one_third_of="REL-CONE-THIRD.matched_reference",
    )


def v_sphere(profiles):
    exact = profiles["sphere"]["exact"]
    r = exact["radius"]
    return volume_case(
        "V-SPHERE",
        "R009_SPHERE",
        "sphere",
        "core",
        referenced_dims("sphere", exact, ["radius"]),
        None,
        None,
        num(4.0 * PI * r ** 3 / 3.0, "(4/3) π r³", pi=True),
        two_thirds_of="REL-SPHERE-TWO-THIRDS.matched_reference",
    )


def v_cone_frustum(profiles):
    exact = profiles["frustum"]["exact"]
    R, r, h = exact["bottom_radius"], exact["top_radius"], exact["height"]
    big_height = h * R / (R - r)
    small_height = h * r / (R - r)
    big = PI * R * R * big_height / 3.0
    small = PI * r * r * small_height / 3.0
    volume = big - small
    return volume_case(
        "V-FRUSTUM-CONE",
        "R009_FRUSTUM",
        "frustum_cone",
        "enrichment",
        referenced_dims("frustum", exact, ["bottom_radius", "top_radius", "height"]),
        num(PI * R * R, "π R²", pi=True),
        h,
        num(volume, "(1/3) π h (R² + R r + r²)", pi=True),
        cut_cone={
            "korean_label": "큰 원뿔에서 잘라낸 작은 원뿔을 뺍니다",
            "big_cone_height": num(big_height, "h R / (R − r)"),
            "big_cone_volume": num(big, "(1/3) π R² H", pi=True),
            "small_cone_height": num(small_height, "h r / (R − r)"),
            "small_cone_volume": num(small, "(1/3) π r² (H − h)", pi=True),
        },
    )


# ---------------------------------------------------------------------------
# relations


def relations(profiles, params):
    prism = params["FAMILY_PRISM_4"]
    prism_volume = polygon_area(prism["n"], prism["base_edge"]) * prism["height"]
    pyramid_volume = prism_volume / 3.0

    cone = profiles["cone"]["exact"]
    cone_r, cone_h = cone["base_radius"], cone["height"]
    matched_cylinder = PI * cone_r * cone_r * cone_h
    cone_volume = matched_cylinder / 3.0

    sphere_r = profiles["sphere"]["exact"]["radius"]
    sphere_volume = 4.0 * PI * sphere_r ** 3 / 3.0
    circumscribed = PI * sphere_r * sphere_r * (2.0 * sphere_r)

    return [
        {
            "id": "REL-PYRAMID-THIRD",
            "claim": "각뿔의 부피는 밑면과 높이가 같은 각기둥의 부피의 1/3입니다.",
            "pair": ["V-PRISM-4", "V-PYRAMID-4"],
            "ratio": num(pyramid_volume / prism_volume, "각뿔 부피 ÷ 각기둥 부피"),
            "expected_ratio": num(1.0 / 3.0, "1/3"),
            "note": "Both cases share identical dims, so the pair is exact as stored.",
        },
        {
            "id": "REL-CONE-THIRD",
            "claim": "원뿔의 부피는 밑면과 높이가 같은 원기둥의 부피의 1/3입니다.",
            "pair": ["V-CONE"],
            "matched_reference": {
                "korean_label": "밑면과 높이가 같은 원기둥",
                "radius": cone_r,
                "height": cone_h,
                "volume": num(matched_cylinder, "π r² h", pi=True),
            },
            "ratio": num(cone_volume / matched_cylinder, "원뿔 부피 ÷ 원기둥 부피"),
            "expected_ratio": num(1.0 / 3.0, "1/3"),
            "note": (
                "V-CYLINDER is NOT the matching cylinder: the R009 cylinder profile "
                f"has radius {profiles['cylinder']['exact']['radius']} while the cone "
                f"profile has base radius {cone_r}. The matching cylinder is defined "
                "inline here so the 1/3 claim stays true."
            ),
        },
        {
            "id": "REL-SPHERE-TWO-THIRDS",
            "claim": "구의 부피는 그 구에 꼭 맞는 원기둥의 부피의 2/3입니다.",
            "pair": ["V-SPHERE"],
            "matched_reference": {
                "korean_label": "구에 꼭 맞는 원기둥",
                "radius": sphere_r,
                "height": 2.0 * sphere_r,
                "volume": num(circumscribed, "π r² (2r)", pi=True),
            },
            "ratio": num(sphere_volume / circumscribed, "구 부피 ÷ 원기둥 부피"),
            "expected_ratio": num(2.0 / 3.0, "2/3"),
            "note": "Circumscribed cylinder: same radius, height equal to the diameter.",
        },
    ]


# ---------------------------------------------------------------------------
# document


def build_document():
    profiles = load_r009_profiles()
    params = load_family_params()

    surface_cases = [
        sa_prism("SA-PRISM-3", "FAMILY_PRISM_3", params["FAMILY_PRISM_3"]),
        sa_prism("SA-PRISM-4", "FAMILY_PRISM_4", params["FAMILY_PRISM_4"]),
        sa_cylinder(profiles),
        sa_pyramid("SA-PYRAMID-4", "FAMILY_PYRAMID_4", params["FAMILY_PYRAMID_4"]),
        sa_cone(profiles),
        sa_sphere(profiles),
        sa_pyramid_frustum(
            "SA-FRUSTUM-PYR-4", "FAMILY_FRUSTUM_4", params["FAMILY_FRUSTUM_4"]
        ),
        sa_cone_frustum(profiles),
    ]

    volume_cases = [
        v_prism("V-PRISM-3", "FAMILY_PRISM_3", params["FAMILY_PRISM_3"]),
        v_prism("V-PRISM-4", "FAMILY_PRISM_4", params["FAMILY_PRISM_4"]),
        v_cylinder(profiles),
        v_pyramid("V-PYRAMID-4", "FAMILY_PYRAMID_4", params["FAMILY_PYRAMID_4"], "V-PRISM-4"),
        v_cone(profiles),
        v_sphere(profiles),
        v_cone_frustum(profiles),
    ]

    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": GENERATED_BY,
        "principle": (
            "Exact/display separation. `value` is the full-precision float computed "
            "from `dims` by the generator and is the only authority for arithmetic; "
            "`expr` is the Korean-textbook display string that keeps pi symbolic "
            "(13.5π), and `formula` names the rule being applied. Display code "
            "formats `expr`, never re-derives it; nothing may measure the rendered "
            "mesh, which is a display approximation of these exact solids."
        ),
        "sources": {
            "revolution_profiles": "window.P003_R009_EXACT.revolution_profiles "
            "(src/20_data_script_open_r009_exact.js.part)",
            "family_solids": "window.P003_DATA.solids FAMILY_* family_params "
            "(data/P003_FAMILY_SOLIDS.json)",
        },
        "scopes": {
            "core": "assessable at the 중1 입체도형 level",
            "enrichment": "shown for insight, not for assessment",
        },
        "surface_area": {"cases": surface_cases},
        "volume": {"cases": volume_cases, "relations": relations(profiles, params)},
        "explorer_patterns": {
            "prism": {"V": "2n", "E": "3n", "F": "n+2"},
            "pyramid": {"V": "n+1", "E": "2n", "F": "n+1"},
            "frustum_pyramid": {"V": "2n", "E": "3n", "F": "n+2"},
        },
    }


# ---------------------------------------------------------------------------
# sinks


def render_twin(document):
    return json.dumps(document, ensure_ascii=False, indent=2) + "\n"


def render_part25(document):
    payload = json.dumps(document, ensure_ascii=False, separators=(",", ":"))
    return (
        "  <script>\n"
        "/* P1-3 measurement spec: exact surface areas and volumes for the family\n"
        "   solids and the R009 solids of revolution. Generated by\n"
        "   tools/content_gen/generate_measure_spec.py -- do not hand-edit. */\n"
        f"{PART25_PREFIX}{payload};\n"
        "</script>\n"
    )


def cmd_write(document):
    TWIN.write_text(render_twin(document), encoding="utf-8", newline="\n")
    PART25.write_text(render_part25(document), encoding="utf-8", newline="\n")
    surface = len(document["surface_area"]["cases"])
    volume = len(document["volume"]["cases"])
    print(f"PASS  {surface} surface-area cases, {volume} volume cases")
    print(f"      -> {TWIN}")
    print(f"      -> {PART25}")
    return 0


def cmd_check(document):
    failures = []

    expected_twin = render_twin(document)
    if not TWIN.is_file():
        failures.append(f"missing {TWIN}")
    elif TWIN.read_text(encoding="utf-8") != expected_twin:
        failures.append(f"{TWIN.name} differs from regeneration")

    expected_part = render_part25(document)
    if not PART25.is_file():
        failures.append(f"missing {PART25}")
    else:
        actual = PART25.read_text(encoding="utf-8")
        if actual != expected_part:
            failures.append(f"{PART25.name} differs from regeneration")
        else:
            line = [x for x in actual.split("\n") if x.startswith(PART25_PREFIX)][0]
            embedded = json.loads(line[len(PART25_PREFIX) : -1])
            if TWIN.is_file():
                twin = json.loads(TWIN.read_text(encoding="utf-8"))
                if embedded != twin:
                    failures.append("embedded payload and data/ twin are not JSON-equal")

    if failures:
        print("FAIL: measurement spec sinks are out of date.", file=sys.stderr)
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        print("  Run `python3 tools/content_gen/generate_measure_spec.py`.", file=sys.stderr)
        return 1

    surface = len(document["surface_area"]["cases"])
    volume = len(document["volume"]["cases"])
    print(f"PASS  {surface} surface-area cases, {volume} volume cases; both sinks match")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate the P1-3 measurement spec.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify both sinks match a fresh generation; write nothing",
    )
    args = parser.parse_args(argv)
    document = build_document()
    return cmd_check(document) if args.check else cmd_write(document)


if __name__ == "__main__":
    raise SystemExit(main())
