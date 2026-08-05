#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, pathlib, re

ROOT=pathlib.Path(__file__).resolve().parents[2]
PARENT=ROOT/'parent_baseline'/'P003_R008_Two_Panel_Spatial_Lab_Standalone.html'
OUT=ROOT/'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'
EXPECTED_PARENT='6072923d14e6fdce1826627a0e58e1c7a16b625c7b1265c6e5496630c9c76787'
actual=hashlib.sha256(PARENT.read_bytes()).hexdigest()
if actual!=EXPECTED_PARENT:
    raise SystemExit(f'parent hash mismatch: {actual}')
html=PARENT.read_text(encoding='utf-8')
# R009 removes obsolete R007/R008 UI and duplicate chapter implementations before installing
# the integrated modules. The retained R007 code owns the first six validated chapters and
# shared playback/state helpers; removed code is unreachable in the nine-chapter build.
html,n=re.subn(r'\n  function installR007RightResize\(\) \{.*?(?=\n  function renderNetLab\(\))','\n',html,count=1,flags=re.S)
if n!=1: raise SystemExit('obsolete right-resize block removal failed')
html,n=re.subn(r'\n  function revolutionSVG\(profile,progress\)\{.*?(?=\n\n  function activateTabButton\(tab\))','\n',html,count=1,flags=re.S)
if n!=1: raise SystemExit('obsolete R007 chapters 7-12 removal failed')
html,n=re.subn(r'  function renderR007Timeline\(\) \{.*?\n  \}(?=\n  function r007PlayCurrent)','  function renderR007Timeline() { /* duplicate floating transport removed in R009 */ }',html,count=1,flags=re.S)
if n!=1: raise SystemExit('obsolete floating transport runtime removal failed')
html,n=re.subn(r'\n  function installResizablePanels\(\) \{.*?(?=\n  /\* ===== P003 R008 MODULE OVERRIDES ===== \*/)','\n',html,count=1,flags=re.S)
if n!=1: raise SystemExit('obsolete resizable-panel runtime removal failed')
css=(ROOT/'source/ui/r009_integrated.css').read_text(encoding='utf-8')
js='\n'.join((ROOT/'source/modules'/name).read_text(encoding='utf-8') for name in ['r009_spatial_core.js','r009_chapters.js','r009_shell.js'])
exact=json.loads((ROOT/'data/P003_R009_EXACT_SPATIAL_SPEC.json').read_text(encoding='utf-8'))

html=html.replace('<title>입체 탐구랩 R007 — 다면체·회전체·단면·최단거리</title>','<title>입체 탐구랩 R009 — 다면체·회전체·단면·최단거리</title>',1)
html=html.replace('<h1>입체 탐구랩 R008</h1>','<h1>입체 탐구랩 R009</h1>',1)
html=html.replace('중학교 1학년 · 다면체에서 회전체와 최단거리까지','중학교 1학년 · 하나의 3D 탐구 무대에서 다면체·회전체·최단거리',1)
html=html.replace('<!-- P003 R007 deterministic polyhedra + solids-of-revolution student lab; no image_gen -->','<!-- P003 R009 deterministic integrated spatial lab; no image_gen; local/offline -->',1)

nav='''  <nav class="lab-tabs glass-surface" aria-label="탐구 순서">
    <button class="tab-button is-active" data-tab="explorer" type="button" aria-current="page"><span class="tab-symbol" aria-hidden="true">1</span><span class="tab-copy"><strong>입체 읽기</strong><small>V·E·F 관찰</small></span></button>
    <button class="tab-button" data-tab="generator" type="button"><span class="tab-symbol" aria-hidden="true">2</span><span class="tab-copy"><strong>왜 5개?</strong><small>꼭짓점 각의 합</small></span></button>
    <button class="tab-button" data-tab="net" type="button"><span class="tab-symbol" aria-hidden="true">3</span><span class="tab-copy"><strong>전개도 조립</strong><small>5종 정다면체</small></span></button>
    <button class="tab-button" data-tab="section" type="button"><span class="tab-symbol" aria-hidden="true">4</span><span class="tab-copy"><strong>다면체 단면</strong><small>면의 교선</small></span></button>
    <button class="tab-button" data-tab="euler" type="button"><span class="tab-symbol" aria-hidden="true">5</span><span class="tab-copy"><strong>오일러 증명</strong><small>줄이고 되돌리기</small></span></button>
    <button class="tab-button" data-tab="soccer" type="button"><span class="tab-symbol" aria-hidden="true">6</span><span class="tab-copy"><strong>축구공 확장</strong><small>꼭짓점 자르기</small></span></button>
    <button class="tab-button" data-tab="revolution" type="button"><span class="tab-symbol" aria-hidden="true">7</span><span class="tab-copy"><strong>회전체 생성</strong><small>기본·이격·조합</small></span></button>
    <button class="tab-button" data-tab="revsection" type="button"><span class="tab-symbol" aria-hidden="true">8</span><span class="tab-copy"><strong>회전체 단면·교선</strong><small>단면+자취 통합</small></span></button>
    <button class="tab-button" data-tab="geodesic" type="button"><span class="tab-symbol" aria-hidden="true">9</span><span class="tab-copy"><strong>거리·펼친 최단길</strong><small>조건+후보 비교</small></span></button>
  </nav>'''
html,n=re.subn(r'  <nav class="lab-tabs glass-surface" aria-label="탐구 순서">.*?  </nav>',nav,html,count=1,flags=re.S)
if n!=1: raise SystemExit('nav replacement failed')

