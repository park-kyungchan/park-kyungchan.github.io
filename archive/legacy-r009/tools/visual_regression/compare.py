#!/usr/bin/env python3
"""Compare two capture_states.py output directories: pixels and probes.

Both directories must have been produced on the SAME machine by the same
harness run pair (base build vs head build). Comparing across machines is
meaningless here: GPU/font/rasteriser differences dwarf the gate thresholds.

Usage:
    python3 tools/visual_regression/compare.py BASE_DIR HEAD_DIR [--json OUT]
                                               [--ignore-probes]

Pixel gate (a pair fails if EITHER holds):
    differing pixels > MAX_DIFF_PIXELS   (any channel delta >= 1)
    max channel delta > MAX_CHANNEL_DELTA

Probe gate (runs when BOTH directories contain probes.json, unless
--ignore-probes is passed). A state fails if either holds:
    any of PROBE_FIELDS differs between base and head
    the head state recorded a non-empty console_errors list

A file present in BASE but missing from HEAD, or a size mismatch, is a failure.
A file present only in HEAD is reported as `new state` and does not fail the run:
a PR that adds a chapter legitimately adds states.
Exit code 0 = every pair inside both gates, 1 = at least one failure,
2 = HEAD dropped a state that BASE captured.
"""

import argparse
import json
import os
import sys

from PIL import Image, ImageChops

MAX_DIFF_PIXELS = 200
MAX_CHANNEL_DELTA = 16

PROBES_FILE = "probes.json"
# Semantic state recorded alongside each screenshot. A pixel-identical capture
# whose live guide or chapter navigation changed is still a regression.
PROBE_FIELDS = ("live_guide_title", "live_guide_body", "stage_context", "nav_count")


def pngs(directory):
    return sorted(f for f in os.listdir(directory) if f.endswith(".png"))


def load_probes(directory):
    """Return {screenshot filename: probe record}, or None if absent/unusable."""
    path = os.path.join(directory, PROBES_FILE)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    return {record["file"]: record for record in records if record.get("file")}


def compare_probes(base_probes, head_probes, names):
    """Return (rows, failures).

    rows is one dict per state; failures lists the state names that break the
    probe gate (a changed field, a console error in head, or a missing record).
    """
    rows = []
    failures = []
    for name in names:
        base = base_probes.get(name)
        head = head_probes.get(name)
        if base is None or head is None:
            side = "missing in base" if base is None else "missing in head"
            rows.append({"file": name, "changed_fields": [], "console_errors": [],
                         "status": "MISSING", "note": "probe record %s" % side})
            failures.append(name)
            continue
        changed = [
            {"field": field, "base": base.get(field), "head": head.get(field)}
            for field in PROBE_FIELDS
            if base.get(field) != head.get(field)
        ]
        errors = head.get("console_errors") or []
        status = "FAIL" if (changed or errors) else "ok"
        rows.append({"file": name, "changed_fields": changed,
                     "console_errors": errors, "status": status, "note": ""})
        if status == "FAIL":
            failures.append(name)
    return rows, failures


def print_probe_report(rows):
    width = max([len(r["file"]) for r in rows] + [len("file")])
    print("\n%-*s  %-8s %s" % (width, "file", "status", "detail"))
    print("-" * (width + 45))
    for row in rows:
        detail = row["note"]
        if row["changed_fields"]:
            detail = "; ".join(
                "%s: %r -> %r" % (item["field"], item["base"], item["head"])
                for item in row["changed_fields"]
            )
        if row["console_errors"]:
            joined = " | ".join(
                str(err.get("text", err)) if isinstance(err, dict) else str(err)
                for err in row["console_errors"]
            )
            detail = (detail + " ; " if detail else "") + "console: " + joined
        print("%-*s  %-8s %s" % (width, row["file"], row["status"], detail))


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
    parser.add_argument("--ignore-probes", action="store_true",
                        help="compare pixels only; skip the probes.json gate")
    args = parser.parse_args()

    base_files = pngs(args.base_dir)
    head_files = pngs(args.head_dir)

    only_base = sorted(set(base_files) - set(head_files))
    only_head = sorted(set(head_files) - set(base_files))

    rows = []
    failures = []

    for name in sorted(set(base_files) | set(head_files)):
        if name in only_head:
            rows.append({"file": name, "diff_pixels": None, "max_delta": None,
                         "status": "NEW", "note": "new state (head only)"})
            continue
        if name in only_base:
            rows.append({"file": name, "diff_pixels": None, "max_delta": None,
                         "status": "MISSING", "note": "missing from head"})
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

    base_probes = None if args.ignore_probes else load_probes(args.base_dir)
    head_probes = None if args.ignore_probes else load_probes(args.head_dir)
    probe_rows, probe_failures = [], []
    probes_compared = base_probes is not None and head_probes is not None
    if probes_compared:
        shared = sorted(set(base_files) & set(head_files))
        probe_rows, probe_failures = compare_probes(base_probes, head_probes, shared)

    summary = {
        "base_dir": args.base_dir,
        "head_dir": args.head_dir,
        "gate": {
            "max_diff_pixels": args.max_diff_pixels,
            "max_channel_delta": args.max_channel_delta,
            "probes": "compared" if probes_compared
                      else ("skipped (--ignore-probes)" if args.ignore_probes
                            else "skipped (probes.json missing)"),
            "probe_fields": list(PROBE_FIELDS),
        },
        "pairs": len(rows),
        "new_states": only_head,
        "failures": failures,
        "results": rows,
        "probe_failures": probe_failures,
        "probe_results": probe_rows,
    }
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(summary, fh, ensure_ascii=False, indent=2)
        print("\nwrote %s" % args.json_out)

    if not rows:
        print("\nFAIL: no PNGs to compare", file=sys.stderr)
        return 2
    if only_head:
        print("\nnew states (head only, not a failure): %s" % ", ".join(only_head))
    if only_base:
        print("\nFAIL: head dropped %d state(s) that base captured: %s"
              % (len(only_base), ", ".join(only_base)), file=sys.stderr)
        return 2

    if probes_compared:
        print_probe_report(probe_rows)
        print("\nprobe gate: %s unchanged and head console_errors empty"
              % ", ".join(PROBE_FIELDS))
        if probe_failures:
            print("FAIL: %d/%d states outside the probe gate: %s"
                  % (len(probe_failures), len(probe_rows),
                     ", ".join(probe_failures)), file=sys.stderr)
        else:
            print("PASS: %d/%d states inside the probe gate"
                  % (len(probe_rows), len(probe_rows)))
    elif args.ignore_probes:
        print("\nprobe gate: skipped (--ignore-probes)")
    else:
        print("\nprobe gate: skipped (%s missing from one or both directories)"
              % PROBES_FILE)

    print("\ngate: diff_pixels <= %d and max_delta <= %d"
          % (args.max_diff_pixels, args.max_channel_delta))
    if failures:
        print("FAIL: %d/%d pairs outside the gate: %s"
              % (len(failures), len(rows), ", ".join(failures)), file=sys.stderr)
    else:
        print("PASS: %d/%d pairs inside the gate" % (len(rows), len(rows)))
    return 1 if (failures or probe_failures) else 0


if __name__ == "__main__":
    raise SystemExit(main())
