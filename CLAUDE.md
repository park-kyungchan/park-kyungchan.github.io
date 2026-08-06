# CLAUDE.md — 탐구랩 (Tamgu Labs)

중학교 수학 인터랙티브 기하 플랫폼. 빌드리스 ES 모듈 (`platform/`이 앱 전체). 아키텍처·계약은 **docs/00_ROUTING.md**부터 읽을 것.

## 실행·검증 레시피 (세션 검증된 것만)

- **데이터 모듈을 node로 import할 때**: 파일이 `window.*` 할당을 포함하므로 심이 필요하다.
  ```js
  globalThis.window = globalThis;
  const { P003_DATA, P003_R009_EXACT } = await import('./platform/labs/solid/data/p003-data.js');
  ```
- **로컬 서빙**: 정적 서버는 `/`를 index.html로 매핑하지 않는다 — 반드시 `/index.html#/solid/<chapterId>`로 접근. three.js는 CDN 로드(네트워크 필요).
- **E2E(playwright)**: 패키지는 `.ds-sync/node_modules`에 있음 — `createRequire('<repo>/.ds-sync/')` 트릭으로 로드. 브라우저는 시스템 Chrome을 playwright 기대 경로에 심링크해 사용:
  `~/.cache/ms-playwright/chromium_headless_shell-<build>/chrome-headless-shell-linux64/chrome-headless-shell → /usr/bin/google-chrome`
  (playwright 버전이 바뀌면 `<build>` 번호가 바뀌므로 에러 메시지의 경로로 재생성). favicon 404 콘솔 오류는 무해한 기존 동작.
- **정확값 데이터 수정 금지 원칙**: `p003-data.js`의 수치는 손으로 고치지 말 것. `tools/generate-*.mjs` 생성기(수치 검증 내장, `--write`로 삽입, 기존 항목 바이트 보존) 패턴을 따른다. 기존 예: `generate-platonic-nets.mjs`, `generate-shortest-paths.mjs`.

## 배포 (GitHub Pages)

- **Actions 모드 확정** (2026-08-06): `deploy.yml`이 `platform/`을 사이트 루트로 배포. master 머지 = 자동 배포. **Settings의 Pages 소스를 legacy(브랜치)로 되돌리지 말 것** — legacy는 저장소 루트를 Jekyll로 빌드해 앱을 덮어쓴다.
- 배포 상태 확인: `gh api repos/park-kyungchan/park-kyungchan.github.io/pages` (build_type이 `workflow`여야 정상).
- 배포 실패가 "10분 무음 후 타임아웃" 패턴이면 Pages 백엔드 큐 문제 — 재시도 남발보다 큐 해소 대기가 빠르다.
- 라이브 검증: `https://park-kyungchan.github.io/labs/...` (platform이 루트).

## git / gh

- `gh`는 `~/.local/bin/gh` (기본 PATH에 없음): `export PATH="$HOME/.local/bin:$PATH"` 선행.
- PR 관례: 브랜치 → PR(한국어 본문) → `gh pr merge --merge --delete-branch`.

## 디자인 시스템 / 브랜드

- `design-system/`(@tamgu/ui React 14종)은 claude.ai/design 동기화 전용 — 배포되지 않음. 셸(`platform/apps/shell/main.js`) 스타일을 바꾸면 design-system을 **수동으로** 맞춰야 한다 (드리프트 자동 감지 없음). 재동기화 절차는 `.design-sync/NOTES.md`.
- 브랜드 금지 (docs/07): 그라데이션 배경 · 이모지 · 토큰 외 신규 컬러 · 본문에 손글씨(Gaegu는 브랜드·탐구 질문·칩 전용).
