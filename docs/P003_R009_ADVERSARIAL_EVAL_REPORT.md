# P003 R008 → R009 Adversarial Evaluation Report

## Judgment

`REVISE` at baseline, followed by a separate R009 candidate. Current R009 judgment is **`HOLD_FOR_USER_REVIEW / NOT_USER_GO`**.

## Immutable input

- Pack: `ee7f7660bf3b87dcbb803f2dbe17816458c9aa5b50aef30630b297e914962115`
- Standalone: `6072923d14e6fdce1826627a0e58e1c7a16b625c7b1265c6e5496630c9c76787`
- Baseline integrity and internal checksum/manifest verification: PASS.

## Findings and repairs

| Finding | R008 failure evidence | R009 change | Regression result |
|---|---|---|---|
| Duplicate floating playback transport | `#centerLearningDock`/transport existed in addition to left controls; baseline count 1 | removed transport DOM, runtime builder, and transport-only CSS; playback remains in the left panel | static and runtime count 0; two direct main children |
| Fragmented chapter model | 12 tabs separated section/locus and distance/unfold, and retained a transfer chapter | nine chapters; merge `revsection+locus`, merge `distance+geodesic`, remove `transfer` | nav count 9; removed routes absent |
| Weak section-7 breadth | basic revolution examples did not cover frustum, offset profiles, or composite profiles | ten profiles: four basic, two offset-from-axis, four composite | inventory and interaction tests PASS |
| Separate low-quality spatial path | R008 revolution/section used a fixed spatial canvas; baseline camera drag mean pixel difference ≈ `0.000445` | all three new spatial chapters reuse the same `PolyRenderer` used by the polyhedron section lab | camera orbit and zoom produce live visual changes during autoplay in all 3 chapters |
| Section and locus disconnected | plane motion and intersection-point locus were split | one `revsection` state uses moving plane, growing intersection, boundary-component list, and plane-view inset | 13 cases, including finite caps, apex, frustum, hollow cylinder, and torus enrichment |
| Distance condition and unfolding disconnected | metric-domain selection and development were separate | one `geodesic` state begins with interior/surface/edge domain, then unfolds and compares candidates | cube/cylinder/cone/sphere exact checks PASS; invalid edge-only control disabled for non-polyhedra |
| Motion did not sufficiently signal causality | result-oriented changes with weak phase salience | explicit PREVIEW → ANTICIPATION → TRANSFORM → SETTLE → HOLD phases, live guide, focus pulse, growing curve/path, and comparison hold | motion MP4 and runtime progress/orbit tests PASS |
| Code weight risk | extra transport and duplicate spatial implementations | obsolete R007/R008 chapters 7–12, panel-resize runtime, and transport implementation stripped during build | R009 `1147558` bytes vs R008 `1160280` bytes: **12722 bytes smaller** |

## Adversarial families executed

- all nine chapters across five responsive/reduced-motion profiles;
- rapid chapter switching and reset during animation;
- orbit and zoom while each new autoplay is running;
- `pointercancel` followed by a new drag;
- answer/evidence dialog focus, Escape, and focus return;
- hidden-state pause and no stale resume;
- context-lost/restored listener path;
- external request, console error, machine-ID, teacher/debug leak, target-size, and horizontal-overflow scans.

## Human visual evidence

- `evidence/P003_R009_BEFORE_AFTER_CONTACT_SHEET.png`
- `evidence/P003_R009_MOTION_EVIDENCE.mp4`

The contact sheet shows the removed R008 transport and fixed-canvas behavior beside R009 frustum/composite generation, integrated section+locus, and integrated distance+unfold states.

## Limit boundary

The evaluation does not establish actual touchscreen/pen behavior, non-Chromium rendering, full WCAG conformance, or learning effectiveness. These remain field/open evidence.
