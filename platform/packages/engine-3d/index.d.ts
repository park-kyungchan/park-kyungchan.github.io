import type { StageBase } from '../types/lab';
// R010 lab-engine.js의 타입 표면. 구현은 lab-engine.js (동작 검증본 — 재작성 금지, 점진 TS화만 허용)
export interface Solid {
  vertices: number[][];
  faces: number[][];
  topology?: { edges: number[][]; V: number; E: number; F: number; euler?: number };
}
export interface ProfileComponent {
  kind?: 'circle' | 'semicircle' | 'dome' | 'polygon';
  points?: number[][]; center?: number[]; radius?: number; base_y?: number; samples?: number;
}
export interface Profile { components: ProfileComponent[] }

export declare class LabEngine implements StageBase {
  constructor(container: HTMLElement);
  kind: '3d';
  autoOrbit: boolean;
  onTick: ((dt: number) => void) | null;
  solidScale: number;
  faceMeshes: unknown[]; edgeMeshes: unknown[]; vertMeshes: unknown[];
  clear(): void; clearSolid(): void; clearOverlays(): void; clearSection(): void;
  dispose(): void;
  setPolyhedron(solid: Solid, opts?: { radius?: number; faceColor?: (i: number, sides: number) => number }): void;
  setLathe(profile: Profile, sweepDeg: number, opts?: { noPop?: boolean }): void;
  setLatheSweep(sweepDeg: number): void;
  highlightFace(i: number, on: boolean, color?: number): void;
  highlightEdge(i: number, on: boolean): void;
  highlightVertex(i: number, on: boolean): void;
  setFaceDim(i: number, dim: boolean): void;
  clearHighlights(): void;
  projRange(n: number[]): [number, number];
  showSection(n: number[], d: number, opts?: { clip?: boolean; plane?: boolean; planeSize?: number }): { loops: number; sides: number };
  addPath(pts: unknown[], opts?: { color?: number; r?: number }): unknown;
  addDot(p: unknown, color?: number, r?: number): unknown;
  removeOverlay(o: unknown): void;
  popIn(): void;
  frame(pad?: number): void;
  resetView(): void;
}
