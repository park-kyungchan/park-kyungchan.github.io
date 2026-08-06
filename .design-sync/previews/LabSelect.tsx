import { LabSelect } from '@tamgu/ui';

/** 입체도형 선택 — optgroup으로 기본 입체/정다면체 계열 구분 */
export const Grouped = () => (
  <LabSelect
    groups={[
      {
        label: '기본 입체 (각기둥 · 각뿔)',
        opts: [
          { id: 'PRISM_TRI', name: '삼각기둥' },
          { id: 'PRISM_SQ', name: '사각기둥' },
          { id: 'PYR_TRI', name: '삼각뿔' },
          { id: 'PYR_SQ', name: '사각뿔' },
        ],
      },
      {
        label: '정다면체',
        opts: [
          { id: 'PLATONIC_TETRA', name: '정사면체' },
          { id: 'PLATONIC_CUBE', name: '정육면체' },
          { id: 'PLATONIC_OCTA', name: '정팔면체' },
          { id: 'PLATONIC_DODECA', name: '정십이면체' },
          { id: 'PLATONIC_ICOSA', name: '정이십면체' },
        ],
      },
    ]}
    value="PLATONIC_TETRA"
  />
);

/** 전개도 선택 — 그룹 없는 평면 옵션 */
export const Flat = () => (
  <LabSelect
    options={[
      { id: 'net-1', name: '십자 전개도' },
      { id: 'net-2', name: 'T자 전개도' },
    ]}
    value="net-1"
  />
);
