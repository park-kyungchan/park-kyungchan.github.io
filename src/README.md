# src/ — de-sedimented source for the integrated spatial lab

`index.html` (the 1,147,558-byte, 5,943-line standalone student lab
"입체 탐구랩 R009") has no readable upstream source: it was produced by
regex-patching an opaque parent artifact. This directory inverts that
relationship. **The artifact is now the source of truth**, sliced into ordered,
individually readable part-files, and a forward build reassembles it.

## Byte-identity guarantee

This split is a **pure partition**, not a transformation. Every byte of
`index.html` belongs to exactly one part, in manifest order, with nothing added,
removed, reordered, re-encoded, or reformatted — not one byte, not one newline.
Formally:

```
b"".join(read_bytes(p) for p in manifest["parts"]) == read_bytes("index.html")
```

The build asserts this by SHA-256 and refuses to succeed otherwise.

- Expected SHA-256: `cd985d66bf5a63c55cab8832b5b3a191b5b0df076585ab91102519805b67223a`
- Parts: 37
- All files are handled as **binary**. Do not open them in an editor that
  normalizes line endings, strips trailing whitespace, or appends a final
  newline — that will break the hash.

## Build

```bash
python3 src/build.py
```

Compares the SHA-256 of the assembled bytes to
`manifest.json:expected_sha256` and, only if it matches, writes both outputs
listed in `manifest.json:targets` at the repository root:

- `index.html` — the GitHub Pages entry point
- `P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html` — an
  intentional byte-identical duplicate kept for offline distribution

On a hash mismatch nothing is written; the failed assembly is parked in a temp
file named in the error output. Prints `PASS <hash>` or exits non-zero with a
diagnostic. Stdlib only, no dependencies.

CI / pre-commit check (writes nothing to the repository):

```bash
python3 src/build.py --check
```

`--check` assembles into a temp file, applies the same hash guard, and then
verifies that both committed artifacts are byte-for-byte equal to the
assembly. It fails if the committed artifacts have drifted from the parts.

Independent check:

```bash
cmp -s index.html P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html \
  && echo identical
```

## Part inventory

