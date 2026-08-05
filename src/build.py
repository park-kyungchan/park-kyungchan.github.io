#!/usr/bin/env python3
"""Forward build for the de-sedimented source tree.

Concatenates every part listed in manifest.json (in order, as raw bytes),
verifies the result against manifest["expected_sha256"], and writes it to every
output named in manifest["targets"] at the repository root:

    index.html                                                   GitHub Pages entry
    P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html  offline copy

Both files are the same bytes; the second is an intentional
offline-distribution duplicate, not a stale leftover.

Stdlib only.

Usage:
    python3 src/build.py            # assemble, verify, write the artifacts
    python3 src/build.py --check    # assemble, verify, compare against the
                                    # committed artifacts, write nothing
"""

import argparse
import hashlib
import json
import sys
import tempfile
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
REPO_ROOT = SRC_DIR.parent


def load_manifest():
    manifest_path = SRC_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    targets = manifest.get("targets")
    if not targets:
        # Backwards compatibility with the single-output manifest schema.
        targets = [manifest["target"]]
    return manifest["expected_sha256"], targets, manifest["parts"]


def assemble(parts):
    """Concatenate the part files as raw bytes, in manifest order."""
    chunks = []
    missing = []
    for name in parts:
        part_path = SRC_DIR / name
        if not part_path.is_file():
            missing.append(name)
            continue
        chunks.append(part_path.read_bytes())

    if missing:
        print("FAIL: missing part files:", file=sys.stderr)
        for name in missing:
            print(f"  - {name}", file=sys.stderr)
        raise SystemExit(2)

    return b"".join(chunks)


def dump_for_diagnosis(blob):
    """Park a failed assembly somewhere inspectable without touching the repo."""
    fd, path = tempfile.mkstemp(prefix="r010_failed_build_", suffix=".html")
    with open(fd, "wb") as fh:
        fh.write(blob)
    return path


def hash_guard(blob, expected):
    actual = hashlib.sha256(blob).hexdigest()
    if actual == expected:
        return actual
    dump = dump_for_diagnosis(blob)
    print("FAIL: assembled bytes do not match manifest expected_sha256.", file=sys.stderr)
    print(f"  expected: {expected}", file=sys.stderr)
    print(f"  actual:   {actual}", file=sys.stderr)
    print(f"  bytes:    {len(blob)}", file=sys.stderr)
    print(f"  assembly parked at: {dump}", file=sys.stderr)
    print(
        "  A part file was edited, reordered, or re-encoded. This build is a "
        "pure byte partition: the parts must concatenate to exactly the "
        "artifact recorded in manifest.json. If the change was intentional, "
        "update expected_sha256 in the same commit as the part edit.",
        file=sys.stderr,
    )
    print("  No artifact was written.", file=sys.stderr)
    raise SystemExit(1)


def cmd_build(expected, targets, parts):
    blob = assemble(parts)
    actual = hash_guard(blob, expected)
    for target in targets:
        (REPO_ROOT / target).write_bytes(blob)
    print(f"PASS  sha256={actual}  bytes={len(blob)}  parts={len(parts)}")
    for target in targets:
        print(f"      -> {REPO_ROOT / target}")
    return 0


def cmd_check(expected, targets, parts):
    """Verify the committed artifacts still match what src/ assembles to.

    Writes only to a temp file, never to the repository.
    """
    blob = assemble(parts)
    actual = hash_guard(blob, expected)

    tmp_dir = Path(tempfile.mkdtemp(prefix="r010_check_"))
    tmp_path = tmp_dir / "assembled.html"
    tmp_path.write_bytes(blob)

    drifted = []
    for target in targets:
        path = REPO_ROOT / target
        if not path.is_file():
            drifted.append((target, "missing", "-"))
            continue
        committed = path.read_bytes()
        if committed != blob:
            drifted.append(
                (target, hashlib.sha256(committed).hexdigest(), len(committed))
            )

    if drifted:
        print("FAIL: committed artifacts have drifted from src/.", file=sys.stderr)
        print(f"  assembled sha256: {actual}  bytes={len(blob)}", file=sys.stderr)
        for target, got, size in drifted:
            print(f"  - {target}: sha256={got} bytes={size}", file=sys.stderr)
        print(f"  assembly written to: {tmp_path}", file=sys.stderr)
        print(
            "  Run `python3 src/build.py` and commit the regenerated artifacts.",
            file=sys.stderr,
        )
        return 1

    print(f"PASS  sha256={actual}  bytes={len(blob)}  parts={len(parts)}")
    for target in targets:
        print(f"      == {target} (committed artifact matches assembly)")
    print(f"      (assembly written to {tmp_path}, repository untouched)")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Assemble the standalone artifact from src/ part files."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify the committed artifacts match the assembly; write nothing",
    )
    args = parser.parse_args(argv)

    manifest_path = SRC_DIR / "manifest.json"
    try:
        expected, targets, parts = load_manifest()
    except FileNotFoundError:
        print(f"FAIL: manifest not found: {manifest_path}", file=sys.stderr)
        return 2
    except (KeyError, ValueError) as exc:
        print(f"FAIL: malformed manifest {manifest_path}: {exc}", file=sys.stderr)
        return 2

    if args.check:
        return cmd_check(expected, targets, parts)
    return cmd_build(expected, targets, parts)


if __name__ == "__main__":
    raise SystemExit(main())
