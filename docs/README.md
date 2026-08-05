# P003 R009 Integrated Spatial Revolution Lab Candidate

**Status:** `HOLD_FOR_USER_REVIEW / NOT_USER_GO`  
**Student entrypoint:** `P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html`  
**Standalone SHA-256:** `cd985d66bf5a63c55cab8832b5b3a191b5b0df076585ab91102519805b67223a`  
**Baseline:** immutable P003 R008 Standalone `6072923d14e6fdce1826627a0e58e1c7a16b625c7b1265c6e5496630c9c76787`

R009 keeps the fixed two-panel student interface and removes the duplicate floating playback bar. Chapters 8–9 and 10–11 are consolidated into one shared 3D stage, and the old transfer chapter is removed. The first six polyhedra chapters keep their exact R007 data bytes unchanged.

## Main files

- `P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html` — self-contained student artifact.
- `data/P003_R009_EXACT_SPATIAL_SPEC.json` — exact/display-role separation for revolution, sections, and shortest paths.
- `data/P003_R009_STATE_GRAPH.json` — nine-chapter state contract.
- `source/` — modular R009 CSS/JavaScript and deterministic build.
- `tests/` and `audit/` — exact, static, runtime, resilience, packaging-preflight evidence.
- `evidence/` — before/after contact sheet and motion evidence.
- `docs/` — adversarial report, regression, web references, limitations, and local use.

## Build

```bash
python source/build/build_r009.py
```

The build verifies the immutable R008 parent Standalone hash before producing R009. Three consecutive builds produced the same `cd985d66bf5a63c55cab8832b5b3a191b5b0df076585ab91102519805b67223a` hash.

## Review boundary

Automated checks are not user GO, actual-device evidence, full WCAG conformance, or learning-effect evidence. Exact Pack/Standalone approval remains open.
