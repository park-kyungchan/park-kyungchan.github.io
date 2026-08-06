// 겉면 최단거리 정확값 생성기 — E.shortest_paths에 새 케이스(직육면체·원뿔 실감기·
// 원뿔대 실감기·정사면체·정팔면체)를 닫힌 공식으로 계산해 추가한다.
// 기존 4개 항목(cube/cylinder/cone/sphere)은 수정하지 않고 재계산으로 회귀 검증만 한다.
// 다면체 값은 P003_DATA.solids의 실제 3D 지오메트리를 전개해 교차 검증한다.
//
// 사용:  node tools/generate-shortest-paths.mjs           # 검증만
//        node tools/generate-shortest-paths.mjs --write   # 데이터 파일에 삽입
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = join(ROOT, 'platform/labs/solid/data/p003-data.js');
globalThis.window = globalThis;
const { P003_DATA: D, P003_R009_EXACT: E } = await import(DATA_PATH);

const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = a => Math.hypot(...a);
const mid = (a, b) => a.map((x, i) => (x + b[i]) / 2);
const near = (x, y, eps = 1e-9) => Math.abs(x - y) < eps;
const assert = (cond, msg) => { if (!cond) throw new Error('검증 실패: ' + msg); };

// ── 기존 항목 회귀 검증 ─────────────────────────
{
  const c = E.shortest_paths.cube; // 단위 정육면체
  assert(near(c.interior_distance, Math.sqrt(3)), 'cube interior √3');
  assert(near(c.surface_distance, Math.sqrt(5)), 'cube surface √5');
  const strip = c.surface_candidates.find(x => x.id === 'three_face_strip');
  assert(near(strip.length, Math.sqrt(10)) && strip.valid === false, 'cube strip √10 무효');
  const cy = E.shortest_paths.cylinder;
  for (const pc of cy.periodic_copies)
    assert(near(pc.length, Math.hypot((cy.Q.theta + 2 * Math.PI * pc.k) * cy.radius, cy.height)), `cylinder k=${pc.k}`);
  const co = E.shortest_paths.cone;
  assert(near(co.sector_angle, 2 * Math.PI * co.base_radius / co.slant_height), 'cone 중심각');
  for (const sc of co.seam_copies) {
    const dphi = sc.sector_delta_angle;
    if (sc.valid) assert(near(sc.length, Math.sqrt(co.P.slant ** 2 + co.Q.slant ** 2 - 2 * co.P.slant * co.Q.slant * Math.cos(dphi))), `cone k=${sc.k}`);
    else assert(Math.abs(dphi) > Math.PI, 'cone 무효류는 |Δφ|>π');
  }
  const sp = E.shortest_paths.sphere;
  assert(near(sp.interior_chord, 2 * sp.radius * Math.sin(sp.central_angle / 2)), 'sphere 현');
  assert(near(sp.surface_short_arc, sp.radius * sp.central_angle), 'sphere 호');
  console.log('✓ 기존 4개 항목(cube/cylinder/cone/sphere) 회귀 검증 통과');
}

// ── 다면체 전개 교차 검증 헬퍼 ──────────────────
// 실제 solids 지오메트리에서 인접 두 면을 공통 모서리로 평면 전개해 두 점 사이 거리를 잰다.
function unfoldPairDistance(solid, faceA, faceB, p3A, p3B) {
  // p3A는 faceA 위의 3D 점, p3B는 faceB 위의 3D 점
  const V = solid.vertices;
  const shared = solid.faces[faceA].filter(v => solid.faces[faceB].includes(v));
  assert(shared.length === 2, '공통 모서리 필요');
  const [va, vb] = shared;
  const embed = (face, pt3) => {
    // 면 평면의 정규직교 기저: 원점 va, x̂ = vb−va 방향
    const O = V[va], xv = sub(V[vb], O), xl = norm(xv), xh = xv.map(x => x / xl);
    const other = solid.faces[face].find(v => v !== va && v !== vb);
    let yv = sub(V[other], O);
    yv = sub(yv, xh.map(x => x * dot(yv, xh)));
    const yl = norm(yv), yh = yv.map(x => x / yl);
    const d = sub(pt3, O);
    return { p: [dot(d, xh), dot(d, yh)], ySign: 1 };
  };
  const A = embed(faceA, p3A), B = embed(faceB, p3B);
  // 전개: faceB를 공통 모서리 반대쪽으로 — B의 y를 뒤집는다
  return Math.hypot(A.p[0] - B.p[0], A.p[1] + B.p[1]);
}

const R10 = x => Math.round(x * 1e10) / 1e10;
const entries = {};

