// 셸 — 라우터 + 홈 + 랩 셸(플로팅 패널 시스템 + 플레이어). docs/02 계약 구현.
import { color, font, panel as ptk, touch } from '../../packages/tokens/index.js';
import { LabEngine } from '../../packages/engine-3d/lab-engine.js';
import { lab as solidLab } from '../../labs/solid/lab.js';

const labs = { solid: solidLab };
const app = document.getElementById('app');
const BORD = `1px solid ${color.panelBorder}`;
function h(tag, css, html) { const el = document.createElement(tag); if (css) el.style.cssText = css; if (html != null) el.innerHTML = html; return el; }
function btn(css, html, on) { const b = h('button', 'border:none;cursor:pointer;font-family:inherit;' + css, html); if (on) b.onclick = on; return b; }

let teardown = null;
function route() {
  const seg = location.hash.replace(/^#\/?/, '').split('/');
  if (teardown) { teardown(); teardown = null; }
  app.innerHTML = '';
  const L = labs[seg[0]];
  if (!L) renderHome(); else teardown = renderLab(L, seg[1]);
}
addEventListener('hashchange', route);

function renderHome() {
  document.title = '탐구랩';
  const el = h('div', `display:grid;place-content:center;height:100%;gap:18px;font-family:${font.body};color:${color.ink};`);
  el.innerHTML = `
    <div style="font-family:${font.brand};font-weight:700;font-size:46px;text-align:center;">탐구랩</div>
    <div style="font-size:13px;color:rgba(38,50,75,.6);text-align:center;margin-top:-10px;">수학 탐구 플랫폼</div>`;
  const cards = h('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;width:min(560px,calc(100vw - 32px));');
  const solidCard = h('a', `display:block;border:${BORD};border-radius:${ptk.radius}px;padding:22px 30px;text-decoration:none;color:inherit;background:${color.panelBg};box-shadow:${ptk.shadow};animation:${ptk.floatIn};`);
  solidCard.href = '#/solid';
  solidCard.innerHTML = `
    <div style="font-family:${font.heading};font-weight:700;font-size:20px;">입체도형 탐구 Lab</div>
    <div style="font-size:13px;color:rgba(38,50,75,.6);margin-top:4px;">중1 · 2학기 입체도형 · 9개 챕터</div>`;
  const videoCard = h('a', `display:block;border:${BORD};border-radius:${ptk.radius}px;padding:22px 30px;text-decoration:none;color:inherit;background:${color.panelBg};box-shadow:${ptk.shadow};animation:${ptk.floatIn};`);
  videoCard.href = './video/';
  videoCard.innerHTML = `
    <div style="font-family:${font.heading};font-weight:700;font-size:20px;">수학교육 영상</div>
    <div style="font-size:13px;color:rgba(38,50,75,.6);margin-top:4px;">수학교육에 관한 영상 보기</div>`;
  cards.append(solidCard, videoCard);
  el.appendChild(cards);
  app.appendChild(el);
}

function renderLab(L, initialChapterId) {
  const root = h('div', `position:fixed;inset:0;overflow:hidden;background:${color.paper};font-family:${font.body};color:${color.ink};`);
  root.appendChild(h('div', `position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(${color.grid} 1px,transparent 1px),linear-gradient(90deg,${color.grid} 1px,transparent 1px);background-size:28px 28px;`));
  root.appendChild(h('div', 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 42%,transparent 55%,rgba(38,50,75,0.05) 100%);'));
  const stageEl = h('div', 'position:absolute;inset:0;');
  root.appendChild(stageEl);
  const brand = h('div', 'position:absolute;left:18px;top:12px;display:flex;align-items:baseline;gap:10px;z-index:30;pointer-events:none;');
  brand.innerHTML = `<div style="font-family:${font.brand};font-weight:700;font-size:27px;line-height:1;">${L.meta.title}</div>
    <div style="font-size:11.5px;letter-spacing:.05em;color:rgba(38,50,75,.6);">탐구랩 · ${L.meta.grade}</div>`;
  root.appendChild(brand);
  const chip = h('div', `position:absolute;left:50%;top:16px;transform:translateX(-50%);z-index:40;pointer-events:none;display:none;font-family:${font.brand};font-weight:700;font-size:20px;background:${color.ink};color:${color.paper};padding:7px 20px 8px;border-radius:999px;box-shadow:0 10px 26px rgba(38,50,75,.3);`);
  root.appendChild(chip);
  const tray = h('div', 'position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px;z-index:36;align-items:flex-end;');
  root.appendChild(tray);
  app.appendChild(root);

  const engine = new LabEngine(stageEl);

  // ── 플로팅 패널 시스템 ─────────────────────────
  const panelsReg = {};
  function makePanel(key, title, width, place) {
    const wrap = h('div', 'position:absolute;z-index:14;');
    const card = h('div', `width:${width}px;background:${color.panelBg};backdrop-filter:blur(${ptk.blur}px);-webkit-backdrop-filter:blur(${ptk.blur}px);border:${BORD};border-radius:${ptk.radius}px;box-shadow:${ptk.shadow};overflow:hidden;animation:${ptk.floatIn};`);
    const header = h('div', 'display:flex;align-items:center;gap:8px;padding:10px 10px 10px 14px;cursor:grab;touch-action:none;user-select:none;');
    const label = h('span', `font-family:${font.heading};font-weight:700;font-size:15px;flex:1;`, title);
    const minB = btn(`width:${touch.minTarget - 14}px;height:${touch.minTarget - 14}px;background:rgba(38,50,75,.06);border-radius:8px;color:${color.ink};font-size:14px;`, '–');
    const colB = btn(`width:${touch.minTarget - 14}px;height:${touch.minTarget - 14}px;background:rgba(38,50,75,.06);border-radius:8px;color:${color.ink};font-size:13px;`, '▾');
    header.append(label, minB, colB);
    const body = h('div', `border-top:1px solid rgba(38,50,75,.08);`);
    card.append(header, body);
    wrap.appendChild(card);
    root.appendChild(wrap);
    const P = { key, title, wrap, card, header, label, body, open: true, min: false, place };
    colB.onclick = () => { P.open = !P.open; body.style.display = P.open ? '' : 'none'; colB.innerHTML = P.open ? '▾' : '▸'; };
    minB.onclick = () => minimize(P);
    header.ondblclick = () => minimize(P);
    makeDraggable(P, header);
    position(P);
    panelsReg[key] = P;
    return P;
  }
  function position(P) {
    const W = innerWidth, H = innerHeight;
    const [dx, dy] = P.place();
    P.wrap.style.left = Math.max(2, Math.min(W - 60, dx < 0 ? W + dx : dx)) + 'px';
    P.wrap.style.top = Math.max(2, Math.min(H - 48, dy < 0 ? H + dy : dy)) + 'px';
  }
  function minimize(P) {
    if (P.min) return;
    P.min = true; P.wrap.style.display = 'none';
    const pill = btn(`background:${color.ink};color:${color.paper};border-radius:999px;padding:9px 16px;font-family:${font.brand};font-weight:700;font-size:15px;box-shadow:0 10px 24px rgba(38,50,75,.3);animation:${ptk.chipIn};`, P.title.split(' · ')[0], () => {
      P.min = false; P.wrap.style.display = ''; position(P); pill.remove();
    });
    pill.dataset.tray = P.key;
    tray.appendChild(pill);
  }
  function makeDraggable(P, handle) {
    let d = null;
    handle.addEventListener('pointerdown', e => {
      const r = P.wrap.getBoundingClientRect();
      d = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!d) return;
      const now = performance.now(), dt = (now - d.lt) / 1000;
      if (dt > 0.001) { d.vx = (e.clientX - d.lx) / dt; d.vy = (e.clientY - d.ly) / dt; }
      d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
      P.wrap.style.left = Math.max(2, Math.min(innerWidth - 60, d.ox + e.clientX - d.sx)) + 'px';
      P.wrap.style.top = Math.max(2, Math.min(innerHeight - 48, d.oy + e.clientY - d.sy)) + 'px';
    });
    const up = () => {
      if (!d) return;
      const stale = performance.now() - d.lt > 130;
      const speed = stale ? 0 : Math.hypot(d.vx, d.vy);
      const r = P.wrap.getBoundingClientRect();
      const off = r.left < -60 || r.left > innerWidth - 50 || r.top < -40 || r.top > innerHeight - 40;
      d = null;
      if (speed > 900 || off) (P.minimize || (() => minimize(P)))();
    };
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  const curP = makePanel('cur', '커리큘럼', 250, () => [16, 58]);
  const noteP = makePanel('note', '학습 노트', 330, () => [-348, 58]);
  const boardP = makePanel('board', '칠판', 312, () => [16, -420]);
  boardP.wrap.style.display = 'none'; boardP.hidden = true;
  curP.body.style.cssText += 'padding:2px 10px 12px;max-height:58vh;overflow-y:auto;';
  noteP.body.style.cssText += 'padding:12px 18px 16px;max-height:62vh;overflow-y:auto;';
  boardP.body.style.cssText += 'padding:6px 14px 14px;';

  // ── 독 (컨트롤 + 트랜스포트) ─────────────────────
  const dockWrap = h('div', 'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:20;');
  const dockCol = h('div', `display:flex;flex-direction:column;gap:8px;align-items:center;animation:${ptk.floatIn.replace('0.5s', '0.6s')};`);
  const ctrlRow = h('div', `display:flex;align-items:center;gap:12px;background:rgba(255,255,253,.94);backdrop-filter:blur(${ptk.blur}px);border:${BORD};border-radius:999px;padding:8px 16px 8px 10px;box-shadow:0 14px 34px rgba(38,50,75,.18);flex-wrap:wrap;justify-content:center;max-width:min(92vw,880px);`);
  const transport = h('div', `display:flex;align-items:center;gap:10px;background:${color.ink};color:${color.paper};border-radius:999px;padding:8px 14px;box-shadow:0 16px 34px rgba(38,50,75,.3);`);
  dockCol.append(ctrlRow, transport);
  dockWrap.appendChild(dockCol);
  root.appendChild(dockWrap);
  const dockP = { key: 'dock', title: '컨트롤', wrap: dockWrap, min: false, place: () => [0, 0] };
  // 독 최소화/복원 (그립+트레이)
  const grip = h('span', 'cursor:grab;touch-action:none;color:rgba(38,50,75,.4);font-size:15px;padding:6px 4px;user-select:none;letter-spacing:-2px;', '⠿');
  makeDraggable(dockP, grip);
  // 독 드래그 시 transform 제거
  grip.addEventListener('pointerdown', () => { dockWrap.style.transform = 'none'; dockWrap.style.bottom = 'auto'; const r = dockWrap.getBoundingClientRect(); dockWrap.style.left = r.left + 'px'; dockWrap.style.top = r.top + 'px'; }, { capture: true });
  function minimizeDock() {
    if (dockP.min) return; dockP.min = true; dockWrap.style.display = 'none';
    const pill = btn(`background:${color.ink};color:${color.paper};border-radius:999px;padding:9px 16px;font-family:${font.brand};font-weight:700;font-size:15px;box-shadow:0 10px 24px rgba(38,50,75,.3);animation:${ptk.chipIn};`, '컨트롤', () => {
      dockP.min = false; dockWrap.style.display = ''; dockWrap.style.cssText = 'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:20;'; pill.remove();
    });
    tray.appendChild(pill);
  }
  dockP.minimize = minimizeDock;

  const minDockB = btn(`width:30px;height:30px;background:rgba(38,50,75,.06);border-radius:8px;color:${color.ink};font-size:14px;flex:none;`, '–', minimizeDock);
  const controlsHost = h('div', 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;');
  const readoutEl = h('span', 'font-size:12.5px;font-weight:700;color:#8a5a1d;white-space:nowrap;');
  ctrlRow.append(grip, minDockB, controlsHost, readoutEl);

  const unitLabel = h('div', 'font-size:10.5px;letter-spacing:.08em;color:rgba(247,244,236,.55);');
  const chLabel = h('div', `font-family:${font.heading};font-weight:700;font-size:14px;white-space:nowrap;`);
  const labelBox = h('div', 'min-width:120px;text-align:right;');
  labelBox.append(unitLabel, chLabel);
  const TB = `border-radius:50%;border:1px solid rgba(247,244,236,.25);background:transparent;color:${color.paper};`;
  const prevB = btn(`width:${touch.minTarget}px;height:${touch.minTarget}px;font-size:13px;${TB}`, '◀');
  const playB = btn(`width:48px;height:48px;border-radius:50%;background:${color.paper};color:${color.ink};font-size:17px;box-shadow:0 4px 12px rgba(0,0,0,.25);`, '▶');
  const nextB = btn(`width:${touch.minTarget}px;height:${touch.minTarget}px;font-size:13px;${TB}`, '▶');
  const progOuter = h('div', 'width:140px;height:5px;border-radius:999px;background:rgba(247,244,236,.22);overflow:hidden;');
  const progBar = h('div', `width:0%;height:100%;background:${color.amberSoft};border-radius:999px;transition:width .1s linear;`);
  progOuter.appendChild(progBar);
  const resetB = btn(`width:${touch.minTarget}px;height:${touch.minTarget}px;font-size:15px;${TB}`, '⟳', () => engine.resetView());
  transport.append(labelBox, prevB, playB, nextB, progOuter, resetB);

  // ── 플레이어 ─────────────────────────────────
  let anims = [], chainI = 0, chainN = 1, playing = false, curChip = '';
  const motionScale = 10;
  function uiChip(t) { curChip = t; chip.style.display = t ? '' : 'none'; chip.textContent = t; }
  function uiPlaying(on) { playing = on; playB.innerHTML = on ? '■' : '▶'; }
  engine.onTick = dt => {
    if (!anims.length) return;
    const a = anims[0]; a.t += dt;
    const p = Math.min(1, a.t / a.dur), pe = a.ease ? a.ease(p) : p;
    if (a.onU) a.onU(pe, p);
    if (a.phases) { const ph = a.phases.find(x => p <= x.until) || a.phases[a.phases.length - 1]; if (ph && ph.label !== curChip) uiChip(ph.label); }
    progBar.style.width = Math.round((chainI + p) / chainN * 100) + '%';
    if (p >= 1) {
      anims.shift(); chainI++;
      if (a.onDone) a.onDone();
      if (!anims.length) { uiPlaying(false); uiChip(''); progBar.style.width = '0%'; }
    }
  };
  function play(steps) {
    stop();
    const f = Math.max(0.12, motionScale / 10);
    anims = steps.map(s => ({ t: 0, ...s, dur: Math.max(0.08, s.dur * f) }));
    chainI = 0; chainN = steps.length;
    uiPlaying(true);
  }
  function stop() { anims = []; if (playing) { uiPlaying(false); uiChip(''); progBar.style.width = '0%'; } }
  const easeIO = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  // ── PanelHost 구현 ────────────────────────────
  let answerShown = false;
  function renderNote(c) {
    answerShown = false;
    noteP.body.innerHTML = '';
    const head = h('div', '', `
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${color.accent};">${c.kicker}</div>
      <div style="font-family:${font.heading};font-weight:700;font-size:20px;line-height:1.3;padding:4px 0 10px;">${c.title}</div>`);
    const stats = h('div', 'display:flex;flex-wrap:wrap;gap:6px;padding-bottom:10px;');
    for (const s of c.stats) stats.appendChild(h('div', `border:1px solid rgba(38,50,75,.16);border-radius:8px;padding:3px 9px;font-size:12px;background:rgba(247,244,236,.85);display:flex;gap:5px;align-items:baseline;`, `<span style="color:rgba(38,50,75,.58);">${s.k}</span><b>${s.v}</b>`));
    const body = h('div', 'font-size:13.5px;line-height:1.7;text-wrap:pretty;', c.body);
    const q = h('div', 'margin-top:12px;border-top:2px dashed rgba(38,50,75,.2);padding-top:10px;', `
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${color.amber};padding-bottom:2px;">탐구 질문</div>
      <div style="font-family:${font.brand};font-size:19px;line-height:1.45;">${c.question}</div>`);
    const ansBox = h('div', `margin-top:8px;background:rgba(217,160,91,.13);border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.65;text-wrap:pretty;display:none;animation:${ptk.chipIn};`, c.answer);
    const ansB = btn(`border:1px solid rgba(38,50,75,.2);background:rgba(255,255,253,.9);color:${color.ink};border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;margin-top:10px;`, '풀이 보기', () => {
      answerShown = !answerShown; ansBox.style.display = answerShown ? '' : 'none'; ansB.textContent = answerShown ? '풀이 접기' : '풀이 보기';
    });
    ansB.style.border = '1px solid rgba(38,50,75,.2)';
    noteP.body.append(head, stats, body, q, ansB, ansBox);
    noteP.showAnswer = () => { if (!answerShown) ansB.click(); };
  }
  function renderBoard(title, caption, el) {
    if (!el) { boardP.wrap.style.display = 'none'; boardP.hidden = true; return; }
    boardP.hidden = false;
    if (!boardP.min) boardP.wrap.style.display = '';
    boardP.label.textContent = title;
    boardP.body.innerHTML = '';
    boardP.body.appendChild(el);
    boardP.body.appendChild(h('div', 'font-size:11.5px;color:rgba(38,50,75,.55);padding-top:6px;', caption));
  }
  function renderDockControls(controls) {
    controlsHost.innerHTML = '';
    for (const c of controls) {
      if (c.type === 'select') {
        const sel = h('select', `border:1px solid rgba(38,50,75,.2);background:rgba(247,244,236,.9);color:${color.ink};border-radius:10px;padding:8px 10px;font-size:13px;max-width:210px;cursor:pointer;font-family:inherit;`);
        for (const g of c.groups) {
          const og = document.createElement('optgroup'); og.label = g.label;
          for (const o of g.opts) { const op = document.createElement('option'); op.value = o.id; op.textContent = o.name; og.appendChild(op); }
          sel.appendChild(og);
        }
        sel.value = c.value;
        sel.onchange = () => c.onChange(sel.value);
        controlsHost.appendChild(sel);
      } else if (c.type === 'seg') {
        const box = h('div', 'display:flex;align-items:center;gap:6px;');
        box.appendChild(h('span', 'font-size:11.5px;color:rgba(38,50,75,.6);white-space:nowrap;', c.label));
        const grp = h('div', 'display:flex;gap:2px;background:rgba(38,50,75,.07);border-radius:999px;padding:3px;');
        for (const it of c.items) {
          const dis = !!it.disabled;
          grp.appendChild(btn(`border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:${it.active ? 700 : 400};background:${it.active ? color.ink : 'transparent'};color:${dis ? 'rgba(38,50,75,.3)' : it.active ? color.paper : color.ink};white-space:nowrap;${dis ? 'cursor:default;' : ''}`, it.label, dis ? null : it.on));
        }
        box.appendChild(grp);
        controlsHost.appendChild(box);
      } else if (c.type === 'chip') {
        controlsHost.appendChild(btn(`border:1px solid ${c.active ? color.amber : 'rgba(38,50,75,.2)'};background:${c.active ? 'rgba(217,160,91,.2)' : 'rgba(247,244,236,.9)'};color:${c.active ? '#8a5a1d' : color.ink};border-radius:999px;padding:8px 14px;font-size:12.5px;font-weight:${c.active ? 700 : 400};white-space:nowrap;`, c.label, c.on));
      } else if (c.type === 'slider') {
        const box = h('div', 'display:flex;align-items:center;gap:8px;');
        box.appendChild(h('span', 'font-size:11.5px;color:rgba(38,50,75,.6);white-space:nowrap;', c.label));
        const inp = document.createElement('input');
        inp.type = 'range'; inp.min = c.min; inp.max = c.max; inp.step = c.step; inp.value = c.value;
        inp.style.cssText = 'width:150px;accent-color:#b97a2e;';
        inp.oninput = () => c.onInput(parseFloat(inp.value));
        box.appendChild(inp);
        controlsHost.appendChild(box);
      } else if (c.type === 'readout') {
        readoutEl.textContent = c.text;
      }
    }
  }
  const panelHost = {
    note: renderNote,
    board: renderBoard,
    dock: renderDockControls,
    readout: t => { readoutEl.textContent = t; },
    showAnswer: () => noteP.showAnswer && noteP.showAnswer(),
  };

  // ── 커리큘럼 + 챕터 마운트 ─────────────────────
  let instance = null, currentId = null;
  const ORDER = L.chapters.map(c => c.id);
  function renderCurriculum() {
    curP.body.innerHTML = '';
    for (const u of L.meta.units) {
      const sec = h('div', 'padding-top:10px;');
      sec.appendChild(h('div', 'display:flex;align-items:baseline;gap:8px;padding:0 8px 5px;', `
        <span style="font-family:${font.heading};font-weight:700;font-size:13.5px;color:${color.accent};">${u.numeral}</span>
        <span style="font-size:12px;font-weight:700;letter-spacing:.07em;">${u.title}</span>`));
      const list = h('div', 'display:flex;flex-direction:column;gap:2px;');
      for (const ch of L.chapters.filter(c => c.unitId === u.id)) {
        const active = ch.id === currentId;
        const b = btn(`display:flex;align-items:center;gap:9px;width:100%;text-align:left;border-radius:10px;padding:9px 10px;font-size:13px;font-weight:${active ? 700 : 400};color:${active ? color.paper : color.ink};background:${active ? color.ink : 'transparent'};transition:background .18s,color .18s;`,
          `<span style="font-family:${font.heading};font-weight:700;font-size:11.5px;color:${active ? 'rgba(247,244,236,.6)' : color.accent};min-width:18px;">${ch.no}</span><span>${ch.title}</span>`,
          () => mountChapter(ch.id));
        list.appendChild(b);
      }
      sec.appendChild(list);
      curP.body.appendChild(sec);
    }
  }
  const ctx = { stage: engine, data: L.data, panels: panelHost, play, stop, easeIO };
  function mountChapter(id) {
    const ch = L.chapters.find(c => c.id === id) || L.chapters[0];
    stop();
    if (instance) instance.dispose();
    engine.clearSolid();
    renderBoard('', '', null);
    readoutEl.textContent = '';
    currentId = ch.id;
    instance = ch.mount(ctx);
    const u = L.meta.units.find(x => x.id === ch.unitId);
    unitLabel.textContent = u.numeral + ' ' + u.title;
    chLabel.textContent = ch.no + ' · ' + ch.title;
    document.title = `${L.meta.title} — ${ch.title}`;
    renderCurriculum();
    history.replaceState(null, '', `#/${L.meta.id}/${ch.id}`);
  }
  prevB.onclick = () => mountChapter(ORDER[(ORDER.indexOf(currentId) + ORDER.length - 1) % ORDER.length]);
  nextB.onclick = () => mountChapter(ORDER[(ORDER.indexOf(currentId) + 1) % ORDER.length]);
  playB.onclick = () => { if (playing) stop(); else if (instance && instance.onPlay) instance.onPlay(); };

  mountChapter(initialChapterId || ORDER[0]);
  return () => { stop(); if (instance) instance.dispose(); engine.dispose(); };
}

route();
