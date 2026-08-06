import type { CSSProperties, ReactNode } from 'react';
import { color, font } from '../tokens';

export interface PaperStageProps {
  /** 무대 높이 (CSS 크기). 기본 '100%' — 부모에 높이를 주거나 px 값을 넘긴다. */
  height?: number | string;
  /** 28px 모눈 숨김 */
  hideGrid?: boolean;
  /** 비네트(가장자리 음영) 숨김 */
  hideVignette?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * 종이 무대 — 탐구랩 화면의 기본 배경. paper(#f7f4ec) 바탕 + 28px 모눈 + 은은한 비네트.
 * 랩의 모든 UI(패널·독·칩)는 이 무대 위에 얹힌다. 본문 폰트/잉크색이 여기서 상속된다.
 */
export function PaperStage({ height = '100%', hideGrid, hideVignette, children, style }: PaperStageProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: color.paper,
        fontFamily: font.body,
        color: color.ink,
        height,
        ...style,
      }}
    >
      {!hideGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `linear-gradient(${color.grid} 1px,transparent 1px),linear-gradient(90deg,${color.grid} 1px,transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      )}
      {!hideVignette && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 42%,transparent 55%,rgba(38,50,75,0.05) 100%)',
          }}
        />
      )}
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  );
}
