/* P003 R009 spatial core — one renderer for polyhedra, revolutions, sections, and paths. */
  const R009_EXACT = window.P003_R009_EXACT;
  const R009 = {
    lastDraw:null,
    lastTrigger:null,
    sectionLoops:[],
    sectionPlane:null,
    pathMetrics:null,
    selectedIntersectFaces:new Set(),
  };
  const r9add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const r9sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const r9scale=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const r9dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const r9cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const r9len=a=>Math.hypot(a[0],a[1],a[2]);
  const r9unit=a=>{const m=r9len(a)||1;return r9scale(a,1/m)};
  const r9mix=(a,b,t)=>a+(b-a)*t;
  const r9mix3=(a,b,t)=>[r9mix(a[0],b[0],t),r9mix(a[1],b[1],t),r9mix(a[2],b[2],t)];
  const r9ease=t=>{const x=clamp(t,0,1);return x*x*(3-2*x)};
  const r9easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const r9near=(a,b,e=1e-4)=>r9len(r9sub(a,b))<=e;
  const r9fmt=(v,d=3)=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d});

  function r9ProfilePoints(component){
    if(component.kind==='polygon')return component.points.map(([r,y])=>[Number(r),Number(y)]);
    if(component.kind==='semicircle'){
      const R=component.radius,n=component.samples||32,out=[];
      for(let i=0;i<=n;i++){const y=-R+2*R*i/n;out.push([Math.sqrt(Math.max(0,R*R-y*y)),y]);}
      return out;
    }
    if(component.kind==='circle'){
      const [cr,cy]=component.center,R=component.radius,n=component.samples||36,out=[];
      for(let i=0;i<n;i++){const a=2*Math.PI*i/n;out.push([cr+R*Math.cos(a),cy+R*Math.sin(a)]);}
      return out;
    }
    if(component.kind==='dome'){
      const R=component.radius,b=component.base_y,n=component.samples||24,out=[[0,b],[R,b]];
      for(let i=1;i<=n;i++){const a=(Math.PI/2)*i/n;out.push([R*Math.cos(a),b+R*Math.sin(a)]);}
      return out;
    }
    return [];
  }
  function r9ProfileSpec(id,override=null){
    if(override?.radius&&override?.height){return {label:'원기둥',profile_label:'직사각형',components:[{kind:'polygon',points:[[0,-override.height/2],[override.radius,-override.height/2],[override.radius,override.height/2],[0,override.height/2]]}],exact:override};}
    return R009_EXACT.revolution_profiles[id]||R009_EXACT.revolution_profiles.cylinder;
  }
  function r9ProfileBounds(spec){
    const pts=spec.components.flatMap(r9ProfilePoints);return {minY:Math.min(...pts.map(p=>p[1])),maxY:Math.max(...pts.map(p=>p[1])),maxR:Math.max(...pts.map(p=>p[0]))};
  }
  function r9LatheFaces(profileId,sweep=1,{segments=84,override=null}={}){
    const spec=r9ProfileSpec(profileId,override),faces=[],thetaMax=Math.PI*2*clamp(sweep,0,1),angular=Math.max(1,Math.ceil(segments*clamp(sweep,.001,1))),closed=sweep>=.9999;let faceIndex=0;
    spec.components.forEach((component,componentIndex)=>{
      const path=r9ProfilePoints(component),edgeCount=path.length;
      for(let i=0;i<edgeCount;i++){
        const a=path[i],b=path[(i+1)%edgeCount];
        if(a[0]<1e-7&&b[0]<1e-7)continue;
        for(let j=0;j<angular;j++){
          const t0=thetaMax*j/angular;let t1=thetaMax*(j+1)/angular;
          if(!closed&&j===angular-1&&t1>thetaMax)t1=thetaMax;
          const p00=[a[0]*Math.cos(t0),a[1],a[0]*Math.sin(t0)],p10=[b[0]*Math.cos(t0),b[1],b[0]*Math.sin(t0)],p11=[b[0]*Math.cos(t1),b[1],b[0]*Math.sin(t1)],p01=[a[0]*Math.cos(t1),a[1],a[0]*Math.sin(t1)];
          const pts=[];[p00,p10,p11,p01].forEach(p=>{if(!pts.some(q=>r9near(p,q,1e-7)))pts.push(p)});
          if(pts.length>=3)faces.push({faceIndex:faceIndex++,faceId:`R9-${profileId}-${componentIndex}-${i}-${j}`,sideCount:pts.length,points:pts,componentIndex,profileEdge:i,thetaIndex:j});
        }
      }
    });
    return {spec,faces,bounds:r9ProfileBounds(spec),thetaMax};
  }
  function r9ProfilePolygon3D(spec,theta){
    return spec.components.map(component=>r9ProfilePoints(component).map(([r,y])=>[r*Math.cos(theta),y,r*Math.sin(theta)]));
  }
  function r9CircleSegments(radius,y,thetaMax=Math.PI*2,segments=72){
    const out=[];let prev=[radius,y,0];for(let i=1;i<=segments;i++){const a=thetaMax*i/segments,next=[radius*Math.cos(a),y,radius*Math.sin(a)];out.push({a:prev,b:next,active:true});prev=next;}return out;
  }

  const r009ParentDraw2D=renderer.draw2D.bind(renderer);
  function r9SmoothDraw2D(r){
    const size=r.resize(),ctx=r.ctx2d;if(!ctx)return r009ParentDraw2D();const rect=r.canvas.getBoundingClientRect(),dpr=size.dpr;ctx.clearRect(0,0,r.canvas.width,r.canvas.height);ctx.save();ctx.scale(dpr,dpr);ctx.lineJoin='round';ctx.lineCap='round';
    const css=(rgba,alpha=null)=>`rgba(${Math.round(rgba[0]*255)},${Math.round(rgba[1]*255)},${Math.round(rgba[2]*255)},${alpha==null?rgba[3]:alpha})`;
    const faces=r.facePolygons.map((poly,fi)=>{const projected=poly.points.map(q=>r.projectPoint(q)),depth=projected.reduce((sum,q)=>sum+q.depth,0)/Math.max(1,projected.length),normal=rotatePoint(polygonNormal(poly.points),r.yaw,r.pitch),light=clamp(.62+.38*Math.max(0,vec3Dot(vec3Unit(normal),vec3Unit([.45,.8,.9]))),.40,1);return {poly,fi,projected,depth,light};}).sort((a,b)=>b.depth-a.depth);
    if(r.viewStyle!=='wire')faces.forEach(item=>{const pts=item.projected;if(!pts.length||pts.some(q=>!Number.isFinite(q.x)))return;const base=r.faceColor(item.poly.sideCount,item.poly.faceIndex??item.fi),selected=r.selectedFaces.has(item.poly.faceIndex??item.fi),alpha=r.viewStyle==='transparent'?.30:.94,shade=[base[0]*item.light,base[1]*item.light,base[2]*item.light,alpha];ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=css(shade);ctx.fill();if(selected){ctx.strokeStyle='rgba(216,62,103,.52)';ctx.lineWidth=1.3;ctx.stroke();}});
    (r.vertexMarkers||[]).filter(m=>m.active||m.showLabel).forEach(marker=>{const q=r.projectPoint(marker.point);if(!q.visible)return;ctx.beginPath();ctx.arc(q.x,q.y,4.7,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();ctx.strokeStyle='#0a68ff';ctx.lineWidth=2;ctx.stroke();});ctx.restore();r.drawLabels(size);
  }
  renderer.draw2D=function(){return this.r009SmoothScene?r9SmoothDraw2D(this):r009ParentDraw2D();};

  function r9ApplyCustomScene({faces=[],markers=[],overlay=[],ghosts=[],relations=[],selectedFaces=[],viewStyle='transparent',resetView=false,emptyMessage='',hideMeshEdges=false}){
    renderer.r009SmoothScene=!!hideMeshEdges;renderer.currentSolid=null;renderer.sharedMode=false;renderer.assemblyProgress=null;renderer.foldPlan=null;renderer.currentFoldInfo=null;
    renderer.currentVertices=[];renderer.currentFaces=[];renderer.currentEdges=[];renderer.currentFaceIds=faces.map((f,i)=>f.faceId||`R9F${i}`);renderer.currentFaceSideCounts=faces.map(f=>f.sideCount||f.points.length);
    renderer.facePolygons=faces.map((f,i)=>({...f,faceIndex:f.faceIndex??i,faceId:f.faceId||`R9F${i}`,sideCount:f.sideCount||f.points.length}));
    renderer.vertexMarkers=markers;renderer.overlaySegments=overlay;renderer.netGhostPolygons=ghosts;renderer.netGhostMarkers=[];renderer.relationSegments=relations;renderer.mergeSegments=[];renderer.emptyMessage=emptyMessage;
    renderer.selectedFaces=new Set(selectedFaces);renderer.selectedEdges.clear();renderer.selectedVertices.clear();renderer.countedFaces.clear();renderer.countedEdges.clear();renderer.countedVertices.clear();renderer.viewStyle=viewStyle;renderer.labelMode='none';renderer.setInteractionMode('navigate');renderer.onPick=null;
    if(resetView)renderer.resetView('solid');renderer.uploadGeometry();if(hideMeshEdges&&renderer.available&&renderer.buffers?.edges)renderer.buffers.edges.count=0;
  }
  function r9PlaneBasis(normal){const n=r9unit(normal),helper=Math.abs(n[1])<.86?[0,1,0]:[0,0,1],u=r9unit(r9cross(n,helper)),v=r9unit(r9cross(n,u));return {n,u,v};}
  function r9PlanePatch(normal,d,radius){const {n,u,v}=r9PlaneBasis(normal),c=r9scale(n,d);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>r9add(c,r9add(r9scale(u,a*radius),r9scale(v,b*radius))));}
  function r9IntersectFace(points,n,d){
    const hits=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],sa=r9dot(n,a)-d,sb=r9dot(n,b)-d;if(Math.abs(sa)<1e-7)hits.push(a);if(sa*sb<0){const t=sa/(sa-sb);hits.push(r9mix3(a,b,t));}}
    const unique=[];hits.forEach(p=>{if(!unique.some(q=>r9near(p,q,1e-5)))unique.push(p)});if(unique.length<2)return null;let pair=[unique[0],unique[1]],best=0;for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){const dd=r9len(r9sub(unique[i],unique[j]));if(dd>best){best=dd;pair=[unique[i],unique[j]]}}return pair;
  }
  function r9MeshSegments(faces,n,d){const segments=[];faces.forEach((face,index)=>{const pair=r9IntersectFace(face.points,n,d);if(pair)segments.push({a:pair[0],b:pair[1],faceIndex:face.faceIndex??index});});return segments;}
  function r9ChainSegments(segments,tolerance=2e-3){
    const unused=segments.map((s,i)=>({...s,_i:i})),loops=[];
    while(unused.length){const first=unused.shift(),points=[first.a,first.b],faces=[first.faceIndex];let guard=0;
      while(unused.length&&guard++<segments.length+3){const tail=points[points.length-1];let idx=unused.findIndex(s=>r9near(s.a,tail,tolerance)||r9near(s.b,tail,tolerance));if(idx<0)break;const s=unused.splice(idx,1)[0],next=r9near(s.a,tail,tolerance)?s.b:s.a;points.push(next);faces.push(s.faceIndex);if(points.length>3&&r9near(points[0],next,tolerance)){points[points.length-1]=points[0];break;}}
      if(points.length>=2)loops.push({points,faces});
    }
    return loops.sort((a,b)=>b.points.length-a.points.length);
  }
  function r9RevealLoops(loops,reveal){const out=[],selected=new Set();loops.forEach(loop=>{const total=Math.max(0,loop.points.length-1),count=Math.ceil(total*clamp(reveal,0,1));for(let i=0;i<count;i++){out.push({a:loop.points[i],b:loop.points[i+1],active:true});if(loop.faces[i]!=null)selected.add(loop.faces[i]);}});return {segments:out,selected};}
  function r9Support(faces,n){const values=[];faces.forEach(f=>f.points.forEach(p=>values.push(r9dot(n,p))));return {min:Math.min(...values),max:Math.max(...values)};}

  function r9CanvasSetup(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:rect.width,h:rect.height};}
  function r9DrawProfileInset(profileId){
    const root=$('#r009Inset'),canvas=$('#r009InsetCanvas');if(!root||!canvas)return;root.hidden=false;$('#r009InsetLabel').textContent='회전 전 평면도형';canvas.hidden=false;$('#r009InsetMetrics').hidden=true;
    const {ctx,w,h}=r9CanvasSetup(canvas),spec=r9ProfileSpec(profileId),bounds=r9ProfileBounds(spec),pad=18,scale=Math.min((w-2*pad)/(bounds.maxR*1.25||1),(h-2*pad)/(bounds.maxY-bounds.minY||1));ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w*.34,h/2);ctx.strokeStyle='rgba(182,106,5,.82)';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,-h/2+8);ctx.lineTo(0,h/2-8);ctx.stroke();ctx.setLineDash([]);
    spec.components.forEach((component,ci)=>{const pts=r9ProfilePoints(component);ctx.beginPath();pts.forEach(([r,y],i)=>{const x=r*scale,yy=-(y-(bounds.minY+bounds.maxY)/2)*scale;i?ctx.lineTo(x,yy):ctx.moveTo(x,yy)});ctx.closePath();ctx.fillStyle=ci%2?'rgba(108,76,255,.16)':'rgba(10,104,255,.17)';ctx.fill();ctx.strokeStyle=ci%2?'#6c4cff':'#0a68ff';ctx.lineWidth=2.2;ctx.stroke();});ctx.restore();
  }
  function r9DrawSectionInset(loops,normal,d,label){
    const root=$('#r009Inset'),canvas=$('#r009InsetCanvas');if(!root||!canvas)return;root.hidden=false;$('#r009InsetLabel').textContent=label||'절단 평면에서 본 경계';canvas.hidden=false;$('#r009InsetMetrics').hidden=true;const {ctx,w,h}=r9CanvasSetup(canvas);ctx.clearRect(0,0,w,h);const {u,v,n}=r9PlaneBasis(normal),c=r9scale(n,d),pts=loops.flatMap(loop=>loop.points);if(!pts.length){ctx.fillStyle='#6b7b8f';ctx.font='700 12px system-ui';ctx.textAlign='center';ctx.fillText('아직 교선이 없습니다.',w/2,h/2);return;}const uv=pts.map(p=>[r9dot(r9sub(p,c),u),r9dot(r9sub(p,c),v)]),max=Math.max(.2,...uv.flat().map(Math.abs)),scale=.40*Math.min(w,h)/max;ctx.save();ctx.translate(w/2,h/2);ctx.strokeStyle='rgba(24,48,82,.12)';ctx.beginPath();ctx.moveTo(-w/2,0);ctx.lineTo(w/2,0);ctx.moveTo(0,-h/2);ctx.lineTo(0,h/2);ctx.stroke();let cursor=0;loops.forEach(loop=>{ctx.beginPath();loop.points.forEach((_,i)=>{const q=uv[cursor++];i?ctx.lineTo(q[0]*scale,-q[1]*scale):ctx.moveTo(q[0]*scale,-q[1]*scale)});ctx.strokeStyle='#d83e67';ctx.lineWidth=3;ctx.lineJoin='round';ctx.stroke();});ctx.restore();
  }
  function r9ShowMetricInset(metrics){const root=$('#r009Inset');if(!root)return;root.hidden=false;$('#r009InsetLabel').textContent='같은 두 점, 다른 허용 경로';$('#r009InsetCanvas').hidden=true;const box=$('#r009InsetMetrics');box.hidden=false;box.innerHTML=metrics.map(m=>`<span>${escapeHTML(m.label)}<strong>${escapeHTML(m.value)}</strong></span>`).join('');}
  function r9HideInset(){const root=$('#r009Inset');if(root)root.hidden=true;}
  function r9SetHud({kicker,title,subtitle,progress=0,legend=[]}){
    const hud=$('#r009SpatialHud');if(!hud)return;hud.hidden=false;$('#r009HudKicker').textContent=kicker||'';$('#r009HudTitle').textContent=title||'';$('#r009HudSubtitle').textContent=subtitle||'';const idx=progress<.14?0:progress<.30?1:progress<.72?2:progress<.90?3:4;$('#r009PhaseStrip').innerHTML=['미리','예상','변화','맞춤','설명'].map((v,i)=>`<i class="${i<idx?'is-past':''} ${i===idx?'is-current':''}">${v}</i>`).join('');$('#r009SpatialLegend').innerHTML=legend.map(x=>`<span class="${x.cls||''}"><b></b>${escapeHTML(x.label)}</span>`).join('');
  }
  function r9HideHud(){const hud=$('#r009SpatialHud');if(hud)hud.hidden=true;r9HideInset();}
  function r9PulseStage(){const stage=refs.stage;if(!stage)return;const ring=document.createElement('span');ring.className='r009-focus-ring';stage.appendChild(ring);setTimeout(()=>ring.remove(),1200)}

  function r9DrawRevolutionSpatial(progress){
    const id=state.revolutionProfile||'cylinder',p=clamp(progress,0,1),sweep=r9ease(clamp((p-.14)/.68,0,1)),mesh=r9LatheFaces(id,sweep,{segments:84}),spec=mesh.spec,bounds=mesh.bounds,profiles=r9ProfilePolygon3D(spec,Math.PI*2*sweep),ghosts=[];
    r9ProfilePolygon3D(spec,0).forEach(points=>ghosts.push({points,alpha:.38}));profiles.forEach(points=>ghosts.push({points,alpha:.72}));
    const outer=spec.components.flatMap(r9ProfilePoints).sort((a,b)=>b[0]-a[0])[0]||[1,0],trace=r9CircleSegments(outer[0],outer[1],Math.PI*2*sweep,Math.max(4,Math.ceil(72*sweep))),axis=[{a:[0,bounds.minY-.38,0],b:[0,bounds.maxY+.38,0],active:false}],view='solid';
    r9ApplyCustomScene({faces:mesh.faces,overlay:[...axis,...trace],ghosts,selectedFaces:mesh.faces.filter(f=>f.thetaIndex>=Math.max(0,Math.ceil(84*sweep)-2)).map(f=>f.faceIndex),viewStyle:view,hideMeshEdges:true});
    r9SetHud({kicker:'7 · 회전체 생성',title:`${spec.profile_label} → ${spec.label}`,subtitle:spec.axis_relation==='offset_from_axis'?'회전축에서 떨어진 평면도형은 가운데가 비거나 고리 모양인 회전체를 만듭니다.':'회전축·생성선·점의 원운동을 같은 화면에서 추적합니다.',progress:p,legend:[{cls:'axis',label:'회전축'},{cls:'surface',label:'생성 중인 곡면'},{cls:'focus',label:'생성점의 원운동'}]});r9DrawProfileInset(id);renderer.effectUntil=performance.now()+190;renderer.requestRender();R009.lastDraw=()=>r9DrawRevolutionSpatial(state.revolutionProgress);
  }

  function r9SectionCase(){return R009_EXACT.section_cases.find(x=>x.case_id===state.revSectionCase)||R009_EXACT.section_cases[0]}
  function r9DrawSectionSpatial(progress,{directD=null}={}){
    const item=r9SectionCase(),p=clamp(progress,0,1),override=item.display_profile_override||null,mesh=r9LatheFaces(item.profile,1,{segments:96,override}),n=r9unit(item.plane.normal),target=Number(item.plane.d),support=r9Support(mesh.faces,n),span=support.max-support.min,start=support.max+Math.max(.25,span*.18),move=r9ease(clamp((p-.08)/.52,0,1)),d=directD==null?r9mix(start,target,move):directD,raw=r9MeshSegments(mesh.faces,n,d),loops=r9ChainSegments(raw,3e-3),reveal=clamp((p-.34)/.48,0,1),shown=r9RevealLoops(loops,reveal),plane=r9PlanePatch(n,d,Math.max(mesh.bounds.maxR,mesh.bounds.maxY-mesh.bounds.minY)*1.25),ghosts=[{points:plane,alpha:.34}];
    if(reveal>.88&&loops.length===1)ghosts.push({points:loops[0].points,alpha:.80});
    const markers=[];shown.segments.forEach((seg,i)=>{if(i%Math.max(1,Math.floor(shown.segments.length/10))===0)markers.push({point:seg.a,vertexIndex:i,label:'',active:true,showLabel:false,primaryInGroup:true})});
    r9ApplyCustomScene({faces:mesh.faces,markers,overlay:shown.segments,ghosts,selectedFaces:[...shown.selected],viewStyle:'solid',hideMeshEdges:true});R009.sectionLoops=loops;R009.sectionPlane={n,d};
    r9SetHud({kicker:'8 · 회전체 단면과 교선',title:item.label,subtitle:p<.34?'평면이 처음 닿는 위치를 예상하세요.':p<.82?'평면과 곡면을 동시에 만족하는 점들이 교선으로 이어집니다.':`실제 유한 경계: ${r9ClassificationLabel(item.classification)}`,progress:p,legend:[{cls:'surface',label:'회전체 표면'},{cls:'plane',label:'절단 평면'},{cls:'focus',label:'실제 교선·교점'}]});r9DrawSectionInset(loops,n,d,'절단 평면에서 본 실제 경계');renderer.effectUntil=performance.now()+190;renderer.requestRender();R009.lastDraw=()=>r9DrawSectionSpatial(state.revSectionProgress,{directD:state.r009SectionDirectD});return {item,mesh,n,d,loops,support};
  }
  function r9ClassificationLabel(v){return ({circle:'원',tangent_point:'한 점',rectangle:'직사각형',ellipse:'타원',curves_and_cap_segments:'옆면 곡선 + 윗면·밑면 선분',triangle:'삼각형',trapezoid:'사다리꼴',annulus:'고리 모양',two_circles:'서로 떨어진 두 원'})[v]||v}

  function r9CubePathScene(progress,mode){
    const p=clamp(progress,0,1),u=mode==='surface'?r9ease(clamp((p-.22)/.52,0,1)):0,s=.82,front=[[-s,-s,s],[s,-s,s],[s,s,s],[-s,s,s]],top=[[-s,s,s],[s,s,s],[s,s,-s],[-s,s,-s]],hingeA=[-s,s,s],hingeB=[s,s,s],rot=rotationAboutLine(hingeA,r9sub(hingeB,hingeA),u*Math.PI/2),topNow=top.map(q=>rigidTransformPoint(rot,q)),P=[-s,-s,s],Q0=[s,s,-s],Q=rigidTransformPoint(rot,Q0),H=[0,s,s];
    const faces=[{faceIndex:0,sideCount:4,points:front},{faceIndex:1,sideCount:4,points:topNow}];if(p<.28){faces.push({faceIndex:2,sideCount:4,points:[[-s,-s,-s],[-s,s,-s],[s,s,-s],[s,-s,-s]]},{faceIndex:3,sideCount:4,points:[[-s,-s,-s],[-s,-s,s],[-s,s,s],[-s,s,-s]]},{faceIndex:4,sideCount:4,points:[[s,-s,s],[s,-s,-s],[s,s,-s],[s,s,s]]},{faceIndex:5,sideCount:4,points:[[-s,-s,-s],[s,-s,-s],[s,-s,s],[-s,-s,s]]});}
    const reveal=clamp((p-.52)/.34,0,1),overlay=[];
    if(mode==='surface'){const segments=[{a:P,b:H,active:true},{a:H,b:Q,active:true}],count=Math.ceil(segments.length*reveal);overlay.push(...segments.slice(0,count));}
    else if(mode==='interior'&&p>.35)overlay.push({a:P,b:Q0,active:true});
    else if(mode==='edge'&&p>.35){const A=[s,-s,s],B=[s,s,s];overlay.push({a:P,b:A,active:true},{a:A,b:B,active:true},{a:B,b:Q0,active:true});}
    const markers=[{point:P,vertexIndex:0,label:'P',active:true,showLabel:true,primaryInGroup:true},{point:mode==='surface'?Q:Q0,vertexIndex:1,label:'Q',active:true,showLabel:true,primaryInGroup:true}],ghosts=u>0?[{points:top,alpha:.20}]:[];
    r9ApplyCustomScene({faces,markers,overlay,ghosts,selectedFaces:mode==='surface'?[0,1]:[],viewStyle:'transparent'});const exact=R009_EXACT.shortest_paths.cube;r9ShowMetricInset([{label:'내부 직선',value:`√3 ≈ ${r9fmt(exact.interior_distance)}`},{label:'겉면',value:`√5 ≈ ${r9fmt(exact.surface_distance)}`},{label:'모서리',value:`${r9fmt(exact.edge_only_distance)}`}]);
  }
  function r9CylinderPathScene(progress,mode){
    const p=clamp(progress,0,1),u=mode==='surface'?r9ease(clamp((p-.20)/.56,0,1)):0,ex=R009_EXACT.shortest_paths.cylinder,R=ex.radius,H=ex.height,seg=48,levels=5,faces=[];let fi=0;
    const morph=(theta,y)=>{const solid=[R*Math.cos(theta),y,R*Math.sin(theta)],flat=[R*theta,y,0];return r9mix3(solid,flat,u)};
    for(let i=0;i<seg;i++){const t0=-Math.PI+2*Math.PI*i/seg,t1=-Math.PI+2*Math.PI*(i+1)/seg;for(let j=0;j<levels;j++){const y0=-H/2+H*j/levels,y1=-H/2+H*(j+1)/levels;faces.push({faceIndex:fi++,sideCount:4,points:[morph(t0,y0),morph(t1,y0),morph(t1,y1),morph(t0,y1)]});}}
    const k=ex.minimum_k,thetaP=ex.P.theta,thetaQ=ex.Q.theta+2*Math.PI*k,path=[],steps=42;for(let i=0;i<=steps;i++){const t=i/steps,theta=r9mix(thetaP,thetaQ,t),y=r9mix(ex.P.y,ex.Q.y,t),solid=[R*Math.cos(theta),y,R*Math.sin(theta)],flat=[R*theta,y,0];path.push(r9mix3(solid,flat,u));}
    const overlay=[];if(p>.38){const count=Math.ceil((path.length-1)*clamp((p-.38)/.42,0,1));for(let i=0;i<count;i++)overlay.push({a:path[i],b:path[i+1],active:true});}
    const solidP=[R*Math.cos(thetaP),ex.P.y,R*Math.sin(thetaP)],solidQ=[R*Math.cos(ex.Q.theta),ex.Q.y,R*Math.sin(ex.Q.theta)],P=r9mix3(solidP,[R*thetaP,ex.P.y,0],u),Q=r9mix3(solidQ,[R*thetaQ,ex.Q.y,0],u),markers=[{point:P,vertexIndex:0,label:'P',active:true,showLabel:true,primaryInGroup:true},{point:Q,vertexIndex:1,label:'Q',active:true,showLabel:true,primaryInGroup:true}],ghosts=[];
    if(u>.72){const C=2*Math.PI*R;[-1,1].forEach(copy=>ghosts.push({points:[[-Math.PI*R+copy*C,-H/2,0],[Math.PI*R+copy*C,-H/2,0],[Math.PI*R+copy*C,H/2,0],[-Math.PI*R+copy*C,H/2,0]],alpha:.24}));}
    if(mode==='interior'&&p>.34){overlay.length=0;overlay.push({a:solidP,b:solidQ,active:true});}
    r9ApplyCustomScene({faces,markers,overlay,ghosts,viewStyle:'transparent'});r9ShowMetricInset([{label:'내부 직선',value:r9fmt(ex.interior_chord)},{label:'옆면 최단',value:r9fmt(ex.surface_minimum)},{label:'최소 복사본',value:`k=${ex.minimum_k}`}]);
  }
  function r9ConePathScene(progress,mode){
    const p=clamp(progress,0,1),u=mode==='surface'?r9ease(clamp((p-.20)/.56,0,1)):0,ex=R009_EXACT.shortest_paths.cone,R=ex.base_radius,H=ex.height,L=ex.slant_height,seg=54,levels=6,faces=[];let fi=0;
    const point=(s,theta)=>{const r=R*s/L,y=H/2-H*s/L,solid=[r*Math.cos(theta),y,r*Math.sin(theta)],phi=(R/L)*(theta-Math.PI),flat=[s*Math.cos(phi),s*Math.sin(phi),0];return {solid,flat,m:r9mix3(solid,flat,u)}};
    for(let i=0;i<seg;i++){const t0=2*Math.PI*i/seg,t1=2*Math.PI*(i+1)/seg;for(let j=0;j<levels;j++){const s0=L*j/levels,s1=L*(j+1)/levels,pts=[point(s0,t0).m,point(s0,t1).m,point(s1,t1).m,point(s1,t0).m],unique=[];pts.forEach(q=>{if(!unique.some(z=>r9near(q,z,1e-6)))unique.push(q)});if(unique.length>=3)faces.push({faceIndex:fi++,sideCount:unique.length,points:unique});}}
    const k=ex.minimum_k,phiP=(R/L)*(ex.P.theta-Math.PI),phiQ=phiP+ex.seam_copies.find(x=>x.k===k).sector_delta_angle,FP=[ex.P.slant*Math.cos(phiP),ex.P.slant*Math.sin(phiP)],FQ=[ex.Q.slant*Math.cos(phiQ),ex.Q.slant*Math.sin(phiQ)],path=[],steps=46;
    for(let i=0;i<=steps;i++){const t=i/steps,x=r9mix(FP[0],FQ[0],t),y2=r9mix(FP[1],FQ[1],t),s=Math.hypot(x,y2),phi=Math.atan2(y2,x),theta=Math.PI+phi*L/R,solid=point(s,theta).solid,flat=[x,y2,0];path.push(r9mix3(solid,flat,u));}
    const overlay=[];if(p>.38){const count=Math.ceil((path.length-1)*clamp((p-.38)/.42,0,1));for(let i=0;i<count;i++)overlay.push({a:path[i],b:path[i+1],active:true});}
    const P0=point(ex.P.slant,ex.P.theta),Q0=point(ex.Q.slant,ex.Q.theta),P=r9mix3(P0.solid,[FP[0],FP[1],0],u),Q=r9mix3(Q0.solid,[FQ[0],FQ[1],0],u),markers=[{point:P,vertexIndex:0,label:'P',active:true,showLabel:true,primaryInGroup:true},{point:Q,vertexIndex:1,label:'Q',active:true,showLabel:true,primaryInGroup:true}];if(mode==='interior'&&p>.34){overlay.length=0;overlay.push({a:P0.solid,b:Q0.solid,active:true});}
    r9ApplyCustomScene({faces,markers,overlay,viewStyle:'transparent'});r9ShowMetricInset([{label:'모선',value:r9fmt(L)},{label:'부채꼴 각',value:`${r9fmt(ex.sector_angle)} rad`},{label:'옆면 최단',value:r9fmt(ex.surface_minimum)}]);
  }
  function r9SpherePathScene(progress,mode){
    const p=clamp(progress,0,1),ex=R009_EXACT.shortest_paths.sphere,R=ex.radius,mesh=r9LatheFaces('sphere',1,{segments:84}),a=ex.central_angle,P=[R,0,0],Q=[R*Math.cos(a),0,R*Math.sin(a)],overlay=[];
    if(mode==='interior'&&p>.28)overlay.push({a:P,b:Q,active:true});else if(p>.28){const n=64,count=Math.ceil(n*clamp((p-.28)/.5,0,1));let prev=P;for(let i=1;i<=count;i++){const t=a*i/n,next=[R*Math.cos(t),0,R*Math.sin(t)];overlay.push({a:prev,b:next,active:true});prev=next;}}
    r9ApplyCustomScene({faces:mesh.faces,markers:[{point:P,vertexIndex:0,label:'P',active:true,showLabel:true,primaryInGroup:true},{point:Q,vertexIndex:1,label:'Q',active:true,showLabel:true,primaryInGroup:true}],overlay,viewStyle:'transparent'});r9ShowMetricInset([{label:'내부 chord',value:r9fmt(ex.interior_chord)},{label:'표면 짧은 호',value:r9fmt(ex.surface_short_arc)},{label:'범위',value:'심화'}]);
  }
  function r9DrawPathSpatial(progress){
    const p=clamp(progress,0,1),key=state.pathCase||'cube',mode=state.distanceFocus||'surface';if(key==='cube')r9CubePathScene(p,mode);else if(key==='cylinder')r9CylinderPathScene(p,mode);else if(key==='cone')r9ConePathScene(p,mode);else r9SpherePathScene(p,mode);
    const labels={cube:'정육면체',cylinder:'원기둥 옆면',cone:'원뿔 옆면',sphere:'구 표면(심화)'},modeLabels={interior:'입체 내부 직선',surface:'겉면 최단경로',edge:'모서리만 따라가기'};
    r9SetHud({kicker:'9 · 거리 조건과 펼친 최단길',title:`${labels[key]} · ${modeLabels[mode]}`,subtitle:p<.28?'P와 Q 사이에서 어디를 지나갈 수 있는지 먼저 정합니다.':p<.78?(mode==='surface'?'길이를 보존한 채 표면을 펼치고 직선 후보를 비교합니다.':'허용된 영역 안에서 경로를 직접 비교합니다.'):'같은 P·Q라도 허용 경로가 달라지면 최단거리도 달라집니다.',progress:p,legend:[{cls:'path',label:'현재 허용 경로'},{cls:'surface',label:'길이를 보존한 펼침'},{cls:'focus',label:'점 P · 점 Q'}]});renderer.effectUntil=performance.now()+190;renderer.requestRender();R009.lastDraw=()=>r9DrawPathSpatial(state.pathProgress);
  }
