# 00_ROUTING — Agent Context Router (READ THIS FIRST, THEN ONLY WHAT YOU NEED)

> 목적: zero-context agent가 최소 토큰으로 올바른 문서만 주입받게 한다.
> 규칙: 이 파일을 읽고, 아래 표에서 자기 task에 해당하는 문서 **만** 읽어라. 나머지는 열지 마라.

## Task → Doc 라우팅

| Task 유형 | 필수 문서 | 참조(필요시만) |
|---|---|---|
| 새 챕터/랩 추가 | 02_ARCHITECTURE, 07_DESIGN_TOKENS | 03 (스캐폴딩 붙일 때) |
| 3D/2D 엔진 수정 | 02_ARCHITECTURE §Engine | — |
| 스캐폴딩 branch 트리 작성/수정 | 03_SCAFFOLDING | 04 (스키마 영향 시) |
| LLM 힌트 연동 | 03_SCAFFOLDING §LLM-Adapter, 05_BACKEND §API | — |
| 추적 데이터/스키마 | 04_DATA_SCHEMA | 05 (저장 위치) |
| 백엔드/배포/인프라 | 05_BACKEND | 04 |
| 로드맵/우선순위 판단 | 06_ROADMAP | 01 |
| 브랜드/비주얼/카피 | 07_DESIGN_TOKENS, 01_VISION | — |
| 홈 화면/멀티 랩 네비 | 01_VISION §IA, 02_ARCHITECTURE §Shell | 07 |

## 불변 결정 (재논의 금지 — 근거는 01_VISION)

1. 플랫폼명 **「탐구랩」**, 개별 랩은 `{영역} 탐구랩` (파일럿: 입체 탐구랩). 영문 병기 `Tamgu Labs`.
2. 대상: 중1 자습생 + 1:1 지도 교사. 톤: 교과서적 정확·격식. 손글씨(Gaegu) 정체성 유지.
3. 프론트 = GitHub Pages 정적 배포. 백엔드 = Hostinger VPS Docker (LLM 프록시 + 추적 저장).
4. 추적 데이터는 **스캐폴딩 branch 경로 + 도달 깊이만** 수집. 그 외 이벤트 수집 금지.
5. 스캐폴딩: 수학적 판정은 100% deterministic 룰. LLM은 룰이 커버 못 하는 서술형 힌트만.
6. 스택: Vite + TypeScript + three.js. 챕터는 플러그인 계약(02 참조)으로 추가.
7. 백엔드 없이도 랩은 완전 동작해야 한다 (offline-first, 백엔드는 enhancement).

## 저장소 지도

```
/                  # GitHub Pages 루트 (빌드 산출물은 Actions가 배포)
├─ docs/           # 이 설계 문서 세트 (00~07)
├─ apps/shell/     # 홈 + 랩 로더 (계획)
├─ labs/solid/     # 입체 탐구랩 (파일럿, 계획)
├─ packages/       # engine-3d, engine-2d, scaffold, tokens (계획)
└─ server/         # VPS 백엔드 (별도 배포, 계획)
```

현재(마이그레이션 전) 실소스: `index.html`(번들), `src/lab-engine.js`, `src/p003-data.js`, `src/lab-app.dc.html`. Phase 1에서 위 구조로 이관 (06_ROADMAP).
