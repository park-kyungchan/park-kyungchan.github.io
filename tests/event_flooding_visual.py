#!/usr/bin/env python3
from __future__ import annotations
import io, pathlib, sys, time
from PIL import Image, ImageChops, ImageStat
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

def img_diff_ratio(a_bytes: bytes, b_bytes: bytes) -> float:
    im1 = Image.open(io.BytesIO(a_bytes)).convert('RGB')
    im2 = Image.open(io.BytesIO(b_bytes)).convert('RGB')
    if im1.size != im2.size:
        im2 = im2.resize(im1.size)
    diff = ImageChops.difference(im1, im2)
    stat = ImageStat.Stat(diff)
    mean_diff = sum(stat.mean) / 3.0
    return mean_diff / 255.0

def run_event_flooding_visual():
    with sync_playwright() as p:
        launch_kwargs = {
            'headless': True,
            'args': [
                '--no-sandbox',
                '--disable-gpu-sandbox',
                '--use-gl=swiftshader',
                '--enable-unsafe-swiftshader'
            ]
        }
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

        page.eval_on_selector('.tab-button[data-tab="explorer"]', 'e => e.click()')
        page.wait_for_timeout(300)
        
        canvas = page.locator('#glCanvas')
        snapshot_baseline = canvas.screenshot()
        
        # Dispatch 50 high-frequency mouse moves & drag events
        box = canvas.bounding_box()
        if box:
            cx = box['x'] + box['width'] / 2.0
            cy = box['y'] + box['height'] / 2.0
            page.mouse.move(cx, cy)
            page.mouse.down()
            for step in range(30):
                page.mouse.move(cx + (step % 10) * 5, cy + (step % 5) * 5)
            page.mouse.up()
            page.mouse.wheel(0, -300)
        
        page.wait_for_timeout(200)
        snapshot_after_event = canvas.screenshot()
        
        diff_ratio = img_diff_ratio(snapshot_baseline, snapshot_after_event)
        
        record_check('EVENT-FLOODING-NO-PAGE-ERRORS', len(errors) == 0, len(errors), 0)
        record_check('EVENT-FLOODING-VISUAL-CANVAS-CAPTURED', len(snapshot_baseline) > 100, True, True)
        record_check('EVENT-FLOODING-VISUAL-DIFF-RATIO-VALID', diff_ratio <= 0.05, round(diff_ratio, 4), '<= 0.05')
        
        browser.close()
        
    failed = [c for c in checks if c['status'] == 'FAIL']
    if failed:
        print(f"\nEvent Flooding & Visual Suite Finished: {len(failed)} Checks Failed!")
        sys.exit(1)
    else:
        print("\nEvent Flooding & Visual Suite Finished: 100% Passed!")
        sys.exit(0)

if __name__ == '__main__':
    run_event_flooding_visual()
