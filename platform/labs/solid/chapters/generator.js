import { svg, el } from '../../../packages/svg/index.js';
const ANG = { 3: 60, 4: 90, 5: 108, 6: 120 };

export const generator = {
  id: 'generator', unitId: 'poly', no: '02', title: '정다면체, 왜 다섯뿐인가',
  mount(ctx) {
    const e = ctx.stage, D = ctx.data.D;
    let genN = 3, genK = 3;

    function boardEl(shown) {
      const a = ANG[genN], k = genK, sum = a * k;
      const cx = 142, cy = 128, R = 96;
      const g = svg('0 0 284 264');
      for (let i = 0; i < Math.min(k, shown); i++) {
        const a0 = (-90 + i * a) * Math.PI / 180, a1 = (-90 + (i + 1) * a) * Math.PI / 180;
        g.appendChild(el('path', {
          d: `M ${cx} ${cy} L ${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} Z`,
          fill: sum > 360 && i === k - 1 ? 'rgba(178,58,58,0.3)' : 'rgba(65,96,143,0.16)',
          stroke: '#41608f', 'stroke-width': 1.6 }));
      }
      if (sum < 360) {
        const a0 = (-90 + sum) * Math.PI / 180, a1 = (-90 + 360) * Math.PI / 180, R2 = R + 8;
        g.appendChild(el('path', {
          d: `M ${cx + R2 * Math.cos(a0)} ${cy + R2 * Math.sin(a0)} A ${R2} ${R2} 0 ${360 - sum > 180 ? 1 : 0} 1 ${cx + R2 * Math.cos(a1)} ${cy + R2 * Math.sin(a1)}`,
          fill: 'none', stroke: '#b97a2e', 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }));
      }
      g.appendChild(el('circle', { cx, cy, r: 3.5, fill: '#26324b' }));
      g.appendChild(el('text', { x: cx, y: 252, 'text-anchor': 'middle', 'font-family': 'Gaegu, cursive', 'font-size': 22, 'font-weight': 700, fill: '#26324b' },
        `${a}° × ${k} = ${sum}°  ${sum < 360 ? '< 360° ✓' : sum === 360 ? '= 360° ✗' : '> 360° ✗'}`));
      return g;
    }
    function apply(n, k, shown) {
      genN = n; genK = k;
      const sum = ANG[n] * k;
      const valid = D.platonic_generator_valid_pairs[n + ',' + k];
      e.clearSolid();
      if (valid) { e.setPolyhedron(D.solids[valid]); e.frame(); }
      ctx.panels.board('칠판 · 한 꼭짓점에 모인 각', '360°보다 작아야 입체로 접힌다', boardEl(shown != null ? shown : 99));
      ctx.panels.note({
        kicker: 'Ⅰ단원 다면체 · 02', title: '정다면체, 왜 다섯뿐인가',
        stats: [{ k: '한 내각', v: ANG[n] + '°' }, { k: '각의 합', v: sum + '°' }, { k: '판정', v: valid ? D.solids[valid].korean_name : '만들 수 없음' }],
        body: '정다면체는 모든 면이 합동인 정다각형이고, 각 꼭짓점에 모이는 면의 개수가 같은 볼록 다면체이다. 한 꼭짓점에 모인 각의 합이 360°보다 작아야 입체로 접을 수 있다.',
        question: '정육각형(한 각 120°)으로는 왜 정다면체를 만들 수 없을까?',
        answer: '정육각형 3개가 한 꼭짓점에 모이면 120°×3 = 360°가 되어 평면에 그대로 펼쳐진다. 접을 여유 각이 없으므로 입체가 만들어지지 않는다. 가능한 조합은 (3,3) (3,4) (3,5) (4,3) (5,3)의 다섯 가지뿐이다.',
      });
      ctx.panels.dock([
        { type: 'seg', label: '정n각형', items: [3, 4, 5, 6].map(v => ({ label: String(v), active: genN === v, on: () => apply(v, genK) })) },
        { type: 'seg', label: '한 꼭짓점에', items: [3, 4, 5].map(v => ({ label: v + '개', active: genK === v, on: () => apply(genN, v) })) },
        { type: 'readout', text: `${ANG[n]}°×${k} = ${sum}°` + (valid ? ' → ' + D.solids[valid].korean_name : sum === 360 ? ' → 평면' : sum > 360 ? ' → 불가능' : ' → ?') },
      ]);
    }
    apply(genN, genK);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const k = genK, sum = ANG[genN] * k;
        const valid = !!D.platonic_generator_valid_pairs[genN + ',' + genK];
        let last = 0;
        ctx.play([
          { dur: 1.8, phases: [{ until: 1, label: '한 꼭짓점에 면을 모아 봅니다' }],
            onU: p => { const m = Math.max(1, Math.ceil(p * k)); if (m !== last) { last = m; ctx.panels.board('칠판 · 한 꼭짓점에 모인 각', '360°보다 작아야 입체로 접힌다', boardEl(m)); } } },
          { dur: 1.4, phases: [{ until: 1, label: valid ? sum + '° < 360° · 입체로 접힙니다' : (sum === 360 ? '360° · 평면이 되어 접히지 않습니다' : sum + '° > 360° · 겹쳐서 만들 수 없습니다') }],
            onDone: () => { if (valid) e.popIn(); ctx.panels.showAnswer(); } },
        ]);
      },
    };
  },
};
