import type { CSSProperties } from 'react';
import { color, font, panel } from '../tokens';
import { btnReset } from '../internal';

export interface TrayPillProps {
  /** 알약 라벨 — 최소화된 패널 이름 (예: '학습 노트') */
  label: string;
  /** 클릭 시 해당 패널 복원 */
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * 트레이 알약 — 최소화(또는 화면 밖으로 플링)된 패널·독을 복원하는 ink 알약 버튼.
 * 화면 우측 트레이에 세로로 쌓이며, Gaegu 손글씨 15px, chipIn 등장 모션.
 */
export function TrayPill({ label, onClick, style }: TrayPillProps) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnReset,
        background: color.ink,
        color: color.paper,
        borderRadius: 999,
        padding: '9px 16px',
        fontFamily: font.brand,
        fontWeight: 700,
        fontSize: 15,
        boxShadow: '0 10px 24px rgba(38,50,75,.3)',
        animation: panel.chipIn,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
