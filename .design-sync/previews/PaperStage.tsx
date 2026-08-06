import { BrandHeader, FloatingPanel, PaperStage } from '@tamgu/ui';

/** 빈 무대 — paper 바탕 + 28px 모눈 + 가장자리 비네트 질감 */
export const EmptyStage = () => (
  <PaperStage height={340} style={{ width: 520 }} />
);

/** 레이어 구성 — 무대 위 좌상단 워드마크와 절대 위치 플로팅 패널 */
export const StageComposition = () => (
  <PaperStage height={340} style={{ width: 520 }}>
    <BrandHeader
      title="입체 탐구랩"
      subtitle="탐구랩 · 중1"
      style={{ position: 'absolute', left: 18, top: 14 }}
    />
    <FloatingPanel
      title="칠판"
      width={312}
      bodyPadding="6px 14px 14px"
      style={{ position: 'absolute', left: 16, top: 58 }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        원기둥을 회전축에 수직으로 자르면 단면은 언제나 크기가 같은 원이다.
      </div>
    </FloatingPanel>
  </PaperStage>
);
