# P1-4 — embedded handwriting typeface

## What is embedded

| | |
|---|---|
| Family | **Gaegu** (개구체) |
| Weights | Regular (400), Bold (700) |
| Designer | Team Gaegu / Yoon Design |
| Upstream | <https://github.com/google/fonts/tree/main/ofl/gaegu> |
| Licence | **SIL Open Font License, Version 1.1** |
| Licence text | `OFL.txt` in the upstream directory above, and <https://openfontlicense.org> |
| Form in the artifact | `@font-face { src: url("data:font/woff2;base64,…") }` in `src/05_css_05_p14_handwriting_font.css.part` |

## Why it is embedded rather than linked

The artifact's contract is that it runs fully offline and issues **zero external
requests** — the footer states this to the student (`외부 요청 0`). A
`<link>` to a font CDN would break that contract, so the face is subset and
inlined as base64 woff2.

## Subset note

The embedded faces are **subsets**, not the complete fonts. The glyph set is
generated, never hand-listed, by `tools/content_gen/build_font_subset.py`:

* every character that occurs in any `src/*.part` file — a superset of every
  character the assembled artifact can contain, which covers the Korean strings
  the chapter modules compose at runtime as well as the static markup; plus
* a safety set: ASCII printable, digits, and the mathematical/geometric symbols
  the lab renders.

At the time of writing that is **638 requested codepoints**, of which **578 exist
in Gaegu** and are embedded (≈108 KB of woff2 across both weights). The
remaining 60 are mathematical and geometric symbols (`√ π ° × ÷ ≈ → ★ ▶ ① …`)
that Gaegu does not contain; they fall through to the next family in the
`font-family` stack exactly as they did before this change.

Regenerate and verify with:

```bash
python3 tools/content_gen/build_font_subset.py            # regenerate the part
python3 tools/content_gen/build_font_subset.py --check    # verify it is current
python3 tools/content_gen/build_font_subset.py --report   # glyph/byte report
```

The upstream TTFs live in `tools/content_gen/vendor_fonts/` and are **not
committed** (they are ~6 MB of build input, and only the subset ships). The
script downloads them on demand.

## OFL compliance

* The Font Software is used, modified (subset) and redistributed under the terms
  of the SIL OFL 1.1, which explicitly permits subsetting and bundling.
* The subset is **not sold on its own**; it is bundled with this teaching
  artifact.
* The Reserved Font Name is preserved: the embedded faces are still named
  `Gaegu`, and no derivative is distributed under a different name.
* This file, shipped in the repository, carries the copyright notice, the
  licence name and the pointer to the full licence text, as the OFL requires.
