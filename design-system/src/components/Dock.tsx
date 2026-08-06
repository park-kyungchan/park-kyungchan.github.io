import type { CSSProperties, ReactNode } from 'react';
import { color, font, panel } from '../tokens';
import { BORD, headerBtn } from '../internal';

export interface DockProps {
  /** 컨트롤 행 내용 — SegmentedControl · ChipToggle · LabSlider · LabSelect 등 */
  children?: ReactNode;
  /** 우측 읽기값 (예: 'V − E + F = 2') — amber-brown 12.5px 700 */
  readout?: string;
  /** 최소화(–) 버튼 동작 — TrayPill('컨트롤')로 복원하는 앱 동작에 연결 */
  onMinimize?: () => void;
  /** 드래그 그립(⠿) 숨김 */
  hideGrip?: boolean;
  /** 하단 트랜스포트 — 보통 <Transport …/> */
  transport?: ReactNode;
  style?: CSSProperties;
}

/**
 * 독 — 화면 하단 중앙의 컨트롤 허브. 위에는 반투명 알약 컨트롤 행(그립 ⠿ + 최소화 +
 * 컨트롤들 + 읽기값), 아래에는 ink 트랜스포트 알약이 세로로 쌓인다. floatIn 0.6s 등장.
 */
export function Dock({ children, readout, onMinimize, hideGrip, transport, style }: DockProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        animation: panel.floatIn.replace('0.5s', '0.6s'),
        fontFamily: font.body,
        color: color.ink,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(255,255,253,.94)',
          backdropFilter: `blur(${panel.blur}px)`,
          WebkitBackdropFilter: `blur(${panel.blur}px)`,
          border: BORD,
          borderRadius: 999,
          padding: '8px 16px 8px 10px',
          boxShadow: '0 14px 34px rgba(38,50,75,.18)',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 'min(92vw,880px)',
        }}
      >
        {!hideGrip && (
          <span
            style={{
              cursor: 'grab',
              color: 'rgba(38,50,75,.4)',
              fontSize: 15,
              padding: '6px 4px',
              userSelect: 'none',
              letterSpacing: -2,
            }}
          >
            ⠿
          </span>
        )}
        {onMinimize && (
          <button style={{ ...headerBtn, fontSize: 14, flex: 'none' }} onClick={onMinimize} aria-label="독 최소화">
            –
          </button>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
        {readout && (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a5a1d', whiteSpace: 'nowrap' }}>{readout}</span>
        )}
      </div>
      {transport}
    </div>
  );
}
