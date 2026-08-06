import { svg, el } from '../../../packages/svg/index.js';
const CUBE = {
  vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
  faces: [[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],
  topology: { edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]], V: 8, E: 12, F: 6 },
};

export const geodesic = {
  id: 'geodesic', unitId: 'adv', no: '09', title: '겉면 위의 최단거리',
  mount(ctx) {
    const e = ctx.stage, E = ctx.data.E;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    let geoCase = 'cube', geoMode = 'surface', geo = null;

    function boardEl() {
      if (geoCase === 'cube') {
        const S = 118, ox = 20, oy = 30;
        const g = svg('0 0 284 190');
        g.appendChild(el('rect', { x: ox, y: oy, width: S, height: S, fill: 'rgba(65,96,143,0.1)', stroke: '#26324b', 'stroke-width': 1.4 }));
        g.appendChild(el('rect', { x: ox + S, y: oy, width: S, height: S, fill: 'rgba(65,96,143,0.16)', stroke: '#26324b', 'stroke-width': 1.4 }));
        g.appendChild(el('line', { x1: ox, y1: oy + S, x2: ox + 2 * S, y2: oy, stroke: '#b97a2e', 'stroke-width': 2.6 }));
        g.appendChild(el('circle', { cx: ox, cy: oy + S, r: 5, fill: '#26324b' }));
        g.appendChild(el('circle', { cx: ox + 2 * S, cy: oy, r: 5, fill: '#b97a2e' }));
        g.appendChild(el('text', { x: ox - 4, y: oy + S + 20, 'font-family': 'Gaegu, cursive', 'font-size': 19, 'font-weight': 700, fill: '#26324b' }, 'P'));
        g.appendChild(el('text', { x: ox + 2 * S - 8, y: oy - 10, 'font-family': 'Gaegu, cursive', 'font-size': 19, 'font-weight': 700, fill: '#b97a2e' }, 'Q'));
        g.appendChild(el('text', { x: ox + S, y: oy + S + 26, 'text-anchor': 'middle', 'font-family': 'Gaegu, cursive', 'font-size': 20, 'font-weight': 700, fill: '#26324b' }, '펼치면 선분 · 길이 √5·a'));
        return g;
      }
      const sp = E.shortest_paths.cylinder, W = 2 * Math.PI, S2 = 40, ox = 12, oy = 22;
      const g = svg('0 0 284 138');
      g.appendChild(el('rect', { x: ox, y: oy, width: W * S2, height: 2 * S2, fill: 'rgba(65,96,143,0.1)', stroke: '#26324b', 'stroke-width': 1.4 }));
      g.appendChild(el('line', { x1: ox, y1: oy + 2 * S2, x2: ox + sp.Q.theta * S2, y2: oy, stroke: '#b97a2e', 'stroke-width': 2.6 }));
      g.appendChild(el('circle', { cx: ox, cy: oy + 2 * S2, r: 5, fill: '#26324b' }));
      g.appendChild(el('circle', { cx: ox + sp.Q.theta * S2, cy: oy, r: 5, fill: '#b97a2e' }));
      g.appendChild(el('text', { x: ox + W * S2 / 2, y: oy + 2 * S2 + 24, 'text-anchor': 'middle', 'font-family': 'Gaegu, cursive', 'font-size': 19, 'font-weight': 700, fill: '#26324b' }, '옆면 전개도 = 직사각형, 최단 경로는 선분'));
      return g;
    }
    function redraw(f) {
      if (!geo) return;
      e.clearOverlays();
      e.addDot(geo.P, 0x26324b, 0.11);
      e.addDot(geo.Q, 0xb97a2e, 0.11);
      e.addPath(geo.pts.slice(0, Math.max(2, Math.ceil(geo.pts.length * f))), { color: 0xb97a2e, r: 0.05 });
    }
    function apply(c, m) {
      geoCase = c; geoMode = c === 'cylinder' && m === 'edge' ? 'surface' : m;
      e.clearSolid();
      if (c === 'cube') {
        e.setPolyhedron(CUBE);
        const s = e.solidScale, sp = E.shortest_paths.cube;
        const P = V3(-s, -s, -s), Q = V3(s, s, s);
        if (geoMode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 √3·a ≈ ' + sp.interior_distance.toFixed(3) + 'a' };
        else if (geoMode === 'edge') geo = { P, Q, pts: [P, V3(s, -s, -s), V3(s, s, -s), Q], len: '모서리 경로 3a' };
        else geo = { P, Q, pts: [P, V3(s, -s, 0), Q], len: '겉면 최단 √5·a ≈ ' + sp.surface_distance.toFixed(3) + 'a' };
      } else {
        e.setLathe({ components: [{ kind: 'polygon', points: [[0, -1], [1, -1], [1, 1], [0, 1]] }] }, 360);
        const sp = E.shortest_paths.cylinder, TH = sp.Q.theta;
        const P = V3(1, -1, 0), Q = V3(Math.cos(TH), 1, Math.sin(TH));
        if (geoMode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 ≈ ' + sp.interior_chord.toFixed(3) };
        else {
          const pts = [];
          for (let i = 0; i <= 48; i++) { const t = i / 48; pts.push(V3(Math.cos(t * TH), -1 + 2 * t, Math.sin(t * TH))); }
          geo = { P, Q, pts, len: '옆면 최단 ≈ ' + Math.hypot(TH, 2).toFixed(3) };
        }
      }
      e.frame();
      redraw(1);
      const spc = E.shortest_paths.cube, spl = E.shortest_paths.cylinder;
      ctx.panels.board('칠판 · 전개도에서 보기', '겉면 최단 경로는 전개도에서 선분이 된다', boardEl());
      ctx.panels.note({
        kicker: 'Ⅲ단원 심화 탐구 · 09', title: '겉면 위의 최단거리',
        stats: geoCase === 'cube'
          ? [{ k: '내부', v: '√3a ≈ ' + spc.interior_distance.toFixed(3) + 'a' }, { k: '겉면', v: '√5a ≈ ' + spc.surface_distance.toFixed(3) + 'a' }, { k: '모서리', v: '3a' }]
          : [{ k: '내부', v: '≈ ' + spl.interior_chord.toFixed(3) }, { k: '옆면', v: '≈ ' + Math.hypot(spl.Q.theta, 2).toFixed(3) }],
        body: '입체의 겉면을 따라 두 점을 잇는 최단 경로는, 겉면을 평면에 펼친 전개도 위에서 두 점을 잇는 선분이 된다.',
        question: geoCase === 'cube' ? '겉면을 따라가는 최단 경로는 왜 모서리의 한가운데를 지날까?' : '옆면을 따라 도는 최단 경로는 어떤 곡선일까?',
        answer: geoCase === 'cube'
          ? '전개도에서 P와 Q를 잇는 선분이 두 면의 공통 모서리를 정확히 절반 지점에서 지나기 때문이다. 길이는 √5·a로, 모서리를 따라가는 3a보다 짧다.'
          : '전개도(직사각형)에서는 선분이지만, 다시 말아 올리면 옆면을 비스듬히 감는 나선 모양의 곡선이 된다.',
      });
      ctx.panels.dock([
        { type: 'seg', label: '입체', items: [
          { label: '정육면체', active: geoCase === 'cube', on: () => apply('cube', geoMode) },
          { label: '원기둥', active: geoCase === 'cylinder', on: () => apply('cylinder', geoMode) },
        ]},
        { type: 'seg', label: '경로', items: [
          { label: '내부', active: geoMode === 'interior', on: () => apply(geoCase, 'interior') },
          { label: '겉면', active: geoMode === 'surface', on: () => apply(geoCase, 'surface') },
          { label: '모서리', active: geoMode === 'edge', disabled: geoCase !== 'cube', on: () => apply(geoCase, 'edge') },
        ]},
        { type: 'readout', text: geo.len },
      ]);
    }
    apply(geoCase, geoMode);
    return {
      dispose() { ctx.stop(); e.clearOverlays(); },
      onPlay() {
        ctx.play([
          { dur: 0.6, phases: [{ until: 1, label: '두 점 P와 Q' }], onU: () => redraw(0.01) },
          { dur: 2.2, ease: ctx.easeIO, phases: [{ until: 1, label: '경로를 그립니다' }], onU: pe => redraw(pe) },
          { dur: 1.0, phases: [{ until: 1, label: geo ? geo.len : '' }], onDone: () => ctx.panels.showAnswer() },
        ]);
      },
    };
  },
};