| Part | Bytes | Lines | Contents |
|---|---:|---|---|
| `00_document_head.html.part` | 380 | 1–9 | <!doctype>, <html lang=ko>, <head> meta/title, opening <style> tag. |
| `05_css_00_base_tokens_layout.css.part` | 35,589 | 10–539 | CSS layer 1: :root color/spacing tokens, page shell, panels, buttons, notebook, proof workspace, net relation lab, why-five view, dialog. |
| `05_css_10_r004_r005_typography.css.part` | 11,709 | 540–838 | CSS layer 2: R004 Korean handwriting typography + mapped notebook; R005 two-panel learning layout, guidance, compact vertex-only labels. |
| `05_css_20_r006_r007_student_lab.css.part` | 21,847 | 839–1286 | CSS layer 3: R006 progressive student lab (resizable panels, legibility-first UI) and R007 deterministic student-UI overrides. |
| `05_css_30_r008_design_system_shell.css.part` | 19,150 | 1287–1741 | CSS layer 4: R008 design-system tokens (color/type/space/elevation/motion) and the fixed two-panel shell, transport, live guide, evidence sheet. |
| `05_css_40_r008_components.css.part` | 9,130 | 1742–1901 | CSS layer 5: R008 controls, transport, stage content, spatial module canvases, inherited non-spatial overlays. |
| `05_css_50_r009_spatial.css.part` | 7,167 | 1902–1975 | CSS layer 6: R009 integrated spatial design - spatial HUD, inset, legend, left-panel module controls, responsive media queries. |
| `10_body_markup.html.part` | 9,357 | 1976–2070 | </style></head> and the entire static <body> markup: header, 9 chapter tabs, viewer stage/canvases, spatial HUD, footer, dialogs. |
| `20_data_script_open_r009_exact.js.part` | 9,542 | 2071–2072 | Data script #1 open + window.P003_R009_EXACT JSON payload (R009 integrated spatial contract: revolution profiles, section cases, chapter order). |
| `21_data_p003_core.js.part` | 171,165 | 2073–2075 | window.P003_DATA JSON payload (solids, nets, cross-section presets, UI defaults) + close of data script #1. |
| `22_data_script_open_r007_nets.js.part` | 538,999 | 2076–2077 | Data script #2 open + window.P003_R007_NETS JSON payload (all Platonic net variants). Largest single payload. |
| `23_data_r007_exact_merge.js.part` | 6,245 | 2078–2084 | window.P003_R007_EXACT payload plus the small merge statements that fold R007 nets/exact geometry into window.P003_DATA; close of data script #2. |
| `30_runtime_prelude.js.part` | 5,660 | 2085–2190 | Main runtime script open, IIFE + 'use strict', DATA guard, DOM/math micro-helpers, public vertex/edge/face naming and local vertex maps. |
| `31_runtime_vec_quat_math.js.part` | 5,390 | 2191–2324 | Palette constants; vec3 algebra, polygon normals, perspective matrix, point-in-triangle / point-segment tests, quaternion slerp/rotate/compose, rigid transforms. |
| `32_runtime_fold_plan.js.part` | 7,922 | 2325–2466 | Rigid fold-plan builder and cache, FOLD_PHASES, fold frame/phase/hinge progress math, fold stage + mapping info. |
| `33_runtime_renderer.js.part` | 47,831 | 2467–3362 | class PolyRenderer - WebGL/canvas2d scene renderer: buffers, shaders, camera, picking, label canvas, 2D fallback draw path. |
| `34_runtime_state_refs.js.part` | 2,664 | 3363–3437 | The global `state` object, the `refs` DOM handle map, renderer instantiation, viewer fallback hide. |
| `35_runtime_mapping_ui.js.part` | 12,855 | 3438–3623 | announce(), Euler/universal mapping notebook state and HTML, controls collapse, module overlay, net variant lookup, solid <option> lists, interaction mode UI, metrics and selection descriptions. |
| `36_chapter_explorer.js.part` | 6,083 | 3624–3709 | Chapter 1: renderExplorer() - solid reading panel. |
| `37_chapter_net_relations.js.part` | 17,640 | 3710–3962 | Chapter 3 part A: net SVG geometry helpers, edge/vertex relation challenges, renderNetSVG / renderGeneratedNetSVG, SVG event wiring, relation panel. |
| `38_chapter_net_fold.js.part` | 12,200 | 3963–4145 | Chapter 3 part B: fold view distances, fold playback loop (start/stop/apply), fold stage UI, renderNetLab(). |
| `39_chapter_net_cut.js.part` | 15,143 | 4146–4383 | Chapter 3 part C: cube-cut mode, cut panel + validation, JS unfolding (fitChild2D/unfoldSolidJS), convex overlap tests, angle gauge SVG. |
| `40_chapter_generator.js.part` | 16,871 | 4384–4535 | Chapter 2: 'why five?' generator - vertex-angle patch drawing, playback, right panel, renderGenerator(). |
| `41_chapter_euler.js.part` | 43,462 | 4536–4851 | Chapter 5: EULER_PROOFS models, proof snapshots/timeline/semantic units, animated proof SVG, direct-proof legality, playback, renderEuler(). |
| `42_chapter_soccer_playback.js.part` | 3,297 | 4852–4901 | Chapter 6 part A: soccer-ball (truncated icosahedron) stage math and playback loop. |
| `43_chapter_section.js.part` | 15,690 | 4902–5124 | Chapter 4: cross-section presets, plane support range, section polygon solver, section dock sync, playback, renderSectionLab(). |
| `44_chapter_soccer_render.js.part` | 7,495 | 5125–5176 | Chapter 6 part B: renderSoccer(), dock-only refresh, right-panel HTML. |
| `45_r007_modules.js.part` | 7,630 | 5177–5292 | R007 module layer: exact-geometry accessors, phase labels, escape/format helpers, R007 playback controller, moduleShell(), play/replay/reset. |
| `46_r007_tab_router.js.part` | 10,346 | 5293–5387 | R007 renderNetLab() override, activateTabButton(), renderCurrentTab() router. |
| `47_runtime_events_boot.js.part` | 6,007 | 5388–5479 | Reduced-motion preference wiring and all global event listeners: tabs, interaction modes, zoom, reset, fullscreen, help/start dialog, visibility/blur/resize. |
| `48_runtime_chapter_nav.js.part` | 1,696 | 5480–5497 | CHAPTER_ORDER / CHAPTER_NAMES, updateChapterNav(), goChapter(), prev/next button wiring. |
| `49_r009_spatial_core.js.part` | 4,339 | 5498–5573 | R009 module-override banner, R009_EXACT/R009 config, r9* vector helpers and easings, revolution profile points/specs/bounds, lathe face generation, circle segments. |
| `50_r009_scene_draw.js.part` | 22,077 | 5574–5686 | R009 rendering layer: smooth draw2D override, custom scene apply, plane basis/patch, mesh section intersection and loop chaining, canvas insets, spatial HUD, revolution/section/path scene draws. |
| `51_r009_chapters.js.part` | 25,115 | 5687–5851 | R009 chapter integration: chapter order/names/labels, state extension, phase helpers, drawRevolutionVisual/renderRevolution, revsection, shortest-path chapters, moduleSupports3D override. |
| `52_r009_shell_boot.js.part` | 9,827 | 5852–5935 | R009 shell: renderCurrentTab wrapper, chapter nav overrides, live guide, evidence dialog, r009Install(), and the boot sequence (install, nav, first render, announce, start dialog). |
| `53_runtime_close.js.part` | 22 | 5936–5941 | IIFE close `})();`, trailing whitespace lines, and the closing </script> tag of the main runtime. |
| `60_document_tail.html.part` | 16 | 5942–5943 | Closing </body></html>. |

