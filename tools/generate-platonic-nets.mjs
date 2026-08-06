// 정다면체 전개도 생성기 — P003_DATA.solids의 실제 3D 지오메트리를 스패닝 트리로 전개한다.
// 생성 대상: PLATONIC_TETRA(큰 삼각형) · PLATONIC_OCTA(지그재그 스트립) ·
//            PLATONIC_DODECA(이중 장미) · PLATONIC_ICOSA(교과서 스트립: 5-10-5)
// 스키마는 기존 nets.PLATONIC_CUBE(R009 계보)와 동일: faces/hinges/boundary_edge_copies/
// edge_pairs/corners/assembly_faces/validation. 전개도 변 길이는 정육면체와 같은 0.96로 통일.
//
// 사용:  node tools/generate-platonic-nets.mjs           # 검증만 (stdout 요약)
//        node tools/generate-platonic-nets.mjs --write   # platform/labs/solid/data/p003-data.js 에 삽입
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = join(ROOT, 'platform/labs/solid/data/p003-data.js');
const NET_EDGE = 0.96; // 전개도 상 변 길이 (정육면체 전개도와 동일 스케일)
const TARGETS = ['PLATONIC_TETRA', 'PLATONIC_OCTA', 'PLATONIC_DODECA', 'PLATONIC_ICOSA'];

globalThis.window = globalThis;
const { P003_DATA: D } = await import(DATA_PATH);

// ── 벡터/쿼터니언 ──────────────────────────────
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => Math.hypot(...a);
const unit = a => { const n = norm(a); return a.map(x => x / n); };
const round10 = x => { const r = Math.round(x * 1e10) / 1e10; return Object.is(r, -0) ? 0 : r; };

// 회전행렬(열벡터 x̂ ŷ ẑ) → 쿼터니언 [x,y,z,w]
function matToQuat(x, y, z) {
  const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22;
  let qx, qy, qz, qw;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    qw = s / 4; qx = (m21 - m12) / s; qy = (m02 - m20) / s; qz = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    qw = (m21 - m12) / s; qx = s / 4; qy = (m01 + m10) / s; qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    qw = (m02 - m20) / s; qx = (m01 + m10) / s; qy = s / 4; qz = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    qw = (m10 - m01) / s; qx = (m02 + m20) / s; qy = (m12 + m21) / s; qz = s / 4;
  }
  return [qx, qy, qz, qw];
}
const quatRot = (q, v) => { // v' = q v q⁻¹,  q=[x,y,z,w]
  const [qx, qy, qz, qw] = q, u = [qx, qy, qz];
  const s = qw, uv = cross(u, v);
  return add(add(v.map(x => x * (s * s - dot(u, u))), u.map(x => x * 2 * dot(u, v))), uv.map(x => x * 2 * s));
};

// ── 면별 로컬 2D 좌표계 (등거리 임베딩) ─────────
// 원점=첫 꼭짓점, x̂=첫 변 방향, ẑ=면 법선(꼭짓점 순서 기준), ŷ=ẑ×x̂
function faceFrame(verts3, face) {
  const P = face.map(vi => verts3[vi]);
  let n = [0, 0, 0];
  for (let i = 0; i < P.length; i++) n = add(n, cross(P[i], P[(i + 1) % P.length]));
  const zhat = unit(n);
  const xhat = unit(sub(P[1], P[0]));
  const yhat = cross(zhat, xhat);
  const local = P.map(p => [dot(sub(p, P[0]), xhat), dot(sub(p, P[0]), yhat)]);
  return { local, xhat, yhat, zhat, origin: P[0] };
}

// ── 2D 강체 변환: (a1→b1, a2→b2) 정렬 (회전+평행이동, 반사 없음) ──
function rigid2D(a1, a2, b1, b2) {
  const va = [a2[0] - a1[0], a2[1] - a1[1]], vb = [b2[0] - b1[0], b2[1] - b1[1]];
  const th = Math.atan2(vb[1], vb[0]) - Math.atan2(va[1], va[0]);
  const c = Math.cos(th), s = Math.sin(th);
  const rot = p => [c * p[0] - s * p[1], s * p[0] + c * p[1]];
  const r1 = rot(a1);
  const t = [b1[0] - r1[0], b1[1] - r1[1]];
  return { theta: th, apply: p => { const r = rot(p); return [r[0] + t[0], r[1] + t[1]]; } };
}

