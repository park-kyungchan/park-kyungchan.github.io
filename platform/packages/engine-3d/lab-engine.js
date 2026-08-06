/* lab-engine.js — 입체 탐구랩 R010 3D 엔진 (three.js r128) */
'use strict';
var TAU = Math.PI * 2;
function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }
function pointInPoly(pt, poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyArea(poly) {
  var a = 0;
  for (var i = 0; i < poly.length; i++) { var p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

function LabEngine(container) {
  var self = this;
  this.ink = 0x26324b; this.accent = 0x41608f; this.amber = 0xb97a2e; this.paper = 0xdde6f3;
  this.container = container;
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
  container.appendChild(canvas);
  this.canvas = canvas;
  this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  this.renderer.localClippingEnabled = true;
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 300);
  this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa5bd, 0.95));
  var dir = new THREE.DirectionalLight(0xfff3e0, 0.75); dir.position.set(4, 8, 5); this.scene.add(dir);
  var dir2 = new THREE.DirectionalLight(0xdfe8ff, 0.3); dir2.position.set(-5, -3, -4); this.scene.add(dir2);
  this.root = new THREE.Group(); this.scene.add(this.root);
  this.overlay = new THREE.Group(); this.scene.add(this.overlay);
  this.sectionGroup = new THREE.Group(); this.scene.add(this.sectionGroup);
  this.sph = { r: 8, th: 0.7, ph: 1.12 };
  this._home = { r: 8, th: 0.7, ph: 1.12 };
  this.autoOrbit = true;
  this._idle = 99; this._vel = 0;
  this.onTick = null;
  this.solidScale = 1;
  this._tris = []; this._clipMats = [];
  this.faceMeshes = []; this.edgeMeshes = []; this.vertMeshes = [];
  this._unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
  this._unitSph = new THREE.SphereGeometry(1, 16, 12);
  this._pop = null;
  this._pointers = new Map();
  this._pinch = 0;
  canvas.addEventListener('pointerdown', function (e) {
    self._pointers.set(e.pointerId, [e.clientX, e.clientY]);
    canvas.setPointerCapture(e.pointerId);
    self._idle = 0; self._vel = 0;
    if (self._pointers.size === 2) {
      var p = Array.from(self._pointers.values());
      self._pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!self._pointers.has(e.pointerId)) return;
    var prev = self._pointers.get(e.pointerId);
    self._pointers.set(e.pointerId, [e.clientX, e.clientY]);
    self._idle = 0;
    if (self._pointers.size === 1) {
      var dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      self.sph.th -= dx * 0.006; self.sph.ph -= dy * 0.006;
      self.sph.ph = Math.max(0.12, Math.min(Math.PI - 0.12, self.sph.ph));
      self._vel = -dx * 0.006 * 60;
    } else if (self._pointers.size === 2) {
      var p = Array.from(self._pointers.values());
      var d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      if (self._pinch > 0) { self.sph.r *= self._pinch / d; self.sph.r = Math.max(3, Math.min(40, self.sph.r)); }
      self._pinch = d;
    }
  });
  function up(e) { self._pointers.delete(e.pointerId); self._pinch = 0; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault(); self._idle = 0;
    self.sph.r *= Math.exp(e.deltaY * 0.0012);
    self.sph.r = Math.max(3, Math.min(40, self.sph.r));
  }, { passive: false });
  canvas.addEventListener('dblclick', function () { self.resetView(); });
  this._resize = function () {
    var w = container.clientWidth || 1, h = container.clientHeight || 1;
    self.renderer.setSize(w, h, false);
    self.camera.aspect = w / h; self.camera.updateProjectionMatrix();
  };
  if (window.ResizeObserver) { this._ro = new ResizeObserver(this._resize); this._ro.observe(container); }
  window.addEventListener('resize', this._resize);
  this._resize();
  this._last = performance.now(); this._dead = false;
  (function loop(t) {
    if (self._dead) return;
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (t - self._last) / 1000); self._last = t;
    self._idle += dt;
    if (Math.abs(self._vel) > 0.01 && self._pointers.size === 0) {
      self.sph.th += self._vel * dt; self._vel *= Math.pow(0.02, dt);
    }
    if (self.autoOrbit && self._idle > 2.5 && self._pointers.size === 0) self.sph.th += dt * 0.12;
    if (self._pop) {
      self._pop.t += dt / self._pop.dur;
      var p = Math.min(1, self._pop.t), c1 = 1.7, s = p === 1 ? 1 : 1 + c1 * Math.pow(p - 1, 3) + c1 * 0.85 * Math.pow(p - 1, 2);
      var sc = 0.55 + 0.45 * s;
      self.root.scale.set(sc, sc, sc);
      if (p >= 1) { self.root.scale.set(1, 1, 1); self._pop = null; }
    }
    var sp = self.sph;
    self.camera.position.set(sp.r * Math.sin(sp.ph) * Math.cos(sp.th), sp.r * Math.cos(sp.ph), sp.r * Math.sin(sp.ph) * Math.sin(sp.th));
    self.camera.lookAt(0, 0, 0);
    if (self.onTick) self.onTick(dt);
    self.renderer.render(self.scene, self.camera);
  })(this._last);
}

