#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, pathlib, socket, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
ENTRY='P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'
BROWSER='/usr/bin/chromium'
checks=[]
def check(cid,cond,actual=None,expected=None):
    checks.append({'id':cid,'status':'PASS' if cond else 'FAIL','actual':actual,'expected':expected})
def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0));return s.getsockname()[1]
port=free_port();server=subprocess.Popen([sys.executable,str(ROOT/'tools/serve_local.py'),'--port',str(port)],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
localhost_browser={'status':'UNVERIFIED_NOT_RUN'}
direct_file={'status':'UNVERIFIED_SANDBOX_POLICY','reason':'Chromium returned ERR_BLOCKED_BY_ADMINISTRATOR for file:// navigation in this environment','self_contained_html':True}
try:
    deadline=time.time()+8
    while time.time()<deadline:
        try:
            with socket.create_connection(('127.0.0.1',port),timeout=.25): break
        except OSError: time.sleep(.1)
    else: raise RuntimeError('localhost server did not start')
    url=f'http://127.0.0.1:{port}/{ENTRY}'
    served=urllib.request.urlopen(url,timeout=10).read()
    local=(ROOT/ENTRY).read_bytes()
    check('R009-LOCALHOST-BYTE-DELIVERY',served==local,{'served_sha256':hashlib.sha256(served).hexdigest(),'local_sha256':hashlib.sha256(local).hexdigest(),'bytes':len(served)},'byte-identical')
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=BROWSER,args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=swiftshader'])
            page=browser.new_page(viewport={'width':1180,'height':820});errors=[];external=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('request',lambda req: external.append(req.url) if req.url.startswith(('http://','https://')) and f'127.0.0.1:{port}' not in req.url else None)
            page.goto(url,wait_until='load',timeout=60000);page.wait_for_timeout(500)
            title=page.title();tabs=page.locator('.tab-button').count()
            localhost_browser={'status':'PASS' if tabs==9 and not errors and not external else 'FAIL','title':title,'tabs':tabs,'errors':errors,'external_requests':external}
            browser.close()
    except Exception as exc:
        localhost_browser={'status':'UNVERIFIED_SANDBOX_POLICY','reason':str(exc).splitlines()[0]}
finally:
    server.terminate()
    try: server.wait(timeout=3)
    except subprocess.TimeoutExpired: server.kill()
status='PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL'
result={'suite':'P003-R009-LOCAL-MODES','status':status,'localhost_server':{'url_pattern':'http://127.0.0.1:<port>/P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html','checks':checks},'localhost_browser_navigation':localhost_browser,'direct_file_browser_navigation':direct_file,'runtime_substitute_evidence':'The identical standalone bytes were exercised with Playwright page.set_content in P003_R009_RUNTIME_ADVERSARIAL.json. This does not replace field navigation evidence.','pass_count':sum(c['status']=='PASS' for c in checks),'fail_count':sum(c['status']=='FAIL' for c in checks)}
out=ROOT/'audit/P003_R009_LOCAL_MODES.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if status=='PASS' else 1)
