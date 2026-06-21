/* ============================================================================
   new-script.js — DEDUPED shared driver set for the refactored _merged.html.
   Replaces the seven secroot_secN wrapper IIFEs (~42 inner IIFEs, ~13 no-op)
   with ONE flat run of 9 REAL drivers + 2 verbatim global tail scripts.

   BEHAVIOR IS BYTE-FOR-BYTE EQUIVALENT to the live drivers:
   - same rAF loop shape: apply(); scroll(passive)+resize listeners; (loop(){apply();rAF;})()
   - same reveal thresholds per section (0.82/0.12 vs 0.84/0.10) — NOT unified
   - same reduced-motion arms (return vs continue) per section
   - same color-lerp math, same KG force-sim constants, same band logic
   - same active-dot colors: scene2=#C0EBA6, scene(sec6)=#D0BFFF/#7048E8

   ALL secroot_secN.querySelector(x) -> document.querySelector(x): every id the
   drivers touch (#stageA/#stage/#scene/#scene2/#svg/#field/#pbar/#gbar...) is
   globally unique and lives in exactly one section (scout 05 ground-truth map).
   Class queries (.phrase/.sd/.phrase2/.sd2/[data-reveal]/[data-vp]) are global-
   safe because each class renders only in its one owning section — BUT reveal
   thresholds differ, so the reveal driver stays SECTION-SCOPED (see RV).

   DROPPED (scout 06 §F): all `if(badge){...}` branches. #badge has no markup and
   no JS creates it; the original querySelector returns null and the branch never
   runs. Zero pixel risk. The sec6 scene driver below omits the dead badge branch.

   The two huge KG blobs var __KGGRAPH={...} / var __KGSTATE={...} stay inlined and
   byte-untouched ABOVE this code (do NOT reformat them). This file is the driver
   body that follows them inside the first <script>, plus the two global tails.
   ============================================================================ */

/* ============================================================================
   CONSOLIDATED rAF — ONE requestAnimationFrame loop drives every per-frame
   scroll-progress driver (CHANGE 3). Each driver below registers its per-frame
   function on __FRAMES instead of starting its own loop; the single loop at the
   BOTTOM of this script calls every __FRAMES fn in order, then schedules itself.
   Per-driver math/behavior is unchanged — only loop OWNERSHIP is consolidated.
   The KG builder, the two tail scripts, and the IO reveals below are NOT part of
   the rAF loop.
   ============================================================================ */
var __FRAMES=[];

/* ---- PIN (CHANGE 1): mobile orbit sticky -> JS-driven position:fixed pin.
   position:sticky cannot track the live mobile visible viewport when the dynamic
   toolbar shows/hides; position:fixed CAN. Per orbit section root id R (sec3/sec4)
   we measure the un-pinned reserved height H and drive .pin-fixed / .pin-end via
   grid.getBoundingClientRect(). Desktop (>820px) no-ops and clears its classes. */
