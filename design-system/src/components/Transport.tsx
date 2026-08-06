import type { CSSProperties } from 'react';
import { color, font, touch } from '../tokens';
import { btnReset } from '../internal';

export interface TransportProps {
  /** 단원 라벨 (예: 'Ⅰ 다면체') — 작은 대문자 느낌 표기 */
  unitLabel?: string;
  /** 챕터 라벨 (예: '1 · 정육면체 관찰') — Gowun Batang 700 */
  chapterLabel?: string;
  /** 재생 중이면 ■, 아니면 ▶ */
  playing?: boolean;
  /** 진행률 0–100 (amber-soft 진행바) */
  progress?: number;
  onPrev?: () => void;
  onPlay?: () => void;
  onNext?: () => void;
  onReset?: () => void;
  style?: CSSProperties;
}

/**
 * 트랜스포트 — 독 하단의 ink 알약 재생 컨트롤. 단원·챕터 라벨, 이전/다음(◀ ▶),
 * paper 원형 재생 버튼(▶/■), amber-soft 진행바, 시점 리셋(⟳)으로 구성된다.
 */
export function Transport({
  unitLabel,
  chapterLabel,
  playing,
  progress = 0,
  onPrev,
  onPlay,
  onNext,
  onReset,
  style,
}: TransportProps) {
  const roundBtn: CSSProperties = {
    ...btnReset,
    width: touch.minTarget,
    height: touch.minTarget,
    fontSize: 13,
    borderRadius: '50%',
    border: '1px solid rgba(247,244,236,.25)',
    background: 'transparent',
    color: color.paper,
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: color.ink,
        color: color.paper,
        borderRadius: 999,
        padding: '8px 14px',
        boxShadow: '0 16px 34px rgba(38,50,75,.3)',
        fontFamily: font.body,
        ...style,
      }}
    >
      <div style={{ minWidth: 120, textAlign: 'right' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.08em', color: 'rgba(247,244,236,.55)' }}>{unitLabel}</div>
        <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
          {chapterLabel}
        </div>
      </div>
      <button style={roundBtn} onClick={onPrev} aria-label="이전 챕터">
        ◀
      </button>
      <button
        style={{
          ...btnReset,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: color.paper,
          color: color.ink,
          fontSize: 17,
          boxShadow: '0 4px 12px rgba(0,0,0,.25)',
        }}
        onClick={onPlay}
        aria-label={playing ? '정지' : '재생'}
      >
        {playing ? '■' : '▶'}
      </button>
      <button style={roundBtn} onClick={onNext} aria-label="다음 챕터">
        ▶
      </button>
      <div style={{ width: 140, height: 5, borderRadius: 999, background: 'rgba(247,244,236,.22)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, progress))}%`,
            height: '100%',
            background: color.amberSoft,
            borderRadius: 999,
            transition: 'width .1s linear',
          }}
        />
      </div>
      <button style={{ ...roundBtn, fontSize: 15 }} onClick={onReset} aria-label="시점 리셋">
        ⟳
      </button>
    </div>
  );
}
