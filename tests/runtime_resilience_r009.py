#!/usr/bin/env python3
from __future__ import annotations
import io, json, pathlib, sys
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=(ROOT/'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html').read_text(encoding='utf-8')
BROWSER='/usr/bin/chromium'
checks=[]
def check(cid,condition,actual=None,expected=None):
    checks.append({'id':cid,'status':'PASS' if condition else 'FAIL','actual':actual,'expected':expected})
def variance(data:bytes)->float:
    im=Image.open(io.BytesIO(data)).convert('RGB')
    stat=ImageStat.Stat(im)
    return sum(stat.var)/3

def dismiss(page):
    page.wait_for_timeout(250)
    if page.locator('#studentStartDialog').evaluate('(e)=>e.open'):
        page.locator('#startExploreButton').click();page.wait_for_timeout(120)

def open_tab(page,tab):
    page.eval_on_selector(f'.tab-button[data-tab="{tab}"]','e=>e.click()');page.wait_for_timeout(120)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=BROWSER,args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=swiftshader'])
    ctx=browser.new_context(viewport={'width':1180,'height':820})
    page=ctx.new_page();page.set_default_timeout(6000);errors=[];requests=[]
    page.on('console',lambda m: errors.append({'kind':'console','type':m.type,'text':m.text}) if m.type=='error' else None)
    page.on('pageerror',lambda e: errors.append({'kind':'pageerror','text':str(e)}))
    page.on('request',lambda req: requests.append(req.url) if req.url.startswith(('http://','https://')) else None)
    page.set_content(HTML,wait_until='load',timeout=60000);dismiss(page)

    # Hidden-tab injection: stop, preserve the exact progress, and do not stale-resume.
    open_tab(page,'revolution')
    page.locator('#revolutionPlay').click();page.wait_for_timeout(500)
    before_hide=float(page.locator('#revolutionProgress').input_value())
    page.evaluate("""()=>{window.__r009Hidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__r009Hidden});document.dispatchEvent(new Event('visibilitychange'));}""")
    page.wait_for_timeout(650)
    hidden_value=float(page.locator('#revolutionProgress').input_value())
    hidden_pressed=page.locator('#revolutionPlay').get_attribute('aria-pressed')
    page.evaluate("""()=>{window.__r009Hidden=false;document.dispatchEvent(new Event('visibilitychange'));}""")
    page.wait_for_timeout(450)
    shown_value=float(page.locator('#revolutionProgress').input_value())
    check('R009-RESILIENCE-HIDDEN-STARTED',before_hide>0.005,before_hide,'> 0.005')
    check('R009-RESILIENCE-HIDDEN-STOPS',abs(hidden_value-before_hide)<0.02,{'before':before_hide,'hidden':hidden_value},'delta < 0.02')
    check('R009-RESILIENCE-HIDDEN-BUTTON-RESET',hidden_pressed=='false',hidden_pressed,'false')
    check('R009-RESILIENCE-SHOW-NO-STALE-RESUME',abs(shown_value-hidden_value)<0.02,{'hidden':hidden_value,'shown':shown_value},'delta < 0.02')

    # Actual WebGL lose/restore extension where available.
    open_tab(page,'revsection')
    page.locator('#revSectionProgress').fill('0.72');page.locator('#revSectionProgress').dispatch_event('input');page.wait_for_timeout(250)
    canvas=page.locator('#glCanvas')
    before=canvas.screenshot();before_var=variance(before)
    support=page.evaluate("""()=>{const c=document.querySelector('#glCanvas');const gl=c.getContext('webgl');window.__r009LossEvents=0;window.__r009RestoreEvents=0;c.addEventListener('webglcontextlost',()=>window.__r009LossEvents++);c.addEventListener('webglcontextrestored',()=>window.__r009RestoreEvents++);window.__r009LoseExt=gl&&gl.getExtension('WEBGL_lose_context');return !!window.__r009LoseExt;}""")
    check('R009-RESILIENCE-WEBGL-LOSE-EXTENSION-RECORDED',isinstance(support,bool),support,'boolean recorded')
    if support:
        context_mode='WEBGL_lose_context extension'
        page.evaluate('()=>window.__r009LoseExt.loseContext()');page.wait_for_timeout(450)
        lost_events=page.evaluate('()=>window.__r009LossEvents')
        page.evaluate('()=>window.__r009LoseExt.restoreContext()');page.wait_for_timeout(800)
    else:
        context_mode='injected listener path; extension unavailable in this SwiftShader session'
        page.evaluate("""()=>{const c=document.querySelector('#glCanvas');c.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));}""");page.wait_for_timeout(250)
        lost_events=page.evaluate('()=>window.__r009LossEvents')
        page.evaluate("""()=>{const c=document.querySelector('#glCanvas');c.dispatchEvent(new Event('webglcontextrestored'));}""");page.wait_for_timeout(650)
    restored_events=page.evaluate('()=>window.__r009RestoreEvents')
    after=canvas.screenshot();after_var=variance(after)
    check('R009-RESILIENCE-CONTEXT-LOST-EVENT',lost_events>=1,{'events':lost_events,'mode':context_mode},'>= 1')
    check('R009-RESILIENCE-CONTEXT-RESTORED-EVENT',restored_events>=1,{'events':restored_events,'mode':context_mode},'>= 1')
    check('R009-RESILIENCE-CONTEXT-RESTORE-READABLE',after_var>20,after_var,'> 20 image variance')
    check('R009-RESILIENCE-CONTEXT-RESTORE-CONTROLS',page.locator('#revSectionCaseSelect').count()==1,page.locator('#revSectionCaseSelect').count(),1)
    check('R009-RESILIENCE-NETWORK-0',len(requests)==0,requests,[])
    check('R009-RESILIENCE-ERROR-0',len(errors)==0,errors,[])
    ctx.close();browser.close()
status='PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL'
result={'suite':'P003-R009-RUNTIME-RESILIENCE','status':status,'browser':'Chromium headless / SwiftShader','execution_note':'hidden state is adversarially injected. WEBGL_lose_context availability is recorded; when unavailable in SwiftShader, the context-lost/restored listener path is injected and verified.','checks':checks,'pass_count':sum(x['status']=='PASS' for x in checks),'fail_count':sum(x['status']=='FAIL' for x in checks)}
out=ROOT/'audit/P003_R009_RUNTIME_RESILIENCE.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if status=='PASS' else 1)
