# 탐구랩 (Tamgu Labs) — build conventions

Tamgu Labs is a Korean middle-school math exploration platform. Its look: warm paper (`#f7f4ec`) with a 28px grid, deep ink (`#26324b`) text, floating translucent panels, and a single amber accent family. Textbook-formal tone — playful handwriting appears ONLY where specified below.

## Setup — no provider needed
Components are self-contained (inline styles). Two global requirements, both satisfied by `styles.css`: the font `@import` (Gaegu, Gowun Batang, Noto Sans KR) and the `floatIn` / `chipIn` keyframes that panel/chip entrances reference. Build screens on `<PaperStage>` (the paper+grid backdrop) or set the page background to `var(--paper)`.

## Styling idiom — inline styles + CSS variables; there are NO utility classes
Never invent CSS class names. For your own layout glue use the custom properties the stylesheet defines (`styles.css` → its `_ds_bundle.css` import):
`--ink · --accent · --amber · --amber-soft · --paper · --solid-face · --grid · --panel · --panel-border · --font-brand (Gaegu) · --font-heading (Gowun Batang) · --font-body (Noto Sans KR) · --radius-panel (16px) · --shadow-panel`.
The same values are exported as JS tokens: `color`, `font`, `panel`, `touch` (e.g. `color.ink`, `font.heading`, `panel.shadow`, `touch.minTarget`).

## Typography rules (strict)
- **Gaegu (--font-brand)**: brand wordmarks, the 탐구 질문 handwriting, StatusChip/TrayPill text — nowhere else. Never body text or data.
- **Gowun Batang (--font-heading)**: titles, unit numerals (roman: Ⅰ·Ⅱ·Ⅲ), chapter labels.
- **Noto Sans KR (--font-body)**: everything else. Minimum 12.5px; note body 13.5px/1.7.
- Forbidden (from the brand spec in `guidelines/07_DESIGN_TOKENS.md`): gradient backgrounds, emoji, left-border accent cards, new colors beyond the token set.

## Layout conventions
Panels float absolutely over the stage: 커리큘럼 left (width 250), 학습 노트 right (width 330), 칠판 lower-left (width 312). The Dock sits bottom-center; the StatusChip top-center; BrandHeader top-left; TrayPills stack at mid-right. Touch targets ≥ 44px.

## Idiomatic screen
```jsx
const { PaperStage, BrandHeader, NotePanel, Dock, Transport, SegmentedControl } = window.TamguUI;

<PaperStage height={720}>
  <div style={{ position: 'absolute', left: 18, top: 12 }}>
    <BrandHeader title="입체 탐구랩" subtitle="탐구랩 · 중1 · 2학기" />
  </div>
  <div style={{ position: 'absolute', right: 18, top: 58 }}>
    <NotePanel kicker="Ⅰ단원 다면체 · 03" title="오일러 공식"
      stats={[{ k: 'V', v: '4' }, { k: 'E', v: '6' }, { k: 'F', v: '4' }]}
      question="면의 수가 늘어나도 V−E+F가 2로 유지되는 까닭은?"
      answer="증가분이 상쇄되기 때문이다.">
      볼록한 다면체에서 V − E + F = 2 가 항상 성립한다.
    </NotePanel>
  </div>
  <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)' }}>
    <Dock readout="V 4 − E 6 + F 4 = 2"
      transport={<Transport unitLabel="Ⅰ 다면체" chapterLabel="03 · 오일러 공식" progress={0} />}>
      <SegmentedControl label="세어 보기" value="v"
        options={[{ id: 'v', label: '꼭짓점' }, { id: 'e', label: '모서리' }, { id: 'f', label: '면' }]} />
    </Dock>
  </div>
</PaperStage>
```
Component APIs live in each `components/general/<Name>/<Name>.d.ts`; usage patterns in each `<Name>.prompt.md`.
