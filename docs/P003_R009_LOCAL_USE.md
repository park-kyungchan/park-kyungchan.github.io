# P003 R009 Local Use

## Direct Standalone

Open `P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html` in a browser that permits local HTML files. The file contains its CSS, JavaScript, exact data, and geometry data; no network asset is required.

The current execution sandbox blocks `file://` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`, so this mode remains field-unverified here.

## Localhost

From the candidate folder:

```bash
python tools/serve_local.py --port 8000
```

Then open:

```text
http://127.0.0.1:8000/P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html
```

The server-delivery test confirmed that localhost returns byte-identical Standalone bytes with SHA-256 `cd985d66bf5a63c55cab8832b5b3a191b5b0df076585ab91102519805b67223a`. Browser navigation to localhost was also administrator-blocked in this sandbox and remains a field check.

## Recommended classroom preflight

1. Open the artifact on the actual device and browser.
2. Test touch orbit, pinch/＋− zoom, and reset.
3. Run chapters 7–9 while moving the camera during autoplay.
4. Switch tabs rapidly, reset during playback, rotate the device, and return from a hidden tab.
5. Confirm no external requests are required under the school network policy.
