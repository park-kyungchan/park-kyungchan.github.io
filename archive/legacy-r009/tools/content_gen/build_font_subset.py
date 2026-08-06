#!/usr/bin/env python3
"""
P1-4 - build the embedded handwriting-font CSS part for the standalone artifact.

The artifact contract is "fully offline, zero external requests", so the
handwriting face cannot be linked; it has to be subset and base64-embedded.

What this does
--------------
1. Derives the glyph set from the repository itself (never a hand-written list):
     * every character that appears in any ``src/*.part`` file, which is a
       superset of every character in the assembled artifact, including the
       Korean strings that are composed at runtime by the chapter modules;
     * a safety set (ASCII printable + digits + the maths/arrow symbols the
       lab renders) so a symbol that only shows up after a future copy edit is
       still covered.
2. Subsets Gaegu Regular + Bold to that set and converts them to woff2.
3. Emits ``src/05_css_05_p14_handwriting_font.css.part`` containing two
   ``@font-face`` rules with ``src: url(data:font/woff2;base64,...)``.

Usage
-----
    python3 tools/content_gen/build_font_subset.py            # write the part
    python3 tools/content_gen/build_font_subset.py --check    # verify only

``--check`` regenerates into a temporary buffer and compares against the
committed part, so it fails if the source strings drifted away from the
embedded subset.

Font source
-----------
Gaegu by Team Gaegu / Yoon Design, SIL Open Font License 1.1.
    https://github.com/google/fonts/tree/main/ofl/gaegu
The two upstream TTFs are expected in ``--fonts-dir`` (default
``tools/content_gen/vendor_fonts/``). They are not committed; the script
downloads them on demand when the directory is empty and the network allows.
See docs/P1-4_FONT_LICENSE.md.
"""

from __future__ import annotations

import argparse
import base64
import glob
import io
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = REPO_ROOT / "src"
DEFAULT_FONTS_DIR = Path(__file__).resolve().parent / "vendor_fonts"
OUTPUT_PART = SRC_DIR / "05_css_05_p14_handwriting_font.css.part"

UPSTREAM = "https://github.com/google/fonts/raw/main/ofl/gaegu/%s"
FACES = [
    # (upstream filename, css font-weight)
    ("Gaegu-Regular.ttf", "400"),
    ("Gaegu-Bold.ttf", "700"),
]

# Symbols the lab can render. Kept as an explicit *safety* set only: the real
# glyph set is whatever the sources actually contain, and this is unioned in so
# a symbol introduced by a later copy edit does not silently lose its glyph.
SAFETY_SYMBOLS = (
    "√π²³°≈⅓½¼⅔¾"
    "×÷−·…←→↔↻⌖◎"
    "▶★∠≤≥±"
)


def source_characters():
    """Every character present in the build inputs.

    The artifact is a straight concatenation of ``src/*.part``, so this is a
    superset of every character the assembled HTML can contain -- static markup,
    data payloads and the template literals the chapter modules assemble at
    runtime alike.
    """
    chars = set()
    for path in sorted(glob.glob(str(SRC_DIR / "*.part"))):
        with open(path, encoding="utf-8") as fh:
            chars |= set(fh.read())
    return chars


def glyph_set():
    chars = source_characters()
    chars |= {chr(cp) for cp in range(0x20, 0x7F)}  # ASCII printable + digits
    chars |= set(SAFETY_SYMBOLS)
    chars |= {" "}  # NBSP: used by the layout, must not fall back
    # Control/unassigned characters have no glyph and are intentionally excluded.
    return {c for c in chars if unicodedata.category(c) not in ("Cc", "Cs", "Cn")}


def ensure_sources(fonts_dir):
    fonts_dir.mkdir(parents=True, exist_ok=True)
    missing = [name for name, _ in FACES if not (fonts_dir / name).exists()]
    if not missing:
        return
    import urllib.request

    for name in missing:
        url = UPSTREAM % name
        print("downloading %s" % url, file=sys.stderr)
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                (fonts_dir / name).write_bytes(response.read())
        except Exception as exc:  # pragma: no cover - network dependent
            raise SystemExit(
                "cannot obtain %s (%s). Download it manually from %s into %s."
                % (name, exc, url, fonts_dir)
            )