function setupPin(R){
  var grid = document.querySelector('#'+R+' .pin-grid');
  var stage = document.querySelector('#'+R+' .pin-stage');
  if(!grid||!stage) return null;
  var mq = window.matchMedia('(max-width:820px)');
  var H = 0;
  return function frame(){
    if(mq.matches){
      // measure reserved height from the relative (un-pinned) state once it's not fixed
      if(!stage.classList.contains('pin-fixed') && !stage.classList.contains('pin-end')) H = stage.offsetHeight;
      var r = grid.getBoundingClientRect();
      // position:fixed is relative to the LAYOUT viewport; the VISUAL viewport is offset
      // by visualViewport.offsetTop/offsetLeft (and may be narrower) when the dynamic
      // toolbar shows/hides. Make engage/end thresholds offset-aware so the orbit pins
      // exactly when its top reaches the VISUAL top (no "cut" window), and track the
      // visual viewport for both top AND left/width while pinned (Z Flip horizontal).
      var off = (window.visualViewport ? Math.round(window.visualViewport.offsetTop) : 0);
      if(r.top <= off && r.bottom >= H + off){
        if(!stage.classList.contains('pin-fixed')){ stage.classList.add('pin-fixed'); stage.classList.remove('pin-end'); grid.style.setProperty('padding-top', H + 'px', 'important'); }
        stage.style.setProperty('top', off + 'px', 'important');
        stage.style.setProperty('left', (window.visualViewport ? Math.round(window.visualViewport.offsetLeft) : 0) + 'px', 'important');
        stage.style.setProperty('width', (window.visualViewport && window.visualViewport.width ? Math.round(window.visualViewport.width) : window.innerWidth) + 'px', 'important');
        stage.style.setProperty('right', 'auto', 'important');
      } else if(r.bottom < H + off){
        if(!stage.classList.contains('pin-end')){ stage.classList.add('pin-end'); stage.classList.remove('pin-fixed'); grid.style.setProperty('padding-top', H + 'px', 'important'); }
        stage.style.removeProperty('top'); stage.style.removeProperty('left'); stage.style.removeProperty('width'); stage.style.removeProperty('right');
      } else {
        if(stage.classList.contains('pin-fixed')||stage.classList.contains('pin-end')){ stage.classList.remove('pin-fixed','pin-end'); grid.style.removeProperty('padding-top'); }
        stage.style.removeProperty('top'); stage.style.removeProperty('left'); stage.style.removeProperty('width'); stage.style.removeProperty('right');
      }
    } else {
      if(stage.classList.contains('pin-fixed')||stage.classList.contains('pin-end')){ stage.classList.remove('pin-fixed','pin-end'); grid.style.removeProperty('padding-top'); }
      stage.style.removeProperty('top'); stage.style.removeProperty('left'); stage.style.removeProperty('width'); stage.style.removeProperty('right');
    }
  };
}

/* ---- REVEALS (CHANGE 2): rAF-poll -> ONE IntersectionObserver for ALL
   [data-reveal]. Trigger only (add data-in then unobserve, one-shot); the CSS
   opacity/translateY transition is unchanged. rootMargin -18% bottom ~= the old
   ~82% viewport threshold. prefers-reduced-motion: show every reveal immediately.
   The [data-vp]/--hp/--sp PARALLAX stays per-frame in the rAF loop below (RV). */
(function(){
  var reveals=[].slice.call(document.querySelectorAll('[data-reveal]'));
  if(!reveals.length) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    reveals.forEach(function(el){ el.setAttribute('data-in',''); });
    return;
  }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.setAttribute('data-in',''); io.unobserve(e.target); } });
  }, {root:null, rootMargin:'0px 0px 0px 0px', threshold:0});
  reveals.forEach(function(el){ io.observe(el); });
})();

/* ---- RV: PARALLAX only (--sp scroll-progress + --hp hero + --vp), ONE driver
   per section to preserve each original section IIFE's --sp/--hp/--vp math. The
   reveal-toggling that used to live here moved to the IntersectionObserver above.
   sec1/3/4/6: --hp + [data-vp]; sec2: --sp only. Each config pushes its per-frame
   fn onto __FRAMES (the single rAF loop calls them). */
[
  {root:'#sec1', vp:true,  sp:true},
  {root:'#sec2', vp:false, sp:true},
  {root:'#sec3', vp:true,  sp:true},
  {root:'#sec4', vp:true,  sp:true},
  {root:'#sec6', vp:true,  sp:true}
].forEach(function(cfg){
  var root=document.querySelector(cfg.root); if(!root) return;
  var de=document.documentElement;
  var vpEls=cfg.vp?[].slice.call(root.querySelectorAll('[data-vp]')):[];
  var last=-1;
  function apply(){
    var vh=window.innerHeight;
    var st=window.scrollY || de.scrollTop || 0;
    if(st!==last){
      last=st;
      if(cfg.sp){ var max=(de.scrollHeight - vh)||1; de.style.setProperty('--sp',(st/max).toFixed(4)); }
      if(cfg.vp){
        de.style.setProperty('--hp',Math.min(1, st/vh).toFixed(4));
        for(var i=0;i<vpEls.length;i++){
          var host=vpEls[i].parentElement, er=host.getBoundingClientRect();
          var prog=(vh - er.top)/(vh + er.height);
          vpEls[i].style.setProperty('--vp',Math.max(0,Math.min(1,prog)).toFixed(4));
        }
      }
    }
  }
  __FRAMES.push(apply);
});

