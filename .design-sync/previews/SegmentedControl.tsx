import { SegmentedControl } from '@tamgu/ui';

/** 세어 보기 — 꼭짓점 선택(ink 알약 강조) */
export const CountBy = () => (
  <SegmentedControl
    label="세어 보기"
    options={[
      { id: 'v', label: '꼭짓점' },
      { id: 'e', label: '모서리' },
      { id: 'f', label: '면' },
    ]}
    value="v"
  />
);

/** 모드 전환 — '단면' 옵션 비활성화 상태 */
export const WithDisabled = () => (
  <SegmentedControl
    label="모드"
    options={[
      { id: 'rotate', label: '회전' },
      { id: 'unfold', label: '펼치기' },
      { id: 'section', label: '단면', disabled: true },
    ]}
    value="unfold"
  />
);

/** 라벨 없는 세그먼트 — 알약 트랙만 */
export const NoLabel = () => (
  <SegmentedControl
    options={[
      { id: 'rotate', label: '회전' },
      { id: 'unfold', label: '펼치기' },
      { id: 'section', label: '단면' },
    ]}
    value="section"
  />
);