def subset_face(ttf_path, chars):
    """Return (woff2 bytes, glyph count actually retained).

    Deterministic on purpose: `recalcTimestamp` is disabled so fontTools does
    not stamp the save time into head.modified, which would make every run
    produce different bytes and break --check.
    """
    from fontTools import subset
    from fontTools.ttLib import TTFont

    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.layout_features = ["*"]
    options.name_IDs = [0, 1, 2, 3, 4, 6, 13, 14]
    options.name_legacy = False
    options.notdef_outline = True
    options.recalc_bounds = True
    options.recalc_timestamp = False
    options.drop_tables += ["DSIG"]
    options.hinting = False

    font = TTFont(str(ttf_path), recalcTimestamp=False)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=[ord(c) for c in sorted(chars)])
    subsetter.subset(font)

    glyph_count = len(font.getGlyphOrder())
    buffer = io.BytesIO()
    font.flavor = "woff2"
    font.recalcTimestamp = False
    font.save(buffer)
    font.close()
    return buffer.getvalue(), glyph_count


def covered_codepoints(ttf_path):
    from fontTools.ttLib import TTFont

    font = TTFont(str(ttf_path))
    cmap = set(font.getBestCmap().keys())
    font.close()
    return cmap


def render_part(faces, stats):
    lines = [
        "/* P003 P1-4 - embedded handwriting face (Gaegu, SIL OFL 1.1).",
        "   GENERATED by tools/content_gen/build_font_subset.py -- do not hand-edit.",
        "   The artifact must make zero external requests, so the subset is inlined",
        "   as base64 woff2. The glyph set is derived from src/*.part; see the tool",
        "   and docs/P1-4_FONT_LICENSE.md. Requested codepoints: %d, embedded: %d. */"
        % (stats["requested"], stats["covered"]),
    ]
    for weight, payload in faces:
        b64 = base64.b64encode(payload).decode("ascii")
        lines.append("@font-face {")
        lines.append('  font-family: "Gaegu";')
        lines.append("  font-style: normal;")
        lines.append("  font-weight: %s;" % weight)
        lines.append("  font-display: block;")
        lines.append('  src: url("data:font/woff2;base64,%s") format("woff2");' % b64)
        lines.append("}")
    lines.append("")
    return "\n".join(lines)


def build(fonts_dir):
    chars = glyph_set()
    ensure_sources(fonts_dir)

    stats = {"requested": len(chars)}
    faces = []
    total = 0
    covered = None
    for name, weight in FACES:
        path = fonts_dir / name
        cmap = covered_codepoints(path)
        covered = cmap if covered is None else (covered & cmap)
        payload, glyphs = subset_face(path, chars)
        faces.append((weight, payload))
        total += len(payload)
        stats["face_%s" % weight] = {"bytes": len(payload), "glyphs": glyphs}

    wanted = {ord(c) for c in chars}
    stats["covered"] = len(wanted & (covered or set()))
    stats["missing"] = sorted(wanted - (covered or set()))
    stats["woff2_bytes"] = total
    return render_part(faces, stats), stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify without writing")
    parser.add_argument("--fonts-dir", type=Path, default=DEFAULT_FONTS_DIR)
    parser.add_argument("--report", action="store_true", help="print the glyph report")
    args = parser.parse_args()

    part, stats = build(args.fonts_dir)

    if args.report:
        print("requested codepoints : %d" % stats["requested"])
        print("covered by Gaegu     : %d" % stats["covered"])
        print("woff2 bytes total    : %d" % stats["woff2_bytes"])
        for _, weight in FACES:
            face = stats["face_%s" % weight]
            print("  weight %s: %d bytes, %d glyphs" % (weight, face["bytes"], face["glyphs"]))
        missing = stats["missing"]
        print("not in Gaegu (%d, fall back to the next family in the stack):" % len(missing))
        print("  " + " ".join("U+%04X %s" % (cp, chr(cp)) for cp in missing))

    if args.check:
        if not OUTPUT_PART.exists():
            print("FAIL missing %s" % OUTPUT_PART)
            return 1
        current = OUTPUT_PART.read_text(encoding="utf-8")
        if current != part:
            print("FAIL %s is stale; re-run without --check" % OUTPUT_PART.name)
            return 1
        print("PASS %s matches the sources (%d bytes)" % (OUTPUT_PART.name, len(part)))
        return 0

    OUTPUT_PART.write_text(part, encoding="utf-8")
    print("wrote %s (%d bytes)" % (OUTPUT_PART, len(part)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