LabEngine.prototype._disposeGroup = function (g) {
  g.traverse(function (o) {
    if (o.geometry && o.geometry !== undefined) o.geometry.dispose && o.geometry.dispose();
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); }); }
  });
  while (g.children.length) g.remove(g.children[0]);
};
LabEngine.prototype.clearSolid = function () {
  this._disposeGroup(this.root);
  this._tris = []; this._clipMats = [];
  this.faceMeshes = []; this.edgeMeshes = []; this.vertMeshes = [];
  this.clearSection(); this.clearOverlays();
  this.root.scale.set(1, 1, 1);
};
LabEngine.prototype.clearOverlays = function () { this._disposeGroup(this.overlay); };
LabEngine.prototype.clearSection = function () {
  this._disposeGroup(this.sectionGroup);
  this._clipMats.forEach(function (m) { m.clippingPlanes = null; m.needsUpdate = true; });
};
LabEngine.prototype.dispose = function () {
  this._dead = true;
  this.clearSolid();
  if (this._ro) this._ro.disconnect();
  window.removeEventListener('resize', this._resize);
  this.renderer.dispose();
  if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
};
LabEngine.prototype._mat = function (color, opts) {
  opts = opts || {};
  var m = new THREE.MeshPhongMaterial({
    color: color, shininess: opts.shininess != null ? opts.shininess : 22, specular: 0x1c2230,
    transparent: true, opacity: opts.opacity != null ? opts.opacity : 0.97,
    side: THREE.DoubleSide, polygonOffset: !!opts.offset, polygonOffsetFactor: 1, polygonOffsetUnits: 1
  });
  this._clipMats.push(m);
  return m;
};
LabEngine.prototype._edgeMesh = function (a, b, r, mat) {
  var dirv = new THREE.Vector3().subVectors(b, a), len = dirv.length();
  var m = new THREE.Mesh(this._unitCyl, mat);
  m.scale.set(r, len, r);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirv.clone().normalize());
  m.position.copy(a).addScaledVector(dirv, 0.5);
  return m;
};

