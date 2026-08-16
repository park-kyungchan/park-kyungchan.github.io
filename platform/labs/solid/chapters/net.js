import { svg, el } from '../../../packages/svg/index.js';

export const net = {
  id: 'net', unitId: 'poly', no: '04', title: '전개도',
  mount(ctx) {
    const e = ctx.stage, D = ctx.data.D;
    const netIds = Object.keys(D.nets || {});
    let netSolid = netIds[0], netFace = -1;

    function boardEl() {
      const netD = D.nets[netSolid];
      if (!netD) return null;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      netD.faces.forEach(f => f.points.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, -p[1]); y1 = Math.max(y1, -p[1]); }));
      const pad = 0.12;
      const g = svg(`${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`);
      netD.faces.forEach((f, i) => {
        const poly = el('polygon', {
          points: f.points.map(p => p[0] + ',' + (-p[1])).join(' '),
          fill: i === netFace ? 'rgba(217,160,91,0.75)' : 'rgba(65,96,143,0.13)',
          stroke: '#26324b', 'stroke-width': 0.025, style: 'cursor:pointer;' });
        poly.addEventListener('click', () => {
          netFace = i;
          e.clearHighlights();
          e.highlightFace(f.source_face_index, true);
          renderBoard();
        });
        g.appendChild(poly);
      });
      return g;
    }
    function renderBoard() {
      ctx.panels.board('칠판 · 전개도', '면을 누르면 입체에서 같은 면이 켜집니다', boardEl());
    }
    function build(id) {
      netSolid = id; netFace = -1;
      const s = D.solids[id];
      e.setPolyhedron(s); e.frame();
      const netD = D.nets[id];
      ctx.panels.note({
        kicker: 'Ⅰ단원 다면체 · 04', title: '전개도',
        stats: netD ? [{ k: '입체', v: s.korean_name }, { k: '면', v: netD.faces.length + '개' }] : [],
        body: '전개도는 입체도형의 겉면을 모서리를 따라 잘라 한 평면 위에 겹치지 않게 펼친 그림이다. 전개도를 접으면 원래의 입체가 된다.',
        question: '같은 입체의 전개도는 한 가지뿐일까?',
        answer: '아니다. 어느 모서리를 자르는지에 따라 여러 가지 전개도가 나온다. 정육면체의 서로 다른 전개도는 모두 11가지이다.',
      });
      ctx.panels.dock([
        { type: 'select', groups: [{ label: '전개도가 준비된 입체', opts: netIds.map(nid => ({ id: nid, name: (D.solids[nid] || {}).korean_name || nid })) }], value: id, onChange: build },
        { type: 'readout', text: netD ? `면 ${netD.faces.length}개 · 칠판의 면을 눌러 보세요` : '' },
      ]);
      renderBoard();
    }
    build(netSolid);
    return {
      dispose() { ctx.stop(); },
      onPlay() {
        const netD = D.nets[netSolid];
        if (!netD) return;
        const F = netD.faces.length;
        ctx.play([{
          dur: 0.55 * F, phases: [{ until: 1, label: '전개도의 면과 입체의 면을 짝지어 봅니다' }],
          onU: p => {
            const k = Math.min(F - 1, Math.floor(p * F));
            if (k !== netFace) {
              netFace = k;
              e.clearHighlights();
              e.highlightFace(netD.faces[k].source_face_index, true);
              renderBoard();
            }
          },
          onDone: () => { e.clearHighlights(); netFace = -1; renderBoard(); },
        }]);
      },
    };
  },
};
