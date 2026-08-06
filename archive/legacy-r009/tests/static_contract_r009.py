#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, pathlib, re, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
html_path=ROOT/'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'
html=html_path.read_text(encoding='utf-8')
checks=[]
def check(name,cond,actual=None,expected=None): checks.append({'id':name,'status':'PASS' if cond else 'FAIL','actual':actual,'expected':expected})
# DOM strings rather than dormant CSS selectors.
main_match=re.search(r'<main id="appMain"[^>]*>(.*?)</main>',html,re.S)
main=main_match.group(1) if main_match else ''
nav_match=re.search(r'<nav class="lab-tabs[^>]*>(.*?)</nav>',html,re.S)
nav=nav_match.group(1) if nav_match else ''
check('R009-STATIC-001-main-found',bool(main_match))
check('R009-STATIC-002-direct-main-panels',len(re.findall(r'^\s{4}<(?:aside|section)\b',main,re.M))==2,len(re.findall(r'^\s{4}<(?:aside|section)\b',main,re.M)),2)
check('R009-STATIC-003-nav-count',len(re.findall(r'class="tab-button',nav))==11,len(re.findall(r'class="tab-button',nav)),11)
for tab in ['locus','distance','transfer']:
    check(f'R009-STATIC-NAV-NO-{tab}',f'data-tab="{tab}"' not in nav,f'data-tab="{tab}"' in nav,False)
check('R009-STATIC-004-no-floating-dock-dom','id="centerLearningDock"' not in html,'id="centerLearningDock"' in html,False)
check('R009-STATIC-005-no-transport-dom','class="r008-transport' not in html,'class="r008-transport' in html,False)
check('R009-STATIC-006-no-resize-handle-dom','role="separator"' not in html,'role="separator"' in html,False)
check('R009-STATIC-007-no-section-12-dom','12. 전이 과제' not in html,'12. 전이 과제' in html,False)
check('R009-STATIC-008-no-old-render-functions',all(x not in html for x in ['function renderLocus(','function renderDistanceModes(','function renderTransfer(']))
check('R009-STATIC-009-no-old-spatial-render-implementation','function revolutionSVG(' not in html,'function revolutionSVG(' in html,False)
check('R009-STATIC-010-shared-poly-renderer-text','same PolyRenderer' in html or '같은 PolyRenderer' in html)
check('R009-STATIC-011-no-http-runtime-url',not re.search(r'https?://',html),re.findall(r'https?://[^\s"\']+',html)[:5],[])
check('R009-STATIC-012-no-external-script',not re.search(r'<script[^>]+src=',html,re.I))
check('R009-STATIC-013-no-external-stylesheet',not re.search(r'<link[^>]+rel=["\']stylesheet',html,re.I))
check('R009-STATIC-014-no-analytics',not re.search(r'google-analytics|gtag\(|segment\.com|mixpanel|hotjar',html,re.I))
# Compare code weight to immutable R008 standalone.
parent=ROOT/'parent_baseline/P003_R008_Two_Panel_Spatial_Lab_Standalone.html'
check('R009-STATIC-015-parent-present',parent.exists())
if parent.exists():
    check('R009-STATIC-016-code-lighter',html_path.stat().st_size<parent.stat().st_size,html_path.stat().st_size,parent.stat().st_size)
result={'suite':'P003-R009-STATIC-CONTRACT','status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','standalone_sha256':hashlib.sha256(html_path.read_bytes()).hexdigest(),'standalone_bytes':html_path.stat().st_size,'parent_bytes':parent.stat().st_size if parent.exists() else None,'checks':checks,'pass_count':sum(c['status']=='PASS' for c in checks),'fail_count':sum(c['status']=='FAIL' for c in checks)}
out=ROOT/'audit/P003_R009_STATIC_CONTRACT.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':result['status'],'pass':result['pass_count'],'fail':result['fail_count'],'output':str(out)},ensure_ascii=False))
sys.exit(0 if result['status']=='PASS' else 1)
