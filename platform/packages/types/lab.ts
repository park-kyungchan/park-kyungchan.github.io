// 핵심 계약 — docs/02_ARCHITECTURE.md 준거. 이 파일이 계약의 단일 출처.
export interface Unit { id: string; numeral: string; title: string }

export interface LabMeta {
  id: string;               // "solid"
  title: string;            // "입체 탐구랩"
  grade: string;            // "중1 · 2학기"
  units: Unit[];
}
export interface Lab {
  meta: LabMeta;
  chapters: ChapterModule[];
}

export interface StageBase {
  kind: '3d' | '2d';
  clear(): void;
  frame(pad?: number): void;
  resetView(): void;
  onTick: ((dt: number) => void) | null;
}
// Stage3D = LabEngine 표면 (packages/engine-3d/index.d.ts). Stage2D는 Phase 4에서 동결.
export interface Stage2D extends StageBase { kind: '2d' }

export interface PlayPhase { until: number; label: string }
export interface PlayStep {
  dur: number;
  phases?: PlayPhase[];
  ease?: (p: number) => number;
  onU?: (pe: number, p: number) => void;
  onDone?: () => void;
}

export interface DockControl {
  type: 'select' | 'seg' | 'chip' | 'slider' | 'readout';
  [k: string]: unknown;     // 챕터별 파라미터 — shell/dock.ts에서 렌더
}
export interface NoteContent {
  kicker: string; title: string;
  stats: { k: string; v: string | number }[];
  body: string; question: string; answer: string;
}
export interface PanelHost {
  note(content: NoteContent): void;
  board(title: string, caption: string, el: SVGElement | HTMLElement | null): void;
  dock(controls: DockControl[]): void;
}

export interface ChapterCtx {
  stage: StageBase;         // 실제로는 Stage3D — 챕터가 kind 확인 후 캐스트
  panels: PanelHost;
  play(steps: PlayStep[]): void;
  stop(): void;
  data: Record<string, unknown>;  // P003_DATA + P003_R009_EXACT
}
export interface ChapterInstance {
  dispose(): void;
}
export interface ChapterModule {
  id: string; unitId: string; no: string; title: string;
  scaffoldTreeId?: string;
  mount(ctx: ChapterCtx): ChapterInstance;
}
