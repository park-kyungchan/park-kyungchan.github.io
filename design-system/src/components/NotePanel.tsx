import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { color, font, panel } from '../tokens';
import { btnReset } from '../internal';
import { FloatingPanel } from './FloatingPanel';

export interface NoteStat {
  /** 항목 이름 (예: '면') */
  k: string;
  /** 값 (예: '6') */
  v: string;
}

export interface NotePanelProps {
  /** 킥커 — 단원 맥락 라벨. accent색 11px 대문자 느낌 (예: 'Ⅰ. 다면체 · 01') */
  kicker: string;
  /** 노트 제목 — Gowun Batang 700 20px (예: '정육면체 관찰') */
  title: string;
  /** 수치 요약 칩 목록 (예: [{k:'면',v:'6'},{k:'꼭짓점',v:'8'}]) */
  stats?: NoteStat[];
  /** 본문 — 13.5px/1.7 교과서체 설명 */
  children?: ReactNode;
  /** 탐구 질문 — Gaegu 손글씨 19px로 렌더된다 */
  question?: ReactNode;
  /** 풀이 내용 — '풀이 보기' 버튼으로 토글되는 amber 박스 */
  answer?: ReactNode;
  /** 풀이를 처음부터 펼친 상태로 시작 */
  defaultAnswerShown?: boolean;
  /** 감싸는 패널 제목. 기본 '학습 노트' */
  panelTitle?: string;
  /** 패널 폭. 기본 330 */
  width?: number;
  /** 최소화(–) 버튼 동작 */
  onMinimize?: () => void;
  style?: CSSProperties;
}

/**
 * 학습 노트 패널 — 챕터의 개념 설명 카드. 킥커 + 제목 + 수치 칩 + 본문 + 점선 구분선 아래
 * 손글씨 '탐구 질문' + '풀이 보기' 토글로 구성된다. FloatingPanel('학습 노트')을 감싸서 렌더된다.
 */
export function NotePanel({
  kicker,
  title,
  stats,
  children,
  question,
  answer,
  defaultAnswerShown,
  panelTitle = '학습 노트',
  width = 330,
  onMinimize,
  style,
}: NotePanelProps) {
  const [shown, setShown] = useState(!!defaultAnswerShown);
  return (
    <FloatingPanel title={panelTitle} width={width} onMinimize={onMinimize} style={style}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: color.accent }}>{kicker}</div>
      <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, lineHeight: 1.3, padding: '4px 0 10px' }}>
        {title}
      </div>
      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 10 }}>
          {stats.map(s => (
            <div
              key={s.k}
              style={{
                border: '1px solid rgba(38,50,75,.16)',
                borderRadius: 8,
                padding: '3px 9px',
                fontSize: 12,
                background: 'rgba(247,244,236,.85)',
                display: 'flex',
                gap: 5,
                alignItems: 'baseline',
              }}
            >
              <span style={{ color: 'rgba(38,50,75,.58)' }}>{s.k}</span>
              <b>{s.v}</b>
            </div>
          ))}
        </div>
      )}
      {children && (
        <div style={{ fontSize: 13.5, lineHeight: 1.7, textWrap: 'pretty' } as CSSProperties}>{children}</div>
      )}
      {question && (
        <div style={{ marginTop: 12, borderTop: '2px dashed rgba(38,50,75,.2)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: color.amber, paddingBottom: 2 }}>
            탐구 질문
          </div>
          <div style={{ fontFamily: font.brand, fontSize: 19, lineHeight: 1.45 }}>{question}</div>
        </div>
      )}
      {answer != null && (
        <>
          <button
            style={{
              ...btnReset,
              border: '1px solid rgba(38,50,75,.2)',
              background: 'rgba(255,255,253,.9)',
              color: color.ink,
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 500,
              marginTop: 10,
            }}
            onClick={() => setShown(s => !s)}
          >
            {shown ? '풀이 접기' : '풀이 보기'}
          </button>
          {shown && (
            <div
              style={{
                marginTop: 8,
                background: 'rgba(217,160,91,.13)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.65,
                animation: panel.chipIn,
                textWrap: 'pretty',
              } as CSSProperties}
            >
              {answer}
            </div>
          )}
        </>
      )}
    </FloatingPanel>
  );
}