// ── 볼록다각형 교차 넓이 (Sutherland–Hodgman) ──
const polyArea = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
function clipConvex(subject, clip) {
  const signed = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const C = signed(clip) > 0 ? clip : [...clip].reverse();
  let out = subject;
  for (let i = 0; i < C.length && out.length; i++) {
    const A = C[i], B = C[(i + 1) % C.length], inp = out; out = [];
    const side = p => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= -1e-12) out.push(P);
      if ((sp > 1e-12 && sq < -1e-12) || (sp < -1e-12 && sq > 1e-12)) {
        const t = sp / (sp - sq);
        out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
      }
    }
  }
  return out.length ? polyArea(out) : 0;
}

// ── 면 인접 그래프 ─────────────────────────────
function adjacency(solid) {
  const adj = solid.faces.map(() => []);
  solid.topology.edges.forEach((_e, k) => {
    const [fa, fb] = solid.topology.edge_incident_faces[k];
    adj[fa].push({ other: fb, edgeIdx: k });
    adj[fb].push({ other: fa, edgeIdx: k });
  });
  return adj;
}

// ── 스패닝 트리 (모양별 교과서형) ───────────────
// 반환: { root, edges: [{parent, child, edgeIdx}] } — edges는 전개 순서(부모 먼저)
function treeTetra(_solid, adj) { // 큰 삼각형: 면0 + 이웃 3
  const root = 0;
  return { root, edges: adj[0].map(({ other, edgeIdx }) => ({ parent: 0, child: other, edgeIdx })) };
}
function treeStrip(solid, adj) { // 지그재그 스트립: 면 인접(쌍대) 그래프의 해밀턴 경로
  const F = solid.faces.length;
  const path = [0];
  const seen = new Set([0]);
  (function dfs(u) {
    if (path.length === F) return true;
    for (const { other } of adj[u]) if (!seen.has(other)) {
      seen.add(other); path.push(other);
      if (dfs(other)) return true;
      seen.delete(other); path.pop();
    }
    return false;
  })(0);
  if (path.length !== F) throw new Error('해밀턴 경로 없음');
  const edges = [];
  for (let i = 1; i < path.length; i++) {
    const e = adj[path[i - 1]].find(a => a.other === path[i]);
    edges.push({ parent: path[i - 1], child: path[i], edgeIdx: e.edgeIdx });
  }
  return { root: 0, edges };
}
function treeDodeca(solid, adj) { // 이중 장미: A+꽃잎5 ↔ B+꽃잎5, 꽃잎 한 쌍으로 연결
  const A = 0;
  const petalsA = adj[A].map(a => a.other);
  const sharesWithA = f => solid.faces[f].some(v => solid.faces[A].includes(v));
  // 반대면 B: A와 꼭짓점을 공유하지 않고, 이웃(B의 꽃잎)들도 전부 A와 무관한 면
  const B = solid.faces.findIndex((_, f) => f !== A && !sharesWithA(f) &&
    adj[f].every(a => !sharesWithA(a.other)));
  const petalsB = adj[B].map(a => a.other);
  let link = null;
  for (const p of petalsA) { const q = adj[p].find(a => petalsB.includes(a.other)); if (q) { link = { p, q: q.other, edgeIdx: q.edgeIdx }; break; } }
  const edges = petalsA.map(p => ({ parent: A, child: p, edgeIdx: adj[A].find(a => a.other === p).edgeIdx }));
  edges.push({ parent: link.p, child: link.q, edgeIdx: link.edgeIdx });
  edges.push({ parent: link.q, child: B, edgeIdx: adj[B].find(a => a.other === link.q).edgeIdx });
  for (const q of petalsB) if (q !== link.q) edges.push({ parent: B, child: q, edgeIdx: adj[B].find(a => a.other === q).edgeIdx });
  return { root: A, edges };
}
function treeIcosa(solid, adj) { // 교과서 스트립: 북극 모자 5 + 적도 띠 10 + 남극 모자 5
  const vN = 0;
  const capN = solid.faces.map((f, i) => f.includes(vN) ? i : -1).filter(i => i >= 0);
  // 남극 = 북극과 기하학적으로 반대인 꼭짓점 (정다면체는 원점 중심 — 내적 최소)
  const vN3 = solid.vertices[vN];
  const vS = solid.vertices.reduce((best, v, i) => dot(v, vN3) < dot(solid.vertices[best], vN3) ? i : best, 0);
  const capS = solid.faces.map((f, i) => f.includes(vS) ? i : -1).filter(i => i >= 0);
  const band = solid.faces.map((_, i) => i).filter(i => !capN.includes(i) && !capS.includes(i));
  // 띠는 사이클: 인접 순서로 정렬
  const chain = [band[0]];
  while (chain.length < band.length) {
    const cur = chain[chain.length - 1];
    const next = adj[cur].map(a => a.other).find(o => band.includes(o) && !chain.includes(o));
    chain.push(next);
  }
  const edges = [];
  for (let i = 1; i < chain.length; i++) {
    const e = adj[chain[i - 1]].find(a => a.other === chain[i]);
    edges.push({ parent: chain[i - 1], child: chain[i], edgeIdx: e.edgeIdx });
  }
  for (const c of [...capN, ...capS]) {
    const e = adj[c].find(a => band.includes(a.other));
    edges.push({ parent: e.other, child: c, edgeIdx: e.edgeIdx });
  }
  return { root: chain[0], edges };
}
const TREE = { PLATONIC_TETRA: treeTetra, PLATONIC_OCTA: treeStrip, PLATONIC_DODECA: treeDodeca, PLATONIC_ICOSA: treeIcosa };

