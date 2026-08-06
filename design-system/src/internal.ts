import type { CSSProperties } from 'react';
import { color } from './tokens';

/** 패널·카드 공통 테두리 */
export const BORD = `1px solid ${color.panelBorder}`;

/** 버튼 공통 리셋 (셸의 btn 헬퍼와 동일) */
export const btnReset: CSSProperties = {
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/** 패널 헤더의 30×30 사각 버튼 (최소화 –, 접기 ▾/▸) */
export const headerBtn: CSSProperties = {
  ...btnReset,
  width: 30,
  height: 30,
  background: 'rgba(38,50,75,.06)',
  borderRadius: 8,
  color: color.ink,
};
