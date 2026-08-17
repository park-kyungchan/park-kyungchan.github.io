# Math Education Video Archive

이 저장소의 GitHub Pages는 **video-only GitHub Pages**로 운영됩니다. Workflow는 `platform/video`의 HTML/CSS/JS/manifest/MP4 allowlist만 `_site`에 복사하며, 그 외 source는 배포 artifact에 포함하지 않습니다.

- 공개 사이트: `https://park-kyungchan.github.io/`
- 영상 manifest: `platform/video/media/manifest.json`
- 배포 workflow: `.github/workflows/deploy.yml`

## 최신 영상

- 제목: `Megastudy 15 Full Film`
- 길이: 300초
- 규격: 1920×1080, 30fps, H.264, 무음
- SHA-256: `436b93e94b15b32671aa36220c8cbbb29799a45761c3e477e186675e3944cc3b`

## 영상 업데이트 절차

1. 100MB 미만의 새 MP4를 `platform/video/media/`에 고유한 버전명으로 추가합니다.
2. `platform/video/media/manifest.json`에 hash, bytes, duration, fps, dimensions, scope를 기록합니다.
3. `node --test platform/video/tests/*.test.mjs`를 실행합니다.
4. `master` 반영 후 GitHub Pages workflow, 원격 hash, HTTP range, 실제 재생을 검증합니다.

이전 영상은 manifest history에 남겨 롤백 및 비교가 가능하도록 보존합니다.