LabEngine.prototype.setPolyhedron = function (solid, opts) {
  opts = opts || {};
  this.clearSolid();
  var maxR = 0;
  solid.vertices.forEach(function (v) { maxR = Math.max(maxR, Math.hypot(v[0], v[1], v[2])); });
  var s = (opts.radius || 2.3) / (maxR || 1);
  this.solidScale = s;
  var verts = solid.vertices.map(function (v) { return new THREE.Vector3(v[0] * s, v[1] * s, v[2] * s); });
  this._verts = verts;
  var self = this;
  solid.faces.forEach(function (face, fi) {
    var col = opts.faceColor ? opts.faceColor(fi, face.length) : self.paper;
    var mat = self._mat(col, { offset: true });
    var pos = [];
    for (var k = 1; k < face.length - 1; k++) {
      var a = verts[face[0]], b = verts[face[k]], c = verts[face[k + 1]];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      self._tris.push([a, b, c]);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    var mesh = new THREE.Mesh(g, mat);
    mesh.userData = { baseColor: col };
    self.root.add(mesh);
    self.faceMeshes.push(mesh);
  });
  var edges = (solid.topology && solid.topology.edges) || [];
  edges.forEach(function (e) {
    var mat = new THREE.MeshPhongMaterial({ color: self.ink, shininess: 8 });
    self._clipMats.push(mat);
    var m = self._edgeMesh(verts[e[0]], verts[e[1]], 0.022, mat);
    self.root.add(m); self.edgeMeshes.push(m);
  });
  verts.forEach(function (v) {
    var mat = new THREE.MeshPhongMaterial({ color: self.ink, shininess: 8 });
    self._clipMats.push(mat);
    var m = new THREE.Mesh(self._unitSph, mat);
    m.scale.setScalar(0.05); m.position.copy(v);
    self.root.add(m); self.vertMeshes.push(m);
  });
  this.popIn();
};

LabEngine.prototype._profilePoints = function (comp) {
  var pts = [], n, i, a;
  if (comp.kind === 'circle') {
    n = comp.samples || 40;
    for (i = 0; i < n; i++) {
      a = i / n * TAU;
      pts.push([comp.center[0] + comp.radius * Math.cos(a), comp.center[1] + comp.radius * Math.sin(a)]);
    }
    return pts;
  }
  if (comp.kind === 'semicircle') {
    n = comp.samples || 48;
    for (i = 0; i <= n; i++) {
      a = -Math.PI / 2 + i / n * Math.PI;
      pts.push([comp.radius * Math.cos(a), comp.radius * Math.sin(a)]);
    }
    return pts;
  }
  if (comp.kind === 'dome') {
    n = comp.samples || 32;
    var by = comp.base_y || 0;
    pts.push([0, by]);
    for (i = 0; i <= n; i++) {
      a = i / n * Math.PI / 2;
      pts.push([comp.radius * Math.cos(a), by + comp.radius * Math.sin(a)]);
    }
    return pts;
  }
  return (comp.points || []).slice();
};
LabEngine.prototype.setLathe = function (profile, sweepDeg, opts) {
  this._lathe = { profile: profile, opts: opts || {} };
  this._buildLathe(sweepDeg);
  if (!(opts && opts.noPop)) this.popIn();
};
LabEngine.prototype.setLatheSweep = function (sweepDeg) {
  if (!this._lathe) return;
  this._buildLathe(sweepDeg);
};
LabEngine.prototype._buildLathe = function (sweepDeg) {
  var self = this;
  var keepOverlay = this.overlay.children.slice();
  this._disposeGroup(this.root);
  this._tris = []; this._clipMats = [];
  this.solidScale = 1;
  var sweep = Math.max(0.001, Math.min(360, sweepDeg)) / 360 * TAU;
  var full = sweepDeg >= 359.9;
  var comps = this._lathe.profile.components || [];
  comps.forEach(function (comp) {
    var pts = self._profilePoints(comp);
    var steps = Math.max(3, Math.ceil(96 * sweep / TAU));
    for (var j = 0; j < pts.length; j++) {
      var p0 = pts[j], p1 = pts[(j + 1) % pts.length];
      if (Math.abs(p0[0]) < 1e-6 && Math.abs(p1[0]) < 1e-6) continue;
      var pos = [], idx = [];
      for (var sI = 0; sI <= steps; sI++) {
        var a = sI / steps * sweep;
        var ca = Math.cos(a), sa = Math.sin(a);
        pos.push(p0[0] * ca, p0[1], p0[0] * sa, p1[0] * ca, p1[1], p1[0] * sa);
      }
      for (sI = 0; sI < steps; sI++) {
        var r0 = sI * 2, r1 = (sI + 1) * 2;
        idx.push(r0, r0 + 1, r1, r1, r0 + 1, r1 + 1);
        var A = new THREE.Vector3(pos[r0 * 3], pos[r0 * 3 + 1], pos[r0 * 3 + 2]);
        var B = new THREE.Vector3(pos[(r0 + 1) * 3], pos[(r0 + 1) * 3 + 1], pos[(r0 + 1) * 3 + 2]);
        var C = new THREE.Vector3(pos[r1 * 3], pos[r1 * 3 + 1], pos[r1 * 3 + 2]);
        var D2 = new THREE.Vector3(pos[(r1 + 1) * 3], pos[(r1 + 1) * 3 + 1], pos[(r1 + 1) * 3 + 2]);
        self._tris.push([A, B, C]); self._tris.push([C, B, D2]);
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      self.root.add(new THREE.Mesh(g, self._mat(self.paper, { opacity: 0.96 })));
    }
    if (!full) {
      [0, sweep].forEach(function (ang, which) {
        var shape = new THREE.Shape(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
        var g = new THREE.ShapeGeometry(shape);
        var col = which === 1 ? 0xd9a05b : self.paper;
        var mesh = new THREE.Mesh(g, self._mat(col, { opacity: which === 1 ? 0.92 : 0.9, offset: true }));
        mesh.rotation.y = -ang;
        self.root.add(mesh);
        var outMat = new THREE.MeshPhongMaterial({ color: which === 1 ? self.amber : self.ink, shininess: 8 });
        self._clipMats.push(outMat);
        for (var q = 0; q < pts.length; q++) {
          var a2 = pts[q], b2 = pts[(q + 1) % pts.length];
          var A3 = new THREE.Vector3(a2[0] * Math.cos(ang), a2[1], a2[0] * Math.sin(ang));
          var B3 = new THREE.Vector3(b2[0] * Math.cos(ang), b2[1], b2[0] * Math.sin(ang));
          if (A3.distanceTo(B3) < 1e-6) continue;
          self.root.add(self._edgeMesh(A3, B3, which === 1 ? 0.03 : 0.018, outMat));
        }
      });
    }
  });
  var axisG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -3.4, 0), new THREE.Vector3(0, 3.4, 0)]);
  var axisM = new THREE.LineDashedMaterial({ color: this.ink, dashSize: 0.16, gapSize: 0.12, transparent: true, opacity: 0.65 });
  var axis = new THREE.Line(axisG, axisM);
  axis.computeLineDistances();
  this.root.add(axis);
  keepOverlay.forEach(function (o) { self.overlay.add(o); });
};

