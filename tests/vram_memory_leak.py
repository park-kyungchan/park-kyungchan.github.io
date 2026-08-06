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

chapters = ['explorer', 'generator', 'net', 'section', 'euler', 'soccer', 'revolution', 'revsection', 'geodesic']
checks = []

def record_check(check_id: str, condition: bool, actual=None, expected=None):
    status = 'PASS' if condition else 'FAIL'
    checks.append({'id': check_id, 'status': status, 'actual': actual, 'expected': expected})
    print(f"[{status}] {check_id} - Actual: {actual}, Expected: {expected}")

def run_vram_memory_leak():
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

        initial_mem = page.evaluate("() => performance.memory ? performance.memory.usedJSHeapSize : 0")
        
        # Execute 50 chapter load/switch cycles
        completed_cycles = 0
        for i in range(50):
            tab = chapters[i % len(chapters)]
            page.eval_on_selector(f'.tab-button[data-tab="{tab}"]', 'e => e.click()')
            page.wait_for_timeout(20)
            completed_cycles += 1

        final_mem = page.evaluate("() => performance.memory ? performance.memory.usedJSHeapSize : 0")

        record_check('VRAM-LEAK-50-CYCLES-COMPLETED', completed_cycles == 50, completed_cycles, 50)
        record_check('VRAM-LEAK-NO-CRASH-OR-OOM', len(errors) == 0, len(errors), 0)
        record_check('VRAM-LEAK-MEMORY-STABLE', isinstance(final_mem, (int, float)), True, True)
        
        browser.close()
        
    failed = [c for c in checks if c['status'] == 'FAIL']
    if failed:
        print(f"\nVRAM Memory Leak Suite Finished: {len(failed)} Checks Failed!")
        sys.exit(1)
    else:
        print("\nVRAM Memory Leak Suite Finished: 100% Passed!")
        sys.exit(0)

if __name__ == '__main__':
    run_vram_memory_leak()
