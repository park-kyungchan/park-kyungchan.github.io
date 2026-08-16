# 탐구Lab Hub

`https://park-kyungchan.github.io/`의 첫 화면에는 서로 독립된 두 진입점이 있습니다.

- 입체도형 탐구 Lab
- 수학교육 영상

## 수학교육 영상 품질 업데이트

1. 새 MP4를 `platform/video/media/`에 버전이 포함된 이름으로 추가합니다.
2. `platform/video/media/manifest.json`의 `src`를 새 파일명으로 변경합니다.
3. `version` 값도 함께 올린 뒤 `master`에 반영합니다.

영상 페이지 HTML은 변경할 필요가 없고, 이전 MP4를 남겨두면 manifest만 되돌려 롤백할 수 있습니다.
GitHub 단일 파일 제한 때문에 MP4는 100MB 미만이어야 합니다.

## 이전 사이트 보존본

- branch: `archive/pre-video-home-2026-08-16`
- tag: `archive-pre-video-home-2026-08-16`
