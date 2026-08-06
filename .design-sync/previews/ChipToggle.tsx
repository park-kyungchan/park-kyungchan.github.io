import { ChipToggle } from '@tamgu/ui';

/** 꺼짐 — 종이색 알약 */
export const Off = () => <ChipToggle label="단면 표시" />;

/** 켜짐 — amber 테두리 + 연한 amber 배경 */
export const On = () => <ChipToggle label="단면 표시" active />;

/** 독 안에서 쓰이는 조합 — 켜짐 하나 + 꺼짐 둘 */
export const Group = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <ChipToggle label="단면 표시" active />
    <ChipToggle label="전개도 펼치기" />
    <ChipToggle label="회전축 표시" />
  </div>
);