// ── 직육면체 1×2×3 · 마주 보는 꼭짓점 ───────────
{
  const [a, b, c] = [1, 2, 3];
  // first_span = 전개도에서 P가 놓인 첫 띠(P쪽 면)의 폭 — 칠판 렌더가 두 띠를 나눠 칠할 때 쓴다
  const cands = [
    { id: 'unfold_ab', flat: [a, b], edge: 'c', first: b, len: Math.hypot(a + b, c) },
    { id: 'unfold_ca', flat: [c, a], edge: 'b', first: c, len: Math.hypot(c + a, b) },
    { id: 'unfold_bc', flat: [b, c], edge: 'a', first: c, len: Math.hypot(b + c, a) },
  ];
  assert(near(cands[0].len, Math.sqrt(18)) && near(cands[1].len, Math.sqrt(20)) && near(cands[2].len, Math.sqrt(26)), 'cuboid 후보값');
  const minLen = Math.min(...cands.map(x => x.len));
  assert(near(minLen, cands[0].len), 'cuboid 최단은 두 짧은 치수를 펼친 전개');
  entries.cuboid = {
    case_id: 'CUBOID-OPPOSITE-VERTICES', label: '직육면체 · 마주 보는 꼭짓점',
    dims: { a, b, c },
    interior_distance: R10(Math.hypot(a, b, c)),
    edge_only_distance: a + b + c,
    surface_candidates: cands.map(x => ({
      id: x.id, label: `${x.flat[0]}+${x.flat[1]} 전개 (공통 모서리 ${x.edge})`,
      spans_sum: x.flat[0] + x.flat[1], common_edge: { c, b, a }[x.edge],
      first_span: x.first, length: R10(x.len), valid: true,
    })),
    surface_minimum: R10(minLen),
    minimum_rule: '두 짧은 치수가 펼쳐지는(가장 긴 모서리를 공통 모서리로 하는) 전개가 최단',
  };
}

// ── 원뿔 실 감기 (한 바퀴 왕복) ─────────────────
{
  const sharp = { r: 1, l: 4 };
  const th1 = 2 * Math.PI * sharp.r / sharp.l;
  assert(th1 < Math.PI, 'sharp 원뿔 유효');
  const flat = { r: E.shortest_paths.cone.base_radius, l: E.shortest_paths.cone.slant_height };
  const th2 = E.shortest_paths.cone.sector_angle;
  assert(th2 > Math.PI, 'flat 원뿔 무효');
  entries.cone_loop = {
    case_id: 'CONE-LATERAL-LOOP', label: '원뿔 옆면 실 감기 — 한 바퀴 돌아 제자리로',
    validity_condition: 'sector_angle < π ⇔ slant_height > 2 × base_radius',
    sharp: {
      base_radius: sharp.r, slant_height: sharp.l, height: R10(Math.sqrt(sharp.l ** 2 - sharp.r ** 2)),
      sector_angle: R10(th1), loop_length: R10(2 * sharp.l * Math.sin(th1 / 2)),
      closest_slant_from_apex: R10(sharp.l * Math.cos(th1 / 2)), valid: true,
    },
    flat: {
      base_radius: flat.r, slant_height: R10(flat.l), height: E.shortest_paths.cone.height ?? 2.4,
      sector_angle: R10(th2), valid: false,
      reason: `sector_angle = ${th2.toFixed(6)} > π — 전개 부채꼴에서 두 경계 반지름의 같은 점을 잇는 현이 부채꼴 밖을 지나므로 팽팽한 실이 존재하지 않는다. 실은 꼭짓점 쪽으로 미끄러지며, 이 감김류의 하한은 꼭짓점 왕복 2l = ${(2 * flat.l).toFixed(6)}`,
    },
  };
  assert(near(entries.cone_loop.sharp.loop_length, 4 * Math.SQRT2), 'cone_loop 4√2');
}

// ── 원뿔대 실 감기 ─────────────────────────────
{
  const std = { R: 1.5, r: 0.72, h: 3.0 }; // revolution_profiles.frustum과 동일
  const fx = E.revolution_profiles.frustum.exact;
  assert(fx.bottom_radius === std.R && fx.top_radius === std.r && fx.height === std.h, 'frustum 프로필 일치');
  const H = std.h * std.R / (std.R - std.r);
  const L1 = Math.hypot(std.R, H), L2 = L1 * std.r / std.R;
  const phi = 2 * Math.PI * std.R / L1;
  const loop = 2 * L1 * Math.sin(phi / 2);
  const clearance = L1 * Math.cos(phi / 2);
  assert(phi < Math.PI, 'frustum std 중심각 유효');
  assert(clearance >= L2, 'frustum std 현이 안쪽 호를 침범하지 않음');
  const slip = { R: 1.5, r: 0.6, h: 1.2 };
  const Hs = slip.h * slip.R / (slip.R - slip.r);
  const L1s = Math.hypot(slip.R, Hs), L2s = L1s * slip.r / slip.R;
  const phis = 2 * Math.PI * slip.R / L1s;
  assert(phis > Math.PI, 'frustum slip 무효');
  entries.frustum_loop = {
    case_id: 'FRUSTUM-LATERAL-LOOP', label: '원뿔대 옆면 실 감기',
    scope: 'ENRICHMENT_NOT_ASSESSMENT',
    validity_condition: 'sector_angle < π 그리고 현의 꼭짓점 최소거리 L1·cos(φ/2) ≥ L2',
    standard: {
      bottom_radius: std.R, top_radius: std.r, height: std.h,
      apex_height: R10(H), outer_slant: R10(L1), inner_slant: R10(L2),
      sector_angle: R10(phi), loop_length: R10(loop), chord_clearance: R10(clearance), valid: true,
    },
    slipped: {
      bottom_radius: slip.R, top_radius: slip.r, height: slip.h,
      apex_height: R10(Hs), outer_slant: R10(L1s), inner_slant: R10(L2s),
      sector_angle: R10(phis), valid: false,
      reason: `sector_angle = ${phis.toFixed(6)} > π — 팽팽한 실이 존재하지 않고 실은 좁은 위쪽으로 미끄러져 벗겨진다. 둘레의 하한은 윗면 원둘레 2πr = ${(2 * Math.PI * slip.r).toFixed(6)}`,
    },
  };
}

