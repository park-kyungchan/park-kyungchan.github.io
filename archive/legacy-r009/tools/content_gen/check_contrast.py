#!/usr/bin/env python3
"""
P1-4 - WCAG contrast checker for the artifact's text colour tokens.

Every token below is a colour the lab actually paints *text* with. Each entry
records the background that text really sits on (the panel/glass surfaces are
near-white composites over the canvas gradient, so the effective background is
sampled as the flattened light surface, which is the worst realistic case for
these tokens).

Rules applied
-------------
* Normal-size body text and any small/label text  -> WCAG 2.1 AA 1.4.3, >= 4.5:1
* Large text (>= 24px, or >= 18.66px bold)        -> >= 3.0:1
* Non-text fills (chips, dots, strokes)           -> not checked here; 1.4.11
  graphical contrast is a separate concern and the bright accent is kept for
  those.

Usage:
    python3 tools/content_gen/check_contrast.py            # table + exit status
    python3 tools/content_gen/check_contrast.py --tokens   # re-read src values
"""

from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = REPO_ROOT / "src"

# Backgrounds the artifact actually renders text on.
BACKGROUNDS = {
    "panel": "#fbfdff",   # .controls-panel  rgba(251,253,255,.82) over canvas -> ~#fbfcff
    "glass": "#f4f7fd",   # .glass-surface / .live-guide composite, worst case
    "canvas": "#eef2f8",  # --r8-canvas-0, the bare app background
    "chip": "#f6f9ff",    # rgba(255,255,255,.6x) pills on the glass surfaces
    "stage": "#edf5ff",   # --r8-stage-0, the viewer background behind HUD glass
}

# token -> (background key, usage note, minimum ratio)
# Only colours the artifact paints TEXT with are gated. Tokens used purely as
# fills, strokes, dots or accent-color are listed in FILL_ONLY and reported but
# not gated: WCAG 1.4.3 does not apply to them, and keeping them bright is what
# preserves the legend-dot / 3D-scene colour correspondence.
CHECKS = [
    ("--ink",              "panel",  "primary body text",                 4.5),
    ("--ink-strong",       "panel",  "headings and emphasised values",     4.5),
    ("--muted",            "panel",  "secondary paragraph text",           4.5),
    ("--muted-2",          "canvas", "tab subtitles, table empty cells",   4.5),
    ("--accent-text",      "canvas", "eyebrows, chips, small link text",   4.5),
    ("--focus",            "panel",  "focus label text",                   4.5),
    ("--success",          "panel",  "correct-answer text",                4.5),
    ("--danger",           "panel",  "incorrect-answer text",              4.5),
    ("--warning",          "panel",  "caution text",                       4.5),
    ("--r8-ink",           "panel",  "R008 primary body text",             4.5),
    ("--r8-ink-strong",    "panel",  "R008 headings",                      4.5),
    ("--r8-ink-secondary", "stage",  "R008/R009 secondary + legend text",  4.5),
    ("--r8-ink-tertiary",  "stage",  "R008 tertiary labels, phase strip",  4.5),
    ("--r8-accent-text",   "stage",  "kickers, eyebrows, HUD heading tag", 4.5),
    ("--r8-success",       "panel",  "success text",                       4.5),
    ("--r8-danger",        "panel",  "danger text",                        4.5),
    ("--r8-focus",         "panel",  "focus text",                         4.5),
]

# (token, why it is not text)
FILL_ONLY = [
    ("--accent",       "range accent-color, callout border, SVG stroke"),
    ("--accent-2",     "gradient fill"),
    ("--amber",        "callout left border"),
    ("--mint",         "swatch background, callout left border"),
    ("--rose",         "callout left border"),
    ("--cyan",         "swatch background"),
    ("--r8-accent",    "tab-symbol/phase gradient fill, range accent-color"),
    ("--r8-accent-2",  "gradient fill"),
    ("--r8-teal",      "status dot fill"),
    ("--r8-amber",     "legend dot fill (.r008-dot.axis)"),
    ("--r8-rose",      "legend dot fill (.r008-dot.intersection)"),
    ("--r8-cyan",      "legend dot fill"),
    ("--r9-axis",      "R009 legend dot fill; matches the 3D scene colour"),
    ("--r9-plane",     "R009 legend dot fill; matches the 3D scene colour"),
    ("--r9-path",      "R009 legend dot fill; matches the 3D scene colour"),
    ("--r9-focus-rose","R009 legend dot fill; matches the 3D scene colour"),
]

