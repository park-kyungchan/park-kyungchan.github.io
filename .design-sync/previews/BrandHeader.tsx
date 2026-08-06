import { BrandHeader } from '@tamgu/ui';

/** 랩 화면 좌상단 — 제목 + 보조 라벨 (종이 배경 위) */
export const LabHeader = () => (
  <div style={{ background: '#f7f4ec', padding: '18px 22px' }}>
    <BrandHeader title="입체 탐구랩" subtitle="탐구랩 · 중1 · 2학기" />
  </div>
);

/** 제목만 있는 워드마크 */
export const Wordmark = () => (
  <div style={{ background: '#f7f4ec', padding: '18px 22px' }}>
    <BrandHeader title="탐구랩" />
  </div>
);

/** 홈 화면 워드마크 — 플랫폼 보조 라벨 */
export const HomeWordmark = () => (
  <div style={{ background: '#f7f4ec', padding: '18px 22px' }}>
    <BrandHeader title="탐구랩" subtitle="수학 탐구 플랫폼" />
  </div>
);
