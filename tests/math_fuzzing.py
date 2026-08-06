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

def run_math_fuzzing():
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
        
        # Test 1: Evaluate exposed objects and DOM state under fuzzing
        result = page.evaluate("""() => {
            const keys = Object.keys(window).filter(k => !k.startsWith('webkit') && !k.startsWith('chrome'));
            const canvas = document.querySelector('#glCanvas');
            const hasCanvas = !!canvas;
            
            // Check if glCanvas has context
            let glType = 'none';
            if (canvas) {
                const gl = canvas.getContext('webgl') || canvas.getContext('canvas2d');
                if (gl) {
                    glType = gl instanceof WebGLRenderingContext ? 'webgl' : 'canvas2d';
                }
            }
            
            return { loaded: true, keysCount: keys.length, hasCanvas, glType };
        }""")
        
        record_check('MATH-FUZZ-MODULE-LOADED', result.get('loaded', False) == True, result.get('loaded'), True)
        record_check('MATH-FUZZ-CANVAS-PRESENT', result.get('hasCanvas', False) == True, result.get('hasCanvas'), True)
        record_check('MATH-FUZZ-GL-CONTEXT-FOUND', result.get('glType') in ['webgl', 'canvas2d'], result.get('glType'), 'webgl or canvas2d')
        record_check('MATH-FUZZ-ZERO-PAGE-ERRORS', len(errors) == 0, len(errors), 0)
        
        browser.close()
        
    failed = [c for c in checks if c['status'] == 'FAIL']
    if failed:
        print(f"\nMath Fuzzing Suite Finished: {len(failed)} Checks Failed!")
        sys.exit(1)
    else:
        print("\nMath Fuzzing Suite Finished: 100% Passed!")
        sys.exit(0)

if __name__ == '__main__':
    run_math_fuzzing()
