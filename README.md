# Math Education Video Portal

이 저장소의 GitHub Pages는 **video-only GitHub Pages**로 운영됩니다. Workflow는 `platform/video`의 Final/History HTML·CSS·JS, 두 public manifest, 그리고 manifest가 hash-bound한 MP4 allowlist만 `_site`에 복사합니다. 그 외 source는 배포 artifact에 포함하지 않습니다.

- 진입점: `https://park-kyungchan.github.io/`
- 완성본: `https://park-kyungchan.github.io/final/`
- 제작 히스토리: `https://park-kyungchan.github.io/history/`
- Final manifest: `platform/video/media/final-manifest.json`
- History manifest: `platform/video/media/manifest.json`
- 배포 workflow: `.github/workflows/deploy.yml`

## Final

Final에는 완료된 영상만 등록합니다.

| 영상 | 길이 | 규격 | SHA-256 |
|---|---:|---|---|
| `Megastudy 15 Final · PART 1` | 205초 | 1920×1080, 30fps, H.264, 무음 | `4114dbebb8a88c1aae9dd2db3a82c112035ebb706b3da111c14306aea9100e67` |
| `Megastudy 15 Final · PART 2` | 245초 | 1920×1080, 30fps, H.264, 무음 | `af0bb1b8b3b0f73d600f27f44a3c442f5bbd3dde48e039cda30c5767c95bb5c8` |

## History

History는 기존 검토본, 캐너리와 세대별 작업을 계속 보존합니다. Final 등록은 기존 History manifest나 active generation을 자동 변경하지 않습니다.

## 영상 업데이트 절차

1. 100MB 미만의 새 MP4를 `platform/video/media/`에 고유한 버전명으로 no-overwrite 추가합니다.
2. 완성본은 `final-manifest.json`에 `FINAL_RELEASE`, `release_approved: true`, hash, bytes, duration, fps, dimensions를 기록합니다. 검토본은 기존 `manifest.json`의 History workflow를 따릅니다.
3. `node --test platform/video/tests/*.test.mjs`를 실행합니다.
4. no-overwrite builder를 실행해 explicit fileset과 hash closure를 확인합니다.
5. `master` 반영 후 GitHub Pages workflow, route, 원격 full hash, HTTP range와 재생 가능성을 검증합니다.

History의 이전 영상은 롤백 및 비교를 위해 보존합니다. Final에는 draft, review, canary 또는 legacy artifact를 넣지 않습니다.
