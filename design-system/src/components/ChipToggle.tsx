import type { CSSProperties } from 'react';
import { color, font } from '../tokens';
import { btnReset } from '../internal';

export interface ChipToggleProps {
  label: string;
  /** 켜짐 상태 — amber 테두리 + 연한 amber 배경 + 갈색 글자 */
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * 칩 토글 — 독의 온/오프 옵션 알약 (예: '단면 표시', '전개도'). 꺼짐은 종이색 알약,
 * 켜짐은 amber 강조.
 */
export function ChipToggle({ label, active, onClick, style }: ChipToggleProps) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnReset,
        border: `1px solid ${active ? color.amber : 'rgba(38,50,75,.2)'}`,
        background: active ? 'rgba(217,160,91,.2)' : 'rgba(247,244,236,.9)',
        color: active ? '#8a5a1d' : color.ink,
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 12.5,
        fontWeight: active ? 700 : 400,
        whiteSpace: 'nowrap',
        fontFamily: font.body,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
