# archive/ — immutable R007→R009 provenance

Everything under this directory is a **frozen snapshot** of how the R009
artifact was produced and reviewed. It is kept for provenance and audit only.

**Do not edit anything in here.** Nothing in `archive/` is built, imported, or
executed by the current pipeline. The authoritative source of the shipped
artifact is [`/src`](../src/README.md); rebuild with `python3 src/build.py`.

| Path | What it is |
|---|---|
| `r009_legacy_build/` | The retired build: `build/build_r009.py` synthesised the artifact by applying ordered regex substitutions to a parent HTML blob, plus the partial `modules/`, `ui/` and data-generator sources that fed it. Superseded by the forward build in `/src`. |
| `parent_baseline/` | The R008 parent artifact the R009 regex surgery was applied to. |
| `evidence/` | Visual and motion review evidence captured for the R009 release (before/after contact sheet, motion frames, baseline/candidate screenshots). |
| `audit/` | Machine-readable audit records for the R009 release: artifact audit, baseline identity, build reproducibility, static contract, runtime adversarial/resilience, local modes, exact-spec validation. |
| `r009_pack_manifest.json` | Manifest of the R009 distribution pack (formerly `manifest.json` at the repository root). Not the build manifest — that is `src/manifest.json`. |
| `checksums.sha256` | Checksums for the R009 pack contents as shipped. |

Related but deliberately **not** archived, because they are still current:
`docs/` (R009 specifications and reports, still accurate as documentation),
`data/` (the R007/R009 geometry and state-graph specs) and `tests/` (the R009
Playwright suites).

Note: `tools/build_pack.py` and the `tests/` suites were written against the
old root-level layout and still reference `source/`, `evidence/`, `audit/`,
`parent_baseline/`, `manifest.json` and `checksums.sha256` at the repository
root. They are R009-era tooling, left as-is; rerunning them requires updating
those prefixes to `archive/`.
