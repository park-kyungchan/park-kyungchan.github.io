#!/usr/bin/env python3
from __future__ import annotations
import io, json, pathlib, re, statistics, sys, time
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=(ROOT/'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html').read_text(encoding='utf-8')
BROWSER='/usr/bin/chromium'
profiles=[
 {'name':'desktop_1440x900','viewport':{'width':1440,'height':900},'has_touch':False,'reduced_motion':'no-preference'},
 {'name':'class_touch_1180x820','viewport':{'width':1180,'height':820},'has_touch':True,'reduced_motion':'no-preference'},
 {'name':'tablet_touch_820x1180','viewport':{'width':820,'height':1180},'has_touch':True,'reduced_motion':'no-preference'},
 {'name':'mobile_touch_390x844','viewport':{'width':390,'height':844},'has_touch':True,'reduced_motion':'no-preference'},
 {'name':'desktop_reduced_motion','viewport':{'width':1440,'height':900},'has_touch':False,'reduced_motion':'reduce'},
]
chapters=['explorer','generator','net','section','euler','soccer','revolution','revsection','geodesic']
checks=[]
def check(cid,cond,actual=None,expected=None,profile=None):
 checks.append({'id':cid,'profile':profile,'status':'PASS' if cond else 'FAIL','actual':actual,'expected':expected})
def img_diff(a:bytes,b:bytes)->float:
 ia=Image.open(io.BytesIO(a)).convert('RGB'); ib=Image.open(io.BytesIO(b)).convert('RGB')
 if ia.size!=ib.size: ib=ib.resize(ia.size)
 stat=ImageStat.Stat(ImageChops.difference(ia,ib)); return sum(stat.mean)/3

def dismiss(page):
 page.wait_for_timeout(300)
 if page.locator('#studentStartDialog').evaluate('(e)=>e.open'):
  page.locator('#startExploreButton').click()
  page.wait_for_timeout(120)

def open_tab(page,tab):
 page.eval_on_selector(f'.tab-button[data-tab="{tab}"]','e=>e.click()')
 page.wait_for_timeout(65)

def visible_target_metrics(page):
 return page.evaluate('''() => {
  const els=[...document.querySelectorAll('button,select,textarea,input:not([type="hidden"])')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&!e.disabled});
  const boxes=els.map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,id:e.id||'',cls:e.className||'',w:r.width,h:r.height,type:e.type||''}});
  const under24=boxes.filter(x=>x.type!=='range'&&(x.w<24||x.h<24));
  const primary=boxes.filter(x=>/action-button|glass-button|tool-button/.test(String(x.cls))||/chapterPrevButton|chapterNextButton/.test(x.id));
  const primaryUnder40=primary.filter(x=>x.h<40||x.w<40);
  return {count:boxes.length,under24,primaryCount:primary.length,primaryUnder40};
 }''')

def camera_during_autoplay(page,tab,play_sel,slider_sel):
 open_tab(page,tab)
 canvas=page.locator('#glCanvas')
 before_value=float(page.locator(slider_sel).input_value())
 page.locator(play_sel).click()
 page.wait_for_timeout(650)
 after_value=float(page.locator(slider_sel).input_value())
 frame1=canvas.screenshot()
 box=canvas.bounding_box(); x=box['x']+box['width']*.58; y=box['y']+box['height']*.55
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+95,y-45,steps=7);page.mouse.up();page.wait_for_timeout(120)
 frame2=canvas.screenshot(); orbit=img_diff(frame1,frame2)
 page.mouse.move(x,y);page.mouse.wheel(0,-520);page.wait_for_timeout(120)
 frame3=canvas.screenshot(); zoom=img_diff(frame2,frame3)
 value_after_camera=float(page.locator(slider_sel).input_value())
 page.locator(play_sel).click() if page.locator(play_sel).get_attribute('aria-pressed')=='true' else None
 return {'before':before_value,'after':after_value,'after_camera':value_after_camera,'orbit_diff':orbit,'zoom_diff':zoom}

