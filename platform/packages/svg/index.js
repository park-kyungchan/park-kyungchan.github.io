// SVG DOM 헬퍼 — 칠판 패널용
const NS = 'http://www.w3.org/2000/svg';
export function svg(viewBox, width) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('width', width || '100%');
  return s;
}
export function el(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
