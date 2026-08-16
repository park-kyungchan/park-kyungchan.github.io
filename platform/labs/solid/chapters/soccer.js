export const soccer = {
  id: 'soccer', unitId: 'adv', no: '08', title: '축구공의 기하학',
  mount(ctx) {
    const e = ctx.stage, D = ctx.data.D;
    let mode = 'all';
    const solid = () => D.solids.ARCH_TRUNC_ICOSA;

    function build(m) {
      mode = m;
      const s = solid();
      e.setPolyhedron(s, { faceColor: (i, sides) => sides === 5 ? 0x41608f : 0xf2ede1 });
      e.frame();
      s.faces.forEach((f, i) => {
        e.setFaceDim(i, m === 'penta' ? f.length !== 5 : m === 'hexa' ? f.length !== 6 : false);
      });
      ctx.panels.note({
        kicker: 'Ⅲ단원 심화 탐구 · 08', title: '축구공의 기하학',
        stats: [{ k: 'V', v: 60 }, { k: 'E', v: 90 }, { k: 'F', v: '32 (12+20)' }, { k: 'V−E+F', v: 2 }],
        body: '축구공은 정이십면체의 열두 꼭짓점을 잘라 만든 「깎은 정이십면체」이다. 정오각형 12개와 정육각형 20개, 모두 32개의 면으로 이루어진다.',
        question: 'V−E+F를 확인해 보자. 60 − 90 + 32 = ?',
        answer: '60 − 90 + 32 = 2. 면이 32개인 복잡한 다면체에서도 오일러 공식은 그대로 성립한다.',
      });
      ctx.panels.dock([
        { type: 'seg', label: '보기', items: [
          { label: '전체', active: mode === 'all', on: () => build('all') },
          { label: '오각형', active: mode === 'penta', on: () => build('penta') },
          { label: '육각형', active: mode === 'hexa', on: () => build('hexa') },
        ]},
        { type: 'readout', text: '정오각형 12 · 정육각형 20' },
      ]);
    }
    build(mode);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const s = solid();
        const penta = [], hexa = [];
        s.faces.forEach((f, i) => (f.length === 5 ? penta : hexa).push(i));
        ctx.play([
          { dur: 3.4, phases: [{ until: 1, label: '정오각형 세기' }],
            onU: p => { const k = Math.ceil(p * penta.length); penta.forEach((fi, j) => e.highlightFace(fi, j < k)); ctx.panels.readout(`정오각형 ${k} / 12`); } },
          { dur: 3.8, phases: [{ until: 1, label: '정육각형 세기' }],
            onU: p => { const k = Math.ceil(p * hexa.length); hexa.forEach((fi, j) => e.highlightFace(fi, j < k, 0xd9a05b)); ctx.panels.readout(`정육각형 ${k} / 20`); } },
          { dur: 1.6, phases: [{ until: 1, label: '60 − 90 + 32 = 2' }],
            onDone: () => { e.clearHighlights(); build(mode); ctx.panels.showAnswer(); } },
        ]);
      },
    };
  },
};