runtime_profiles=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=BROWSER,args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=swiftshader'])
 for profile in profiles:
  print('PROFILE',profile['name'],flush=True)
  ctx=browser.new_context(viewport=profile['viewport'],has_touch=profile['has_touch'],is_mobile=profile['viewport']['width']<600,reduced_motion=profile['reduced_motion'])
  page=ctx.new_page(); page.set_default_timeout(5000); errors=[]; requests=[]
  page.on('console',lambda m,errs=errors: errs.append({'kind':'console','type':m.type,'text':m.text}) if m.type=='error' else None)
  page.on('pageerror',lambda e,errs=errors: errs.append({'kind':'pageerror','text':str(e)}))
  page.on('request',lambda req,arr=requests: arr.append(req.url) if req.url.startswith(('http://','https://')) else None)
  page.set_content(HTML,wait_until='load',timeout=60000); dismiss(page)
  profile_result={'profile':profile['name'],'chapters':[]}
  for tab in chapters:
   try:
    open_tab(page,tab)
    h2=page.locator('#leftPanel h2').first.text_content(timeout=5000)
    profile_result['chapters'].append({'tab':tab,'status':'PASS','heading':h2})
   except Exception as e:
    profile_result['chapters'].append({'tab':tab,'status':'FAIL','error':str(e)[:300]})
  check('R009-RUNTIME-CHAPTER-COVERAGE',all(x['status']=='PASS' for x in profile_result['chapters']),sum(x['status']=='PASS' for x in profile_result['chapters']),9,profile['name'])
  dims=page.evaluate('()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,body:document.body.scrollWidth})')
  check('R009-RUNTIME-NO-HORIZONTAL-OVERFLOW',dims['sw']<=dims['cw']+1,dims,dims['cw'],profile['name'])
  text=page.locator('body').inner_text()
  machine=re.findall(r'\b[FEV]\d{3}\b',text)
  check('R009-RUNTIME-NO-VISIBLE-MACHINE-ID',len(machine)==0,machine[:10],[],profile['name'])
  aria=page.evaluate(r'''()=>[...document.querySelectorAll('[aria-label],[title],[alt]')].flatMap(e=>[e.getAttribute('aria-label'),e.getAttribute('title'),e.getAttribute('alt')]).filter(Boolean).filter(v=>/\b[FEV]\d{3}\b/.test(v))''')
  check('R009-RUNTIME-NO-ARIA-MACHINE-ID',len(aria)==0,aria,[],profile['name'])
  leaks=[s for s in ['교사용 안내','source hash','SHA-256','debug route','answer fixture'] if s.lower() in text.lower()]
  check('R009-RUNTIME-NO-STUDENT-LEAK',len(leaks)==0,leaks,[],profile['name'])
  check('R009-RUNTIME-NO-FLOATING-BAR',page.locator('#centerLearningDock,.r008-transport,.r007-timeline').count()==0,page.locator('#centerLearningDock,.r008-transport,.r007-timeline').count(),0,profile['name'])
  check('R009-RUNTIME-TWO-PANEL',page.locator('#appMain > *').count()==2,page.locator('#appMain > *').count(),2,profile['name'])
  check('R009-RUNTIME-NO-SEPARATOR',page.locator('[role="separator"],.panel-resize-handle,.dock-resize-handle').count()==0,page.locator('[role="separator"],.panel-resize-handle,.dock-resize-handle').count(),0,profile['name'])
  metrics=visible_target_metrics(page)
  check('R009-A11Y-TARGET-24',len(metrics['under24'])==0,metrics['under24'][:10],[],profile['name'])
  check('R009-A11Y-PRIMARY-40',len(metrics['primaryUnder40'])==0,metrics['primaryUnder40'][:10],[],profile['name'])
  check('R009-RUNTIME-NETWORK-0',len(requests)==0,requests,[],profile['name'])
  check('R009-RUNTIME-ERROR-0',len(errors)==0,errors,[],profile['name'])
  profile_result.update({'overflow':dims,'machine_ids':machine,'requests':requests,'errors':errors,'targets':metrics})
  runtime_profiles.append(profile_result)
  ctx.close()
 # Deep adversarial checks in desktop context.
 print('DEEP restart browser',flush=True); browser.close(); browser=p.chromium.launch(headless=True,executable_path=BROWSER,args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=swiftshader'])
 ctx=browser.new_context(viewport={'width':1440,'height':900})
 page=ctx.new_page(); page.set_default_timeout(5000); errors=[]; requests=[]
 page.on('console',lambda m: errors.append({'kind':'console','type':m.type,'text':m.text}) if m.type=='error' else None)
 page.on('pageerror',lambda e: errors.append({'kind':'pageerror','text':str(e)}))
 page.on('request',lambda req: requests.append(req.url) if req.url.startswith(('http://','https://')) else None)
 page.set_content(HTML,wait_until='load');dismiss(page)
 print('DEEP profiles',flush=True)
 # Section 7 inventory and distinct profile families.
 open_tab(page,'revolution')
 options=page.locator('#revolutionProfileSelect option').all_text_contents()
 required=['원기둥','원뿔','원뿔대','구','속 빈 원기둥','도넛 모양 회전체','원기둥 + 원뿔','원기둥 + 반구 돔','원기둥 + 원뿔대 + 원뿔','단이 있는 회전체']
 check('R009-RUNTIME-REVOLUTION-10-PROFILES',len(options)==10,len(options),10,'adversarial')
 check('R009-RUNTIME-REVOLUTION-REQUIRED',all(any(r in o for o in options) for r in required),options,required,'adversarial')
 for value in ['frustum','torus','triple_stack']:
  page.locator('#revolutionProfileSelect').select_option(value);page.wait_for_timeout(150)
  check(f'R009-RUNTIME-PROFILE-{value}',page.locator('#revolutionProfileSelect').input_value()==value,page.locator('#revolutionProfileSelect').input_value(),value,'adversarial')
 print('DEEP sections',flush=True)
 # Integrated section cases.
 open_tab(page,'revsection'); section_count=page.locator('#revSectionCaseSelect option').count()
 check('R009-RUNTIME-SECTION-13-CASES',section_count==13,section_count,13,'adversarial')
 page.locator('#revSectionCaseSelect').select_option('CYLINDER-OBLIQUE-CAPS');page.locator('#revSectionProgress').fill('0.72');page.locator('#revSectionProgress').dispatch_event('input');page.wait_for_timeout(150)
 check('R009-RUNTIME-SECTION-INSET',page.locator('#r009Inset').is_visible(),page.locator('#r009Inset').is_visible(),True,'adversarial')
 print('DEEP paths',flush=True)
 # Integrated distance/path modes.
 open_tab(page,'geodesic');
 check('R009-RUNTIME-DISTANCE-MODES',page.locator('[data-r9-distance-mode]').count()==3,page.locator('[data-r9-distance-mode]').count(),3,'adversarial')
 page.locator('#pathCaseSelect').select_option('cylinder');page.wait_for_timeout(100)
 check('R009-RUNTIME-EDGE-DISABLED-NONPOLY',page.locator('[data-r9-distance-mode="edge"]').is_disabled(),page.locator('[data-r9-distance-mode="edge"]').is_disabled(),True,'adversarial')
 print('DEEP evidence',flush=True)
 # Evidence dialog focus / Escape / return.
 trigger=page.locator('#r009EvidenceButton');trigger.focus();trigger.click();page.wait_for_timeout(100)
 check('R009-A11Y-EVIDENCE-OPEN',page.locator('#evidenceDialog').evaluate('(e)=>e.open'),True,True,'adversarial')
 focused=page.evaluate('()=>document.activeElement.id')
 check('R009-A11Y-EVIDENCE-FOCUS',focused=='evidenceClose',focused,'evidenceClose','adversarial')
 page.keyboard.press('Escape');page.wait_for_timeout(100);focused_after=page.evaluate('()=>document.activeElement.id')
 check('R009-A11Y-EVIDENCE-RETURN',focused_after=='r009EvidenceButton',focused_after,'r009EvidenceButton','adversarial')
 print('DEEP camera',flush=True)
 # Autoplay remains active while camera is orbiting/zooming.
 camera_results={}
 for tab,play,slider in [('revolution','#revolutionPlay','#revolutionProgress'),('revsection','#revSectionPlay','#revSectionProgress'),('geodesic','#pathPlay','#pathProgress')]:
  result=camera_during_autoplay(page,tab,play,slider);camera_results[tab]=result
  check(f'R009-MOTION-{tab}-PLAY-PROGRESSES',result['after']>result['before']+.005,result,{'after':'> before'},'adversarial')
  check(f'R009-MOTION-{tab}-ORBIT-LIVE',result['orbit_diff']>.12,result['orbit_diff'],'> 0.12','adversarial')
  check(f'R009-MOTION-{tab}-ZOOM-LIVE',result['zoom_diff']>.12,result['zoom_diff'],'> 0.12','adversarial')
  check(f'R009-MOTION-{tab}-PLAY-CONTINUES',result['after_camera']>=result['after'],result,{'after_camera':'>= after'},'adversarial')
 print('DEEP pointercancel',flush=True)
 # Pointercancel, then another drag, should leave the viewer usable.
 open_tab(page,'revsection');canvas=page.locator('#glCanvas');before=canvas.screenshot()
 page.evaluate("()=>document.querySelector('#glCanvas').dispatchEvent(new PointerEvent('pointercancel',{pointerId:77,pointerType:'touch',bubbles:true}))")
 box=canvas.bounding_box();page.mouse.move(box['x']+box['width']*.6,box['y']+box['height']*.55);page.mouse.down();page.mouse.move(box['x']+box['width']*.68,box['y']+box['height']*.48,steps=6);page.mouse.up();page.wait_for_timeout(100);after=canvas.screenshot();pc_diff=img_diff(before,after)
 check('R009-INPUT-POINTERCANCEL-RECOVERY',pc_diff>.12,pc_diff,'> 0.12','adversarial')
 print('DEEP rapid',flush=True)
 # Rapid module switches and reset during a running sequence.
 for _ in range(4):
  for tab in ['revolution','revsection','geodesic','section']:
   open_tab(page,tab)
 open_tab(page,'revolution');page.locator('#revolutionPlay').click();page.wait_for_timeout(250);page.locator('#resetViewButton').click();page.wait_for_timeout(100);open_tab(page,'revsection')
 check('R009-STATE-RAPID-SWITCH-RECOVERY',page.locator('#revSectionCaseSelect').count()==1,page.locator('#revSectionCaseSelect').count(),1,'adversarial')
 check('R009-ADVERSARIAL-ERROR-0',len(errors)==0,errors,[],'adversarial')
 check('R009-ADVERSARIAL-NETWORK-0',len(requests)==0,requests,[],'adversarial')
 ctx.close();browser.close()
status='PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL'
result={'suite':'P003-R009-RUNTIME-ADVERSARIAL','status':status,'browser':'Chromium system executable','execution_mode':'Playwright headless; touch profiles are emulation, not actual classroom devices','profiles':runtime_profiles,'camera_during_autoplay':camera_results,'checks':checks,'pass_count':sum(c['status']=='PASS' for c in checks),'fail_count':sum(c['status']=='FAIL' for c in checks)}
out=ROOT/'audit/P003_R009_RUNTIME_ADVERSARIAL.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':status,'pass':result['pass_count'],'fail':result['fail_count'],'output':str(out)},ensure_ascii=False))
if status!='PASS':
 for c in checks:
  if c['status']=='FAIL': print(json.dumps(c,ensure_ascii=False))
sys.exit(0 if status=='PASS' else 1)
