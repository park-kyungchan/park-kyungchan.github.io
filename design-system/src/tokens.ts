/** 디자인 토큰 단일 출처 — docs/07_DESIGN_TOKENS.md 준거 (platform/packages/tokens 미러) */
export const color = {
  ink: '#26324b',
  accent: '#41608f',
  amber: '#b97a2e',
  amberSoft: '#d9a05b',
  paper: '#f7f4ec',
  solidFace: '#dde6f3',
  grid: 'rgba(38,50,75,0.05)',
  panelBg: 'rgba(255,255,253,0.93)',
  panelBorder: 'rgba(38,50,75,0.14)',
} as const;

export const colorHex = {
  ink: 0x26324b,
  accent: 0x41608f,
  amber: 0xb97a2e,
  amberSoft: 0xd9a05b,
  solidFace: 0xdde6f3,
} as const;

export const font = {
  brand: "'Gaegu', cursive",
  heading: "'Gowun Batang', serif",
  body: "'Noto Sans KR', sans-serif",
} as const;

export const panel = {
  radius: 16,
  blur: 14,
  shadow: '0 14px 34px rgba(38,50,75,0.16)',
  floatIn: 'floatIn 0.5s cubic-bezier(0.2,0.9,0.25,1) both',
  chipIn: 'chipIn 0.35s cubic-bezier(0.2,0.9,0.25,1) both',
} as const;

export const motion = { defaultScale: 10 } as const;

export const touch = { minTarget: 44 } as const;