/* ---- ORBIT (sec3, green 수업축): nearest-center to viewport (matches sec4) for consistent step timing.
   The 841 impl — DISTINCT from the nearest-center funnel. rAF-only (no scroll/resize). */
(function(){
  var de=document.documentElement;
  var stage=document.querySelector('#stageA');
  var steps=[].slice.call(document.querySelectorAll('[data-stepA]'));
  if(!stage||!steps.length) return;
  var last=-1;
  function frame(){
    var vh=window.innerHeight, st=window.scrollY||de.scrollTop||0;
    if(st!==last){
      last=st; var cy=vh/2, best='1', bestD=1e9;
      for(var k=0;k<steps.length;k++){
        var r=steps[k].getBoundingClientRect(), d=Math.abs((r.top+r.height/2)-cy);
        if(d<bestD){ bestD=d; best=steps[k].getAttribute('data-stepA'); }
      }
      if(stage.getAttribute('data-activeA')!==best) stage.setAttribute('data-activeA',best);
    }
  }
  __FRAMES.push(frame);
})();

/* ---- STAGE (sec4, purple 관리축): nearest-center funnel, data-step. The 1037 impl. */
(function(){
  var de=document.documentElement;
  var steps=[].slice.call(document.querySelectorAll('[data-step]'));
  var stage=document.querySelector('#stage');
  if(!stage || !steps.length) return;
  var last=-1;
  function apply(){
    var vh=window.innerHeight, st=window.scrollY || de.scrollTop || 0;
    if(st!==last){
      last=st; var cy=vh/2, best='1', bestD=1e9;
      for(var k=0;k<steps.length;k++){
        var r=steps[k].getBoundingClientRect(), d=Math.abs((r.top+r.height/2)-cy);
        if(d<bestD){ bestD=d; best=steps[k].getAttribute('data-step'); }
      }
      if(stage.getAttribute('data-active')!==best){ stage.setAttribute('data-active',best); }
    }
  }
  __FRAMES.push(apply);
})();

/* ---- SCENE (sec6 dark scene): color-lerp light->dark + phrase/dot bands.
   The 1426 impl. active dot = #D0BFFF (LIVE value; the #C0EBA6 copies were no-ops).
   Dead `if(badge)` branch DROPPED. */
(function(){
  var de=document.documentElement;
  var scene=document.querySelector('#scene');
  var bgfx=document.querySelector('#bgfx');
  if(!scene) return;
  var phrases=[].slice.call(document.querySelectorAll('.phrase'));
  var dots=[].slice.call(document.querySelectorAll('.sd'));
  var sceneTexts=[].slice.call(document.querySelectorAll('[data-scene-text]'));
  var toneEls=[].slice.call(document.querySelectorAll('[data-tone]'));
  var LIGHT=[244,243,240], DARK=[16,16,18];
  var INK=[11,11,11], PAPER=[244,243,240];
  function lerp(a,b,t){ return Math.round(a+(b-a)*t); }
  function mix(c1,c2,t){ return 'rgb('+lerp(c1[0],c2[0],t)+','+lerp(c1[1],c2[1],t)+','+lerp(c1[2],c2[2],t)+')'; }
  var last=-1, lastBand=-1;
  function apply(){
    var vh=window.innerHeight, st=window.scrollY || de.scrollTop || 0;
    if(st!==last){
      last=st;
      var r=scene.getBoundingClientRect(), range=(scene.offsetHeight - vh)||1;
      var t=Math.max(0,Math.min(1, (-r.top)/range));
      var amt=Math.max(0,Math.min(1, t/0.25));
      if(bgfx) bgfx.style.backgroundColor=mix(LIGHT,DARK,amt);
      var ink=mix(INK,PAPER,amt);
      sceneTexts.forEach(function(el){ el.style.color=ink; });
      toneEls.forEach(function(el){ el.style.color= amt>0.4? ink : ''; });
      var band = t>=0.66?2 : t>=0.33?1 : 0;
      if(band!==lastBand){
        lastBand=band;
        for(var i=0;i<phrases.length;i++){ if(i===band) phrases[i].setAttribute('data-on',''); else phrases[i].removeAttribute('data-on'); }
        for(var k=0;k<dots.length;k++){
          if(k===band){ dots[k].style.background= amt>0.5?'#D0BFFF':'#7048E8'; dots[k].style.transform='scale(1.5)'; }
          else { dots[k].style.background='rgba(140,140,140,.4)'; dots[k].style.transform='none'; }
        }
      }
    }
  }
  __FRAMES.push(apply);
})();

