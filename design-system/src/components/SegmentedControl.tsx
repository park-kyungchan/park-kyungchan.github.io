import type { CSSProperties } from 'react';
import { color, font } from '../tokens';
import { btnReset } from '../internal';

export interface SegmentedOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  /** 좌측 라벨 (예: '모드') */
  label?: string;
  options: SegmentedOption[];
  /** 선택된 옵션 id — ink 배경 알약으로 강조 */
  value?: string;
  onChange?: (id: string) => void;
  style?: CSSProperties;
}

/**
 * 세그먼트 컨트롤 — 독의 모드 전환 알약 그룹. 회색 트랙 안에 옵션 알약이 놓이고
 * 선택된 항목은 ink 배경 + paper 글자 + 굵은 글씨.
 */
export function SegmentedControl({ label, options, value, onChange, style }: SegmentedControlProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font.body, ...style }}>
      {label && (
        <span style={{ fontSize: 11.5, color: 'rgba(38,50,75,.6)', whiteSpace: 'nowrap' }}>{label}</span>
      )}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(38,50,75,.07)', borderRadius: 999, padding: 3 }}>
        {options.map(o => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              disabled={o.disabled}
              onClick={o.disabled ? undefined : () => onChange?.(o.id)}
              style={{
                ...btnReset,
                borderRadius: 999,
                padding: '7px 12px',
                fontSize: 12.5,
                fontWeight: active ? 700 : 400,
                background: active ? color.ink : 'transparent',
                color: o.disabled ? 'rgba(38,50,75,.3)' : active ? color.paper : color.ink,
                whiteSpace: 'nowrap',
                cursor: o.disabled ? 'default' : 'pointer',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
