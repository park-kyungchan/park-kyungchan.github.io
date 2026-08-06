# 02_ARCHITECTURE — 프론트 구조

## 스택 (확정)
Vite + TypeScript + three.js(r160+로 승급), 프레임워크 무의존(vanilla TS + 경량 상태). GitHub Actions → Pages 배포.
근거: 플랫폼화(다수 랩·플러그인 계약)에는 타입 계약이 유지보수 비용을 지배함. 런타임 프레임워크는 3D 중심 앱에 이득이 작아 제외.

## 레이어
```
apps/shell           홈 + 라우터 + 랩 로더 + 플로팅 패널 시스템
labs/solid           입체 탐구랩: 챕터 9개 + 데이터
packages/engine-3d   three.js 래퍼 (현 lab-engine.js 이관·TS화)
packages/engine-2d   2D 인터랙티브 캔버스 (계약만 먼저, 구현은 후속)
packages/scaffold    스캐폴딩 런타임 (03)
packages/tracking    추적 클라이언트 (04)
packages/tokens      디자인 토큰 (07)
```

## 핵심 계약 (요약 시그니처)

### Lab
```ts
interface Lab {
  id: string;                 // "solid"
  meta: { title: string; grade: string; units: Unit[] };
  chapters: ChapterModule[];
}
```

### ChapterModule — 챕터 플러그인 계약. 새 챕터 = 이 인터페이스 구현 1파일.
```ts
interface ChapterModule {
  id: string; unitId: string; no: string; title: string;
  mount(ctx: ChapterCtx): ChapterInstance;   // 스테이지·패널에 콘텐츠 주입
  scaffoldTreeId?: string;                   // 03의 트리 참조
}
interface ChapterCtx {
  stage: Stage3D | Stage2D;                  // ← 3D/2D 공용 추상. 아래 참조
  panels: PanelHost;                         // note/board/dock 슬롯 등록
  play(steps: PlayStep[]): void;             // 단계형 모션 시퀀서 (현행 이식)
  scaffold: ScaffoldSession | null;
  data: LabData;                             // P003_DATA + EXACT (계약 유지)
}
```

### Stage 추상 (3D+2D 병행 기반, 사용자 확정)
```ts
interface StageBase {
  kind: "3d" | "2d";
  clear(): void; frame(): void; resetView(): void;
  onTick(cb: (dt: number) => void): void;
}
interface Stage3D extends StageBase { /* setPolyhedron, setLathe, showSection, addPath … 현 LabEngine API */ }
interface Stage2D extends StageBase { /* 계약만 Phase 4에서 확정. 구현 없음 */ }
```
셸·패널·플레이 시퀀서·스캐폴딩·추적은 StageBase에만 의존 → 2D 랩 추가 시 셸 무수정.

### PanelHost — 플로팅 패널 시스템 (현행 R010 동작 이관)
드래그/플링 숨김/최소화 트레이/더블탭은 셸 소유. 챕터는 슬롯에 콘텐츠만 공급:
`panels.note(content)`, `panels.board(svg | Stage2D)`, `panels.dock(controls[])`.

## 데이터 계약
- `P003_DATA`, `P003_R009_EXACT` 스키마는 **동결** (원본 repo 계약 유지, 사용자 확정). TS 타입만 씌운다.
- 전개도 확장(정다면체 5종 전 변형)은 `nets` 스키마의 **추가**로만 — 기존 필드 변경 금지. 생성 파이프라인은 06 Phase 3.

## 마이그레이션 원칙
- R010 산출물(lab-engine.js, 챕터 로직)은 재작성이 아니라 **TS 이관**. 동작 동일성을 챕터별 스냅샷으로 확인.
- 기존 `src/*.part` 바이트-동일성 빌드 체계는 `archive/legacy-r009/`로 이동, CI 게이트 제거.
