#!/usr/bin/env python3
"""Deterministic generator for the polyhedron-family solids (P1-3).

Emits eight records -- four prisms, three pyramids, one square pyramidal
frustum -- in exactly the record schema already used by ``window.P003_DATA``
``solids`` (see ``src/21_data_p003_core.js.part``), plus four family-only
fields:

    family            'prism' | 'pyramid' | 'frustum_pyramid'
    family_params     {n, base_edge, height[, top_edge]}
    base_face_ids     indices into ``faces`` for the 밑면 face(s)
    lateral_face_ids  indices into ``faces`` for the 옆면 faces

Two sinks, both written from the same in-memory records so they can never
drift:

    src/21_data_p003_core.js.part   embedded payload (records appended to
                                    ``solids``, id list added as
                                    ``ui.family_order``)
    data/P003_FAMILY_SOLIDS.json    pretty twin

The embedded payload is patched surgically: line 0 of the part is
``window.P003_DATA = <json>;`` and that JSON round-trips byte-exactly through
``json.dumps(..., ensure_ascii=False, separators=(',', ':'))``, so the patch
parses line 0, mutates two keys, and re-serialises. Every other byte of the
part file is untouched.

This PR is data-only: ``ui.platonic_order`` and ``ui.extension_order`` -- the
two lists every solid dropdown is built from -- are deliberately NOT touched,
so the new solids stay invisible to the UI.

Stdlib only.

Usage:
    python3 tools/content_gen/generate_family_solids.py            # write both sinks
    python3 tools/content_gen/generate_family_solids.py --check    # verify, write nothing
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PART21 = ROOT / "src" / "21_data_p003_core.js.part"
TWIN = ROOT / "data" / "P003_FAMILY_SOLIDS.json"

PART21_PREFIX = "window.P003_DATA = "
SCHEMA_VERSION = "P003-FAMILY-SOLIDS-1.0"
GENERATED_BY = "tools/content_gen/generate_family_solids.py"

# ---------------------------------------------------------------------------
# Dimensions.
#
# Every existing solid in the payload is normalised to circumradius 1.55. The
# family solids cannot be normalised without destroying the clean dimensions the
# measurement spec is built on, so instead the dimensions are chosen so the
# resulting circumradii bracket 1.55:
#
#   n=3 -> 1.386   n=4 -> 1.470   n=5 -> 1.575   n=6 -> 1.697
#
# i.e. every family solid renders within ~11% of the existing solids' extent.
BASE_EDGE = 1.2
HEIGHT = 2.4
TOP_EDGE_RATIO = 0.5

# Existing records carry vertex coordinates rounded to 10 decimal places
# (1.55/sqrt(3) is stored as 0.8948929172); the family records follow suit.
COORD_DP = 10

POLYGON_KOREAN = {3: "정삼각형", 4: "정사각형", 5: "정오각형", 6: "정육각형"}

# (solid_id, family, n, korean_name)
FAMILY_SPECS = [
    ("FAMILY_PRISM_3", "prism", 3, "삼각기둥"),
    ("FAMILY_PRISM_4", "prism", 4, "사각기둥"),
    ("FAMILY_PRISM_5", "prism", 5, "오각기둥"),
    ("FAMILY_PRISM_6", "prism", 6, "육각기둥"),
    ("FAMILY_PYRAMID_3", "pyramid", 3, "삼각뿔"),
    ("FAMILY_PYRAMID_4", "pyramid", 4, "사각뿔"),
    ("FAMILY_PYRAMID_6", "pyramid", 6, "육각뿔"),
    ("FAMILY_FRUSTUM_4", "frustum_pyramid", 4, "사각뿔대"),
]

CONSTRUCTION = {
    "prism": "extrude_regular_polygon",
    "pyramid": "apex_over_regular_polygon",
    "frustum_pyramid": "truncate_regular_pyramid",
}

# V/E/F closed forms, asserted against the built mesh.
TOPOLOGY_FORMULAS = {
    "prism": lambda n: (2 * n, 3 * n, n + 2),
    "pyramid": lambda n: (n + 1, 2 * n, n + 1),
    "frustum_pyramid": lambda n: (2 * n, 3 * n, n + 2),
}


# ---------------------------------------------------------------------------
# geometry helpers


def _r(x):
    """Round a coordinate and normalise -0.0 to 0.0."""
    return round(x, COORD_DP) + 0.0


def circumradius(n, edge):
    return edge / (2.0 * math.sin(math.pi / n))


def ring(n, radius, y):
    """Regular n-gon in a y = const plane, phase pi/n."""
    phase = math.pi / n
    return [
        [
            _r(radius * math.cos(phase + 2.0 * math.pi * k / n)),
            _r(y),
            _r(radius * math.sin(phase + 2.0 * math.pi * k / n)),
        ]
        for k in range(n)
    ]


def sub(a, b):
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def norm(a):
    return math.sqrt(dot(a, a))


def newell_normal(vertices, face):
    """Area-weighted face normal, robust for non-triangular faces."""
    nx = ny = nz = 0.0
    count = len(face)
    for i in range(count):
        a = vertices[face[i]]
        b = vertices[face[(i + 1) % count]]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    return [nx, ny, nz]


def centroid(vertices, face):
    count = len(face)
    return [sum(vertices[i][axis] for i in face) / count for axis in range(3)]


def orient_outward(vertices, faces):
    """Rewind every face so its Newell normal points away from the origin.

    Matches the existing payload convention: face [0,3,2,1] of PLATONIC_CUBE is
    counter-clockwise seen from outside the solid.
    """
    oriented = []
    for face in faces:
        normal = newell_normal(vertices, face)
        if dot(normal, centroid(vertices, face)) < 0:
            face = [face[0]] + list(reversed(face[1:]))
        oriented.append(list(face))
    return oriented


def planarity_error(vertices, face):
    normal = newell_normal(vertices, face)
    length = norm(normal)
    if length == 0.0:
        return 0.0
    unit = [c / length for c in normal]
    middle = centroid(vertices, face)
    return max(abs(dot(sub(vertices[i], middle), unit)) for i in face)


# ---------------------------------------------------------------------------
# meshes


def build_prism(n, edge, height):
    radius = circumradius(n, edge)
    bottom = ring(n, radius, -height / 2.0)
    top = ring(n, radius, height / 2.0)
    vertices = bottom + top
    faces = [list(range(n)), list(range(n, 2 * n))]
    for k in range(n):
        nxt = (k + 1) % n
        faces.append([k, nxt, n + nxt, n + k])
    return vertices, orient_outward(vertices, faces), [0, 1], list(range(2, n + 2))


def build_pyramid(n, edge, height):
    radius = circumradius(n, edge)
    base = ring(n, radius, -height / 2.0)
    vertices = base + [[0.0, _r(height / 2.0), 0.0]]
    apex = n
    faces = [list(range(n))]
    for k in range(n):
        faces.append([k, (k + 1) % n, apex])
    return vertices, orient_outward(vertices, faces), [0], list(range(1, n + 1))


def build_frustum(n, edge, top_edge, height):
    bottom = ring(n, circumradius(n, edge), -height / 2.0)
    top = ring(n, circumradius(n, top_edge), height / 2.0)
    vertices = bottom + top
    faces = [list(range(n)), list(range(n, 2 * n))]
    for k in range(n):
        nxt = (k + 1) % n
        faces.append([k, nxt, n + nxt, n + k])
    return vertices, orient_outward(vertices, faces), [0, 1], list(range(2, n + 2))


# ---------------------------------------------------------------------------
# topology block (same field set and ordering as the existing records)


def build_topology(vertices, faces):
    edge_set = set()
    for face in faces:
        count = len(face)
        for i in range(count):
            a, b = face[i], face[(i + 1) % count]
            edge_set.add((min(a, b), max(a, b)))
    edges = sorted(edge_set)
    edge_index = {edge: i for i, edge in enumerate(edges)}

    edge_incident_faces = [[] for _ in edges]
    vertex_incident_faces = [[] for _ in vertices]
    vertex_incident_edges = [[] for _ in vertices]
    for fi, face in enumerate(faces):
        count = len(face)
        for i in range(count):
            a, b = face[i], face[(i + 1) % count]
            edge_incident_faces[edge_index[(min(a, b), max(a, b))]].append(fi)
        for vi in face:
            vertex_incident_faces[vi].append(fi)
    for ei, (a, b) in enumerate(edges):
        vertex_incident_edges[a].append(ei)
        vertex_incident_edges[b].append(ei)

    edge_incident_faces = [sorted(set(x)) for x in edge_incident_faces]
    vertex_incident_faces = [sorted(set(x)) for x in vertex_incident_faces]
    vertex_incident_edges = [sorted(set(x)) for x in vertex_incident_edges]

    counts = {}
    for face in faces:
        counts[len(face)] = counts.get(len(face), 0) + 1
    face_type_counts = {str(k): counts[k] for k in sorted(counts)}

    vertex_configurations = [
        sorted(len(faces[fi]) for fi in incident) for incident in vertex_incident_faces
    ]

    lengths = [norm(sub(vertices[a], vertices[b])) for a, b in edges]
    planarity = max(planarity_error(vertices, face) for face in faces)

    return {
        "edges": [list(e) for e in edges],
        "edge_incident_faces": edge_incident_faces,
        "vertex_incident_faces": vertex_incident_faces,
        "vertex_incident_edges": vertex_incident_edges,
        "face_type_counts": face_type_counts,
        "vertex_configurations": vertex_configurations,
        "V": len(vertices),
        "E": len(edges),
        "F": len(faces),
        "euler": len(vertices) - len(edges) + len(faces),
        "edge_length_min": min(lengths),
        "edge_length_max": max(lengths),
        "edge_length_spread": max(lengths) - min(lengths),
        "max_face_planarity_error": planarity,
        "manifold_edge_incidence_pass": all(len(x) == 2 for x in edge_incident_faces),
    }


# ---------------------------------------------------------------------------
# Korean copy (middle-school textbook register)


def face_description(family, n):
    base = POLYGON_KOREAN[n]
    if family == "prism":
        return f"{base} 2개 + 직사각형 {n}개"
    if family == "pyramid":
        return f"{base} 1개 + 이등변삼각형 {n}개"
    return f"{base} 2개 + 사다리꼴 {n}개"


def configuration_label(family, topology):
    configurations = topology["vertex_configurations"]
    joined = ["·".join(str(x) for x in cfg) for cfg in configurations]
    if len(set(joined)) == 1:
        return joined[0]
    # A pyramid has two vertex kinds; name both instead of pretending it is
    # uniform. The explorer prints this after "한 꼭짓점에 모이는 면: ".
    if family == "pyramid":
        return f"밑면 꼭짓점 {joined[0]} · 각뿔의 꼭짓점 {joined[-1]}"
    return " / ".join(sorted(set(joined)))


# ---------------------------------------------------------------------------
# record assembly


def build_record(solid_id, family, n, korean_name):
    params = {"n": n, "base_edge": BASE_EDGE, "height": HEIGHT}
    if family == "prism":
        vertices, faces, base_ids, lateral_ids = build_prism(n, BASE_EDGE, HEIGHT)
    elif family == "pyramid":
        vertices, faces, base_ids, lateral_ids = build_pyramid(n, BASE_EDGE, HEIGHT)
    else:
        top_edge = BASE_EDGE * TOP_EDGE_RATIO
        params["top_edge"] = top_edge
        vertices, faces, base_ids, lateral_ids = build_frustum(
            n, BASE_EDGE, top_edge, HEIGHT
        )

    topology = build_topology(vertices, faces)

    expected = TOPOLOGY_FORMULAS[family](n)
    actual = (topology["V"], topology["E"], topology["F"])
    if actual != expected:
        raise AssertionError(f"{solid_id}: V/E/F {actual} != formula {expected}")
    if topology["euler"] != 2:
        raise AssertionError(f"{solid_id}: euler {topology['euler']} != 2")
    if not topology["manifold_edge_incidence_pass"]:
        raise AssertionError(f"{solid_id}: non-manifold edge incidence")
    if sorted(base_ids + lateral_ids) != list(range(topology["F"])):
        raise AssertionError(f"{solid_id}: base/lateral ids do not partition faces")

    return {
        "solid_id": solid_id,
        "korean_name": korean_name,
        "category": "family",
        "face_description": face_description(family, n),
        "vertex_configuration_label": configuration_label(family, topology),
        "family": family,
        "family_params": params,
        "base_face_ids": base_ids,
        "lateral_face_ids": lateral_ids,
        "vertices": vertices,
        "faces": faces,
        "topology": topology,
        "construction": CONSTRUCTION[family],
    }


def build_records():
    return {
        solid_id: build_record(solid_id, family, n, korean_name)
        for solid_id, family, n, korean_name in FAMILY_SPECS
    }


def family_order():
    return [spec[0] for spec in FAMILY_SPECS]


def twin_document(records):
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": GENERATED_BY,
        "note": (
            "Pretty twin of the FAMILY_* records embedded in "
            "src/21_data_p003_core.js.part (window.P003_DATA.solids). Both sinks "
            "are written by the generator; never hand-edit the geometry."
        ),
        "dimensions": {
            "base_edge": BASE_EDGE,
            "height": HEIGHT,
            "top_edge_ratio": TOP_EDGE_RATIO,
            "coordinate_decimals": COORD_DP,
        },
        "family_order": family_order(),
        "solids": records,
    }


# ---------------------------------------------------------------------------
# sinks


def render_twin(records):
    return json.dumps(twin_document(records), ensure_ascii=False, indent=2) + "\n"


def read_part21_payload():
    text = PART21.read_text(encoding="utf-8")
    lines = text.split("\n")
    head = lines[0]
    if not head.startswith(PART21_PREFIX) or not head.endswith(";"):
        raise SystemExit(f"FAIL: unexpected shape of {PART21.name} line 0")
    payload = json.loads(head[len(PART21_PREFIX) : -1])
    return text, lines, payload


def render_part21(records):
    text, lines, payload = read_part21_payload()
    solids = {
        key: value
        for key, value in payload["solids"].items()
        if not key.startswith("FAMILY_")
    }
    solids.update(records)
    payload["solids"] = solids
    ui = dict(payload["ui"])
    ui["family_order"] = family_order()
    payload["ui"] = ui
    lines[0] = (
        PART21_PREFIX
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";"
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# commands


def cmd_write(records):
    TWIN.parent.mkdir(parents=True, exist_ok=True)
    TWIN.write_text(render_twin(records), encoding="utf-8", newline="\n")
    PART21.write_text(render_part21(records), encoding="utf-8", newline="\n")
    print(f"PASS  wrote {len(records)} family records")
    print(f"      -> {TWIN}")
    print(f"      -> {PART21}")
    return 0


def cmd_check(records):
    failures = []

    expected_twin = render_twin(records)
    if not TWIN.is_file():
        failures.append(f"missing {TWIN}")
    elif TWIN.read_text(encoding="utf-8") != expected_twin:
        failures.append(f"{TWIN.name} differs from regeneration")

    if PART21.read_text(encoding="utf-8") != render_part21(records):
        failures.append(f"{PART21.name} differs from regeneration")

    _, _, payload = read_part21_payload()
    embedded = {
        key: value for key, value in payload["solids"].items() if key.startswith("FAMILY_")
    }
    if embedded != records:
        failures.append("embedded FAMILY_* records differ from regeneration")
    if payload.get("ui", {}).get("family_order") != family_order():
        failures.append("ui.family_order differs from regeneration")
    if TWIN.is_file():
        twin = json.loads(TWIN.read_text(encoding="utf-8"))
        if twin["solids"] != embedded:
            failures.append("data/ twin and embedded records are not JSON-equal")
    for key in ("platonic_order", "extension_order"):
        listed = payload.get("ui", {}).get(key, [])
        if any(x.startswith("FAMILY_") for x in listed):
            failures.append(f"ui.{key} leaked a FAMILY_* id (must stay UI-invisible)")

    if failures:
        print("FAIL: family solid sinks are out of date.", file=sys.stderr)
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        print("  Run `python3 tools/content_gen/generate_family_solids.py`.", file=sys.stderr)
        return 1

    print(f"PASS  {len(records)} family records; both sinks match regeneration")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate the P1-3 family solids.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify both sinks match a fresh generation; write nothing",
    )
    args = parser.parse_args(argv)
    records = build_records()
    return cmd_check(records) if args.check else cmd_write(records)


if __name__ == "__main__":
    raise SystemExit(main())
