import type { CSSProperties } from 'react';
import { font } from '../tokens';

export interface LabSliderProps {
  /** 좌측 라벨 (예: '회전각') */
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  style?: CSSProperties;
}

/**
 * 랩 슬라이더 — 독의 연속값 컨트롤. 150px 트랙에 amber(#b97a2e) 액센트.
 */
export function LabSlider({ label, min = 0, max = 100, step = 1, value, onChange, style }: LabSliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: font.body, ...style }}>
      {label && (
        <span style={{ fontSize: 11.5, color: 'rgba(38,50,75,.6)', whiteSpace: 'nowrap' }}>{label}</span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange?.(parseFloat(e.target.value))}
        style={{ width: 150, accentColor: '#b97a2e' }}
      />
    </div>
  );
}