// ── 전개 ───────────────────────────────────────
function unfold(solid, { root, edges }) {
  const frames = solid.faces.map(f => faceFrame(solid.vertices, f));
  const placed = {}; // faceIdx → { pts2: 면 꼭짓점의 2D 좌표(면 순서), theta }
  placed[root] = { pts2: frames[root].local.map(p => [...p]), theta: 0, trans: [0, 0] };
  for (const { parent, child, edgeIdx } of edges) {
    const [va, vb] = solid.topology.edges[edgeIdx];
    const pFace = solid.faces[parent], cFace = solid.faces[child];
    const pA = placed[parent].pts2[pFace.indexOf(va)], pB = placed[parent].pts2[pFace.indexOf(vb)];
    const cA = frames[child].local[cFace.indexOf(va)], cB = frames[child].local[cFace.indexOf(vb)];
    const T = rigid2D(cA, cB, pA, pB);
    const pts2 = frames[child].local.map(T.apply);
    placed[child] = { pts2, theta: T.theta, trans: T.apply([0, 0]) };
  }
  return { frames, placed };
}

// ── 스키마 조립 + 검증 ─────────────────────────
function buildNet(solidId) {
  const solid = D.solids[solidId];
  const adj = adjacency(solid);
  const tree = TREE[solidId](solid, adj);
  const { frames, placed } = unfold(solid, tree);
  const F = solid.faces.length;
  const edge3D = norm(sub(solid.vertices[solid.topology.edges[0][0]], solid.vertices[solid.topology.edges[0][1]]));
  const scale = NET_EDGE / edge3D;

  // 스케일 적용 + 무게중심 원점 정렬
  let cx = 0, cy = 0, cn = 0;
  for (let f = 0; f < F; f++) for (const p of placed[f].pts2) { cx += p[0] * scale; cy += p[1] * scale; cn++; }
  cx /= cn; cy /= cn;
  const S = p => [round10(p[0] * scale - cx), round10(p[1] * scale - cy)];

  const fid = i => 'F' + String(i + 1).padStart(3, '0');
  const vid = i => 'V' + String(i + 1).padStart(3, '0');
  const eid = i => 'E' + String(i + 1).padStart(3, '0');

  const hingeEdges = new Map(tree.edges.map(e => [e.edgeIdx, e]));
  const faces = solid.faces.map((fv, f) => ({
    face_id: fid(f), source_face_index: f,
    vertex_ids: fv.map(vid),
    points: placed[f].pts2.map(S),
    side_count: fv.length,
  }));

  const hinges = tree.edges.map(({ child, edgeIdx }) => {
    const [va, vb] = solid.topology.edges[edgeIdx];
    const cFace = solid.faces[child], pts2 = placed[child].pts2;
    return { face_id: fid(child), solid_edge_id: eid(edgeIdx), source_vertices: [vid(va), vid(vb)],
      points: [S(pts2[cFace.indexOf(va)]), S(pts2[cFace.indexOf(vb)])], hinge: true };
  });

  const boundary = []; const pairs = {};
  let bSeq = 0;
  for (let f = 0; f < F; f++) {
    const fv = solid.faces[f];
    for (let j = 0; j < fv.length; j++) {
      const va = fv[j], vb = fv[(j + 1) % fv.length];
      const edgeIdx = solid.topology.edges.findIndex(e => (e[0] === va && e[1] === vb) || (e[0] === vb && e[1] === va));
      if (hingeEdges.has(edgeIdx)) continue;
      const copy_id = 'B' + String(++bSeq).padStart(3, '0');
      boundary.push({ face_id: fid(f), solid_edge_id: eid(edgeIdx), source_vertices: [vid(va), vid(vb)],
        points: [S(placed[f].pts2[j]), S(placed[f].pts2[(j + 1) % fv.length])], copy_id });
      (pairs[eid(edgeIdx)] ||= []).push(copy_id);
    }
  }

  const npIds = new Map(); const key = p => p.map(x => Math.round(x * 1e6)).join(',');
  const corners = [];
  for (let f = 0; f < F; f++) solid.faces[f].forEach((v, j) => {
    const point = S(placed[f].pts2[j]);
    if (!npIds.has(key(point))) npIds.set(key(point), 'NP' + String(npIds.size + 1).padStart(3, '0'));
    corners.push({ corner_id: `${fid(f)}-C${j + 1}`, face_id: fid(f), solid_vertex_id: vid(v), point, net_point_id: npIds.get(key(point)) });
  });

  const assembly_faces = solid.faces.map((_fv, f) => {
    const fr = frames[f], pl = placed[f];
    return {
      face_id: fid(f), source_face_index: f,
      local_vertices: fr.local.map(p => [round10(p[0]), round10(p[1]), 0]),
      flat_quaternion: [0, 0, round10(Math.sin(pl.theta / 2)), round10(Math.cos(pl.theta / 2))],
      flat_translation: [round10(pl.trans[0] * scale - cx), round10(pl.trans[1] * scale - cy), 0],
      flat_scale: round10(scale),
      target_quaternion: matToQuat(fr.xhat, fr.yhat, fr.zhat).map(round10),
      target_translation: fr.origin.map(round10), target_scale: 1,
      flat_points: pl.pts2.map(p => [...S(p), 0]),
    };
  });

  // ── 검증 ──
  const errs = [];
  // (1) 면별 등거리: 전개도 다각형의 모든 변·대각선이 3D와 scale배로 일치 (vertex_ids 기준)
  for (let f = 0; f < F; f++) {
    const fv = solid.faces[f], pts = faces[f].points;
    for (let i = 0; i < fv.length; i++) for (let j = i + 1; j < fv.length; j++) {
      const d3 = norm(sub(solid.vertices[fv[i]], solid.vertices[fv[j]])) * scale;
      const d2 = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (Math.abs(d3 - d2) > 1e-8) errs.push(`isometry ${fid(f)} ${i}-${j}`);
    }
  }
  // (2) 힌지 접합: 부모·자식이 공유 변에서 같은 좌표
  for (const { parent, child, edgeIdx } of tree.edges) {
    for (const v of solid.topology.edges[edgeIdx]) {
      const pp = faces[parent].points[solid.faces[parent].indexOf(v)];
      const cp = faces[child].points[solid.faces[child].indexOf(v)];
      if (Math.hypot(pp[0] - cp[0], pp[1] - cp[1]) > 1e-8) errs.push(`hinge seam E${edgeIdx}`);
    }
  }
  // (3) 겹침 넓이
  let overlap = 0;
  for (let a = 0; a < F; a++) for (let b = a + 1; b < F; b++) {
    const shrink = (pts) => { // 공유 변 접촉 허용을 위해 미세 수축
      const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
      return pts.map(p => [c[0] + (p[0] - c[0]) * 0.999999, c[1] + (p[1] - c[1]) * 0.999999]);
    };
    overlap += clipConvex(shrink(faces[a].points), shrink(faces[b].points));
  }
  if (overlap > 1e-7) errs.push(`overlap ${overlap}`);
  // (4) assembly 재현: target이 3D 면을, flat이 전개도를 정확히 재현
  for (let f = 0; f < F; f++) {
    const A = assembly_faces[f], fv = solid.faces[f];
    A.local_vertices.forEach((lv, i) => {
      const tgt = add(quatRot(A.target_quaternion, lv), A.target_translation);
      if (norm(sub(tgt, solid.vertices[fv[i]])) > 1e-6) errs.push(`assembly target ${fid(f)}#${i}`);
      const fl = add(quatRot(A.flat_quaternion, lv.map(x => x * A.flat_scale)), A.flat_translation);
      if (Math.hypot(fl[0] - faces[f].points[i][0], fl[1] - faces[f].points[i][1]) > 1e-6) errs.push(`assembly flat ${fid(f)}#${i}`);
    });
  }
  // (5) 절단변 쌍 완결성 + 힌지 트리
  const pairOk = Object.values(pairs).every(v => v.length === 2) &&
    Object.keys(pairs).length === solid.topology.edges.length - tree.edges.length;
  if (!pairOk) errs.push('edge_pairs');
  const reach = new Set([tree.root]);
  for (const { parent, child } of tree.edges) { if (!reach.has(parent)) errs.push('tree order'); reach.add(child); }
  if (reach.size !== F) errs.push('tree span');
  if (errs.length) throw new Error(`${solidId} 검증 실패: ${errs.slice(0, 5).join(', ')}`);

  return {
    net_id: `NET-${solidId}-001`, solid_id: solidId, root_face_id: fid(tree.root),
    faces, hinges, boundary_edge_copies: boundary, edge_pairs: pairs, corners, assembly_faces,
    validation: {
      connected_single_piece: true, hinge_count: tree.edges.length, expected_hinge_count: F - 1,
      hinge_graph_is_tree: true, flat_overlap_area: 0, flat_overlap_free: true, edge_pair_complete: true,
      distinct_net_point_count: npIds.size, entry_label_count: npIds.size,
    },
    variant_label: '기본형',
  };
}