## Split boundaries

Parts are cut only at boundaries that are safe to edit around:

- **CSS** is cut only at top-level section banner comments (`/* P003 R004 … */`,
  `/* ===== P003 R008 MODULED DESIGN SYSTEM ===== */`, …), i.e. always *between*
  complete rules. The six CSS parts correspond to the historical R004→R009
  design layers that accreted in the blob.
- **JS** is cut only at top-level statement boundaries inside the main IIFE —
  between a closing `}` / `;` and the next `function` / `const` / `let` /
  `class` / banner comment, always on a blank line. No part starts or ends
  mid-statement, mid-string, or mid-template-literal, so each `.js.part` is
  independently readable and independently editable.
- **JSON payloads** (`window.P003_R009_EXACT`, `window.P003_DATA`,
  `window.P003_R007_NETS`, `window.P003_R007_EXACT`) each get their own part.
  They are single-line minified blobs with no safe internal boundary, so they
  are kept whole even though two of them are large.

## How this replaces the regex-surgery build

The previous pipeline (`archive/r009_legacy_build/build/build_r009.py`)
synthesized the artifact by
applying ordered regex substitutions to a parent HTML file. That approach had
three structural problems: the "source" was a patch script rather than the code
being shipped, every edit had to be expressed as a fragile pattern match against
text nobody could read, and a pattern that silently stopped matching produced a
quietly wrong artifact.

Going forward:

1. **Edit the part-file, not a patch.** Change the ~10 KB module you actually
   care about; the other 36 parts are untouched bytes.
2. **Rebuild with `build.py`.** Concatenation, not substitution — there is no
   pattern that can fail to match.
3. **The hash check flips meaning after the first intentional edit.** Today
   `expected_sha256` proves the extraction is lossless. Once a real change
   lands, update `expected_sha256` to the new artifact hash *in the same commit
   as the part edit*; the field then pins "this tree builds exactly this
   artifact" and any accidental drift still fails loudly.
4. **Correctness of behaviour is gated separately** by the visual-regression
   harness, not by this build. `build.py` proves byte identity only.

The old build script is left untouched under `archive/r009_legacy_build/` as
historical record; it is no longer the path by which the artifact is produced.

## Rules for editing

- No reformatting, no deduplication, no "drive-by" cleanups. The extraction was
  deliberately a pure partition; improvements land as reviewed, separately
  gated changes.
- Do not renumber or rename parts without updating `manifest.json` — the
  numeric prefix encodes concatenation order, and the manifest, not the
  filesystem sort, is authoritative.
- Splitting a part further is fine: cut at a blank line between top-level
  statements, add both new names to `manifest.json` in place of the old one,
  and confirm `build.py` still prints the same hash.
