import { svg, el } from '../../../packages/svg/index.js';

// 챕터 09 — 겉면 위의 최단거리.
// "펼치면 선분" 전략을 다면체(평면 전개) → 뿔·기둥(부채꼴·띠 전개) → 구(전개 불가)로 확장한다.
// 모든 수치는 E.shortest_paths의 해석적 정확값을 읽는다 (tools/generate-shortest-paths.mjs 준거).

const CUBE = {
  vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
  faces: [[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],
  topology: { edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]] },
};
// 직육면체 1×2×3 — x=c(3), y=a(1), z=b(2)
const CUBOID = {
  vertices: CUBE.vertices.map(v => [v[0] * 1.5, v[1] * 0.5, v[2] * 1]),
  faces: CUBE.faces, topology: CUBE.topology,
};

const INK = '#26324b', AMBER = '#b97a2e', ACC = 'rgba(65,96,143,0.13)', ACC2 = 'rgba(65,96,143,0.2)';
const F = x => (typeof x === 'number' ? x.toFixed(3).replace(/\.?0+$/, '') : x);

export const geodesic = {
  id: 'geodesic', unitId: 'adv', no: '09', title: '겉면 위의 최단거리',
  mount(ctx) {
    const e = ctx.stage, E = ctx.data.E, D = ctx.data.D, SP = E.shortest_paths;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    // ── 상태 ──
    let solid = 'cube';
    let mode = 'surface';          // interior | surface | edge
    let sub = {};                  // 입체별 보조 상태
    let geo = null;                // { P, Q, pts, len, wrongEnd? }

    // ── 칠판 SVG 헬퍼 ──
    const gaegu = (x, y, t, fill, size, anchor) =>
      el('text', { x, y, 'font-family': 'Gaegu, cursive', 'font-size': size || 18, 'font-weight': 700, fill: fill || INK, ...(anchor ? { 'text-anchor': anchor } : {}) }, t);
    const dot = (g, x, y, fill) => g.appendChild(el('circle', { cx: x, cy: y, r: 4.6, fill: fill || INK }));
    const seg = (g, x1, y1, x2, y2, opts) => g.appendChild(el('line', { x1, y1, x2, y2, stroke: (opts && opts.stroke) || AMBER, 'stroke-width': (opts && opts.w) || 2.6, ...(opts && opts.dash ? { 'stroke-dasharray': opts.dash } : {}) }));
    const rect = (g, x, y, w, h, fill) => g.appendChild(el('rect', { x, y, width: w, height: h, fill: fill || ACC, stroke: INK, 'stroke-width': 1.4 }));
    const poly = (g, pts, fill, opts) => g.appendChild(el('polygon', { points: pts.map(p => p[0] + ',' + p[1]).join(' '), fill: fill || ACC, stroke: INK, 'stroke-width': (opts && opts.w) || 1.4 }));
    const arcPath = (cx, cy, r, a0, a1, n) => {
      const pts = []; n = n || 48;
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return pts;
    };
    const polyline = (g, pts, opts) => g.appendChild(el('polyline', { points: pts.map(p => p[0] + ',' + p[1]).join(' '), fill: 'none', stroke: (opts && opts.stroke) || INK, 'stroke-width': (opts && opts.w) || 1.4, ...(opts && opts.dash ? { 'stroke-dasharray': opts.dash } : {}) }));

    // ── 부채꼴 전개 → 3D 사상 (원뿔·원뿔대 공용) ──
    // 옆면 위 점: 꼭짓점에서 모선거리 s, 부채꼴 각 φ → 3D (θ3D = φ·L/R)
    const coneMap = (R, L, apexY, H) => (s, phi) => {
      const f = s / L, th = phi * L / R;
      return V3(f * R * Math.cos(th), apexY - f * H, f * R * Math.sin(th));
    };
    // 부채꼴 안의 현을 데카르트로 보간하되, atan2의 (−π,π] 분지를 예상각 기준으로 언랩한다
    // (중심각이 π를 넘는 부채꼴에서 필수 — θ3D=φ·L/R는 φ에 2π-주기가 아니다)
    const sectorPts = (A, B, n, map) => {
      const ax = A[0] * Math.cos(A[1]), ay = A[0] * Math.sin(A[1]);
      const bx = B[0] * Math.cos(B[1]), by = B[0] * Math.sin(B[1]);
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        let phi = Math.atan2(y, x);
        const want = A[1] + (B[1] - A[1]) * t;
        if (phi - want > Math.PI) phi -= 2 * Math.PI;
        else if (want - phi > Math.PI) phi += 2 * Math.PI;
        out.push(map(Math.hypot(x, y), phi));
      }
      return out;
    };

    // ── 입체별 구성 ──
    function applyCube() {
      e.setPolyhedron(CUBE);
      const s = e.solidScale, sp = SP.cube, a = '·a';
      const P = V3(-s, -s, -s), Q = V3(s, s, s);
      if (mode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 √3' + a + ' ≈ ' + F(sp.interior_distance) + 'a' };
      else if (mode === 'edge') geo = { P, Q, pts: [P, V3(s, -s, -s), V3(s, s, -s), Q], len: '모서리 경로 3a' };
      else if (sub.unfold === 'strip') {
        const wrong = V3(-s, s, s);
        geo = { P, Q, pts: [P, V3(s, -s, -s / 3), V3(s, s, s / 3), wrong], wrongEnd: wrong,
          len: '√10·a — 도착점이 Q가 아니다!' };
      } else geo = { P, Q, pts: [P, V3(s, -s, 0), Q], len: '겉면 최단 √5' + a + ' ≈ ' + F(sp.surface_distance) + 'a' };
    }
    function boardCube() {
      const g = svg('0 0 284 190');
      if (sub.unfold === 'strip') {
        const S = 78, ox = 20, oy = 46;
        for (let i = 0; i < 3; i++) rect(g, ox + i * S, oy, S, S, i === 1 ? ACC2 : ACC);
        seg(g, ox, oy + S, ox + 3 * S, oy, { stroke: AMBER, dash: '7 5' });
        dot(g, ox, oy + S); dot(g, ox + 3 * S, oy, AMBER);
        g.appendChild(gaegu(ox - 6, oy + S + 20, 'P'));
        g.appendChild(el('text', { x: ox + 3 * S, y: oy - 8, 'font-family': 'Gaegu, cursive', 'font-size': 17, 'font-weight': 700, fill: AMBER, 'text-anchor': 'end' }, '여기는 Q가 아님!'));
        g.appendChild(gaegu(142, oy + S + 34, '√10 선분 — 접으면 다른 꼭짓점에 닿는다', INK, 15, 'middle'));
      } else {
        const S = 118, ox = 20, oy = 30;
        rect(g, ox, oy, S, S); rect(g, ox + S, oy, S, S, ACC2);
        seg(g, ox, oy + S, ox + 2 * S, oy);
        dot(g, ox, oy + S); dot(g, ox + 2 * S, oy, AMBER);
        g.appendChild(gaegu(ox - 4, oy + S + 20, 'P'));
        g.appendChild(gaegu(ox + 2 * S - 8, oy - 10, 'Q', AMBER));
        g.appendChild(gaegu(ox + S, oy + S + 26, '펼치면 선분 · 길이 √5·a', INK, 20, 'middle'));
      }
      return g;
    }

    function applyCuboid() {
      e.setPolyhedron(CUBOID);
      const s = e.solidScale, sp = SP.cuboid;
      const X = 1.5 * s, Y = 0.5 * s, Z = 1 * s; // c/2, a/2, b/2
      const P = V3(-X, -Y, -Z), Q = V3(X, Y, Z);
      const cand = sp.surface_candidates[sub.cand || 0];
      if (mode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 √14 ≈ ' + F(sp.interior_distance) };
      else if (mode === 'edge') geo = { P, Q, pts: [P, V3(X, -Y, -Z), V3(X, Y, -Z), Q], len: '모서리 경로 ' + sp.edge_only_distance };
      else {
        const cross = [V3(X / 3, -Y, Z), V3(X, -Y, Z / 2), V3(X, 0.2 * Y, -Z)][sub.cand || 0];
        const min = Math.abs(cand.length - sp.surface_minimum) < 1e-9;
        geo = { P, Q, pts: [P, cross, Q], len: cand.label + ' = ' + F(cand.length) + (min ? ' (최단!)' : '') };
      }
    }
    function boardCuboid() {
      const sp = SP.cuboid, cand = sp.surface_candidates[sub.cand || 0];
      const W = cand.common_edge, Hs = cand.spans_sum, first = cand.first_span; // 전개: 가로 = 공통 모서리, 세로 = 두 면 폭의 합
      const sc = Math.min(210 / W, 128 / Hs), ox = 24, oy = 24;
      const g = svg('0 0 284 190');
      rect(g, ox, oy, W * sc, first * sc, ACC);
      rect(g, ox, oy + first * sc, W * sc, (Hs - first) * sc, ACC2);
      seg(g, ox, oy, ox + W * sc, oy + Hs * sc);
      dot(g, ox, oy); dot(g, ox + W * sc, oy + Hs * sc, AMBER);
      g.appendChild(gaegu(ox - 6, oy - 8, 'P'));
      g.appendChild(gaegu(ox + W * sc + 2, oy + Hs * sc + 16, 'Q', AMBER));
      g.appendChild(gaegu(142, 178, `√(${cand.spans_sum}² + ${cand.common_edge}²) = ${F(cand.length)}`, INK, 19, 'middle'));
      return g;
    }

    // 정사면체·정팔면체 — 마름모 전개 공용
    function applyPlatonic(id) {
      const S = D.solids[id];
      e.setPolyhedron(S);
      const s = e.solidScale, V = S.vertices;
      const mid3 = (i, j) => V3((V[i][0] + V[j][0]) / 2 * s, (V[i][1] + V[j][1]) / 2 * s, (V[i][2] + V[j][2]) / 2 * s);
      const vtx = i => V3(V[i][0] * s, V[i][1] * s, V[i][2] * s);
      if (id === 'PLATONIC_TETRA') {
        const sp = SP.tetrahedron;
        const P = mid3(0, 1), Q = mid3(2, 3), X = mid3(1, 2);
        if (mode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 a/√2 ≈ ' + F(sp.interior_distance) + 'a' };
        else if (mode === 'edge') geo = { P, Q, pts: [P, vtx(1), vtx(2), Q], len: '모서리 경로 2a' };
        else geo = { P, Q, pts: [P, X, Q], len: '겉면 최단 = 정확히 a (같은 길이 경로가 4개!)' };
      } else {
        const sp = SP.octahedron;
        let Pi = 0, Qi = 1, best = Infinity;
        for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
          const d = V[i][0] * V[j][0] + V[i][1] * V[j][1] + V[i][2] * V[j][2];
          if (d < best) { best = d; Pi = i; Qi = j; }
        }
        const fP = S.faces.find(f => f.includes(Pi));
        const fQ = S.faces.find(f => f.includes(Qi) && fP.filter(v => f.includes(v)).length === 2);
        const shared = fP.filter(v => fQ.includes(v));
        const P = vtx(Pi), Q = vtx(Qi), X = mid3(shared[0], shared[1]);
        if (mode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 √2·a ≈ ' + F(sp.interior_distance) + 'a' };
        else if (mode === 'edge') geo = { P, Q, pts: [P, vtx(shared[0]), Q], len: '모서리 경로 2a' };
        else geo = { P, Q, pts: [P, X, Q], len: '겉면 최단 √3·a ≈ ' + F(sp.surface_distance) + 'a' };
      }
    }
    function boardRhombus(id) {
      const a = 118, h = a * Math.sqrt(3) / 2, ox = 62, oy = 95;
      const B = [ox, oy], C = [ox + a, oy], A = [ox + a / 2, oy - h], Dp = [ox + a / 2, oy + h];
      const g = svg('0 0 284 190');
      poly(g, [B, C, A], ACC); poly(g, [B, C, Dp], ACC2);
      let p1, p2, label;
      if (id === 'PLATONIC_TETRA') {
        p1 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; p2 = [(C[0] + Dp[0]) / 2, (C[1] + Dp[1]) / 2];
        label = '두 중점을 잇는 선분 = 정확히 a';
      } else {
        p1 = A; p2 = Dp;
        label = '마름모의 긴 대각선 = √3·a';
      }
      seg(g, p1[0], p1[1], p2[0], p2[1]);
      dot(g, p1[0], p1[1]); dot(g, p2[0], p2[1], AMBER);
      g.appendChild(gaegu(p1[0] - 18, p1[1] + 4, 'P'));
      g.appendChild(gaegu(p2[0] + 8, p2[1] + 4, 'Q', AMBER));
      g.appendChild(gaegu(142, 185, label, INK, 16, 'middle'));
      return g;
    }

    function applyCylinder() {
      e.setLathe({ components: [{ kind: 'polygon', points: [[0, -1], [1, -1], [1, 1], [0, 1]] }] }, 360);
      const sp = SP.cylinder, k = sub.wind || 0;
      const pc = sp.periodic_copies.find(c => c.k === k);
      const TH = sp.Q.theta + 2 * Math.PI * k;
      const P = V3(1, -1, 0), Q = V3(Math.cos(sp.Q.theta), 1, Math.sin(sp.Q.theta));
      if (mode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 지름길 ≈ ' + F(sp.interior_chord) };
      else {
        const pts = [];
        for (let i = 0; i <= 64; i++) { const t = i / 64; pts.push(V3(Math.cos(t * TH), -1 + 2 * t, Math.sin(t * TH))); }
        geo = { P, Q, pts, len: `감김 k=${k} · 길이 ≈ ${F(pc.length)}` + (k === sp.minimum_k ? ' (최단!)' : '') };
      }
    }
    function boardCylinder() {
      const sp = SP.cylinder, k = sub.wind || 0;
      const S2 = 14, ox = 100, oy = 46, H2 = 2 * S2; // 등방 축척 — 전개도의 각도가 실제와 같다
      const g = svg('0 0 284 150');
      // 기본 띠 [0, 2π] + 좌우 복사 표시
      rect(g, ox - 2 * Math.PI * S2, oy, 2 * Math.PI * S2, H2, 'rgba(65,96,143,0.05)');
      rect(g, ox + 2 * Math.PI * S2, oy, 2 * Math.PI * S2, H2, 'rgba(65,96,143,0.05)');
      rect(g, ox, oy, 2 * Math.PI * S2, H2, ACC);
      dot(g, ox, oy + H2);
      g.appendChild(gaegu(ox - 6, oy + H2 + 18, 'P'));
      for (const c of sp.periodic_copies) {
        const qx = ox + (sp.Q.theta + 2 * Math.PI * c.k) * S2;
        const sel = c.k === k;
        seg(g, ox, oy + H2, qx, oy, { stroke: sel ? AMBER : 'rgba(65,96,143,0.45)', w: sel ? 2.6 : 1.6 });
        dot(g, qx, oy, sel ? AMBER : 'rgba(65,96,143,0.6)');
        g.appendChild(gaegu(qx - 10, oy - 8, 'Q(' + (c.k > 0 ? '+' : '') + c.k + ')', sel ? AMBER : INK, 14));
      }
      g.appendChild(gaegu(142, 144, '띠를 이으면 감김마다 Q 복사본이 생긴다', INK, 14, 'middle'));
      return g;
    }

    function applyCone() {
      const sp = SP.cone, lp = SP.cone_loop;
      if (sub.prob === 'loop') {
        const c = sub.shape === 'flat' ? lp.flat : lp.sharp;
        const R = c.base_radius, L = c.slant_height, H = c.height;
        e.setLathe({ components: [{ kind: 'polygon', points: [[0, -H / 2], [R, -H / 2], [0, H / 2]] }] }, 360);
        const map = coneMap(R, L, H / 2, H);
        const P = map(L, 0);
        if (c.valid) {
          geo = { P, Q: P, pts: sectorPts([L, 0], [L, c.sector_angle], 72, map), len: '한 바퀴 최단 = 2l·sin(θ/2) ≈ ' + F(c.loop_length) };
        } else {
          geo = { P, Q: P, pts: [P, V3(0, H / 2, 0), P], invalid: true, len: '중심각 > 180° — 팽팽한 실이 없다 (꼭짓점 왕복 2l ≈ ' + F(2 * c.slant_height) + ')' };
        }
      } else {
        const R = sp.base_radius, H = sp.height, L = sp.slant_height;
        e.setLathe({ components: [{ kind: 'polygon', points: [[0, -H / 2], [R, -H / 2], [0, H / 2]] }] }, 360);
        const map = coneMap(R, L, H / 2, H);
        const k = sub.seam == null ? 0 : sub.seam;
        const sc = sp.seam_copies.find(c => c.k === k);
        const phiQ = sp.Q.theta * R / L, phiMax = sp.sector_angle;
        const P = map(sp.P.slant, 0), Q = map(sp.Q.slant, phiQ);
        if (sc.valid) {
          const A = k === 0 ? [sp.P.slant, 0] : [sp.P.slant, phiMax];
          geo = { P, Q, pts: sectorPts(A, [sp.Q.slant, phiQ], 72, map), len: `전개류 k=${k} · 길이 ≈ ${F(sc.length)}` + (k === sp.minimum_k ? ' (최단!)' : '') };
        } else {
          geo = { P, Q, pts: [P, V3(0, H / 2, 0), Q], invalid: true, len: 'k=+1 — 현이 부채꼴을 벗어나 무효 (꼭짓점 경유 ≈ ' + F(sp.P.slant + sp.Q.slant) + ')' };
        }
      }
    }
    function boardCone() {
      const sp = SP.cone, lp = SP.cone_loop;
      const loop = sub.prob === 'loop';
      const c = loop ? (sub.shape === 'flat' ? lp.flat : lp.sharp) : sp;
      const L = c.slant_height, phiMax = c.sector_angle;
      const sc = 104 / L, cx = 142, cy = 130;
      const rot = -Math.PI / 2 - phiMax / 2; // 부채꼴을 위쪽 중앙 정렬
      const g = svg('0 0 284 190');
      const A0 = rot, A1 = rot + phiMax;
      poly(g, [[cx, cy], ...arcPath(cx, cy, L * sc, A0, A1)], ACC, {});
      const bp = a => [cx + L * sc * Math.cos(a), cy + L * sc * Math.sin(a)];
      if (loop) {
        const [x1, y1] = bp(A0), [x2, y2] = bp(A1);
        if (c.valid) { seg(g, x1, y1, x2, y2); dot(g, x1, y1); dot(g, x2, y2, AMBER); }
        else { seg(g, x1, y1, x2, y2, { dash: '7 5' }); dot(g, x1, y1); dot(g, x2, y2); g.appendChild(gaegu(cx, cy - 12, '현이 부채꼴 밖!', AMBER, 16, 'middle')); }
        g.appendChild(gaegu(bp(A0)[0] - 16, bp(A0)[1] + 6, 'P'));
        g.appendChild(gaegu(bp(A1)[0] + 6, bp(A1)[1] + 6, 'P′', c.valid ? AMBER : INK));
        g.appendChild(gaegu(142, 182, `중심각 ${(phiMax * 180 / Math.PI).toFixed(1)}° ${c.valid ? '< 180° → 현 = 최단' : '> 180° → 실이 미끄러진다'}`, INK, 14, 'middle'));
      } else {
        const k = sub.seam == null ? 0 : sub.seam;
        const phiQ = sp.Q.theta * sp.base_radius / L;
        const pP = [cx + sp.P.slant * sc * Math.cos(A0), cy + sp.P.slant * sc * Math.sin(A0)];
        const pP2 = [cx + sp.P.slant * sc * Math.cos(A1), cy + sp.P.slant * sc * Math.sin(A1)];
        const pQ = [cx + sp.Q.slant * sc * Math.cos(A0 + phiQ), cy + sp.Q.slant * sc * Math.sin(A0 + phiQ)];
        for (const scp of sp.seam_copies) {
          const from = scp.k === -1 ? pP2 : pP;
          const sel = scp.k === k;
          if (scp.k === 1) { // 무효 — 부채꼴 밖 유령 사본 방향으로 점선 (뷰박스 안까지만)
            const gA = A0 + phiQ + 2 * Math.PI * sp.base_radius / L;
            const gQ = [cx + sp.Q.slant * sc * Math.cos(gA), cy + sp.Q.slant * sc * Math.sin(gA)];
            const t = 0.55;
            seg(g, pP[0], pP[1], pP[0] + (gQ[0] - pP[0]) * t, pP[1] + (gQ[1] - pP[1]) * t, { stroke: sel ? AMBER : 'rgba(65,96,143,0.4)', dash: '7 5', w: sel ? 2.4 : 1.4 });
          } else {
            seg(g, from[0], from[1], pQ[0], pQ[1], { stroke: sel ? AMBER : 'rgba(65,96,143,0.45)', w: sel ? 2.6 : 1.6 });
          }
        }
        dot(g, pP[0], pP[1]); dot(g, pP2[0], pP2[1]); dot(g, pQ[0], pQ[1], AMBER);
        g.appendChild(gaegu(pP[0] - 18, pP[1] + 4, 'P'));
        g.appendChild(gaegu(pP2[0] + 6, pP2[1] + 4, 'P′'));
        g.appendChild(gaegu(pQ[0] + 6, pQ[1] - 6, 'Q', AMBER));
        g.appendChild(gaegu(142, 182, '이음선 양쪽 사본 — 짧은 쪽이 최단', INK, 14.5, 'middle'));
      }
      return g;
    }

    function applyFrustum() {
      const fp = SP.frustum_loop;
      const c = sub.shape === 'slip' ? fp.slipped : fp.standard;
      const R = c.bottom_radius, r = c.top_radius, h = c.height, L1 = c.outer_slant, H = c.apex_height;
      e.setLathe({ components: [{ kind: 'polygon', points: [[0, -h / 2], [R, -h / 2], [r, h / 2], [0, h / 2]] }] }, 360);
      const map = coneMap(R, L1, -h / 2 + H, H);
      const P = map(L1, 0);
      if (c.valid) {
        geo = { P, Q: P, pts: sectorPts([L1, 0], [L1, c.sector_angle], 72, map), len: '한 바퀴 최단 = 2L₁·sin(φ/2) ≈ ' + F(c.loop_length) };
      } else {
        const rim = [];
        for (let i = 0; i <= 64; i++) { const a = i / 64 * 2 * Math.PI; rim.push(V3(r * Math.cos(a), h / 2, r * Math.sin(a))); }
        geo = { P, Q: P, pts: rim, invalid: true, len: '중심각 > 180° — 실이 위로 미끄러져 벗겨진다 (하한: 윗면 둘레 2πr ≈ ' + F(2 * Math.PI * r) + ')' };
      }
    }
    function boardFrustum() {
      const fp = SP.frustum_loop;
      const c = sub.shape === 'slip' ? fp.slipped : fp.standard;
      const L1 = c.outer_slant, L2 = c.inner_slant, phi = c.sector_angle;
      const sc = 96 / L1, cx = 142, cy = c.valid ? 130 : 102;
      const rot = -Math.PI / 2 - phi / 2;
      const g = svg('0 0 284 190');
      const outer = arcPath(cx, cy, L1 * sc, rot, rot + phi);
      const inner = arcPath(cx, cy, L2 * sc, rot + phi, rot);
      poly(g, [...outer, ...inner], ACC, {});
      const bp = (rr, a) => [cx + rr * sc * Math.cos(a), cy + rr * sc * Math.sin(a)];
      const [x1, y1] = bp(L1, rot), [x2, y2] = bp(L1, rot + phi);
      if (c.valid) { seg(g, x1, y1, x2, y2); dot(g, x1, y1); dot(g, x2, y2, AMBER); }
      else { seg(g, x1, y1, x2, y2, { dash: '7 5' }); dot(g, x1, y1); dot(g, x2, y2); }
      g.appendChild(gaegu(x1 - 16, y1 + 6, 'P'));
      g.appendChild(gaegu(x2 + 6, y2 + 6, 'P′', c.valid ? AMBER : INK));
      g.appendChild(gaegu(142, 182, c.valid
        ? `현이 안쪽 호를 비껴간다 (${F(c.chord_clearance)} ≥ ${F(c.inner_slant)})`
        : `중심각 ${(phi * 180 / Math.PI).toFixed(1)}° > 180° → 실이 벗겨진다`, INK, 14.5, 'middle'));
      return g;
    }

    function applySphere() {
      const sp = SP.sphere, R = sp.radius, half = sp.central_angle / 2;
      e.setLathe({ components: [{ kind: 'semicircle', radius: R, samples: 48 }] }, 360);
      const ang = t => -half + sp.central_angle * t;
      const P = V3(R * Math.cos(-half), R * Math.sin(-half), 0), Q = V3(R * Math.cos(half), R * Math.sin(half), 0);
      if (mode === 'interior') geo = { P, Q, pts: [P, Q], len: '내부 현 2r·sin(θ/2) ≈ ' + F(sp.interior_chord) };
      else {
        const pts = [];
        for (let i = 0; i <= 48; i++) { const a = ang(i / 48); pts.push(V3(R * Math.cos(a), R * Math.sin(a), 0)); }
        geo = { P, Q, pts, len: '대원의 짧은 호 rθ = π ≈ ' + F(sp.surface_short_arc) };
      }
    }
    function boardSphere() {
      const sp = SP.sphere, Rr = 74, cx = 142, cy = 96, half = sp.central_angle / 2;
      const g = svg('0 0 284 190');
      g.appendChild(el('circle', { cx, cy, r: Rr, fill: ACC, stroke: INK, 'stroke-width': 1.4 }));
      const pP = [cx + Rr * Math.cos(Math.PI - half), cy - Rr * Math.sin(Math.PI - half)];
      const pQ = [cx + Rr * Math.cos(Math.PI + half), cy - Rr * Math.sin(Math.PI + half)];
      polyline(g, arcPath(cx, cy, Rr, Math.PI - half, Math.PI + half), { stroke: AMBER, w: 2.6 });
      seg(g, pP[0], pP[1], pQ[0], pQ[1], { stroke: 'rgba(65,96,143,0.7)', w: 1.8, dash: '6 4' });
      dot(g, pP[0], pP[1]); dot(g, pQ[0], pQ[1], AMBER);
      g.appendChild(gaegu(pP[0] + 8, pP[1] - 6, 'P'));
      g.appendChild(gaegu(pQ[0] + 8, pQ[1] + 14, 'Q', AMBER));
      g.appendChild(gaegu(142, 182, '구는 펼칠 수 없다 — 최단은 대원의 짧은 호', INK, 14.5, 'middle'));
      return g;
    }

    // ── 케이스 레지스트리 ──
    const CASES = {
      cube: { name: '정육면체', apply: applyCube, board: boardCube, modes: ['interior', 'surface', 'edge'] },
      cuboid: { name: '직육면체 1×2×3', apply: applyCuboid, board: boardCuboid, modes: ['interior', 'surface', 'edge'] },
      tetra: { name: '정사면체', apply: () => applyPlatonic('PLATONIC_TETRA'), board: () => boardRhombus('PLATONIC_TETRA'), modes: ['interior', 'surface', 'edge'] },
      octa: { name: '정팔면체', apply: () => applyPlatonic('PLATONIC_OCTA'), board: () => boardRhombus('PLATONIC_OCTA'), modes: ['interior', 'surface', 'edge'] },
      cylinder: { name: '원기둥', apply: applyCylinder, board: boardCylinder, modes: ['interior', 'surface'] },
      cone: { name: '원뿔', apply: applyCone, board: boardCone, modes: [] },
      frustum: { name: '원뿔대', apply: applyFrustum, board: boardFrustum, modes: [] },
      sphere: { name: '구', apply: applySphere, board: boardSphere, modes: ['interior', 'surface'] },
    };

    const NOTES = {
      cube: () => ({
        stats: [{ k: '내부', v: '√3a' }, { k: '겉면', v: '√5a' }, { k: '모서리', v: '3a' }, { k: '함정', v: '√10a' }],
        body: '입체의 겉면을 따라 두 점을 잇는 최단 경로는, 겉면을 평면에 펼친 전개도 위에서 두 점을 잇는 선분이 된다. 단, 어느 전개도를 쓰는지가 중요하다.',
        question: '세 면 띠의 대각선 √10·a 는 왜 답이 아닐까?',
        answer: '그 전개도에서 띠의 먼 꼭짓점은 Q가 아니라 다른 꼭짓점이기 때문이다. 다시 접어 보면 선분의 끝이 Q에 닿지 않는다. 올바른 두 면 전개의 선분은 공통 모서리를 중점에서 지나며 길이 √5·a로, 모서리 경로 3a보다 짧다.',
      }),
      cuboid: () => ({
        stats: [{ k: '√18', v: F(Math.sqrt(18)) }, { k: '√20', v: F(Math.sqrt(20)) }, { k: '√26', v: F(Math.sqrt(26)) }, { k: '내부', v: '√14' }],
        body: '직육면체 1×2×3의 마주 보는 꼭짓점 사이에는 서로 다른 두-면 전개가 세 가지 있고, 전개마다 선분의 길이가 다르다. 겉면 최단은 그중 가장 짧은 것이다.',
        question: '세 전개 중 어느 것이 최단이 될까? 규칙을 찾아보자.',
        answer: '두 짧은 치수(1과 2)가 펼쳐져 합쳐지는 전개 — 즉 가장 긴 모서리(3)를 공통 모서리로 하는 전개가 최단이다. √((1+2)²+3²) = √18 < √20 < √26.',
      }),
      tetra: () => ({
        stats: [{ k: '내부', v: 'a/√2' }, { k: '겉면', v: 'a' }, { k: '모서리', v: '2a' }, { k: '동률', v: '4개' }],
        body: '정사면체에서 꼬인 위치에 있는 두 모서리의 중점 사이를 겉면으로 잇는다. 인접한 두 정삼각형을 공통 모서리로 펼치면 마름모가 되고, 최단 경로는 그 안의 선분이다.',
        question: '겉면 최단 경로는 몇 개나 있을까?',
        answer: '길이가 정확히 a인 경로가 4개 있다. 네 대칭 방향의 마름모 전개가 모두 같은 길이를 주기 때문 — 최단 경로는 하나뿐이라는 법이 없다.',
      }),
      octa: () => ({
        stats: [{ k: '내부', v: '√2a' }, { k: '겉면', v: '√3a' }, { k: '모서리', v: '2a' }],
        body: '정팔면체의 마주 보는 두 꼭짓점을 겉면으로 잇는다. 두 정삼각형을 펼친 마름모의 긴 대각선이 최단 경로이며, 공통 모서리를 중점에서 지난다.',
        question: '내부·겉면·모서리 세 경로의 길이를 √ 하나로 각각 나타내면?',
        answer: '내부 √2·a, 겉면 √3·a, 모서리 √4·a(=2a) — 놀랍게도 √2, √3, √4 순서로 나란히 늘어난다.',
      }),
      cylinder: () => ({
        stats: [{ k: 'k=−1', v: F(SP.cylinder.periodic_copies[0].length) }, { k: 'k=0', v: F(SP.cylinder.surface_minimum) }, { k: 'k=+1', v: F(SP.cylinder.periodic_copies[2].length) }],
        body: '원기둥 옆면을 펼치면 직사각형 띠가 되고, 같은 띠가 옆으로 무한히 이어진다고 생각할 수 있다. 감는 방향과 횟수마다 Q의 복사본이 하나씩 생기며, 각 복사본까지의 선분이 서로 다른 감김의 경로다.',
        question: '반대 방향으로 감는 경로(k=−1)는 왜 더 길까?',
        answer: '전개 띠에서 Q(−1) 복사본이 더 멀리 있기 때문이다. 가로 이동량 |θ+2πk|·r가 커질수록 선분이 길어지므로, 이 문제에서는 k=0(짧게 감기)이 최단이다.',
      }),
      cone: () => sub.prob === 'loop' ? ({
        stats: [{ k: '중심각', v: (sub.shape === 'flat' ? (SP.cone_loop.flat.sector_angle * 180 / Math.PI).toFixed(1) : (SP.cone_loop.sharp.sector_angle * 180 / Math.PI).toFixed(1)) + '°' }, { k: '조건', v: 'l > 2r' }],
        body: '밑면 둘레의 점 P에서 옆면을 한 바퀴 감아 다시 P로 돌아오는 실을 팽팽하게 당긴다. 옆면을 펼친 부채꼴에서 두 경계 반지름 위의 같은 점 P, P′을 잇는 현이 그 실이다.',
        question: '어떤 원뿔에서는 실을 팽팽하게 감을 수 없다. 언제일까?',
        answer: '부채꼴 중심각이 180°를 넘을 때 — 즉 모선이 밑면 지름보다 짧을 때(l < 2r)다. 그때는 현이 부채꼴 밖을 지나므로 팽팽한 실이 존재하지 않고, 당길수록 실이 꼭짓점 쪽으로 미끄러진다.',
      }) : ({
        stats: SP.cone.seam_copies.map(c => ({ k: 'k=' + (c.k > 0 ? '+' : '') + c.k, v: c.valid ? F(c.length) : '무효' })),
        body: '원뿔 옆면 위 두 점 사이의 최단 경로. 옆면을 이음선에서 잘라 펼친 부채꼴에서, P는 두 경계 반지름 양쪽에 복사본이 생긴다 — 이음선의 왼쪽으로 도는 경로와 오른쪽으로 도는 경로다.',
        question: '한 바퀴 더 감는 경로(k=+1)는 왜 무효일까?',
        answer: '전개했을 때 두 점의 각도 차가 180°를 넘어 현이 부채꼴 영역을 벗어나기 때문이다. 그 감김류에서 실현 가능한 최단은 꼭짓점을 지나는 꺾인 경로로 퇴화한다.',
      }),
      frustum: () => ({
        stats: sub.shape === 'slip'
          ? [{ k: '중심각', v: (SP.frustum_loop.slipped.sector_angle * 180 / Math.PI).toFixed(1) + '°' }, { k: '하한', v: '2πr' }]
          : [{ k: '중심각', v: (SP.frustum_loop.standard.sector_angle * 180 / Math.PI).toFixed(1) + '°' }, { k: '최단', v: F(SP.frustum_loop.standard.loop_length) }],
        body: '원뿔대(전등갓 모양) 옆면에 실을 한 바퀴 감는다. 옆면을 펼치면 고리꼴(도넛 조각) 부채꼴이 되고, 실은 바깥 호의 두 끝점을 잇는 현이다. 현이 안쪽 호(윗면 테두리)를 침범하지 않아야 실이 실제로 옆면 위에 놓인다.',
        question: '납작한 원뿔대에서는 실이 어떻게 될까?',
        answer: '중심각이 180°를 넘으면 팽팽한 현이 존재하지 않는다. 실을 당기면 좁은 위쪽으로 밀려 올라가 결국 벗겨진다 — 둘레의 하한은 윗면 원둘레 2πr이다.',
      }),
      sphere: () => ({
        stats: [{ k: '내부 현', v: F(SP.sphere.interior_chord) }, { k: '대원 호', v: 'π' }],
        body: '구는 지금까지의 입체와 달리 겉면을 평면에 펼칠 수 없다 — 찢거나 늘이지 않고는 전개도가 없다. 그래서 "펼쳐서 선분" 전략이 통하지 않는다.',
        question: '전개도가 없다면, 구 겉면의 최단 경로는 무엇일까?',
        answer: '두 점과 구의 중심을 지나는 평면으로 자른 단면 원 — 대원 — 의 짧은 호다. 비행기가 지구 위에서 대권 항로를 따라 나는 것과 같은 원리다.',
      }),
    };

    // ── 렌더링 ──
    function redraw(f) {
      if (!geo) return;
      e.clearOverlays();
      e.addDot(geo.P, 0x26324b, 0.11);
      e.addDot(geo.Q, 0xb97a2e, 0.11);
      if (geo.wrongEnd) e.addDot(geo.wrongEnd, 0x41608f, 0.13);
      e.addPath(geo.pts.slice(0, Math.max(2, Math.ceil(geo.pts.length * f))), geo.invalid ? { color: 0x26324b, r: 0.032 } : { color: 0xb97a2e, r: 0.05 });
    }
    function apply(next) {
      if (next) solid = next;
      const C = CASES[solid];
      if (C.modes.length && !C.modes.includes(mode)) mode = C.modes.includes('surface') ? 'surface' : C.modes[0];
      e.clearSolid();
      C.apply();
      e.frame();
      redraw(1);
      const N = NOTES[solid]();
      ctx.panels.board(
        solid === 'sphere' ? '칠판 · 대원에서 보기' : '칠판 · 전개도에서 보기',
        solid === 'sphere' ? '구는 펼칠 수 없다 — 최단은 대원의 호'
          : geo.invalid ? '이 경우는 전개도의 선분이 실현되지 않는다' : '겉면 최단 경로는 전개도에서 선분이 된다',
        C.board());
      ctx.panels.note({ kicker: 'Ⅲ단원 심화 탐구 · 09', title: '겉면 위의 최단거리', ...N });
      renderDock();
    }
    function renderDock() {
      const C = CASES[solid];
      const controls = [{
        type: 'select',
        groups: [
          { label: '다면체 — 평면 전개', opts: [{ id: 'cube', name: '정육면체' }, { id: 'cuboid', name: '직육면체 1×2×3' }, { id: 'tetra', name: '정사면체' }, { id: 'octa', name: '정팔면체' }] },
          { label: '회전체 — 곡면 전개', opts: [{ id: 'cylinder', name: '원기둥' }, { id: 'cone', name: '원뿔' }, { id: 'frustum', name: '원뿔대' }, { id: 'sphere', name: '구' }] },
        ],
        value: solid,
        onChange: id => { sub = {}; apply(id); },
      }];
      if (C.modes.length) {
        controls.push({ type: 'seg', label: '경로', items: [
          { label: '내부', active: mode === 'interior', on: () => { mode = 'interior'; apply(); } },
          { label: '겉면', active: mode === 'surface', on: () => { mode = 'surface'; apply(); } },
          ...(C.modes.includes('edge') ? [{ label: '모서리', active: mode === 'edge', on: () => { mode = 'edge'; apply(); } }] : []),
        ]});
      }
      if (solid === 'cube' && mode === 'surface') controls.push({ type: 'seg', label: '전개', items: [
        { label: '두 면 √5', active: sub.unfold !== 'strip', on: () => { sub.unfold = 'two'; apply(); } },
        { label: '세 면 띠 √10', active: sub.unfold === 'strip', on: () => { sub.unfold = 'strip'; apply(); } },
      ]});
      if (solid === 'cuboid' && mode === 'surface') controls.push({ type: 'seg', label: '전개', items:
        SP.cuboid.surface_candidates.map((c, i) => ({ label: '√' + Math.round(c.length ** 2), active: (sub.cand || 0) === i, on: () => { sub.cand = i; apply(); } })),
      });
      if (solid === 'cylinder' && mode === 'surface') controls.push({ type: 'seg', label: '감김', items:
        [-1, 0, 1].map(k => ({ label: 'k=' + (k > 0 ? '+' : '') + k, active: (sub.wind || 0) === k, on: () => { sub.wind = k; apply(); } })),
      });
      if (solid === 'cone') {
        controls.push({ type: 'seg', label: '문제', items: [
          { label: '두 점 사이', active: sub.prob !== 'loop', on: () => { sub.prob = 'pts'; apply(); } },
          { label: '실 감기 한 바퀴', active: sub.prob === 'loop', on: () => { sub.prob = 'loop'; apply(); } },
        ]});
        if (sub.prob === 'loop') controls.push({ type: 'seg', label: '모양', items: [
          { label: '뾰족한 원뿔', active: sub.shape !== 'flat', on: () => { sub.shape = 'sharp'; apply(); } },
          { label: '납작한 원뿔', active: sub.shape === 'flat', on: () => { sub.shape = 'flat'; apply(); } },
        ]});
        else controls.push({ type: 'seg', label: '전개류', items:
          [-1, 0, 1].map(k => ({ label: 'k=' + (k > 0 ? '+' : '') + k, active: (sub.seam == null ? 0 : sub.seam) === k, on: () => { sub.seam = k; apply(); } })),
        });
      }
      if (solid === 'frustum') controls.push({ type: 'seg', label: '모양', items: [
        { label: '표준', active: sub.shape !== 'slip', on: () => { sub.shape = 'std'; apply(); } },
        { label: '납작 (벗겨짐)', active: sub.shape === 'slip', on: () => { sub.shape = 'slip'; apply(); } },
      ]});
      controls.push({ type: 'readout', text: geo.len });
      ctx.panels.dock(controls);
    }

    apply('cube');
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
