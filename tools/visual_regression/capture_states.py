#!/usr/bin/env python3
"""
Visual-regression capture harness for the standalone artifact.

Captures a deterministic screenshot matrix from a standalone HTML artifact and
writes a probes.json sidecar describing each captured state.

Usage:
    python3 tools/visual_regression/capture_states.py [OUTPUT_DIR] [HTML_PATH]

    OUTPUT_DIR  default: /tmp/baseline_r009/
    HTML_PATH   default: <repo root>/index.html

Pass HTML_PATH to capture a different build of the artifact (CI captures the
PR base and the PR head on the same runner and pixel-compares the two runs; see
tools/visual_regression/compare.py).

Setup:
    pip install -r requirements-ci.txt
    python3 -m playwright install --with-deps chromium-headless-shell

On a host where the browser's system libraries cannot be installed (no sudo),
extract them locally and point the loader at them instead:
    export LD_LIBRARY_PATH=/path/to/libs/usr/lib/x86_64-linux-gnu:/path/to/libs/lib/x86_64-linux-gnu

Determinism strategy
--------------------
1. The page is loaded via page.set_content() (not file://) so there is no
   network/disk-timing variance.
2. All CSS animations and transitions are disabled with an injected style tag
   AFTER load (injecting before load would be overwritten by the artifact's own
   stylesheet cascade order).
3. No play/autoplay button is ever clicked.
4. After every state change we wait SETTLE_MS (900ms). The artifact's canvas
   renderer keeps re-requesting frames while `performance.now() < effectUntil`,
   and the longest effect window in the artifact is 900ms, so waiting 900ms
   guarantees the transient-effect render loop has stopped.
5. As extra hardening, `performance.now()` is then frozen to a large constant.
   This (a) makes `performance.now() < effectUntil` permanently false so no
   further effect frames are scheduled, and (b) makes the artifact's single
   time-based visual, `pulse = .5+.5*sin(performance.now()/155)`, a constant.
   The freeze is applied AFTER settling so the captured frame is the settled
   state, not a state with transient effects pinned on.
6. Window is scrolled to top before every screenshot.
7. Each state group runs on a FRESH page so no state leaks across groups
   (e.g. a slider left at 1.0 must not contaminate a later chapter default).
"""

import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACT = str(REPO_ROOT / "index.html")
DEFAULT_OUT = "/tmp/baseline_r009/"

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}

# Longest transient effect window in the artifact is 900ms (see effectUntil).
SETTLE_MS = 900
# Time granted for a chapter to initialise (WebGL scene build) after a tab click.
TAB_SETTLE_MS = 1200
# Frames allowed to flush after the performance.now() freeze.
FREEZE_SETTLE_MS = 250
# Time granted for first paint after set_content.
LOAD_SETTLE_MS = 1500

NO_ANIM_CSS = "*,*::before,*::after{animation:none!important;transition:none!important}"

CHAPTERS = [
    "explorer", "generator", "net", "section", "euler",
    "soccer", "revolution", "revsection", "geodesic",
]

REVOLUTION_CYLINDER_PROGRESS = [0.0, 0.34, 0.62, 1.0]
REVOLUTION_EXTRA_PROFILES = ["frustum", "hollow_cylinder", "triple_stack"]
REVSECTION_PROGRESS = [0.0, 0.62, 1.0]
REVSECTION_EXTRA_CASES = ["CONE-OBLIQUE", "TORUS-AXIAL"]
GEODESIC_CASES = ["cube", "cylinder", "cone"]
GEODESIC_PROGRESS = [0.34, 1.0]


def ptag(value: float) -> str:
    """0.62 -> p062, 1.0 -> p100, 0.0 -> p000"""
    return "p%03d" % round(value * 100)


def slug(value: str) -> str:
    return value.lower().replace("-", "_").replace(" ", "_")