# Text colours written as literals rather than tokens.
LITERAL_CHECKS = [
    ("#004da8", "panel", "p13 expression text / active card text", 4.5),
    ("#004fa8", "chip",  "evidence button label",                  4.5),
    ("#36516d", "chip",  "live-guide chip text",                   4.5),
    ("#36506e", "chip",  "live-guide step pill text",              4.5),
    ("#225b91", "chip",  "past phase-strip text",                  4.5),
    ("#5b3fd0", "chip",  "enrichment group label",                 4.5),
    ("#0a6f50", "chip",  "matched-piece heading",                  4.5),
    ("#27486d", "panel", "proof counter label",                    4.5),
    ("#173457", "panel", "formula box text",                       4.5),
    ("#596a7d", "glass", "model-note text",                        4.5),
    ("#36516d", "stage", "R009 legend label text",                 4.5),
]

def parse_hex(value: str) -> tuple[float, float, float]:
    value = value.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))


def relative_luminance(rgb) -> float:
    def channel(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg: str, bg: str) -> float:
    a = relative_luminance(parse_hex(fg))
    b = relative_luminance(parse_hex(bg))
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def oklch_to_hex(lightness: float, chroma: float, hue: float) -> str:
    """Oklch -> sRGB hex, so the checker measures what actually renders.

    The stylesheet upgrades several tokens inside `@supports (color: oklch(...))`,
    and every browser this artifact targets takes that branch. Checking only the
    hex fallback would report a contrast the student never sees.
    """
    h = math.radians(hue)
    a, b = chroma * math.cos(h), chroma * math.sin(h)
    l_ = lightness + 0.3963377774 * a + 0.2158037573 * b
    m_ = lightness - 0.1055613458 * a - 0.0638541728 * b
    s_ = lightness - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    def encode(c: float) -> int:
        c = max(0.0, min(1.0, c))
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return round(c * 255)

    return "#%02x%02x%02x" % (encode(r), encode(g), encode(bl))


HEX_RE = re.compile(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;")
OKLCH_RE = re.compile(
    r"(--[a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)\s*;"
)


def read_tokens() -> dict:
    """Effective token values: hex base, then any @supports oklch upgrade."""
    tokens = {}
    for path in sorted(SRC_DIR.glob("05_css_*.part")):
        text = path.read_text(encoding="utf-8")
        for name, value in HEX_RE.findall(text):
            tokens.setdefault(name, value)  # first (base :root) definition wins
    for path in sorted(SRC_DIR.glob("05_css_*.part")):
        text = path.read_text(encoding="utf-8")
        for name, lightness, chroma, hue in OKLCH_RE.findall(text):
            tokens[name] = oklch_to_hex(float(lightness) / 100, float(chroma), float(hue))
    return tokens


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    tokens = read_tokens()
    rows = []
    for name, bg_key, usage, minimum in CHECKS:
        value = tokens.get(name)
        if value is None:
            rows.append((name, "-", bg_key, 0.0, minimum, "MISSING", usage))
            continue
        r = ratio(value, BACKGROUNDS[bg_key])
        rows.append((name, value, bg_key, r, minimum, "PASS" if r >= minimum else "FAIL", usage))
    for value, bg_key, usage, minimum in LITERAL_CHECKS:
        r = ratio(value, BACKGROUNDS[bg_key])
        rows.append(("(literal)", value, bg_key, r, minimum, "PASS" if r >= minimum else "FAIL", usage))

    width = max(len(r[0]) for r in rows)
    if not args.quiet:
        print("%-*s  %-9s %-7s %7s  %5s  %-4s  %s"
              % (width, "token", "value", "on", "ratio", "min", "", "usage"))
        print("-" * (width + 74))
        for name, value, bg_key, r, minimum, status, usage in rows:
            print("%-*s  %-9s %-7s %6.2f:1  %5.1f  %-4s  %s"
                  % (width, name, value, bg_key, r, minimum, status, usage))

    if not args.quiet:
        print()
        print("not gated -- these tokens are never used as text:")
        for name, why in FILL_ONLY:
            value = tokens.get(name, "-")
            print("  %-18s %-9s  %s" % (name, value, why))

    failures = [r for r in rows if r[5] != "PASS"]
    print()
    if failures:
        print("FAIL %d of %d text colours are below their AA threshold." % (len(failures), len(rows)))
        return 1
    print("PASS all %d text colours meet WCAG AA for their usage." % len(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
