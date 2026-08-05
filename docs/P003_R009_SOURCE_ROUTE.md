# P003 R009 Source Route

```yaml
MODE: BUILD_AND_EVALUATE
WORK_PACKAGE:
  - INTERACTIVE_ADVERSARIAL_EVAL_AND_IMPROVEMENT
  - INTERACTIVE_PROTOTYPE_BUILD
  - REGRESSION_AND_PACKAGING
PROJECT_ID: P003
OUTPUT_MEDIUM: INTERACTIVE_WEB_3D
ROUTE_REASON: R008 immutable baseline → R009 separate candidate
PILOT_SOURCE_STATUS: INSTALLED_ACTIVE_P1_WITH_NEWER_ARTIFACT_HANDOFF
SESSION_FALLBACK_USED: ARTIFACT_POINTER_ONLY
IMAGE_GEN: NOT_APPLICABLE_NO_IMAGE_GEN
PROMOTION: NONE
```

## Applied Sources

- `LAB-ROUTER-P1`
- `CURR-2022-MIDDLE-MATH`
- `STORY-KEYFRAME-ENGINE`
- `INTERACTIVE-ARTIFACT-ENGINE-P1`
- `INTERACTIVE-ARTIFACT-AUDIT-P1`
- `INTERACTIVE-ARTIFACT-REGRESSION-P1`
- `QA-PROMOTION`
- `P003-INTERACTIVE-POLYHEDRA-DESIGN`
- `P003-BENCHMARK-REGRESSION-P1`
- exact R008 Pack and Standalone baseline
- current user change request for R009

## Excluded Sources

- P001/P002 topic bodies: unrelated to the current artifact bytes and mathematics.
- image prompt/audit Sources: no image generation was used.
- raw R0 PDF bodies: no image-generation or visual-reference transfer was needed.

## Baseline integrity

- R008 Pack SHA-256: `ee7f7660bf3b87dcbb803f2dbe17816458c9aa5b50aef30630b297e914962115` — match.
- R008 Standalone SHA-256: `6072923d14e6fdce1826627a0e58e1c7a16b625c7b1265c6e5496630c9c76787` — match.
- ZIP integrity: `PASS`.
- checksum mismatches: `0`.
- manifest mismatches: `0`.
- baseline mutation: `NONE`.

R008 bytes were not rewritten. R009 was built in a separate directory.
