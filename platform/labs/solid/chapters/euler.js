export const euler = {
  id: 'euler', unitId: 'poly', no: '03', title: '오일러 공식',
  mount(ctx) {
    const e = ctx.stage, D = ctx.data.D;
    let solidId = 'PLATONIC_TETRA', countType = null;

    function countStep(type) {
      const t = D.solids[solidId].topology;
      const N = type === 'v' ? t.V : type === 'e' ? t.E : t.F;
      const label = { v: '꼭짓점 세기', e: '모서리 세기', f: '면 세기' }[type];
      return {
        dur: Math.min(5, 0.22 * N + 0.7), phases: [{ until: 1, label }],
        onU: p => {
          const k = Math.floor(p * N);
          for (let i = 0; i < N; i++) {
            const on = i < k;
            if (type === 'v') e.highlightVertex(i, on);
            else if (type === 'e') e.highlightEdge(i, on);
            else e.highlightFace(i, on);
          }
          ctx.panels.readout(`${({ v: '꼭짓점', e: '모서리', f: '면' })[type]} ${k} / ${N}`);
        },
      };
    }
    function renderDock() {
      const t = D.solids[solidId].topology;
      ctx.panels.dock([
        { type: 'select', groups: [
          { label: '기본 입체 (각기둥 · 각뿔)', opts: D.ui.family_order.map(id => ({ id, name: D.solids[id].korean_name })) },
          { label: '정다면체', opts: D.ui.platonic_order.map(id => ({ id, name: D.solids[id].korean_name })) },
          { label: '아르키메데스 입체', opts: D.ui.extension_order.map(id => ({ id, name: D.solids[id].korean_name })) },
        ], value: solidId, onChange: build },
        { type: 'seg', label: '세어 보기', items: [
          { label: '꼭짓점', active: countType === 'v', on: () => { countType = 'v'; renderDock(); ctx.play([countStep('v')]); } },
          { label: '모서리', active: countType === 'e', on: () => { countType = 'e'; renderDock(); ctx.play([countStep('e')]); } },
          { label: '면', active: countType === 'f', on: () => { countType = 'f'; renderDock(); ctx.play([countStep('f')]); } },
        ]},
        { type: 'readout', text: `V ${t.V} − E ${t.E} + F ${t.F} = ${t.euler}` },
      ]);
    }
    function build(id) {
      solidId = id; countType = null;
      const s = D.solids[id];
      e.setPolyhedron(s); e.frame();
      ctx.panels.note({
        kicker: 'Ⅰ단원 다면체 · 03', title: '오일러 공식',
        stats: [{ k: '이름', v: s.korean_name }, { k: 'V', v: s.topology.V }, { k: 'E', v: s.topology.E }, { k: 'F', v: s.topology.F }, { k: 'V−E+F', v: s.topology.euler }],
        body: '볼록한 다면체에서 꼭짓점의 수를 V, 모서리의 수를 E, 면의 수를 F라 하면 V − E + F = 2 가 항상 성립한다. 재생을 눌러 세 값을 차례로 세어 보자.',
        question: '면의 수가 아무리 늘어나도 V−E+F가 2로 유지되는 까닭은?',
        answer: '면을 늘리면 그만큼 모서리와 꼭짓점도 함께 늘어나 증가분이 상쇄되기 때문이다. 이 값은 입체의 생김새가 아니라 면·모서리·꼭짓점이 연결된 구조가 결정한다.',
      });
      renderDock();
    }
    build(solidId);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const steps = ['v', 'e', 'f'].map(countStep);
        steps.push({ dur: 1.6, phases: [{ until: 1, label: '오일러 확인 · V−E+F = 2' }], onDone: () => ctx.panels.showAnswer() });
        ctx.play(steps);
      },
    };
  },
};
