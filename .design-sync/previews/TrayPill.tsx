import { TrayPill } from '@tamgu/ui';

/** 최소화된 패널 하나 — 학습 노트 복원 알약 */
export const Single = () => (
  <div style={{ background: '#f7f4ec', padding: '18px 22px' }}>
    <TrayPill label="학습 노트" />
  </div>
);

/** 우측 트레이 — 최소화된 패널들이 세로로 쌓인 모습 */
export const Tray = () => (
  <div
    style={{
      background: '#f7f4ec',
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-end',
    }}
  >
    <TrayPill label="커리큘럼" />
    <TrayPill label="학습 노트" />
    <TrayPill label="컨트롤" />
  </div>
);
