import { CurriculumList, FloatingPanel } from '@tamgu/ui';

const units = [
  { id: 'poly', numeral: 'Ⅰ', title: '다면체' },
  { id: 'rev', numeral: 'Ⅱ', title: '회전체' },
  { id: 'adv', numeral: 'Ⅲ', title: '심화 탐구' },
];

const chapters = [
  { id: 'explorer', no: '01', title: '다면체 관찰실', unitId: 'poly' },
  { id: 'generator', no: '02', title: '정다면체, 왜 다섯뿐인가', unitId: 'poly' },
  { id: 'euler', no: '03', title: '오일러 공식', unitId: 'poly' },
  { id: 'net', no: '04', title: '전개도', unitId: 'poly' },
  { id: 'section', no: '05', title: '다면체의 단면', unitId: 'poly' },
  { id: 'revolution', no: '06', title: '회전체 만들기', unitId: 'rev' },
  { id: 'revsection', no: '07', title: '회전체의 단면', unitId: 'rev' },
  { id: 'soccer', no: '08', title: '축구공의 기하학', unitId: 'adv' },
  { id: 'geodesic', no: '09', title: '겉면 위의 최단거리', unitId: 'adv' },
];

/** 실제 사용 형태 — FloatingPanel('커리큘럼', 250) 안의 3단원 9챕터, 현재 챕터 03 오일러 공식 */
export const InCurriculumPanel = () => (
  <FloatingPanel title="커리큘럼" width={250} bodyPadding="2px 10px 12px">
    <CurriculumList units={units} chapters={chapters} currentId="euler" />
  </FloatingPanel>
);

/** 단원 Ⅰ 다면체만 — 래퍼 없이 목록 자체 */
export const SingleUnit = () => (
  <CurriculumList
    units={units.filter(u => u.id === 'poly')}
    chapters={chapters.filter(c => c.unitId === 'poly')}
    currentId="net"
    style={{ width: 230 }}
  />
);
