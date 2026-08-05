# P003 R009 Known Limitations

- Playwright touch profiles emulate touch; they are not evidence from an actual classroom touchscreen or pen.
- Only Chromium in the current environment was automated. Firefox and Safari/WebKit were not field-tested.
- The SwiftShader run did not expose `WEBGL_lose_context`. The context-lost/restored listener path was injected and verified, but an actual GPU loss remains unverified.
- Browser navigation to both `file://` and `localhost` was blocked by the execution sandbox administrator policy. The localhost server delivered byte-identical HTML, and the identical bytes were exercised through `page.set_content`; actual school-browser navigation remains field evidence.
- Surface-of-revolution meshes and mesh-plane intersection polylines are display approximations. Exact classification, values, and length data come from deterministic sources.
- Intermediate cylinder/cone surface-unfolding animation is explanatory interpolation; exact developments and endpoint lengths are authoritative. The cube fold path uses rigid hinge transforms.
- The sphere shortest surface path is labeled enrichment, not core assessment.
- Full WCAG 2.2 conformance, physical screen-reader/high-contrast combinations, empirical learning effects, and 20–30 minute classroom pacing were not established.
- Current status is `HOLD_FOR_USER_REVIEW`; no release or user GO is implied.
