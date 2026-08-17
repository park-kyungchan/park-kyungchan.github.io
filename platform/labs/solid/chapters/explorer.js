// 레퍼런스 챕터 — 나머지 8개 이관의 표본 패턴.
export const explorer = {
  id: 'explorer', unitId: 'poly', no: '01', title: '다면체 관찰실',
  mount(ctx) {
    const e = ctx.stage, D = ctx.data.D;
    let solidId = 'FAMILY_PRISM_3', countType = null;

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
        onDone: () => ctx.panels.readout(`${({ v: '꼭짓점', e: '모서리', f: '면' })[type]} ${N} / ${N}`),
      };
    }
    function startCount(type) { countType = type; renderDock(); ctx.play([countStep(type)]); }
    function renderDock() {
      const t = D.solids[solidId].topology;
      ctx.panels.dock([
        { type: 'select', groups: [
          { label: '기본 입체 (각기둥 · 각뿔)', opts: D.ui.family_order.map(id => ({ id, name: D.solids[id].korean_name })) },
          { label: '정다면체', opts: D.ui.platonic_order.map(id => ({ id, name: D.solids[id].korean_name })) },
          { label: '아르키메데스 입체', opts: D.ui.extension_order.map(id => ({ id, name: D.solids[id].korean_name })) },
        ], value: solidId, onChange: build },
        { type: 'seg', label: '세어 보기', items: [
          { label: '꼭짓점', active: countType === 'v', on: () => startCount('v') },
          { label: '모서리', active: countType === 'e', on: () => startCount('e') },
          { label: '면', active: countType === 'f', on: () => startCount('f') },
        ]},
        { type: 'readout', text: `V ${t.V} · E ${t.E} · F ${t.F}` },
      ]);
    }
    function build(id) {
      solidId = id; countType = null;
      const s = D.solids[id];
      e.setPolyhedron(s); e.frame();
      ctx.panels.note({
        kicker: 'Ⅰ단원 다면체 · 01', title: '다면체 관찰실',
        stats: [{ k: '이름', v: s.korean_name }, { k: 'V', v: s.topology.V }, { k: 'E', v: s.topology.E }, { k: 'F', v: s.topology.F }, { k: 'V−E+F', v: s.topology.euler }],
        body: '다면체는 다각형인 면만으로 둘러싸인 입체도형이다. 면·모서리·꼭짓점을 직접 세어 구조를 파악해 보자.',
        question: '각기둥과 각뿔의 옆면은 각각 어떤 다각형일까?',
        answer: '각기둥의 옆면은 직사각형, 각뿔의 옆면은 삼각형이다. 옆면의 개수는 밑면의 변의 수와 같다.',
      });
      renderDock();
    }
    build(solidId);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const steps = ['v', 'e', 'f'].map(countStep);
        steps.push({ dur: 1.6, phases: [{ until: 1, label: '오일러 확인 · V−E+F = 2' }] });
        ctx.play(steps);
      },
    };
  },
};
