const CLS = { circle: '원', annulus: '고리 모양(원환)', two_circles: '원 2개', rectangle: '직사각형', triangle: '삼각형' };

export const revsection = {
  id: 'revsection', unitId: 'rev', no: '07', title: '회전체의 단면',
  mount(ctx) {
    const e = ctx.stage, E = ctx.data.E;
    let caseIdx = 0, revD = 0, range = [-1, 1], clip = false, loops = 0;

    function update(d) {
      const c = E.section_cases[caseIdx];
      const res = e.showSection(c.plane.normal, d, { clip });
      revD = d; loops = res.loops;
      ctx.panels.readout(`단면 경계 ${loops}개 · ${CLS[c.classification] || c.classification}`);
    }
    function renderDock() {
      const cases = E.section_cases;
      ctx.panels.dock([
        { type: 'select', groups: [{ label: '탐구 사례', opts: cases.map((c, i) => ({ id: String(i), name: c.label })) }], value: String(caseIdx), onChange: v => apply(parseInt(v, 10)) },
        { type: 'slider', label: '평면 위치', min: range[0] + 0.04, max: range[1] - 0.04, step: 0.01, value: revD, onInput: update },
        { type: 'chip', label: '잘라 보기', active: clip, on: () => { clip = !clip; renderDock(); update(revD); } },
        { type: 'readout', text: '' },
      ]);
      update(revD);
    }
    function apply(i) {
      caseIdx = i;
      const c = E.section_cases[i];
      e.setLathe(E.revolution_profiles[c.profile], 360); e.frame();
      const nl = Math.hypot(c.plane.normal[0], c.plane.normal[1], c.plane.normal[2]) || 1;
      range = e.projRange(c.plane.normal);
      revD = c.plane.d / nl;
      ctx.panels.note({
        kicker: 'Ⅱ단원 회전체 · 07', title: '회전체의 단면',
        stats: [{ k: '회전체', v: E.revolution_profiles[c.profile].label }, { k: '단면', v: CLS[c.classification] || c.classification }],
        body: '회전체를 회전축에 수직인 평면으로 자르면 단면은 항상 원이거나 원으로 둘러싸인 도형이다. 축을 포함하는 평면으로 자르면 축에 대하여 선대칭인 도형이 된다.',
        question: c.label + ' — 단면은 어떤 모양일까?',
        answer: `이 위치에서 단면은 ${CLS[c.classification] || c.classification}이다. 평면 위치 슬라이더를 움직여 단면이 어떻게 변하는지 관찰해 보자.`,
      });
      renderDock();
    }
    apply(caseIdx);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const c = E.section_cases[caseIdx];
        const nl = Math.hypot(c.plane.normal[0], c.plane.normal[1], c.plane.normal[2]) || 1;
        const lo = range[0] + 0.05, target = c.plane.d / nl;
        ctx.play([
          { dur: 0.8, phases: [{ until: 1, label: '자르는 평면 준비' }], onU: () => update(lo) },
          { dur: 2.8, ease: ctx.easeIO, phases: [{ until: 1, label: '평면이 회전체를 지나갑니다' }], onU: pe => update(lo + (target - lo) * pe) },
          { dur: 1.0, phases: [{ until: 1, label: '단면 확인' }], onDone: () => { renderDock(); ctx.panels.showAnswer(); } },
        ]);
      },
    };
  },
};
