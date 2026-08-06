import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { color, font, panel } from '../tokens';
import { BORD, headerBtn } from '../internal';

export interface FloatingPanelProps {
  /** 패널 제목 — Gowun Batang 700 15px (예: '커리큘럼', '학습 노트', '칠판') */
  title: string;
  /** 카드 폭(px). 셸 관례: 커리큘럼 250 · 학습 노트 330 · 칠판 312 */
  width?: number;
  /** 처음부터 본문을 접은 상태(▸)로 시작 */
  defaultCollapsed?: boolean;
  /** 최소화(–) 버튼 클릭 — 패널을 숨기고 TrayPill로 복원하는 앱 동작에 연결 */
  onMinimize?: () => void;
  /** 본문 패딩. 셸 관례: 노트 '12px 18px 16px' · 커리큘럼 '2px 10px 12px' · 칠판 '6px 14px 14px' */
  bodyPadding?: string;
  /** 본문 추가 스타일 (예: maxHeight + overflowY) */
  bodyStyle?: CSSProperties;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * 플로팅 패널 — 탐구랩 UI의 기본 컨테이너. 반투명 흰 카드(blur 14px), radius 16,
 * floatIn 등장 모션. 헤더에 제목·최소화(–)·접기(▾/▸) 버튼이 있고, 접기는 내부 상태로 동작한다.
 * 무대(PaperStage) 위에 절대 위치로 띄워 쓰는 것이 관례.
 */
export function FloatingPanel({
  title,
  width = 330,
  defaultCollapsed,
  onMinimize,
  bodyPadding = '12px 18px 16px',
  bodyStyle,
  children,
  style,
}: FloatingPanelProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <div
      style={{
        width,
        background: color.panelBg,
        backdropFilter: `blur(${panel.blur}px)`,
        WebkitBackdropFilter: `blur(${panel.blur}px)`,
        border: BORD,
        borderRadius: panel.radius,
        boxShadow: panel.shadow,
        overflow: 'hidden',
        animation: panel.floatIn,
        fontFamily: font.body,
        color: color.ink,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 10px 10px 14px',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15, flex: 1 }}>{title}</span>
        {onMinimize && (
          <button style={{ ...headerBtn, fontSize: 14 }} onClick={onMinimize} aria-label="최소화">
            –
          </button>
        )}
        <button
          style={{ ...headerBtn, fontSize: 13 }}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? '접기' : '펼치기'}
        >
          {open ? '▾' : '▸'}
        </button>
      </div>
      <div
        style={{
          borderTop: '1px solid rgba(38,50,75,.08)',
          display: open ? undefined : 'none',
          padding: bodyPadding,
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