/* ---- KG BUILDER (sec5): force-sim + render + hover/panel + applyState overlay.
   Verbatim from 1152; only secroot_sec5.X -> document.X. Constants byte-stable. */
(function(){
  var W=1600,H=900,SVGNS='http://www.w3.org/2000/svg';

  function simulate(graph){
    var nodes=graph.nodes, edges=graph.edges;
    var idx={}; nodes.forEach(function(n,i){ idx[n.id]=i; });
    var seed=42; function rnd(){ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }
    var P=nodes.map(function(_,i){ var a=(i/nodes.length)*Math.PI*2; return {x:W/2+Math.cos(a)*300+(rnd()-0.5)*40,y:H/2+Math.sin(a)*300+(rnd()-0.5)*40,vx:0,vy:0}; });
    var E=edges.map(function(e,ei){ return [idx[e.s],idx[e.t],ei]; }).filter(function(p){ return p[0]!=null&&p[1]!=null; });
    var deg=nodes.map(function(){return 0;}); E.forEach(function(p){ deg[p[0]]++; deg[p[1]]++; });
    var k_rep=52000,k_spring=0.012,L=200,k_center=0.0011,damp=0.85,ITER=900,maxDisp=0;
    for(var it=0;it<ITER;it++){
      var cool=Math.pow(1-(it/ITER),1.6);
      for(var i=0;i<P.length;i++){
        var cf=(deg[i]===0?6:(deg[i]===1?1.8:1));
        var fx=0,fy=0;
        for(var j=0;j<P.length;j++){ if(i===j)continue; var dx=P[i].x-P[j].x,dy=P[i].y-P[j].y,d2=dx*dx+dy*dy+0.01,d=Math.sqrt(d2),f=k_rep/d2; fx+=(dx/d)*f; fy+=(dy/d)*f; }
        fx+=(W/2-P[i].x)*k_center*cf; fy+=(H/2-P[i].y)*k_center*cf;
        P[i].vx=(P[i].vx+fx)*damp; P[i].vy=(P[i].vy+fy)*damp;
      }
      for(var e=0;e<E.length;e++){ var a=E[e][0],b=E[e][1],dx=P[b].x-P[a].x,dy=P[b].y-P[a].y,d=Math.sqrt(dx*dx+dy*dy)+0.01,f=k_spring*(d-L),ux=dx/d,uy=dy/d; P[a].vx+=ux*f; P[a].vy+=uy*f; P[b].vx-=ux*f; P[b].vy-=uy*f; }
      maxDisp=0;
      for(var i=0;i<P.length;i++){ var ddx=P[i].vx*cool,ddy=P[i].vy*cool; P[i].x+=ddx; P[i].y+=ddy; var disp=Math.abs(ddx)+Math.abs(ddy); if(disp>maxDisp)maxDisp=disp; }
    }
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    P.forEach(function(p){ if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y; });
    var m=70,s=Math.min((W-2*m)/(maxX-minX||1),(H-2*m)/(maxY-minY||1));
    var usedW=(maxX-minX)*s, usedH=(maxY-minY)*s;
    var offX=(W-usedW)/2, offY=(H-usedH)/2;
    P.forEach(function(p){ p.x=offX+(p.x-minX)*s; p.y=offY+(p.y-minY)*s; });
    return {P:P,E:E};
  }

  function render(graph,sim){
    var svg=document.querySelector('#svg');
    var gE=document.createElementNS(SVGNS,'g'), gN=document.createElementNS(SVGNS,'g');
    sim.E.forEach(function(p){
      var ln=document.createElementNS(SVGNS,'line'); ln.setAttribute('class','edge '+('ek-'+(graph.edges[p[2]]&&graph.edges[p[2]].kind||'').replace(/\s+/g,'-')));
      ln.setAttribute('x1',sim.P[p[0]].x.toFixed(1)); ln.setAttribute('y1',sim.P[p[0]].y.toFixed(1));
      ln.setAttribute('x2',sim.P[p[1]].x.toFixed(1)); ln.setAttribute('y2',sim.P[p[1]].y.toFixed(1));
      gE.appendChild(ln);
    });
    var RSZ={DATA:11,LOGIC:8,ACTION:8,PROBLEM:7};
    graph.nodes.forEach(function(n,i){
      var g=document.createElementNS(SVGNS,'g'); g.setAttribute('class','node'); g.setAttribute('transform','translate('+sim.P[i].x.toFixed(1)+','+sim.P[i].y.toFixed(1)+')');
      var c=document.createElementNS(SVGNS,'circle'); c.setAttribute('r',RSZ[n.layer]||8);
      c.setAttribute('class','nl-'+n.layer+' nt-'+n.topic);
      var ti=document.createElementNS(SVGNS,'title'); ti.textContent=n.label+'  ['+n.layer+' · '+(n.topic==='function'?'함수':'방정식')+']';
      g.appendChild(c); g.appendChild(ti); gN.appendChild(g);
    });
    svg.appendChild(gE); svg.appendChild(gN);
    var field=document.querySelector('#field'), hl=document.querySelector('#hoverlbl');
    var adj={}; sim.E.forEach(function(p){ (adj[p[0]]=adj[p[0]]||[]).push(p[1]); (adj[p[1]]=adj[p[1]]||[]).push(p[0]); });
    var nodeEls=[].slice.call(gN.children), edgeEls=[].slice.call(gE.children);
    nodeEls.forEach(function(g,i){
      function enter(){
        field.classList.add('has-hover');
        var nb={}; nb[i]=1; (adj[i]||[]).forEach(function(j){ nb[j]=1; });
        nodeEls.forEach(function(el,k){ el.classList.toggle('hl', !!nb[k]); });
        edgeEls.forEach(function(el,k){ var p=sim.E[k]; el.classList.toggle('hl', p[0]===i||p[1]===i); });
        hl.textContent=graph.nodes[i].label;
        hl.style.left=(sim.P[i].x/1600*field.clientWidth)+'px';
        hl.style.top=(sim.P[i].y/900*field.clientHeight)+'px';
        hl.setAttribute('data-on','');
      }
      function leave(){ field.classList.remove('has-hover'); hl.removeAttribute('data-on'); }
      g.addEventListener('mouseenter',enter);
      g.addEventListener('mouseleave',leave);
      g.addEventListener('click',function(){ openPanel(i); });
      var lpTimer=null, moved=false;
      g.addEventListener('touchstart',function(){ moved=false; lpTimer=setTimeout(function(){ lpTimer=null; enter(); }, 380); },{passive:true});
      g.addEventListener('touchmove',function(){ moved=true; if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; } },{passive:true});
      g.addEventListener('touchend',function(e){
        if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; if(!moved){ e.preventDefault(); openPanel(i); } }
        else { setTimeout(leave, 1600); }
      });
    });
    var apanel=document.querySelector('#apanel'), atitle=document.querySelector('#atitle'), ameta=document.querySelector('#ameta'), abody=document.querySelector('#abody');
    var LAYNAME={DATA:'개념',LOGIC:'논리',ACTION:'동작',PROBLEM:'문제'};
    function openPanel(i){
      var n=graph.nodes[i], list=(graph.atoms&&graph.atoms[n.id])||[];
      var STC={mastered:'#1F8A5B',learning:'#E0A50E',weak:'#E0443E',current:'#13B5A6',todo:'#C7C4BC'};
      var st=(window.__state&&window.__state[n.id])||'todo';
      apanel.style.setProperty('--acc', STC[st]||'#7048E8');
      ameta.textContent=(n.topic==='function'?'일차함수':'일차방정식')+' · '+(LAYNAME[n.layer]||n.layer)+' · 세부 동작 '+list.length;
      atitle.textContent=n.label;
      if(list.length){ abody.innerHTML='<ul>'+list.map(function(a){var c=String(a).replace(/\s*—\[[^\]]*\]→[\s\S]*$/,'').trim()||String(a); return '<li>'+c.replace(/</g,'&lt;')+'</li>';}).join('')+'</ul>'; }
      else { abody.innerHTML='<p class="empty">이 개념에 연결된 세부 동작은 곧 추가됩니다.</p>'; }
      apanel.setAttribute('data-open','');
    }
    document.querySelector('#aclose').addEventListener('click',function(){ apanel.removeAttribute('data-open'); });
    return {lines:gE.children.length, nodes:gN.children.length};
  }

  Promise.resolve(__KGGRAPH).then(function(graph){
    var sim=simulate(graph);
    var out=render(graph,sim);
    window.__render={nodes:graph.nodes.length, edges:graph.edges.length, drawnNodes:out.nodes, drawnLines:out.lines};
    document.querySelector('#msg').textContent='nodes '+out.nodes+' · edges '+out.lines;
    Promise.resolve(__KGSTATE).then(function(ss){ applyState(graph,sim,ss); }).catch(function(){});
  }).catch(function(err){ window.__render={error:String(err)}; document.querySelector('#msg').textContent='ERROR: '+err; });

  function applyState(graph,sim,ss){
    var SVGNS='http://www.w3.org/2000/svg';
    var nodeEls=[].slice.call(document.querySelectorAll('#svg .node'));
    var pulseG=document.createElementNS(SVGNS,'g');
    document.querySelector('#svg').insertBefore(pulseG, document.querySelectorAll('#svg g')[1]);
    graph.nodes.forEach(function(n,i){
      var s=ss.state[n.id]||'todo';
      nodeEls[i].classList.add('st-'+s);
      if(s==='current'||s==='weak'){
        var r=(n.layer==='DATA'?11:n.layer==='PROBLEM'?7:8);
        var pc=document.createElementNS(SVGNS,'circle');
        pc.setAttribute('class','pulse '+(s==='current'?'pc-current':'pc-weak'));
        pc.setAttribute('cx',sim.P[i].x.toFixed(1)); pc.setAttribute('cy',sim.P[i].y.toFixed(1));
        pc.setAttribute('r',r); pc.style.setProperty('--r',r+'px');
        pulseG.appendChild(pc);
      }
    });
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      var flowG=document.createElementNS(SVGNS,'g');
      document.querySelector('#svg').appendChild(flowG);
      sim.E.forEach(function(p){
        var ss1=ss.state[graph.nodes[p[0]].id]||'todo', ss2=ss.state[graph.nodes[p[1]].id]||'todo';
        var color=null;
        if(ss2==='current') color='#13B5A6';
        else if(ss2==='weak') color='#E0443E';
        else if(ss1==='mastered' && (ss2==='learning')) color='#1F8A5B';
        if(!color) return;
        var dot=document.createElementNS(SVGNS,'circle');
        dot.setAttribute('r','3.4'); dot.setAttribute('fill',color);
        var am=document.createElementNS(SVGNS,'animateMotion');
        am.setAttribute('dur',(1.5+Math.random()*0.6).toFixed(2)+'s'); am.setAttribute('repeatCount','indefinite');
        am.setAttribute('path','M '+sim.P[p[0]].x.toFixed(1)+' '+sim.P[p[0]].y.toFixed(1)+' L '+sim.P[p[1]].x.toFixed(1)+' '+sim.P[p[1]].y.toFixed(1));
        dot.appendChild(am); flowG.appendChild(dot);
      });
    }
    var c={mastered:0,learning:0,weak:0,current:0,todo:0};
    window.__state=ss.state;
    Object.keys(ss.state).forEach(function(k){ c[ss.state[k]]=(c[ss.state[k]]||0)+1; });
    var sum=document.querySelector('#summary');
    if(sum) sum.innerHTML='<span class="wk">이번 주 · '+ss.meta.week+'/'+ss.meta.totalWeeks+'주차</span>'+
      '<span class="cu"><b>'+c.current+'</b> 이번 주 학습</span>'+
      '<span class="wk2"><b>'+c.weak+'</b> 보강 필요</span>'+
      '<span class="lr"><b>'+c.learning+'</b> 학습 중</span>'+
      '<span class="sm"><b>'+c.mastered+'</b> 숙련</span>';
  }
})();

