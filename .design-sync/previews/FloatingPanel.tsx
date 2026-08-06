import { FloatingPanel } from '@tamgu/ui';

/** 칠판 관례 — width 312 · bodyPadding '6px 14px 14px', 짧은 캡션 한 줄 */
export const Chalkboard = () => (
  <FloatingPanel title="칠판" width={312} bodyPadding="6px 14px 14px">
    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
      정육면체를 세 꼭짓점을 지나는 평면으로 자르면 단면은 정삼각형이 된다.
    </div>
  </FloatingPanel>
);

/** 접힌 상태로 시작 — 헤더만 보이고 ▸ 버튼으로 펼친다 */
export const Collapsed = () => (
  <FloatingPanel title="커리큘럼" width={250} bodyPadding="2px 10px 12px" defaultCollapsed>
    <div style={{ fontSize: 13 }}>Ⅰ 다면체 · Ⅱ 회전체 · Ⅲ 심화 탐구</div>
  </FloatingPanel>
);

/** 최소화(–) 버튼이 있는 학습 노트 관례 — width 330 */
export const WithMinimize = () => (
  <FloatingPanel title="학습 노트" width={330} onMinimize={() => {}}>
    <div style={{ fontSize: 13, lineHeight: 1.65 }}>
      평면도형을 한 직선을 축으로 1회전시킬 때 생기는 입체를 회전체라 한다. 축을 바꾸어
      돌려 보며 단면과 회전체의 관계를 관찰하자.
    </div>
  </FloatingPanel>
);
