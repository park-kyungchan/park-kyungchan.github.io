import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { color, font, panel } from '../tokens';
import { BORD } from '../internal';

export interface HomeCardProps {
  /** 랩 이름 — Gowun Batang 700 20px (예: '입체 탐구랩') */
  title: string;
  /** 설명 줄 (예: '중1 · 2학기 입체도형 · 9개 챕터') */
  description?: ReactNode;
  /** 이동 링크 (예: '#/solid') */
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  style?: CSSProperties;
}

/**
 * 홈 카드 — 플랫폼 홈에서 각 랩으로 진입하는 링크 카드. 패널과 같은 반투명 카드 스타일
 * (radius 16, floatIn)에 제목 + 설명 한 줄.
 */
export function HomeCard({ title, description, href, onClick, style }: HomeCardProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        display: 'block',
        border: BORD,
        borderRadius: panel.radius,
        padding: '22px 30px',
        textDecoration: 'none',
        color: color.ink,
        background: color.panelBg,
        boxShadow: panel.shadow,
        animation: panel.floatIn,
        fontFamily: font.body,
        ...style,
      }}
    >
      <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: 'rgba(38,50,75,.6)', marginTop: 4 }}>{description}</div>
      )}
    </a>
  );
}
