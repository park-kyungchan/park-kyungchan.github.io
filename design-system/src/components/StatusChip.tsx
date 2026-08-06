import type { CSSProperties, ReactNode } from 'react';
import { color, font, panel } from '../tokens';

export interface StatusChipProps {
  /** 칩 내용 — 재생 단계 라벨 (예: '전개도를 펼치는 중') */
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * 상태 알림 칩 — 애니메이션 재생 단계를 알리는 ink 배경 알약. 화면 상단 중앙에 띄우며
 * Gaegu 손글씨 20px, chipIn 등장 모션을 쓴다.
 */
export function StatusChip({ children, style }: StatusChipProps) {
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: font.brand,
        fontWeight: 700,
        fontSize: 20,
        background: color.ink,
        color: color.paper,
        padding: '7px 20px 8px',
        borderRadius: 999,
        boxShadow: '0 10px 26px rgba(38,50,75,.3)',
        animation: panel.chipIn,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
