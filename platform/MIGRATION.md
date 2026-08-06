# MIGRATION — Phase 1 이관 지시서 (Claude Code용, zero-context 전제)

## 환경 분담 (중요)
Claude Code(CLI)가 개발 주체이며, Claude Design은 /design-sync(또는 claude-design MCP)로 **필요할 때마다 호출하는 상시 브리지**다:
- **pull**: 이 디자인 프로젝트의 `platform/`·`docs/`를 repo로 (plan 승인, 컴포넌트 단위)
- **push**: CLI에서 수정·추가한 코드를 캔버스로 되돌려 시각 검증·직접 편집 후 다시 pull — 특히 UI가 걸린 변경(패널·챕터 화면·모션)은 push→캔버스 확인을 기본 루프로
- 현재 `platform/` 전체(셸+9챕터)는 캔버스에서 브라우저 동작 검증 완료 상태 — 첫 pull 시 재작성·재구현 금지
- CLI 전담: 커밋·PR·Pages 배포, deploy.yml → `.github/workflows/` 이동, legacy 정리(P1-S6), 실행 환경 필수 Phase(5: VPS 백엔드)


> 선행: `docs/00_ROUTING.md` → Task "새 챕터/랩 추가"/"3D/2D 엔진 수정" 라우팅 준수.
> 목표: `platform/`을 R010과 동작 동일한 상태로 완성 (Phase 1 DoD — docs/06_ROADMAP.md).

## 소스 오브 트루스
| 대상 | 파일 | 상태 |
|---|---|---|
| 3D 엔진 | `packages/engine-3d/lab-engine.js` | ✅ 동작 검증본. **재작성 금지**, 점진 TS화만 |
| 데이터 | `labs/solid/data/p003-data.js` | ✅ 스키마 동결 |
| 셸+9챕터 로직 | `handoff/src/lab-app.dc.html` (repo의 R010 핸드오프) | 이관 원본 — 아래 단계로 분해 |
| 계약 | `packages/types/lab.ts` | ✅ 단일 출처. 변경 시 docs/02 개정 필요 |
| 레퍼런스 챕터 | `labs/solid/chapters/explorer.ts` | ✅ 이관 표본 — 이 패턴을 복제하라 |

## 작업 단계 (순서 고정)

### P1-S1. 부트 확인
`npm i && npm run dev` → 홈 스켈레톤과 `#/solid` 스텁이 뜨는지. `deploy.yml`을 repo 루트 `.github/workflows/`로 이동.

### P1-S2. PlayStep 시퀀서
DC 소스의 `_tick/playSteps/stopPlay/easeIO`를 `apps/shell/player.ts`로 이관 (계약: `ChapterCtx.play/stop`). motionScale 반영(`dur * mf`), phaseLabel 칩·progress는 S3의 독이 구독.

### P1-S3. PanelHost = R010 플로팅 패널 시스템
DC 소스의 template(4개 패널 + 트레이) + 로직(`wrap/_dragStart/dragMove/dragEnd/minimizePanel/restorePanel/togglePanel`)을 `apps/shell/panels.ts`로 이관.
- 동작 사양: 드래그 이동, 헤더 더블탭·`–` 버튼 = 최소화, 플링(속도>900px/s)·화면 밖 드래그 = 숨김, 우측 트레이 알약 복원, 접기(▾/▸)
- 스타일 값은 전부 `@tokens` 참조. DoD: 터치 타깃 44px 상향(docs/07)
- 독의 DockControl 렌더러(select/seg/chip/slider/readout)도 여기 구현 — explorer.ts가 이미 이 타입으로 발행 중

### P1-S4. 챕터 8종 이관 — ✅ 완료 (전 9챕터 + _dummy 구현·등록됨. S2·S3도 main.js에 구현 완료)
DC 소스 `enterChapter/buildPlay/renderVals`의 챕터 분기를 explorer.ts 패턴으로 1파일씩:
`generator`(+칠판 SVG 각 패치), `euler`, `net`(+칠판 전개도 SVG·면 매칭), `section`(13 프리셋+clip), `revolution`(+칠판 프로필 SVG·스윕), `revsection`, `soccer`, `geodesic`(+칠판 전개도 비교).
칠판 SVG는 DC의 `boardSvg()` React.createElement → 순수 DOM/SVG 생성으로 변환.

### P1-S5. 동작 동일성 체크리스트 (DoD ①)
챕터별로: 진입 시 기본 입체 표시 / 재생 시퀀스 완주 / 컨트롤 전 항목 반응 / 칠판·노트 내용 일치 / 뷰 리셋·자동 궤도. R010 배포본(index.html)과 나란히 비교.

### P1-S6. 정리
`src/*.part`·`build.py`·CI 바이트 게이트 → `archive/legacy-r009/`. README 갱신. `_dummy` 챕터는 유지(Phase 4까지 계약 감시용).

## 금지사항
- lab-engine.js 재작성, p003-data 스키마 변경, 챕터 간 직접 import, 토큰 하드코딩(hex 직접 기입), 손글씨 폰트 본문 사용.
