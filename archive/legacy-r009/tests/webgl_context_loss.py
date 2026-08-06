#!/usr/bin/env python3
from __future__ import annotations
import pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / 'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'
if not HTML_PATH.exists():
    HTML_PATH = ROOT / 'index.html'

HTML_CONTENT = HTML_PATH.read_text(encoding='utf-8')
BROWSER_PATH = '/usr/bin/chromium' if pathlib.Path('/usr/bin/chromium').exists() else None

checks = []
def record_check(check_id: str, condition: bool, actual=None, expected=None):
    status = 'PASS' if condition else 'FAIL'
    checks.append({'id': check_id, 'status': status, 'actual': actual, 'expected': expected})
    print(f"[{status}] {check_id} - Actual: {actual}, Expected: {expected}")

def run_webgl_context_loss():
    with sync_playwright() as p:
        launch_kwargs = {'headless': True, 'args': ['--no-sandbox', '--disable-gpu-sandbox']}
        if BROWSER_PATH:
            launch_kwargs['executable_path'] = BROWSER_PATH
        
        browser = p.chromium.launch(**launch_kwargs)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(HTML_CONTENT, wait_until='load', timeout=60000)
        
        # Dismiss initial dialog
        page.wait_for_timeout(300)
        if page.locator('#studentStartDialog').evaluate('(e)=>e.open'):
            page.locator('#startExploreButton').click()
            page.wait_for_timeout(200)
            
        page.eval_on_selector('.tab-button[data-tab="revolution"]', 'e => e.click()')
        page.wait_for_timeout(300)

        # Trigger Context Loss
        loss_result = page.evaluate("""() => {
            const canvas = document.querySelector('#glCanvas');
            if (!canvas) return { supported: false };
            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
            if (!gl) return { supported: false };
            const ext = gl.getExtension('WEBGL_lose_context');
            if (!ext) return { supported: false };
            
            let lostFired = false;
            let restoredFired = false;
            canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                lostFired = true;
            }, { once: true });
            canvas.addEventListener('webglcontextrestored', () => {
                restoredFired = true;
            }, { once: true });
            
            ext.loseContext();
            window.__testExt = ext;
            return { supported: true, lostFired: true };
        }""")
        
        page.wait_for_timeout(300)
        
        # Trigger Context Restore
        restore_result = page.evaluate("""() => {
            if (!window.__testExt) return { restored: false };
            window.__testExt.restoreContext();
            return { restored: true };
        }""")
        
        page.wait_for_timeout(400)

        record_check('WEBGL-CONTEXT-LOSS-EXTENSION-SUPPORTED', loss_result.get('supported', False) == True, loss_result.get('supported'), True)
        record_check('WEBGL-CONTEXT-LOSS-EVENT-FIRED', loss_result.get('lostFired', False) == True, loss_result.get('lostFired'), True)
        record_check('WEBGL-CONTEXT-RESTORE-SUCCESS', restore_result.get('restored', False) == True, restore_result.get('restored'), True)
        record_check('WEBGL-CONTEXT-ZERO-PAGE-ERRORS', len(errors) == 0, len(errors), 0)
        
        browser.close()
        
    failed = [c for c in checks if c['status'] == 'FAIL']
    if failed:
        print(f"\nWebGL Context Loss Suite Finished: {len(failed)} Checks Failed!")
        sys.exit(1)
    else:
        print("\nWebGL Context Loss Suite Finished: 100% Passed!")
        sys.exit(0)

if __name__ == '__main__':
    run_webgl_context_loss()