main='''  <main id="appMain" class="app-main" tabindex="-1">
    <aside id="leftPanel" class="panel controls-panel glass-surface" aria-label="현재 탐구 조작"></aside>
    <section id="viewerStage" class="viewer-stage" aria-label="수학 대상 3D 탐구 화면">
      <div class="stage-background" aria-hidden="true"></div>
      <canvas id="glCanvas" aria-label="회전·확대할 수 있는 다면체와 회전체 3D 화면">이 브라우저에서 입체도형 화면을 바로 열 수 없습니다.</canvas>
      <canvas id="labelCanvas" aria-hidden="true"></canvas>
      <div id="moduleOverlay" class="module-overlay" hidden></div>
      <div id="viewerFallback" class="viewer-fallback" hidden role="status"><strong>입체도형 표시 방식을 바꿉니다.</strong><span>다른 표시 방식으로 계속 탐구합니다.</span></div>
      <div class="stage-topline"><div class="stage-status glass-chip"><span class="status-pulse" aria-hidden="true"></span><span id="stageContextLabel">입체 읽기</span></div><div id="foldStageBadge" class="fold-stage-badge glass-chip" hidden><span class="fold-stage-step">1단계</span><strong class="fold-stage-title">전개도 읽기</strong></div></div>
      <div class="viewer-toolbar glass-surface" role="group" aria-label="입체도형 화면 조작"><button id="navigateModeButton" class="tool-button is-active" type="button" aria-pressed="true"><span aria-hidden="true">↻</span><span>회전</span></button><button id="selectModeButton" class="tool-button" type="button" aria-pressed="false"><span aria-hidden="true">⌖</span><span>선택</span></button><button id="zoomOutButton" class="tool-button icon-only" type="button" aria-label="축소">−</button><button id="zoomInButton" class="tool-button icon-only" type="button" aria-label="확대">＋</button><button id="resetViewButton" class="tool-button" type="button"><span aria-hidden="true">◎</span><span>시점 초기화</span></button></div>
      <div id="viewerHint" class="viewer-hint glass-chip">한 손가락 드래그: 회전 · 두 손가락/＋−: 확대·축소</div>
      <aside id="liveGuide" class="live-guide glass-surface" aria-live="polite" aria-atomic="true"><p id="liveGuideKicker" class="live-guide-kicker"></p><h2 id="liveGuideTitle"></h2><p id="liveGuideBody"></p><div id="liveGuideChips" class="live-guide-chips"></div></aside>
      <section id="r009SpatialHud" class="r009-spatial-hud" hidden aria-hidden="true">
        <div class="r009-spatial-heading"><p id="r009HudKicker"></p><h2 id="r009HudTitle"></h2><span id="r009HudSubtitle"></span><div id="r009PhaseStrip" class="r009-phase-strip"></div></div>
        <div id="r009SpatialLegend" class="r009-spatial-legend"></div>
        <aside id="r009Inset" class="r009-inset" hidden><p id="r009InsetLabel"></p><canvas id="r009InsetCanvas" aria-hidden="true"></canvas><div id="r009InsetMetrics" class="metric" hidden></div></aside>
      </section>
    </section>
  </main>'''
html,n=re.subn(r'  <main id="appMain" class="app-main" tabindex="-1">.*?  </main>',main,html,count=1,flags=re.S)
if n!=1: raise SystemExit('main replacement failed')

html=html.replace('1/12 · 입체 읽기','1/9 · 입체 읽기',1)
html=html.replace('입체 읽기부터 회전체와 최단거리까지 차례로 탐구해 보세요.','입체 읽기부터 통합 회전체·최단거리까지 아홉 장을 차례로 탐구해 보세요.',1)
html=html.replace('입체 읽기에서 시작해 전개도·단면·증명·회전체·최단거리로 이어지는 12장 탐구입니다.','입체 읽기에서 시작해 다면체·회전체·단면·최단거리로 이어지는 9장 통합 탐구입니다.',1)
html=html.replace('그다음 움직임 관찰</strong><span>전개도 접촉, 절단 평면의 교선, 회전체 생성, 펼친 최단경로의 변화를 봅니다.','그다음 움직임 관찰</strong><span>같은 3D 탐구 무대에서 전개도 접촉, 절단 교선, 회전체 생성, 펼친 최단경로를 봅니다.',1)

# Remove the obsolete floating-transport-only CSS and append R009 CSS.
html=re.sub(r'/\* Compact floating transport \*/.*?/\* Spatial module canvases \*/','/* Duplicate floating transport removed in R009. */\n\n/* Spatial module canvases */',html,count=1,flags=re.S)
html=re.sub(r'/\* R008 post-adversarial optical fixes: explicit transport hierarchy and phase semantics\. \*/.*?(?=\.r008-spatial-scene)', '', html,count=1,flags=re.S)
html=html.replace('</style>',f'\n/* ===== P003 R009 INTEGRATED SPATIAL DESIGN ===== */\n{css}\n</style>',1)

# Install exact data before the parent data and replace all R008 runtime overrides with R009 modules.
exact_js=json.dumps(exact,ensure_ascii=False,separators=(',',':'))
html=html.replace('<script>\nwindow.P003_DATA =',f'<script>\nwindow.P003_R009_EXACT={exact_js};\nwindow.P003_DATA =',1)
module_re=re.compile(r'  /\* ===== P003 R008 MODULE OVERRIDES ===== \*/.*?  r008InstallShell\(\);\n  updateChapterNav\(\);',re.S)
module_block=f'''  /* ===== P003 R009 INTEGRATED MODULE OVERRIDES ===== */\n{js}\n  r009Install();\n  updateChapterNav();'''
html,n=module_re.subn(module_block,html,count=1)
if n!=1: raise SystemExit('R008 runtime block replacement failed')

OUT.write_text(html,encoding='utf-8')
print(json.dumps({'output':str(OUT),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'parent_sha256':actual},ensure_ascii=False,indent=2))
