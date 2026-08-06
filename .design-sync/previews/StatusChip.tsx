import { StatusChip } from '@tamgu/ui';

/** 오일러 확인 단계 — 수식이 든 단계 라벨 */
export const EulerCheck = () => (
  <div style={{ background: '#f7f4ec', padding: '18px 22px' }}>
    <StatusChip>오일러 확인 · V−E+F = 2</StatusChip>
  </div>
);

/** 전개도 애니메이션 재생 중 알림 */
export const Unfolding = () => (
  <div style={{ background: '#f7f4ec', padding: '18px 22px' }}>
    <StatusChip>전개도를 펼치는 중</StatusChip>
  </div>
);
