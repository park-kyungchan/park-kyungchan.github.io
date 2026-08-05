#!/usr/bin/env python3
"""Pixel-compare two capture_states.py output directories.

Both directories must have been produced on the SAME machine by the same
harness run pair (base build vs head build). Comparing across machines is
meaningless here: GPU/font/rasteriser differences dwarf the gate thresholds.

Usage:
    python3 tools/visual_regression/compare.py BASE_DIR HEAD_DIR [--json OUT]

Gate (a pair fails if EITHER holds):
    differing pixels > MAX_DIFF_PIXELS   (any channel delta >= 1)
    max channel delta > MAX_CHANNEL_DELTA

A missing file on either side, or a size mismatch, is also a failure.
Exit code 0 = every pair inside the gate, 1 = at least one failure,
2 = the two directories do not describe the same state matrix.
"""

import argparse
import json
import os
import sys

from PIL import Image, ImageChops

MAX_DIFF_PIXELS = 200
MAX_CHANNEL_DELTA = 16


def pngs(directory):
    return sorted(f for f in os.listdir(directory) if f.endswith(".png"))


def compare_pair(base_path, head_path):
    """Return (differing_pixels, max_channel_delta, note)."""
    with Image.open(base_path) as base_img, Image.open(head_path) as head_img:
        if base_img.size != head_img.size:
            return None, None, "size %s != %s" % (base_img.size, head_img.size)
        base_rgb = base_img.convert("RGB")
        head_rgb = head_img.convert("RGB")
        diff = ImageChops.difference(base_rgb, head_rgb)

    bands = diff.split()
    max_delta = 0
    for band in bands:
        hist = band.histogram()
        for value in range(len(hist) - 1, 0, -1):
            if hist[value]:
                max_delta = max(max_delta, value)
                break

    mask = bands[0]
    for band in bands[1:]:
        mask = ImageChops.lighter(mask, band)
    differing = sum(mask.histogram()[1:])

    return differing, max_delta, ""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_dir")
    parser.add_argument("head_dir")
    parser.add_argument("--json", dest="json_out", default=None,
                        help="write the per-file summary as JSON")
    parser.add_argument("--max-diff-pixels", type=int, default=MAX_DIFF_PIXELS)
    parser.add_argument("--max-channel-delta", type=int, default=MAX_CHANNEL_DELTA)
    args = parser.parse_args()

    base_files = pngs(args.base_dir)
    head_files = pngs(args.head_dir)

    only_base = sorted(set(base_files) - set(head_files))
    only_head = sorted(set(head_files) - set(base_files))

    rows = []
    failures = []

    for name in sorted(set(base_files) | set(head_files)):
        if name in only_base or name in only_head:
            side = "base only" if name in only_base else "head only"
            rows.append({"file": name, "diff_pixels": None, "max_delta": None,
                         "status": "MISSING", "note": side})
            failures.append(name)
            continue
        differing, max_delta, note = compare_pair(
            os.path.join(args.base_dir, name), os.path.join(args.head_dir, name)
        )
        if note:
            rows.append({"file": name, "diff_pixels": None, "max_delta": None,
                         "status": "MISMATCH", "note": note})
            failures.append(name)
            continue
        over = (differing > args.max_diff_pixels
                or max_delta > args.max_channel_delta)
        rows.append({"file": name, "diff_pixels": differing,
                     "max_delta": max_delta,
                     "status": "FAIL" if over else "ok", "note": ""})
        if over:
            failures.append(name)

    width = max([len(r["file"]) for r in rows] + [len("file")])
    print("%-*s  %12s  %9s  %-8s %s"
          % (width, "file", "diff_pixels", "max_delta", "status", "note"))
    print("-" * (width + 45))
    for row in rows:
        print("%-*s  %12s  %9s  %-8s %s" % (
            width, row["file"],
            "-" if row["diff_pixels"] is None else row["diff_pixels"],
            "-" if row["max_delta"] is None else row["max_delta"],
            row["status"], row["note"],
        ))

    summary = {
        "base_dir": args.base_dir,
        "head_dir": args.head_dir,
        "gate": {
            "max_diff_pixels": args.max_diff_pixels,
            "max_channel_delta": args.max_channel_delta,
        },
        "pairs": len(rows),
        "failures": failures,
        "results": rows,
    }
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(summary, fh, ensure_ascii=False, indent=2)
        print("\nwrote %s" % args.json_out)

    if not rows:
        print("\nFAIL: no PNGs to compare", file=sys.stderr)
        return 2
    if only_base or only_head:
        print("\nFAIL: the two runs captured different state matrices",
              file=sys.stderr)
        return 2

    print("\ngate: diff_pixels <= %d and max_delta <= %d"
          % (args.max_diff_pixels, args.max_channel_delta))
    if failures:
        print("FAIL: %d/%d pairs outside the gate: %s"
              % (len(failures), len(rows), ", ".join(failures)), file=sys.stderr)
        return 1
    print("PASS: %d/%d pairs inside the gate" % (len(rows), len(rows)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
