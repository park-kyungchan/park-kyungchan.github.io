import { Transport } from '@tamgu/ui';

/** 재생 중 — ■ 버튼 + amber-soft 진행바 62% */
export const Playing = () => (
  <Transport unitLabel="Ⅰ 다면체" chapterLabel="03 · 오일러 공식" playing progress={62} />
);

/** 대기 상태 — ▶ 버튼, 진행바 0% */
export const Idle = () => (
  <Transport unitLabel="Ⅰ 다면체" chapterLabel="01 · 다면체 관찰실" progress={0} />
);

/** 심화 챕터 재생 직전 — 긴 챕터 이름 */
export const LongTitle = () => (
  <Transport unitLabel="Ⅲ 심화 탐구" chapterLabel="09 · 겉면 위의 최단거리" progress={0} />
);
