import type { CSSProperties } from 'react';
import { color, font } from '../tokens';
import { btnReset } from '../internal';

export interface CurriculumUnit {
  id: string;
  /** 로마 숫자 단원 표기 (예: 'Ⅰ') — Gowun Batang, accent색 */
  numeral: string;
  title: string;
}

export interface CurriculumChapter {
  id: string;
  /** 챕터 번호 (예: '1') */
  no: string | number;
  title: string;
  unitId: string;
}

export interface CurriculumListProps {
  units: CurriculumUnit[];
  chapters: CurriculumChapter[];
  /** 현재 선택된 챕터 id — ink 배경으로 강조된다 */
  currentId?: string;
  onSelect?: (id: string) => void;
  style?: CSSProperties;
}

/**
 * 커리큘럼 목록 — 단원(로마 숫자 Ⅰ·Ⅱ·Ⅲ) 아래 챕터 버튼이 쌓이는 내비게이션.
 * 현재 챕터는 ink 배경 + paper 글자로 강조. FloatingPanel('커리큘럼', width 250,
 * bodyPadding '2px 10px 12px') 안에 넣는 것이 관례.
 */
export function CurriculumList({ units, chapters, currentId, onSelect, style }: CurriculumListProps) {
  return (
    <div style={{ fontFamily: font.body, color: color.ink, ...style }}>
      {units.map(u => (
        <div key={u.id} style={{ paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 8px 5px' }}>
            <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 13.5, color: color.accent }}>
              {u.numeral}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.07em' }}>{u.title}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {chapters
              .filter(c => c.unitId === u.id)
              .map(ch => {
                const active = ch.id === currentId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelect?.(ch.id)}
                    style={{
                      ...btnReset,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 10,
                      padding: '9px 10px',
                      fontSize: 13,
                      fontWeight: active ? 700 : 400,
                      color: active ? color.paper : color.ink,
                      background: active ? color.ink : 'transparent',
                      transition: 'background .18s,color .18s',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: font.heading,
                        fontWeight: 700,
                        fontSize: 11.5,
                        color: active ? 'rgba(247,244,236,.6)' : color.accent,
                        minWidth: 18,
                      }}
                    >
                      {ch.no}
                    </span>
                    <span>{ch.title}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