// ── 정사면체 · 맞모서리 중점 (실지오메트리 교차 검증) ──
{
  const T = D.solids.PLATONIC_TETRA, V = T.vertices;
  const a3 = norm(sub(V[0], V[1])); // 모서리 길이
  // 맞모서리: 공통 꼭짓점이 없는 모서리 쌍 (0,1)-(2,3)
  const M = mid(V[0], V[1]), N = mid(V[2], V[3]);
  const interior = norm(sub(M, N)) / a3;
  assert(near(interior, 1 / Math.SQRT2), '정사면체 내부 a/√2');
  // 겉면: M이 있는 면과 N이 있는 면 중 인접한 쌍으로 전개 — faces [2,1,0],[1,3,0],[3,2,0],[2,3,1]
  // M(0-1 중점)은 면0 [2,1,0]에, N(2-3 중점)은 면3 [2,3,1]에 있고 공통 모서리는 (1,2)
  const surf = unfoldPairDistance(T, 0, 3, M, N) / a3;
  assert(near(surf, 1), `정사면체 겉면 = a (실측 ${surf})`);
  entries.tetrahedron = {
    case_id: 'TETRA-OPPOSITE-EDGE-MIDPOINTS', label: '정사면체 · 맞모서리의 중점 사이',
    edge_length: 1,
    interior_distance: R10(1 / Math.SQRT2),
    surface_distance: 1,
    edge_only_distance: 2,
    surface_crossing: '공통 모서리의 중점',
    equal_geodesic_count: 4,
    unfold: '인접한 두 정삼각형을 공통 모서리로 펼친 마름모에서 두 중점을 잇는 선분',
  };
}

// ── 정팔면체 · 마주 보는 꼭짓점 (실지오메트리 교차 검증) ──
{
  const O = D.solids.PLATONIC_OCTA, V = O.vertices;
  const a3 = norm(sub(V[O.faces[0][0]], V[O.faces[0][1]]));
  // 마주 보는 꼭짓점 쌍: 내적이 최소인 쌍
  let P = 0, Q = 1, best = Infinity;
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const d = dot(V[i], V[j]) / (norm(V[i]) * norm(V[j]));
    if (d < best) { best = d; P = i; Q = j; }
  }
  const interior = norm(sub(V[P], V[Q])) / a3;
  assert(near(interior, Math.SQRT2), '정팔면체 내부 √2·a');
  // P를 포함하는 면과, 그 면과 모서리를 공유하며 Q를 포함하는 면을 찾아 전개
  const fP = O.faces.findIndex(f => f.includes(P));
  const fQ = O.faces.findIndex(f => f.includes(Q) && O.faces[fP].filter(v => f.includes(v)).length === 2);
  assert(fQ >= 0, '정팔면체 인접 면 쌍');
  const surf = unfoldPairDistance(O, fP, fQ, V[P], V[Q]) / a3;
  assert(near(surf, Math.sqrt(3)), `정팔면체 겉면 = √3·a (실측 ${surf})`);
  entries.octahedron = {
    case_id: 'OCTA-OPPOSITE-VERTICES', label: '정팔면체 · 마주 보는 꼭짓점 사이',
    edge_length: 1,
    interior_distance: R10(Math.SQRT2),
    surface_distance: R10(Math.sqrt(3)),
    edge_only_distance: 2,
    surface_crossing: '공통 모서리의 중점',
    equal_geodesic_count: 4,
    unfold: '이웃한 두 정삼각형을 공통 모서리로 펼친 마름모의 긴 대각선',
  };
}

for (const [k, v] of Object.entries(entries)) console.log(`✓ ${k}: ${v.label}`);

if (process.argv.includes('--write')) {
  const src = readFileSync(DATA_PATH, 'utf8');
  for (const k of Object.keys(entries)) if (src.includes(`"${entries[k].case_id}"`)) throw new Error(`${k} 항목이 이미 존재합니다`);
  const anchor = '"shortest_paths":{';
  const i = src.indexOf(anchor);
  assert(i >= 0, 'shortest_paths 앵커');
  let j = i + anchor.length - 1, d = 0;
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } }
  const add = Object.entries(entries).map(([k, v]) => `"${k}":${JSON.stringify(v)}`).join(',');
  const out = src.slice(0, j) + ',' + add + src.slice(j);
  writeFileSync(DATA_PATH, out);
  console.log(`✓ ${DATA_PATH} 갱신 (${src.length} → ${out.length} bytes)`);
}
