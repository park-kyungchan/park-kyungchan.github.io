# Video homepage

`https://park-kyungchan.github.io/`에서 전체 화면 영상이 자동 재생됩니다.
브라우저 자동재생 정책 때문에 음소거로 시작하며, 화면 아래 버튼으로 소리를 켤 수 있습니다.

## 영상 품질 업데이트

1. 새 MP4를 `media/`에 버전이 포함된 이름으로 추가합니다. 예: `launch-2026-09-4k.mp4`
2. `media/manifest.json`의 `src`를 새 파일 경로로 변경합니다.
3. `version` 값도 함께 올린 뒤 `master`에 반영합니다.

HTML은 변경할 필요가 없습니다. 이전 파일을 남겨두면 manifest만 되돌려 즉시 롤백할 수 있습니다.
GitHub 단일 파일 제한 때문에 MP4는 100MB 미만이어야 합니다. 그보다 큰 영상은 외부 영상 CDN 사용을 권장합니다.

## 이전 사이트

전체 이전 사이트는 아래 원격 참조에 보존되어 있습니다.

- branch: `archive/pre-video-home-2026-08-16`
- tag: `archive-pre-video-home-2026-08-16`
