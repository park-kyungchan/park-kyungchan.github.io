import { svg, el } from '../../../packages/svg/index.js';
const KM = { radius: '반지름', height: '높이', base_radius: '밑면 반지름', top_radius: '윗면 반지름', major_radius: '큰 반지름', minor_radius: '작은 반지름', outer_radius: '바깥 반지름', inner_radius: '안쪽 반지름' };

export const revolution = {
  id: 'revolution', unitId: 'rev', no: '06', title: '회전체 만들기',
  mount(ctx) {
    const e = ctx.stage, E = ctx.data.E;
    let profId = 'cylinder', sweep = 360;

    function boardEl() {
      const pf = E.revolution_profiles[profId];
      const S = 46, cx = 90, cy = 120;
      const g = svg('0 0 284 252');
      g.appendChild(el('line', { x1: cx, y1: 8, x2: cx, y2: 232, stroke: '#26324b', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }));
      g.appendChild(el('text', { x: cx + 6, y: 20, 'font-size': 11, fill: 'rgba(38,50,75,0.6)', 'font-family': "'Noto Sans KR', sans-serif" }, '회전축 ℓ'));
      (pf.components || []).forEach(comp => {
        if (comp.kind === 'circle') {
          g.appendChild(el('circle', { cx: cx + comp.center[0] * S, cy: cy - comp.center[1] * S, r: comp.radius * S, fill: 'rgba(217,160,91,0.35)', stroke: '#b97a2e', 'stroke-width': 2 }));
        } else {
          const pts = e._profilePoints(comp);
          g.appendChild(el('polygon', { points: pts.map(p => (cx + p[0] * S) + ',' + (cy - p[1] * S)).join(' '), fill: 'rgba(217,160,91,0.35)', stroke: '#b97a2e', 'stroke-width': 2 }));
        }
      });
      g.appendChild(el('path', { d: `M ${cx - 34} 236 A 34 10 0 1 0 ${cx + 34} 236`, fill: 'none', stroke: '#41608f', 'stroke-width': 1.8, 'stroke-dasharray': '4 4' }));
      return g;
    }
    function renderDock() {
      const grp = E.revolution_groups, prof = E.revolution_profiles;
      ctx.panels.dock([
        { type: 'select', groups: [
          { label: '기본 회전체', opts: grp.basic.map(id => ({ id, name: prof[id].label })) },
          { label: '축에서 떨어진 도형', opts: grp.offset.map(id => ({ id, name: prof[id].label })) },
          { label: '복합 회전체', opts: grp.composite.map(id => ({ id, name: prof[id].label })) },
        ], value: profId, onChange: id => apply(id, 360) },
        { type: 'slider', label: '회전각', min: 0, max: 360, step: 1, value: sweep, onInput: v => { sweep = Math.round(v); e.setLatheSweep(v); ctx.panels.readout(sweep + '°'); } },
        { type: 'readout', text: sweep + '°' },
      ]);
    }
    function apply(id, sw) {
      profId = id; sweep = sw;
      const pf = E.revolution_profiles[id];
      e.setLathe(pf, sw); e.frame();
      ctx.panels.board('칠판 · 회전시킬 평면도형', '이 도형을 축 ℓ 둘레로 1회전한다', boardEl());
      ctx.panels.note({
        kicker: 'Ⅱ단원 회전체 · 06', title: '회전체 만들기',
        stats: [{ k: '회전시킨 도형', v: pf.profile_label }].concat(Object.entries(pf.exact || {}).map(([k, v]) => ({ k: KM[k] || k, v: typeof v === 'number' ? +v.toFixed(2) : v }))),
        body: '평면도형을 한 직선 ℓ을 축으로 하여 1회전 시킬 때 생기는 입체도형을 회전체라 한다. 원기둥·원뿔·원뿔대·구가 대표적인 회전체이다.',
        question: '회전시키는 평면도형이 축에서 떨어져 있으면 어떤 회전체가 생길까?',
        answer: '축과 도형 사이가 빈 회전체가 생긴다. 원을 축에서 떨어뜨려 회전하면 가운데가 뚫린 도넛 모양(토러스)이 된다.',
      });
      renderDock();
    }
    apply(profId, 360);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        ctx.play([
          { dur: 0.7, phases: [{ until: 1, label: '회전 준비 · 평면도형에서 시작' }], onU: () => e.setLatheSweep(7) },
          { dur: 3.0, ease: ctx.easeIO, phases: [{ until: 0.9, label: '축을 중심으로 1회전' }, { until: 1, label: '정리' }],
            onU: pe => { const s = 7 + pe * 353; e.setLatheSweep(s); sweep = Math.round(s); ctx.panels.readout(sweep + '°'); } },
          { dur: 0.6, phases: [{ until: 1, label: '회전체 완성' }], onDone: () => { e.frame(); renderDock(); ctx.panels.showAnswer(); } },
        ]);
      },
    };
  },
};
