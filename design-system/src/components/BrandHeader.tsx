import type { CSSProperties } from 'react';
import { color, font } from '../tokens';

export interface BrandHeaderProps {
  /** 랩 이름 — Gaegu 손글씨 워드마크 (예: '입체 탐구랩') */
  title: string;
  /** 보조 라벨 (예: '탐구랩 · 중1') */
  subtitle?: string;
  style?: CSSProperties;
}

/**
 * 브랜드 헤더 — 랩 화면 좌상단의 워드마크. Gaegu 700 손글씨 제목 + 작은 보조 라벨이
 * 베이스라인 정렬로 나란히 놓인다. 손글씨는 브랜드 표기와 탐구 질문에만 쓴다.
 */
export function BrandHeader({ title, subtitle, style }: BrandHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, color: color.ink, ...style }}>
      <div style={{ fontFamily: font.brand, fontWeight: 700, fontSize: 27, lineHeight: 1 }}>{title}</div>
      {subtitle && (
        <div style={{ fontFamily: font.body, fontSize: 11.5, letterSpacing: '.05em', color: 'rgba(38,50,75,.6)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
