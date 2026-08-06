import type { CSSProperties } from 'react';
import { color, font } from '../tokens';

export interface LabSelectOption {
  id: string;
  name: string;
}

export interface LabSelectGroup {
  label: string;
  opts: LabSelectOption[];
}

export interface LabSelectProps {
  /** optgroup 단위 옵션 (예: 정다면체/각기둥/각뿔 그룹) */
  groups?: LabSelectGroup[];
  /** 그룹 없는 평면 옵션 목록 — groups가 없을 때 사용 */
  options?: LabSelectOption[];
  value?: string;
  onChange?: (id: string) => void;
  style?: CSSProperties;
}

/**
 * 랩 셀렉트 — 독의 대상 선택 드롭다운 (예: 입체도형 선택). 종이색 배경, radius 10,
 * optgroup으로 계열을 묶는다.
 */
export function LabSelect({ groups, options, value, onChange, style }: LabSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      style={{
        border: '1px solid rgba(38,50,75,.2)',
        background: 'rgba(247,244,236,.9)',
        color: color.ink,
        borderRadius: 10,
        padding: '8px 10px',
        fontSize: 13,
        maxWidth: 210,
        cursor: 'pointer',
        fontFamily: font.body,
        ...style,
      }}
    >
      {groups
        ? groups.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.opts.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          ))
        : options?.map(o => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
    </select>
  );
}