LabEngine.prototype.highlightFace = function (i, on, color) {
  var m = this.faceMeshes[i]; if (!m) return;
  m.material.color.setHex(on ? (color || 0xe3b264) : m.userData.baseColor);
  m.material.emissive.setHex(on ? 0x5a3c10 : 0x000000);
};
LabEngine.prototype.highlightEdge = function (i, on) {
  var m = this.edgeMeshes[i]; if (!m) return;
  m.material.color.setHex(on ? this.amber : this.ink);
  var s = on ? 0.04 : 0.022;
  m.scale.x = s; m.scale.z = s;
};
LabEngine.prototype.highlightVertex = function (i, on) {
  var m = this.vertMeshes[i]; if (!m) return;
  m.material.color.setHex(on ? this.amber : this.ink);
  m.scale.setScalar(on ? 0.1 : 0.05);
};
LabEngine.prototype.setFaceDim = function (i, dim) {
  var m = this.faceMeshes[i]; if (!m) return;
  m.material.opacity = dim ? 0.25 : 0.97;
};
LabEngine.prototype.clearHighlights = function () {
  for (var i = 0; i < this.faceMeshes.length; i++) { this.highlightFace(i, false); this.setFaceDim(i, false); }
  for (i = 0; i < this.edgeMeshes.length; i++) this.highlightEdge(i, false);
  for (i = 0; i < this.vertMeshes.length; i++) this.highlightVertex(i, false);
};

