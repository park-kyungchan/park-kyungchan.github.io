import { HomeCard } from '@tamgu/ui';

/** 플랫폼 홈의 실제 카드 — 입체 탐구랩 진입 링크 */
export const SolidLab = () => (
  <div style={{ width: 340 }}>
    <HomeCard title="입체 탐구랩" description="중1 · 2학기 입체도형 · 9개 챕터" href="#/solid" />
  </div>
);

/** 랩이 여럿일 때 — 홈에서 세로로 쌓인 카드 목록 */
export const LabList = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 340 }}>
    <HomeCard title="입체 탐구랩" description="중1 · 2학기 입체도형 · 9개 챕터" href="#/solid" />
    <HomeCard title="평면 탐구랩" description="중1 · 1학기 평면도형 · 준비 중" href="#/plane" />
  </div>
);
