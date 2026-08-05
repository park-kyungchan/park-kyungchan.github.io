# P003 R008 → R009 Regression Report

## Result

**Prepack critical regression: PASS. Final release status: HOLD_FOR_USER_REVIEW.**

## Baseline lineage

R008 Pack/Standalone hashes match their immutable handoff; ZIP/checksum/manifest mismatches are zero. R008 was not modified.

## Preserved contracts

- fixed two-panel student-direct shell;
- first six chapters and their mathematical meaning;
- R007 exact geometry, state graph, and 29-net data files — byte-identical across R008 and R009;
- no teacher/debug/hash/machine-ID student-surface leak;
- local/offline, no external runtime request;
- auto-demo and direct controls use the same exact state data;
- exact mathematics remains separate from display tessellation.

Preserved data hashes:

- `data/P003_R007_EXACT_GEOMETRY_SPEC.json`: `c4078ebeb5c16b31267c9a928822863e793caeeb72fe51cdedf77b3bbe580c50`
- `data/P003_R007_STATE_GRAPH.json`: `dcf0f8f0bb6aa5a378e37b8694bd995fb6644c52bbc30794cf52a5f3af279309`
- `data/platonic_nets_r007.json`: `84bd36c06a7c987ad9d7eb7e490a731cc4162be2c4ff1188cb03a2954fbf0eef`

## Intended changes

- remove duplicate floating playback transport;
- replace 12 chapters with 9 integrated chapters;
- add ten revolution profiles;
- merge section+locus and distance+unfold;
- remove the transfer chapter;
- reuse shared `PolyRenderer` and enable camera orbit/zoom during autoplay;
- strengthen phase/focus motion.

## Automated results

| Suite | PASS | FAIL |
|---|---:|---:|
| exact math/state | 29 | 0 |
| static contract | 19 | 0 |
| runtime adversarial | 88 | 0 |
| runtime resilience | 11 | 0 |
| local server byte delivery | 1 | 0 |
| build reproducibility | 3 identical runs | 0 |

Five responsive profiles × nine chapters = 45 chapter-profile openings passed. Touch profiles are emulation evidence only.

## Camera during autoplay

- Revolution: progress `0.00 → 0.27`, orbit and zoom frame differences above threshold.
- Section/locus: progress `0.72 → 0.99`.
- Distance/unfold: progress `0.00 → 0.26`.

## No new critical failures observed

- external requests: 0;
- console/page critical errors: 0;
- visible or accessible machine IDs: 0;
- horizontal overflow: 0 in tested profiles;
- visible targets below 24 CSS px: 0;
- primary controls below 40 CSS px: 0;
- static floating transport/resize handles/removed routes: 0.

## Open field regression

Actual classroom devices, non-Chromium browsers, browser navigation under school policy, and full accessibility/learning-effect studies remain unverified and therefore prevent release GO without user review/field decision.
