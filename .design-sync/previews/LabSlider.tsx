import { LabSlider } from '@tamgu/ui';

/** 회전각 — 0~360° 중 210° (amber 액센트 트랙) */
export const Rotation = () => <LabSlider label="회전각" min={0} max={360} value={210} />;

/** 단면 높이 — 0~100 중 45 */
export const SectionHeight = () => <LabSlider label="단면 높이" min={0} max={100} value={45} />;
