// Phase 1 DoD ③ 증명용 더미 챕터 — 실챕터 이관 완료 후에도 Phase 4까지 계약 감시용으로 유지.
export const dummy = {
  id: '_dummy', unitId: 'adv', no: '99', title: '(계약 검증용)',
  mount(ctx) {
    ctx.panels.note({
      kicker: '개발 · 99', title: '플러그인 계약 검증',
      stats: [{ k: '상태', v: 'OK' }],
      body: '이 챕터가 커리큘럼에 나타나고 마운트되면 ChapterModule 계약이 성립한 것이다.',
      question: '이 파일을 지워도 다른 챕터가 영향받지 않는가?',
      answer: '받지 않아야 한다. 챕터 간 직접 import는 계약 위반이다.',
    });
    ctx.panels.dock([{ type: 'readout', text: 'ChapterModule contract OK' }]);
    return { dispose() {} };
  },
};
