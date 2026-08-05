/* P003 R009 chapter integration — nine chapters, one spatial renderer, left-side playback. */
  let drawRevolutionVisual, drawRevSectionVisual, drawPathVisual, renderRevolution, renderRevSections, renderShortestPaths;
  const R009_CHAPTER_ORDER = Object.freeze([...R009_EXACT.chapter_order]);
  const R009_CHAPTER_NAMES = Object.freeze({
    explorer:'입체 읽기', generator:'왜 5개?', net:'전개도 조립', section:'다면체 단면',
    euler:'오일러 증명', soccer:'축구공 확장', revolution:'회전체 생성',
    revsection:'회전체 단면·교선', geodesic:'거리·펼친 최단길'
  });
  const R009_CONTEXT_LABELS = Object.freeze({
    revolution:'평면도형의 회전과 회전체 생성',
    revsection:'절단 평면과 회전체가 만나는 실제 교선',
    geodesic:'허용 경로와 길이를 보존한 펼침'
  });
  const R009_PROGRESS_STOPS = Object.freeze([0,.16,.34,.62,.84,1]);
  const R009_SECTION_CHOICES = Object.freeze([
    ['circle','원'],['tangent_point','한 점'],['rectangle','직사각형'],['triangle','삼각형'],
    ['trapezoid','사다리꼴'],['ellipse','타원'],['curves_and_cap_segments','곡선+밑면 선분'],
    ['annulus','고리 모양'],['two_circles','두 원']
  ]);

  Object.assign(state, {
    revolutionProfile: R009_EXACT.revolution_groups.basic.includes(state.revolutionProfile) ? state.revolutionProfile : 'cylinder',
    revolutionProgress: Number(state.revolutionProgress || 0),
    revolutionPrediction: null,
    revSectionCase: R009_EXACT.section_cases.some(item=>item.case_id===state.revSectionCase) ? state.revSectionCase : 'CYLINDER-OBLIQUE-CAPS',
    revSectionProgress: Number(state.revSectionProgress || 0),
    revSectionPrediction: null,
    revSectionRevealed: false,
    r009SectionDirectD: null,
    pathCase: ['cube','cylinder','cone','sphere'].includes(state.pathCase) ? state.pathCase : 'cube',
    pathProgress: Number(state.pathProgress || 0),
    distanceFocus: ['interior','surface','edge'].includes(state.distanceFocus) ? state.distanceFocus : 'surface',
  });

  function r009PhaseIndex(progress){
    const p=clamp(Number(progress)||0,0,1);
    return p<.14?0:p<.30?1:p<.72?2:p<.90?3:4;
  }
  function r009PhaseLabel(progress){return ['미리 보기','예상','변화 관찰','정확히 맞추기','비교하고 설명'][r009PhaseIndex(progress)];}
  function r009StepProgress(current,direction){
    const now=clamp(Number(current)||0,0,1);
    if(direction<0){for(let i=R009_PROGRESS_STOPS.length-1;i>=0;i--)if(R009_PROGRESS_STOPS[i]<now-.025)return R009_PROGRESS_STOPS[i];return 0;}
    for(const value of R009_PROGRESS_STOPS)if(value>now+.025)return value;return 1;
  }
  function r009ProfileOptions(){
    const groupNames={basic:'기본 회전체',offset:'회전축에서 떨어진 도형',composite:'여러 평면도형 조합'};
    return Object.entries(R009_EXACT.revolution_groups).map(([group,ids])=>`<optgroup label="${groupNames[group]}">${ids.map(id=>{const item=R009_EXACT.revolution_profiles[id];return `<option value="${id}" ${id===state.revolutionProfile?'selected':''}>${escapeHTML(item.label)} — ${escapeHTML(item.profile_label)}</option>`}).join('')}</optgroup>`).join('');
  }
  function r009ExactList(exact){
    const labels={radius:'반지름',height:'높이',base_radius:'밑면 반지름',bottom_radius:'아랫면 반지름',top_radius:'윗면 반지름',inner_radius:'안쪽 반지름',outer_radius:'바깥 반지름',major_radius:'큰 원 반지름',minor_radius:'작은 원 반지름',parts:'조합'};
    return Object.entries(exact||{}).map(([key,value])=>`<li><strong>${escapeHTML(labels[key]||key)}</strong>: ${escapeHTML(Array.isArray(value)?value.join(' + '):typeof value==='number'?r9fmt(value):value)}</li>`).join('');
  }
  function r009BoundaryLabel(value){
    const map={sphere_plane_circle:'구와 평면의 원 교선',single_tangent_point:'접점 하나',lateral_closed_curve:'옆면의 닫힌 교선',two_lateral_generators:'옆면의 두 모선',top_cap_chord:'윗면의 선분',bottom_cap_chord:'밑면의 선분',lateral_two_arcs:'옆면의 두 곡선',two_generators:'두 모선',base_diameter:'밑면의 지름',top_diameter:'윗면의 지름',bottom_diameter:'밑면의 지름',outer_circle:'바깥 원',inner_circle:'안쪽 원',two_disconnected_circles:'서로 떨어진 두 원'};
    return map[value]||String(value).replaceAll('_',' ');
  }
  function r009SetProgressUI(id,value){
    const input=$(`#${id}`,refs.left);if(input&&document.activeElement!==input)input.value=String(value);
    const out=$(`#${id}Value`,refs.left);if(out)out.textContent=`${Math.round(value*100)}%`;
  }
  function r009MaybePulse(previous,next){if(r009PhaseIndex(previous)!==r009PhaseIndex(next))r9PulseStage();}

  drawRevolutionVisual = function(progress,announceChange=false){
    const previous=state.revolutionProgress||0;state.revolutionProgress=clamp(Number(progress)||0,0,1);
    r9DrawRevolutionSpatial(state.revolutionProgress);r009SetProgressUI('revolutionProgress',state.revolutionProgress);r009UpdateLiveGuide();r009MaybePulse(previous,state.revolutionProgress);
    if(announceChange)announce(`회전체 생성 과정을 ${Math.round(state.revolutionProgress*100)}% 위치에서 확인합니다.`);
  };
  function r009RevolutionEvidence(){
    const item=R009_EXACT.revolution_profiles[state.revolutionProfile],axis=item.axis_relation==='offset_from_axis'?'평면도형이 회전축에서 떨어져 있어 가운데 빈 공간이 생깁니다.':'평면도형이 회전축에 닿아 회전축까지 채워진 회전체가 됩니다.';
    refs.right.innerHTML=`<section class="panel-section"><p class="eyebrow">7 · 정확 데이터</p><h2>${escapeHTML(item.label)}</h2><div class="callout"><strong>${escapeHTML(item.profile_label)}을 1회전</strong>${escapeHTML(axis)}</div><ul>${r009ExactList(item.exact)}</ul></section>
    <section class="panel-section"><h3>어떤 요소가 무엇을 만드는가</h3><ul><li>회전축에 평행한 선분 → 원기둥 모양의 옆면</li><li>회전축으로 향하는 선분 → 원 모양의 밑면·윗면</li><li>곡선 → 그 곡선이 쓸고 간 곡면</li><li>축에서 떨어진 도형 → 속이 빈 회전체 또는 고리 모양</li></ul></section>
    <section class="panel-section"><h3>정확성과 표시 모델</h3><p>평면도형·회전축·수치는 deterministic data가 권위입니다. 3D 곡면은 ${R009_EXACT.model_disclosure.sweep_segments}개 회전 구간으로 표시한 근사 mesh이며, 반지름 2에서 기록한 최대 원호 처짐 오차는 약 ${r9fmt(R009_EXACT.model_disclosure.max_circle_sagitta_error_radius_2_segments_84,6)}입니다.</p></section>`;
  }
  renderRevolution = function(){
    stopR007Playback();showModuleOverlay(false);renderer.resetView('solid');renderer.setInteractionMode('navigate');setInteractionUI('navigate');
    const item=R009_EXACT.revolution_profiles[state.revolutionProfile];
    refs.left.innerHTML=`<section class="panel-section"><p class="eyebrow">7 · 회전체 생성</p><h2>평면도형을 1회전시키면</h2><p>기본 4종, 축에서 떨어진 도형, 여러 도형의 조합을 같은 회전 원리로 비교합니다.</p>
      <label class="control-label" for="revolutionProfileSelect">회전시킬 평면도형</label><select id="revolutionProfileSelect">${r009ProfileOptions()}</select>
      <div class="r009-card-grid" aria-label="기본 회전체 빠른 선택">${R009_EXACT.revolution_groups.basic.map(id=>{const v=R009_EXACT.revolution_profiles[id];return `<button data-r9-profile="${id}" class="choice-button ${id===state.revolutionProfile?'is-active':''}" type="button"><strong>${escapeHTML(v.label)}</strong><small>${escapeHTML(v.profile_label)}을 회전</small></button>`}).join('')}</div>
      <div class="r009-status-line">${escapeHTML(item.axis_relation==='offset_from_axis'?'회전축에서 떨어짐 → 가운데 빈 공간을 관찰':'회전축에 닿음 → 축까지 채워지는 과정을 관찰')}</div></section>
    <section class="panel-section"><h3>자동재생과 직접 확인</h3><div class="r009-control-row"><span>0%</span><input id="revolutionProgress" type="range" min="0" max="1" step="0.01" value="${state.revolutionProgress}" aria-label="회전체 생성 진행률"><output id="revolutionProgressValue" class="progress-value">${Math.round(state.revolutionProgress*100)}%</output></div>
      <div class="r009-play-row"><button id="revolutionPlay" class="action-button primary" type="button" aria-pressed="false">▶ 자동재생</button><button id="revolutionPrev" class="quiet-button" type="button" aria-label="이전 의미 단계">←</button><button id="revolutionNext" class="quiet-button" type="button" aria-label="다음 의미 단계">→</button></div>
      <div class="r009-mini-steps">${['도형','축','회전','곡면','완성'].map((v,i)=>`<button data-r9-rev-stop="${R009_PROGRESS_STOPS[i]}" class="chip-button" type="button">${v}</button>`).join('')}</div></section>`;
    r009RevolutionEvidence();
    $('#revolutionProfileSelect',refs.left).addEventListener('change',event=>{stopR007Playback();state.revolutionProfile=event.target.value;state.revolutionProgress=0;renderer.resetView('solid');renderRevolution();announce(`${R009_EXACT.revolution_profiles[state.revolutionProfile].label} 생성 과정을 선택했습니다.`);});
    $$('[data-r9-profile]',refs.left).forEach(button=>button.addEventListener('click',()=>{stopR007Playback();state.revolutionProfile=button.dataset.r9Profile;state.revolutionProgress=0;renderer.resetView('solid');renderRevolution();}));
    $('#revolutionProgress',refs.left).addEventListener('input',event=>{stopR007Playback();drawRevolutionVisual(Number(event.target.value));});
    $('#revolutionPlay',refs.left).addEventListener('click',()=>state.r007Playing?stopR007Playback({announceStop:true}):startR007Playback('revolutionProgress',drawRevolutionVisual,9));
    $('#revolutionPrev',refs.left).addEventListener('click',()=>{stopR007Playback();drawRevolutionVisual(r009StepProgress(state.revolutionProgress,-1),true);});
    $('#revolutionNext',refs.left).addEventListener('click',()=>{stopR007Playback();drawRevolutionVisual(r009StepProgress(state.revolutionProgress,1),true);});
    $$('[data-r9-rev-stop]',refs.left).forEach(button=>button.addEventListener('click',()=>{stopR007Playback();drawRevolutionVisual(Number(button.dataset.r9RevStop),true);}));
    drawRevolutionVisual(state.revolutionProgress);requestAnimationFrame(()=>r009AfterRender());
  };

  drawRevSectionVisual = function(progress,announceChange=false){
    const previous=state.revSectionProgress||0;state.revSectionProgress=clamp(Number(progress)||0,0,1);state.r009SectionDirectD=null;
    r9DrawSectionSpatial(state.revSectionProgress);if(state.revSectionProgress>=.9)state.revSectionRevealed=true;r009SetProgressUI('revSectionProgress',state.revSectionProgress);r009UpdateLiveGuide();r009MaybePulse(previous,state.revSectionProgress);
    if(announceChange)announce(`절단 과정을 ${Math.round(state.revSectionProgress*100)}% 위치에서 확인합니다.`);
  };
  function r009SectionEvidence(){
    const item=r9SectionCase(),revealed=state.revSectionRevealed||state.revSectionProgress>=.9;
    refs.right.innerHTML=`<section class="panel-section"><p class="eyebrow">8 · analytic source</p><h2>${escapeHTML(item.label)}</h2>${revealed?`<div class="callout success"><strong>${escapeHTML(r9ClassificationLabel(item.classification))}</strong>${escapeHTML((item.boundary_components||[]).map(r009BoundaryLabel).join(' + '))}</div>`:`<div class="callout"><strong>예측을 먼저 남기세요.</strong>평면이 실제로 지난 옆면·윗면·밑면·꼭짓점을 확인한 뒤 결과를 비교합니다.</div>`}<ul>${r009ExactList(item.exact)}</ul></section>
    <section class="panel-section"><h3>교선의 자취가 단면 경계가 되는 과정</h3><ol><li>절단 평면이 회전체 밖에서 접근합니다.</li><li>평면과 표면을 동시에 만족하는 첫 점이 생깁니다.</li><li>그 점들이 표면을 따라 이어져 교선이 됩니다.</li><li>유한한 입체에서는 cap과의 선분도 함께 실제 경계를 닫습니다.</li></ol></section>
    <section class="panel-section"><h3>모델 한계</h3><p>분류·표시 수치·경계 구성은 analytic data가 권위입니다. 화면의 곡선은 deterministic mesh–plane intersection polyline이며 exact analytic curve 자체라고 주장하지 않습니다.</p></section>`;
  }
  function r009SectionOptions(){return R009_EXACT.section_cases.map(item=>`<option value="${item.case_id}" ${item.case_id===state.revSectionCase?'selected':''}>${escapeHTML(item.label)}${item.scope?' · 심화':''}</option>`).join('');}
  renderRevSections = function(){
    stopR007Playback();showModuleOverlay(false);renderer.resetView('solid');renderer.setInteractionMode('navigate');setInteractionUI('navigate');state.r009SectionDirectD=null;
    const item=r9SectionCase();
    refs.left.innerHTML=`<section class="panel-section"><p class="eyebrow">8 · 회전체 단면 + 교선의 자취</p><h2>평면과 곡면이 만나는 점을 추적</h2><p>기존 두 장을 한 state graph로 합쳤습니다. 결과보다 먼저 실제로 지난 표면을 찾습니다.</p>
      <label class="control-label" for="revSectionCaseSelect">절단 사례</label><select id="revSectionCaseSelect">${r009SectionOptions()}</select>
      <div class="r009-prediction" aria-label="단면 모양 예측">${R009_SECTION_CHOICES.map(([value,label])=>`<button data-r9-section-pred="${value}" class="choice-button ${state.revSectionPrediction===value?'is-active':''}" type="button">${label}</button>`).join('')}</div></section>
    <section class="panel-section"><h3>절단 평면 자동재생</h3><div class="r009-control-row"><span>밖</span><input id="revSectionProgress" type="range" min="0" max="1" step="0.01" value="${state.revSectionProgress}" aria-label="절단 평면 이동 진행률"><output id="revSectionProgressValue" class="progress-value">${Math.round(state.revSectionProgress*100)}%</output></div>
      <div class="r009-play-row"><button id="revSectionPlay" class="action-button primary" type="button" aria-pressed="false">▶ 자동재생</button><button id="revSectionPrev" class="quiet-button" type="button" aria-label="이전 의미 단계">←</button><button id="revSectionNext" class="quiet-button" type="button" aria-label="다음 의미 단계">→</button></div>
      <label class="control-label" for="r009SectionOffset">직접 조작: 평면 위치 d</label><input id="r009SectionOffset" type="range" min="-3" max="3" step="0.02" value="${item.plane.d}" aria-label="절단 평면의 법선 방향 위치"><div class="r009-status-line" id="r009SectionOffsetStatus">자동재생 중에도 가운데 입체를 돌리고 확대할 수 있습니다.</div></section>
    <section class="panel-section"><button id="revSectionReveal" class="action-button success" type="button">예측과 실제 경계 비교</button></section>`;
    r009SectionEvidence();const initial=r9DrawSectionSpatial(state.revSectionProgress);const offset=$('#r009SectionOffset',refs.left);offset.min=String(initial.support.min-.35);offset.max=String(initial.support.max+.35);offset.value=String(item.plane.d);
    $('#revSectionCaseSelect',refs.left).addEventListener('change',event=>{stopR007Playback();state.revSectionCase=event.target.value;state.revSectionProgress=0;state.revSectionPrediction=null;state.revSectionRevealed=false;state.r009SectionDirectD=null;renderer.resetView('solid');renderRevSections();announce(`${r9SectionCase().label} 사례로 바꿨습니다.`);});
    $$('[data-r9-section-pred]',refs.left).forEach(button=>button.addEventListener('click',()=>{state.revSectionPrediction=button.dataset.r9SectionPred;$$('[data-r9-section-pred]',refs.left).forEach(v=>v.classList.toggle('is-active',v===button));announce('예측을 기록했습니다. 이제 절단 평면을 움직여 실제 교선을 관찰하세요.');}));
    $('#revSectionProgress',refs.left).addEventListener('input',event=>{stopR007Playback();drawRevSectionVisual(Number(event.target.value));});
    $('#revSectionPlay',refs.left).addEventListener('click',()=>{state.r009SectionDirectD=null;state.r007Playing?stopR007Playback({announceStop:true}):startR007Playback('revSectionProgress',drawRevSectionVisual,9);});
    $('#revSectionPrev',refs.left).addEventListener('click',()=>{stopR007Playback();drawRevSectionVisual(r009StepProgress(state.revSectionProgress,-1),true);});
    $('#revSectionNext',refs.left).addEventListener('click',()=>{stopR007Playback();drawRevSectionVisual(r009StepProgress(state.revSectionProgress,1),true);});
    offset.addEventListener('input',event=>{stopR007Playback();state.r009SectionDirectD=Number(event.target.value);state.revSectionProgress=1;const result=r9DrawSectionSpatial(1,{directD:state.r009SectionDirectD});$('#r009SectionOffsetStatus',refs.left).textContent=`d=${r9fmt(result.d,2)} · 교선 조각 ${result.loops.reduce((n,loop)=>n+Math.max(0,loop.points.length-1),0)}개`;r009UpdateLiveGuide();});
    $('#revSectionReveal',refs.left).addEventListener('click',()=>{state.revSectionRevealed=true;state.revSectionProgress=Math.max(.92,state.revSectionProgress);if(state.r009SectionDirectD==null)r9DrawSectionSpatial(state.revSectionProgress);r009SectionEvidence();r009UpdateLiveGuide(true);announce(state.revSectionPrediction===item.classification?'예측이 analytic 분류와 일치합니다. 실제 경계 구성도 확인하세요.':'예측과 실제 결과를 비교했습니다. 어떤 표면이 경계에 참여했는지 확인하세요.');});
  };

  drawPathVisual = function(progress,announceChange=false){
    const previous=state.pathProgress||0;state.pathProgress=clamp(Number(progress)||0,0,1);r9DrawPathSpatial(state.pathProgress);r009SetProgressUI('pathProgress',state.pathProgress);r009UpdateLiveGuide();r009MaybePulse(previous,state.pathProgress);
    if(announceChange)announce(`거리와 펼침 과정을 ${Math.round(state.pathProgress*100)}% 위치에서 확인합니다.`);
  };
  function r009PathEvidence(){
    const key=state.pathCase,mode=state.distanceFocus,ex=R009_EXACT.shortest_paths[key],modeLabel={interior:'입체 내부 직선',surface:'겉면 최단거리',edge:'모서리만 따라가는 최단거리'}[mode];let body='';
    if(key==='cube')body=`<div class="formula-box">내부: √3 ≈ ${r9fmt(ex.interior_distance)}<br>겉면: √5 ≈ ${r9fmt(ex.surface_distance)}<br>모서리만: ${r9fmt(ex.edge_only_distance)}</div><p>한 펼침만 보지 않고 ${ex.surface_candidates.length}개의 유효 후보를 비교합니다.</p>`;
    else if(key==='cylinder')body=`<div class="formula-box">내부 chord ≈ ${r9fmt(ex.interior_chord)}<br>옆면 최단 ≈ ${r9fmt(ex.surface_minimum)}<br>선택된 periodic copy: k=${ex.minimum_k}</div><p>${ex.periodic_copies.map(v=>`k=${v.k}: ${r9fmt(v.length)}`).join(' · ')}</p>`;
    else if(key==='cone')body=`<div class="formula-box">모선 ${r9fmt(ex.slant_height)}<br>부채꼴 중심각 ${r9fmt(ex.sector_angle)} rad<br>옆면 최단 ≈ ${r9fmt(ex.surface_minimum)}</div><p>${ex.seam_copies.map(v=>`k=${v.k}: ${r9fmt(v.length)}`).join(' · ')}</p>`;
    else body=`<div class="formula-box">내부 chord ≈ ${r9fmt(ex.interior_chord)}<br>표면의 짧은 큰원호 ≈ ${r9fmt(ex.surface_short_arc)}</div><p>구의 표면 최단경로는 심화 관찰이며 중학교 평가 범위로 주장하지 않습니다.</p>`;
    refs.right.innerHTML=`<section class="panel-section"><p class="eyebrow">9 · 같은 두 점, 다른 metric domain</p><h2>${escapeHTML(ex.label)} · ${escapeHTML(modeLabel)}</h2>${body}</section>
    <section class="panel-section"><h3>겉면 최단경로를 판단하는 순서</h3><ol><li>지나갈 수 있는 영역을 먼저 정합니다.</li><li>길이를 보존하는 펼침 또는 periodic/seam copy를 만듭니다.</li><li>평면의 직선이 선택한 face chain 안을 올바르게 지나는지 확인합니다.</li><li>여러 유효 후보의 길이를 비교합니다.</li><li>직선을 다시 입체 표면에 대응시킵니다.</li></ol></section>
    <section class="panel-section"><h3>표시 모델</h3><p>${escapeHTML(R009_EXACT.model_disclosure.unfold_interpolation)}. 표시식과 길이는 같은 exact data에서 생성됩니다.</p></section>`;
  }
  renderShortestPaths = function(){
    stopR007Playback();showModuleOverlay(false);renderer.resetView('solid');renderer.distance=6.4;renderer.requestRender();renderer.setInteractionMode('navigate');setInteractionUI('navigate');
    const edgeAllowed=state.pathCase==='cube';if(!edgeAllowed&&state.distanceFocus==='edge')state.distanceFocus='surface';
    refs.left.innerHTML=`<section class="panel-section"><p class="eyebrow">9 · 거리 조건 + 펼친 최단길</p><h2>“어디를 따라가나”를 먼저 정하기</h2><p>기존 두 장을 하나로 합쳐, 허용 경로를 고른 직후 같은 화면에서 펼침과 후보 비교까지 이어집니다.</p>
      <label class="control-label" for="pathCaseSelect">입체와 두 점</label><select id="pathCaseSelect"><option value="cube" ${state.pathCase==='cube'?'selected':''}>정육면체 · 마주 보는 꼭짓점</option><option value="cylinder" ${state.pathCase==='cylinder'?'selected':''}>원기둥 · 옆면의 두 점</option><option value="cone" ${state.pathCase==='cone'?'selected':''}>원뿔 · 옆면의 두 점</option><option value="sphere" ${state.pathCase==='sphere'?'selected':''}>구 · 내부와 표면 비교(심화)</option></select>
      <div class="r009-prediction" role="group" aria-label="허용 경로 선택"><button data-r9-distance-mode="interior" class="choice-button ${state.distanceFocus==='interior'?'is-active':''}" type="button">입체 내부</button><button data-r9-distance-mode="surface" class="choice-button ${state.distanceFocus==='surface'?'is-active':''}" type="button">겉면</button><button data-r9-distance-mode="edge" class="choice-button ${state.distanceFocus==='edge'?'is-active':''}" type="button" ${edgeAllowed?'':'disabled'}>모서리만</button></div></section>
    <section class="panel-section"><h3>펼치기와 후보 비교</h3><div class="r009-control-row"><span>입체</span><input id="pathProgress" type="range" min="0" max="1" step="0.01" value="${state.pathProgress}" aria-label="최단거리 펼침 진행률"><output id="pathProgressValue" class="progress-value">${Math.round(state.pathProgress*100)}%</output></div>
      <div class="r009-play-row"><button id="pathPlay" class="action-button primary" type="button" aria-pressed="false">▶ 자동재생</button><button id="pathPrev" class="quiet-button" type="button" aria-label="이전 의미 단계">←</button><button id="pathNext" class="quiet-button" type="button" aria-label="다음 의미 단계">→</button></div>
      <div class="r009-mini-steps">${['조건','P·Q','펼침','직선','비교'].map((v,i)=>`<button data-r9-path-stop="${R009_PROGRESS_STOPS[i]}" class="chip-button" type="button">${v}</button>`).join('')}</div>
      <div class="r009-status-line">자동재생 중에도 회전·두 손가락 확대·＋− 조작이 계속 가능합니다.</div></section>`;
    r009PathEvidence();
    $('#pathCaseSelect',refs.left).addEventListener('change',event=>{stopR007Playback();state.pathCase=event.target.value;state.pathProgress=0;if(state.pathCase!=='cube'&&state.distanceFocus==='edge')state.distanceFocus='surface';renderer.resetView('solid');renderShortestPaths();announce(`${R009_EXACT.shortest_paths[state.pathCase].label} 문제로 바꿨습니다.`);});
    $$('[data-r9-distance-mode]',refs.left).forEach(button=>button.addEventListener('click',()=>{stopR007Playback();state.distanceFocus=button.dataset.r9DistanceMode;state.pathProgress=Math.max(.12,state.pathProgress);renderShortestPaths();announce(`${button.textContent.trim()}만 허용하는 거리 문제를 선택했습니다.`);}));
    $('#pathProgress',refs.left).addEventListener('input',event=>{stopR007Playback();drawPathVisual(Number(event.target.value));});
    $('#pathPlay',refs.left).addEventListener('click',()=>state.r007Playing?stopR007Playback({announceStop:true}):startR007Playback('pathProgress',drawPathVisual,9));
    $('#pathPrev',refs.left).addEventListener('click',()=>{stopR007Playback();drawPathVisual(r009StepProgress(state.pathProgress,-1),true);});
    $('#pathNext',refs.left).addEventListener('click',()=>{stopR007Playback();drawPathVisual(r009StepProgress(state.pathProgress,1),true);});
    $$('[data-r9-path-stop]',refs.left).forEach(button=>button.addEventListener('click',()=>{stopR007Playback();drawPathVisual(Number(button.dataset.r9PathStop),true);}));
    drawPathVisual(state.pathProgress);requestAnimationFrame(()=>r009AfterRender());
  };

  renderR007Timeline = function(){ /* R009 deliberately removes the duplicate floating transport. */ };
  moduleSupports3D = function(){return ['explorer','net','section','soccer','revolution','revsection','geodesic'].includes(state.tab);};

  const r009BaseRenderCurrentTab = renderCurrentTab;
  renderCurrentTab = function(){
    if(!R009_CHAPTER_ORDER.includes(state.tab))state.tab=state.tab==='locus'?'revsection':['distance','transfer'].includes(state.tab)?'geodesic':'explorer';
    if(['explorer','generator','net','section','euler','soccer'].includes(state.tab)){
      renderer.r009SmoothScene=false;const out=r009BaseRenderCurrentTab();r9HideHud();requestAnimationFrame(()=>r009AfterRender());return out;
    }
    stopFoldPlayback();stopGeneratorPlayback();stopEulerPlayback();stopSectionPlayback();stopSoccerPlayback();
    if(!['revolution','revsection','geodesic'].includes(state.tab))stopR007Playback();
    refs.main.hidden=false;if(refs.foldStageBadge)refs.foldStageBadge.hidden=true;if(refs.stageContext)refs.stageContext.textContent=R009_CONTEXT_LABELS[state.tab]||'입체 탐구';
    renderer.selectedFaces.clear();renderer.selectedEdges.clear();renderer.selectedVertices.clear();renderer.countedFaces.clear();renderer.countedEdges.clear();renderer.countedVertices.clear();renderer.cutEdges=new Set();renderer.setRelationEdgeHighlights([]);
    if(state.tab==='revolution')renderRevolution();else if(state.tab==='revsection')renderRevSections();else renderShortestPaths();
    r009AfterRender();
  };

  updateChapterNav = function(){
    const index=Math.max(0,R009_CHAPTER_ORDER.indexOf(state.tab)),prev=$('#chapterPrevButton'),next=$('#chapterNextButton'),progress=$('#chapterProgress');
    if(prev){prev.disabled=index<=0;prev.textContent=index>0?`← ${R009_CHAPTER_NAMES[R009_CHAPTER_ORDER[index-1]]}`:'← 처음';}
    if(next){next.disabled=index>=R009_CHAPTER_ORDER.length-1;next.textContent=index<R009_CHAPTER_ORDER.length-1?`${R009_CHAPTER_NAMES[R009_CHAPTER_ORDER[index+1]]} →`:'마침';}
    if(progress)progress.textContent=`${index+1}/${R009_CHAPTER_ORDER.length} · ${R009_CHAPTER_NAMES[state.tab]||''}`;
  };
  goChapter = function(direction){
    const index=R009_CHAPTER_ORDER.indexOf(state.tab),next=clamp(index+direction,0,R009_CHAPTER_ORDER.length-1);if(next===index)return;
    stopFoldPlayback();stopGeneratorPlayback();stopSectionPlayback();stopEulerPlayback();stopSoccerPlayback();stopR007Playback();state.tab=R009_CHAPTER_ORDER[next];activateTabButton(state.tab);renderCurrentTab();announce(`${R009_CHAPTER_NAMES[state.tab]} 장으로 이동했습니다.`);
  };
