# 입체 탐구랩 — 중1 입체도형 탐구랩

A single-file, offline-capable interactive geometry lab for 중학교 1학년
입체도형: 다면체 · 회전체 · 단면 · 최단거리. Nine chapters (explorer,
generator, net, section, euler, soccer, revolution, revsection, geodesic) run
in one fixed two-panel stage with a WebGL renderer and a canvas2d fallback.

Everything ships as **one self-contained HTML file** — no build step for the
reader, no network dependency, no assets to lose.

- Published site: `index.html` (GitHub Pages)
- Offline copy: `P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html`
  (byte-identical duplicate, handed out for offline use)

## Repository layout

| Path | What it holds |
|---|---|
| `src/` | **The source.** 37 ordered `.part` files + `manifest.json` + `build.py`. Concatenating the parts is exactly the shipped artifact. Start here for any change. |
| `tools/` | `visual_regression/` (capture harness + pixel comparer), `serve_local.py`, `build_pack.py`. |
| `data/` | R007/R009 geometry and state-graph specs (exact spatial spec, state graph, Platonic nets). |
| `docs/` | R009 specifications, review records, regression and adversarial reports, known limitations. |
| `tests/` | R009 Playwright suites (static contract, runtime adversarial/resilience, local modes, exact validation). |
| `archive/` | Frozen R007→R009 provenance: the retired regex-surgery build, the R008 parent baseline, evidence, audit JSON, pack manifest. Read-only — see `archive/README.md`. |

The two HTML files at the repository root are build **outputs**, committed on
purpose so GitHub Pages can serve them. Do not hand-edit them; edit a part file
in `src/` and rebuild.

## Build

```bash
python3 src/build.py
```

Stdlib only, no dependencies. Reassembles the artifact and writes both
root-level HTML files. Verify without touching the working tree:

```bash
python3 src/build.py --check
```

## The byte-identity contract

`src/` is a **pure partition** of the artifact, not a transformation. Every
byte of `index.html` belongs to exactly one part, in manifest order, with
nothing added, removed, reordered, re-encoded or reformatted:

```
b"".join(read_bytes(p) for p in manifest["parts"]) == read_bytes("index.html")
```

`build.py` enforces this with a SHA-256 guard against
`manifest.json:expected_sha256`
(`cd985d66bf5a63c55cab8832b5b3a191b5b0df076585ab91102519805b67223a` today). On
a mismatch it writes **nothing** and exits non-zero. CI runs
`src/build.py --check` on every push and pull request, so a hand-edited
artifact, a reordered part or an editor that "helpfully" re-indented a part
file fails loudly instead of silently shipping.

When a change is intentional, edit the part file and update
`expected_sha256` **in the same commit**. The field then means "this tree
builds exactly this artifact", and accidental drift still fails.

Do not open `.part` files in an editor that normalises line endings, strips
trailing whitespace, or appends a final newline. `.gitattributes` marks them
`-text` so git will not do it either.

## Visual regression

The hash guard proves byte identity, not correct behaviour. Behaviour is gated
separately by a deterministic screenshot matrix: 38 states across 9 chapters
and 2 viewports, with animations disabled and `performance.now()` frozen.

```bash
pip install -r requirements-ci.txt
python3 -m playwright install --with-deps chromium-headless-shell

# capture the current build and a reference build, then compare
python3 tools/visual_regression/capture_states.py /tmp/vr/head index.html
git show origin/master:index.html > /tmp/vr/base_index.html
python3 tools/visual_regression/capture_states.py /tmp/vr/base /tmp/vr/base_index.html
python3 tools/visual_regression/compare.py /tmp/vr/base /tmp/vr/head
```

A pair fails at more than 200 differing pixels or a max channel delta above 16.
Always capture both sides **on the same machine**: two runs of the identical
artifact on one runner differ by ~7 pixels, but a different GPU, font stack or
Chromium version differs by far more than the gate allows. CI does exactly this
on pull requests, rendering the base and head builds on one runner.

## History

R007 through R009 were built by *sedimentation*: each release applied ordered
regex substitutions to the previous release's opaque HTML blob, so the "source"
was a patch script rather than the code being shipped, every edit was a fragile
pattern match against text nobody could read, and a pattern that quietly
stopped matching produced a quietly wrong artifact. R010 inverts that. The
artifact became the source, sliced into readable parts, and the build is now
plain concatenation — there is no pattern that can fail to match. The old
pipeline and all of its release evidence are preserved verbatim under
`archive/`; `docs/README.md` remains accurate as the R009 provenance record.