class Harness:
    def __init__(self, out_dir: str, artifact: str = DEFAULT_ARTIFACT):
        self.out_dir = out_dir
        self.artifact = artifact
        os.makedirs(out_dir, exist_ok=True)
        with open(artifact, encoding="utf-8") as fh:
            self.html = fh.read()
        self.probes = []
        self._errors = []

    # ---------- page lifecycle ----------

    def new_page(self, browser, viewport):
        page = browser.new_page(viewport=viewport)
        page.on(
            "console",
            lambda msg: self._errors.append(
                {"kind": "console", "text": msg.text}
            ) if msg.type == "error" else None,
        )
        page.on(
            "pageerror",
            lambda exc: self._errors.append({"kind": "pageerror", "text": str(exc)}),
        )
        page.set_content(self.html, wait_until="load")
        page.wait_for_timeout(LOAD_SETTLE_MS)
        # Dismiss the onboarding dialog.
        page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
        page.evaluate(
            """() => {
                const btn = Array.from(document.querySelectorAll('button'))
                    .find(b => b.textContent.trim() === '바로 탐구하기');
                if (btn && btn.offsetParent !== null) btn.click();
                document.querySelectorAll('dialog[open]').forEach(d => d.close());
            }"""
        )
        page.add_style_tag(content=NO_ANIM_CSS)
        page.wait_for_timeout(SETTLE_MS)
        return page

    # ---------- interactions ----------

    def click_tab(self, page, chapter):
        page.evaluate(
            "sel => document.querySelector(sel).click()", f'[data-tab="{chapter}"]'
        )
        page.wait_for_timeout(TAB_SETTLE_MS)

    def set_range(self, page, selector, value):
        page.evaluate(
            """({selector, value}) => {
                const el = document.querySelector(selector);
                if (!el) throw new Error('missing range ' + selector);
                el.value = String(value);
                el.dispatchEvent(new Event('input', {bubbles: true}));
            }""",
            {"selector": selector, "value": value},
        )
        page.wait_for_timeout(SETTLE_MS)

    def set_select(self, page, selector, value):
        page.evaluate(
            """({selector, value}) => {
                const el = document.querySelector(selector);
                if (!el) throw new Error('missing select ' + selector);
                el.value = value;
                if (el.value !== value) throw new Error('option not found: ' + value);
                el.dispatchEvent(new Event('change', {bubbles: true}));
            }""",
            {"selector": selector, "value": value},
        )
        page.wait_for_timeout(SETTLE_MS)

    def click_selector(self, page, selector):
        page.evaluate(
            """selector => {
                const el = document.querySelector(selector);
                if (!el) throw new Error('missing element ' + selector);
                el.click();
            }""",
            selector,
        )
        page.wait_for_timeout(SETTLE_MS)

    # ---------- capture ----------

    def capture(self, page, viewport_name, chapter, qualifier):
        name = "_".join(p for p in (viewport_name, chapter, qualifier) if p) + ".png"
        path = os.path.join(self.out_dir, name)

        # Freeze the clock so the pulse constant and effect loop are stable, then
        # let a couple of frames flush before grabbing the pixels.
        page.evaluate("() => { const T = 1e7; performance.now = () => T; }")
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(FREEZE_SETTLE_MS)

        page.screenshot(path=path, full_page=False)

        probe = page.evaluate(
            """() => {
                const txt = sel => {
                    const el = document.querySelector(sel);
                    return el ? el.textContent.trim() : null;
                };
                const title = txt('#liveGuideTitle');
                const body = txt('#liveGuideBody');
                return {
                    live_guide: [title, body].filter(v => v !== null).join(' | '),
                    live_guide_title: title,
                    live_guide_body: body,
                    stage_context: txt('#stageContextLabel'),
                    nav_count: document.querySelectorAll('.tab-button').length,
                };
            }"""
        )
        errors = list(self._errors)
        self._errors = []

        self.probes.append(
            {
                "file": name,
                "viewport": viewport_name,
                "chapter": chapter,
                "qualifier": qualifier,
                "live_guide": probe["live_guide"],
                "live_guide_title": probe["live_guide_title"],
                "live_guide_body": probe["live_guide_body"],
                "stage_context": probe["stage_context"],
                "nav_count": probe["nav_count"],
                "console_errors": errors,
            }
        )
        print("captured %s" % name, flush=True)

    # ---------- state groups ----------

    def group_chapter_defaults(self, browser, viewport, viewport_name):
        """Every chapter at its untouched default. No control is ever driven."""
        page = self.new_page(browser, viewport)
        for chapter in CHAPTERS:
            self.click_tab(page, chapter)
            self.capture(page, viewport_name, chapter, "default")
        page.close()

    def group_revolution(self, browser):
        page = self.new_page(browser, DESKTOP)
        self.click_tab(page, "revolution")

        self.set_select(page, "#revolutionProfileSelect", "cylinder")
        for value in REVOLUTION_CYLINDER_PROGRESS:
            self.set_range(page, "#revolutionProgress", value)
            self.capture(page, "desktop", "revolution", "cylinder_%s" % ptag(value))

        for profile in REVOLUTION_EXTRA_PROFILES:
            # Profile first: changing the profile may reset progress.
            self.set_select(page, "#revolutionProfileSelect", profile)
            self.set_range(page, "#revolutionProgress", 1.0)
            self.capture(page, "desktop", "revolution", "%s_%s" % (slug(profile), ptag(1.0)))
        page.close()

    def group_revsection_default(self, browser):
        """Default case swept, then the reveal state (reveal is captured LAST so
        it cannot contaminate any other revsection capture)."""
        page = self.new_page(browser, DESKTOP)
        self.click_tab(page, "revsection")
        case_id = page.evaluate(
            "() => document.querySelector('#revSectionCaseSelect').value"
        )
        print("revsection default case = %s" % case_id, flush=True)

        for value in REVSECTION_PROGRESS:
            self.set_range(page, "#revSectionProgress", value)
            self.capture(page, "desktop", "revsection", "%s_%s" % (slug(case_id), ptag(value)))

        # Still at progress 1.0 from the loop above.
        self.click_selector(page, "#revSectionReveal")
        self.capture(page, "desktop", "revsection", "%s_%s_reveal" % (slug(case_id), ptag(1.0)))
        page.close()

    def group_revsection_cases(self, browser):
        page = self.new_page(browser, DESKTOP)
        self.click_tab(page, "revsection")
        for case_id in REVSECTION_EXTRA_CASES:
            self.set_select(page, "#revSectionCaseSelect", case_id)
            self.set_range(page, "#revSectionProgress", 1.0)
            self.capture(page, "desktop", "revsection", "%s_%s" % (slug(case_id), ptag(1.0)))
        page.close()

    def group_geodesic(self, browser):
        page = self.new_page(browser, DESKTOP)
        self.click_tab(page, "geodesic")
        for case_id in GEODESIC_CASES:
            self.set_select(page, "#pathCaseSelect", case_id)
            # Mode after case: changing the case may reset the distance mode.
            self.click_selector(page, '[data-r9-distance-mode="surface"]')
            for value in GEODESIC_PROGRESS:
                self.set_range(page, "#pathProgress", value)
                self.capture(
                    page, "desktop", "geodesic",
                    "%s_surface_%s" % (slug(case_id), ptag(value)),
                )

        self.set_select(page, "#pathCaseSelect", "cube")
        self.click_selector(page, '[data-r9-distance-mode="edge"]')
        self.set_range(page, "#pathProgress", 1.0)
        self.capture(page, "desktop", "geodesic", "cube_edge_%s" % ptag(1.0))
        page.close()

    # ---------- driver ----------

    def run(self):
        print("artifact: %s (%d bytes)" % (self.artifact, len(self.html)), flush=True)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(args=["--enable-unsafe-swiftshader"])
            try:
                self.group_chapter_defaults(browser, DESKTOP, "desktop")
                self.group_revolution(browser)
                self.group_revsection_default(browser)
                self.group_revsection_cases(browser)
                self.group_geodesic(browser)
                self.group_chapter_defaults(browser, MOBILE, "mobile")
            finally:
                browser.close()

        probes_path = os.path.join(self.out_dir, "probes.json")
        with open(probes_path, "w", encoding="utf-8") as fh:
            json.dump(self.probes, fh, ensure_ascii=False, indent=2)
        print("wrote %s (%d states)" % (probes_path, len(self.probes)), flush=True)


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    artifact = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_ARTIFACT
    if not os.path.isfile(artifact):
        raise SystemExit("artifact not found: %s" % artifact)
    Harness(out_dir, artifact).run()


if __name__ == "__main__":
    main()