/* ---- PBAR + scene2 (sec5): progress bar #pbar + MID dark-scene phrase/dot bands.
   active dot = #C0EBA6. The 1308 impl, verbatim minus secroot_sec5. -> document. */
(function(){
  var de=document.documentElement, pbar=document.querySelector('#pbar');
  var scene=document.querySelector('#scene2');
  var phrases=[].slice.call(document.querySelectorAll('.phrase2'));
  var dots=[].slice.call(document.querySelectorAll('.sd2'));
  var last=-1, lastBand=-1;
  function apply(){
    var vh=window.innerHeight, st=window.scrollY||de.scrollTop||0;
    if(st!==last){ last=st; var max=(de.scrollHeight-vh)||1; if(pbar) pbar.style.transform='scaleX('+(st/max).toFixed(4)+')';
      if(scene){ var r=scene.getBoundingClientRect(); var range=(scene.offsetHeight-vh)||1; var t=Math.max(0,Math.min(1,(-r.top)/range));
        var band=t>=0.66?2:t>=0.33?1:0;
        if(band!==lastBand){ lastBand=band;
          for(var i=0;i<phrases.length;i++){ if(i===band) phrases[i].setAttribute('data-on',''); else phrases[i].removeAttribute('data-on'); }
          for(var k=0;k<dots.length;k++){ if(k===band){ dots[k].style.background='#C0EBA6'; dots[k].style.transform='scale(1.5)'; } else { dots[k].style.background='rgba(244,243,240,.32)'; dots[k].style.transform='none'; } }
        }
      }
    }
  }
  __FRAMES.push(apply);
})();

