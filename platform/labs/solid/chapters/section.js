export const section = {
  id: 'section', unitId: 'poly', no: '05', title: '다면체의 단면',
  mount(ctx) {
    const e = ctx.stage, D = ctx.data.D;
    let presetIdx = 0, secD = 0, range = [-1, 1], clip = false, sides = 0;

    function update(d) {
      const pr = D.cross_section_presets[presetIdx];
      const res = e.showSection(pr.normal, d, { clip });
      secD = d; sides = res.sides;
      ctx.panels.readout(`단면: ${sides || '–'}각형 (예상 ${pr.expected_sides}각형)` + (sides === pr.expected_sides ? ' ✓' : ''));
    }
    function renderDock() {
      const prs = D.cross_section_presets;
      ctx.panels.dock([
        { type: 'select', groups: [{ label: '탐구 사례', opts: prs.map((p, i) => ({ id: String(i), name: p.short_title })) }], value: String(presetIdx), onChange: v => apply(parseInt(v, 10)) },
        { type: 'slider', label: '평면 위치', min: range[0] + 0.03, max: range[1] - 0.03, step: 0.01, value: secD, onInput: update },
        { type: 'chip', label: '잘라 보기', active: clip, on: () => { clip = !clip; renderDock(); update(secD); } },
        { type: 'readout', text: '' },
      ]);
      update(secD);
    }
    function apply(i) {
      presetIdx = i;
      const pr = D.cross_section_presets[i];
      e.setPolyhedron(D.solids[pr.solid_id]); e.frame();
      const nl = Math.hypot(pr.normal[0], pr.normal[1], pr.normal[2]) || 1;
      range = e.projRange(pr.normal);
      secD = pr.target_d * e.solidScale / nl;
      ctx.panels.note({
        kicker: 'Ⅰ단원 다면체 · 05', title: '다면체의 단면',
        stats: [{ k: '입체', v: D.solids[pr.solid_id].korean_name }, { k: '예상 단면', v: pr.expected_sides + '각형' }],
        body: '입체도형을 한 평면으로 자를 때 생기는 면을 단면이라 한다. 자르는 평면의 방향과 위치에 따라 단면의 모양이 달라진다.',
        question: pr.question, answer: pr.explanation,
      });
      renderDock();
    }
    apply(presetIdx);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const lo = range[0] + 0.04, target = secD;
        ctx.play([
          { dur: 0.8, phases: [{ until: 1, label: '자르는 평면 준비' }], onU: () => update(lo) },
          { dur: 2.8, ease: ctx.easeIO, phases: [{ until: 1, label: '평면이 입체를 지나갑니다' }], onU: pe => update(lo + (target - lo) * pe) },
          { dur: 1.0, phases: [{ until: 1, label: '단면 확인' }], onDone: () => { renderDock(); ctx.panels.showAnswer(); } },
        ]);
      },
    };
  },
};
