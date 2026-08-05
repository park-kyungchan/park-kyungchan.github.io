# P003 R009 Dependencies and Licenses

## Student runtime

- No external JavaScript framework, CDN, web font, analytics, API, or network asset.
- Browser-native HTML, CSS, JavaScript, WebGL 1, Canvas 2D, Pointer Events, and `<dialog>`.
- Runtime external request expectation: **0**.

## Build and QA only

- Python 3 standard library — deterministic data/build/packaging scripts.
- Playwright for Python — automated browser evidence; not bundled into the student runtime.
- Pillow — screenshot difference/contact-sheet utilities; not bundled into the student runtime.
- FFmpeg/ffprobe — motion evidence encoding and inspection; not bundled into the student runtime.
- System Chromium/SwiftShader — automated evidence environment; not a distributed dependency.

No third-party runtime source is copied into the Standalone. Tool licenses remain those of the installed tools; this Pack does not redistribute their binaries.