/* ---- STACK (sec7): card depth scale/shade + --sp scroll-progress. The reveal
   toggling that used to live here (0.84/0.10, bidirectional) moved to the unified
   IntersectionObserver above (CHANGE 2). reduced-motion: skip card stacking.
   The 1513 impl, verbatim minus secroot_sec7. -> document.querySelector('#sec7 ...').
   NOTE: scoped to #sec7 to mirror the original's per-section card scan. */
(function(){
  var sec7=document.querySelector('#sec7'); if(!sec7) return;
  var de=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards=[].slice.call(sec7.querySelectorAll('[data-card] .stack-inner'));
  var last=-1;
  function apply(){
    var vh=window.innerHeight, st=window.scrollY || de.scrollTop || 0;
    if(st!==last){
      last=st; var max=(de.scrollHeight - vh)||1; de.style.setProperty('--sp',(st/max).toFixed(4));
      if(!reduce){
        for(var c=0;c<cards.length;c++){
          var inner=cards[c], host=inner.parentElement, next=host.nextElementSibling, p=0;
          if(next){ var nr=next.getBoundingClientRect(); p=1-Math.max(0,Math.min(1, nr.top/vh)); }
          inner.style.setProperty('--cardScale',(1-0.05*p).toFixed(4));
          inner.style.setProperty('--cardShade',(0.4*p).toFixed(4));
        }
      }
    }
  }
  __FRAMES.push(apply);
})();

/* ---- GBAR (global): scroll progress scaleX on #gbar>i. The 1552 impl. */
(function(){var de=document.documentElement,bar=document.querySelector('#gbar>i');function u(){var max=(de.scrollHeight-window.innerHeight)||1;bar.style.transform='scaleX('+((window.scrollY||de.scrollTop||0)/max).toFixed(4)+')';}__FRAMES.push(u);})();

/* ---- PIN registration (CHANGE 1): register the two orbit-section pin drivers. */
[setupPin('sec3'), setupPin('sec4')].forEach(function(fn){ if(fn) __FRAMES.push(fn); });

/* ---- THE single rAF loop (CHANGE 3): run every registered per-frame fn in order,
   once now + on scroll/resize for immediacy + every animation frame, then reschedule. */
(function(){
  function tick(){ for(var i=0;i<__FRAMES.length;i++){ __FRAMES[i](); } }
  tick();
  window.addEventListener('scroll',tick,{passive:true});
  window.addEventListener('resize',tick);
  (function loop(){ tick(); requestAnimationFrame(loop); })();
})();