LabEngine.prototype.projRange = function (nArr) {
  var n = v3(nArr).normalize();
  var lo = Infinity, hi = -Infinity;
  this._tris.forEach(function (t) {
    t.forEach(function (p) { var d = p.dot(n); lo = Math.min(lo, d); hi = Math.max(hi, d); });
  });
  if (lo > hi) { lo = -1; hi = 1; }
  return [lo, hi];
};
LabEngine.prototype._sectionLoops = function (n, d) {
  var segs = [];
  this._tris.forEach(function (t) {
    var dist = t.map(function (p) { return p.dot(n) - d; });
    var pts = [];
    for (var i = 0; i < 3; i++) {
      var j = (i + 1) % 3;
      if ((dist[i] > 0) !== (dist[j] > 0)) {
        var f = dist[i] / (dist[i] - dist[j]);
        pts.push(new THREE.Vector3().lerpVectors(t[i], t[j], f));
      }
    }
    if (pts.length === 2 && pts[0].distanceTo(pts[1]) > 1e-5) segs.push(pts);
  });
  var key = function (p) { return p.x.toFixed(3) + ',' + p.y.toFixed(3) + ',' + p.z.toFixed(3); };
  var map = new Map();
  segs.forEach(function (sg, i) {
    [key(sg[0]), key(sg[1])].forEach(function (k) {
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    });
  });
  var used = new Array(segs.length).fill(false), loops = [];
  for (var i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    var loop = [segs[i][0], segs[i][1]];
    var guard = 0;
    while (guard++ < segs.length + 4) {
      var endK = key(loop[loop.length - 1]);
      var cands = (map.get(endK) || []).filter(function (ci) { return !used[ci]; });
      if (!cands.length) break;
      var ci = cands[0]; used[ci] = true;
      var sg = segs[ci];
      loop.push(key(sg[0]) === endK ? sg[1] : sg[0]);
      if (key(loop[loop.length - 1]) === key(loop[0])) { loop.pop(); break; }
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops.map(function (loop) {
    var out = [];
    for (var q = 0; q < loop.length; q++) {
      var a = loop[(q - 1 + loop.length) % loop.length], b = loop[q], c = loop[(q + 1) % loop.length];
      var u = new THREE.Vector3().subVectors(b, a), w = new THREE.Vector3().subVectors(c, b);
      if (new THREE.Vector3().crossVectors(u, w).length() > 2e-3) out.push(b);
    }
    return out.length >= 3 ? out : loop;
  });
};
LabEngine.prototype.showSection = function (nArr, d, opts) {
  opts = opts || {};
  this.clearSection();
  var self = this;
  var n = v3(nArr).normalize();
  var loops = this._sectionLoops(n, d);
  var u = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize();
  var w = new THREE.Vector3().crossVectors(n, u);
  var loops2 = loops.map(function (loop) {
    return loop.map(function (p) { return [p.dot(u), p.dot(w)]; });
  });
  var order = loops2.map(function (l, i) { return [Math.abs(polyArea(l)), i]; }).sort(function (a, b) { return b[0] - a[0]; });
  var groups = [];
  order.forEach(function (pair) {
    var i = pair[1], l = loops2[i];
    var cx = 0, cy = 0;
    l.forEach(function (p) { cx += p[0]; cy += p[1]; });
    cx /= l.length; cy /= l.length;
    for (var gI = 0; gI < groups.length; gI++) {
      if (pointInPoly([cx, cy], loops2[groups[gI].outer])) { groups[gI].holes.push(i); return; }
    }
    groups.push({ outer: i, holes: [] });
  });
  var basis = new THREE.Matrix4().makeBasis(u, w, n);
  basis.setPosition(n.clone().multiplyScalar(d));
  if (opts.plane !== false) {
    var size = opts.planeSize || 6.4;
    var pg = new THREE.PlaneGeometry(size, size);
    var pm = new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
    var pmesh = new THREE.Mesh(pg, pm);
    pmesh.applyMatrix4(basis);
    this.sectionGroup.add(pmesh);
    var bord = new THREE.LineSegments(new THREE.EdgesGeometry(pg), new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.5 }));
    bord.applyMatrix4(basis);
    this.sectionGroup.add(bord);
  }
  groups.forEach(function (grp) {
    var shape = new THREE.Shape(loops2[grp.outer].map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
    grp.holes.forEach(function (hi) {
      shape.holes.push(new THREE.Path(loops2[hi].map(function (p) { return new THREE.Vector2(p[0], p[1]); })));
    });
    var g = new THREE.ShapeGeometry(shape);
    var m = new THREE.MeshBasicMaterial({ color: 0xd9a05b, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    var mesh = new THREE.Mesh(g, m);
    mesh.applyMatrix4(basis);
    self.sectionGroup.add(mesh);
  });
  var outlMat = new THREE.MeshPhongMaterial({ color: this.amber, shininess: 10 });
  loops.forEach(function (loop) {
    for (var i = 0; i < loop.length; i++) {
      var a = loop[i], b = loop[(i + 1) % loop.length];
      if (a.distanceTo(b) < 1e-6) continue;
      self.sectionGroup.add(self._edgeMesh(a, b, 0.03, outlMat));
    }
  });
  if (opts.clip) {
    var plane = new THREE.Plane(n.clone().negate(), d);
    this._clipMats.forEach(function (m) { m.clippingPlanes = [plane]; m.needsUpdate = true; });
  }
  return { loops: loops.length, sides: loops.length ? loops[0].length : 0 };
};

LabEngine.prototype.addPath = function (pts, opts) {
  opts = opts || {};
  var g = new THREE.Group();
  var mat = new THREE.MeshPhongMaterial({ color: opts.color != null ? opts.color : this.amber, shininess: 30 });
  var r = opts.r || 0.045;
  for (var i = 0; i < pts.length - 1; i++) {
    if (pts[i].distanceTo(pts[i + 1]) < 1e-7) continue;
    g.add(this._edgeMesh(pts[i], pts[i + 1], r, mat));
  }
  this.overlay.add(g);
  return g;
};
LabEngine.prototype.addDot = function (p, color, r) {
  var m = new THREE.Mesh(this._unitSph, new THREE.MeshPhongMaterial({ color: color != null ? color : this.amber }));
  m.scale.setScalar(r || 0.11); m.position.copy(p);
  this.overlay.add(m);
  return m;
};
LabEngine.prototype.removeOverlay = function (o) {
  if (!o) return;
  this.overlay.remove(o);
  this._disposeGroup(o);
};
LabEngine.prototype.popIn = function () { this._pop = { t: 0, dur: 0.8 }; };
LabEngine.prototype.frame = function (pad) {
  var box = new THREE.Box3().setFromObject(this.root);
  if (box.isEmpty()) return;
  var sphere = box.getBoundingSphere(new THREE.Sphere());
  this.sph.r = Math.max(3.5, sphere.radius * (pad || 3.1));
  this._home.r = this.sph.r;
};
LabEngine.prototype.resetView = function () {
  this.sph.th = this._home.th; this.sph.ph = this._home.ph; this.sph.r = this._home.r;
  this._vel = 0; this._idle = 0;
};
window.LabEngine = LabEngine;
export { LabEngine };
