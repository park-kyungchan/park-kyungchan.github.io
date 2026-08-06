# design-sync NOTES — 탐구랩 (Tamgu Labs)

- This repo is NOT a component library. The synced package `@tamgu/ui` (design-system/) was authored **for** this sync (2026-08-06, user-approved) as a faithful React transcription of the app's UI. Sources of truth, in order: `platform/apps/shell/main.js` (inline-styled vanilla JS shell — the pixel reference), `docs/07_DESIGN_TOKENS.md` (brand spec), `platform/packages/tokens/index.js` (JS tokens, mirrored in `design-system/src/tokens.ts`). If the shell's styling changes, the design-system components must be updated by hand — nothing detects that drift automatically.
- The platform itself is deliberately **buildless** (ES modules, no build step); `design-system/` is intentionally isolated at repo root with its own npm/tsup toolchain. GitHub Pages deploys `platform/` only, so design-system/ never ships to the site.
- Build: `npm --prefix design-system run build` (tsup → dist/index.js ESM + index.d.ts). Node 22 / npm 10 used originally.
- Fonts are remote Google Fonts via `@import` in `design-system/src/styles.css` (same as the app's `platform/index.html`). `[FONT_REMOTE]` for Gaegu / Gowun Batang (and Noto Sans KR) is expected — do not chase it. No font files ship in the bundle.
- Render check browser: no playwright chromium was downloaded. System Google Chrome (146) is symlinked as the expected headless shell:
  `~/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell → /usr/bin/google-chrome`.
  On a fresh machine, recreate a matching symlink (check the version the error names) or `npx playwright install chromium`.
- three.js / engine-3d visuals are app-side only — the DS has no 3D components; `PaperStage` is the empty stage backdrop.
- `colorHex` export (three.js hex mirror of `color`) is intentionally part of tokens; it is not a component.

## Known render warns
- `[FONT_REMOTE]` "Gaegu" (--font-brand), "Gowun Batang" (--font-heading) — remote font-host @import serves them at runtime. Expected on every validate.
- `[GRID_OVERFLOW]` NotePanel and Dock (both intrinsically wide) — resolved with `cfg.overrides.<Name>.cardMode: "column"` for each.
- LabSlider previews render a controlled `<input type=range>` without onChange — React logs a benign controlled-input console warning; not a render failure.

## Preview-authoring conventions (wave 1 learnings, folded)
- Stage-floating components (BrandHeader, StatusChip, TrayPill — anything ink-on-paper with no own background) need a paper-bg wrapper div (`#f7f4ec`, padding ~'18px 22px') in previews or they read as unstyled.
- PaperStage: default `height:'100%'` collapses in preview cells — pass explicit `height={340}` and a width via `style`. HomeCard is display:block — wrap in a ~340px div.
- FloatingPanel: minimize (–) button renders only when `onMinimize` is passed (a no-op works); `defaultCollapsed` gives the header-only state statically.
- LabSelect static captures show the closed state only (native `<select>`; optgroups invisible until opened) — accepted, graded on the closed render.
- Use real curriculum data in previews (`platform/labs/solid/lab.js` + `chapters/*.js` ids: explorer, generator, euler, net, section, revolution, revsection, soccer, geodesic; units poly/rev/adv).

## Re-sync risks
- The DS mirrors the shell by hand — a shell restyle (main.js) or token change (packages/tokens) silently stales `design-system/src/*`; diff those files against the DS when the app has changed.
- Fonts are network-fetched at render time; an offline render environment would fall back silently (previews would show system fonts).
- Preview content (chapter/unit names) is inlined from `platform/labs/solid/lab.js`; renaming chapters there makes preview text stale but nothing breaks.
- The Chrome-as-headless-shell symlink pins nothing: a playwright version bump in `.ds-sync/` changes the expected cache dir name (`chromium_headless_shell-<build>`), and the symlink must be recreated at the new path.