// ── 실행 ───────────────────────────────────────
const nets = {};
for (const id of TARGETS) {
  nets[id] = buildNet(id);
  const n = nets[id];
  console.log(`✓ ${id}: 면 ${n.faces.length} · 힌지 ${n.hinges.length} · 경계사본 ${n.boundary_edge_copies.length} · 꼭짓점 ${n.validation.distinct_net_point_count} · 루트 ${n.root_face_id}`);
}

export const GENERATED = nets; // 검증·미리보기 스크립트용

if (process.argv.includes('--write')) {
  const src = readFileSync(DATA_PATH, 'utf8');
  for (const id of TARGETS) if (src.includes(`"NET-${id}-001"`)) throw new Error(`${id} 전개도가 이미 존재합니다`);
  const anchor = '"nets":{"PLATONIC_CUBE":';
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error('nets 앵커를 찾지 못했습니다');
  // PLATONIC_CUBE 값의 끝(중괄호 깊이 0) 탐색
  let j = i + anchor.length, d = 0;
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) { j++; break; } } }
  const J = o => JSON.stringify(o);
  const before = `"nets":{"PLATONIC_TETRA":${J(nets.PLATONIC_TETRA)},"PLATONIC_CUBE":`;
  const after = `,"PLATONIC_OCTA":${J(nets.PLATONIC_OCTA)},"PLATONIC_DODECA":${J(nets.PLATONIC_DODECA)},"PLATONIC_ICOSA":${J(nets.PLATONIC_ICOSA)}`;
  const out = src.slice(0, i) + before + src.slice(i + anchor.length, j) + after + src.slice(j);
  writeFileSync(DATA_PATH, out);
  console.log(`✓ ${DATA_PATH} 갱신 (${src.length} → ${out.length} bytes)`);
}
