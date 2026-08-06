#!/usr/bin/env python3
"""Build a deterministic P003 R009 candidate ZIP with manifest and checksums."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
ROOT_NAME = ROOT.name
STANDALONE = 'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'
FIXED_DATE = (1980, 1, 1, 0, 0, 0)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def role_for(rel: str) -> str:
    if rel == STANDALONE: return 'student_standalone'
    if rel.startswith('source/'): return 'editable_source'
    if rel.startswith('data/'): return 'exact_or_state_data'
    if rel.startswith('tests/'): return 'test_source'
    if rel.startswith('audit/'): return 'machine_audit'
    if rel.startswith('docs/'): return 'documentation'
    if rel.startswith('parent_baseline/'): return 'immutable_parent_reference'
    if rel.startswith('tools/'): return 'build_or_launch_tool'
    if rel.startswith('evidence/baseline/'): return 'baseline_failure_evidence'
    if rel.startswith('evidence/candidate/'): return 'candidate_visual_evidence'
    if rel.startswith('evidence/motion_frames/'): return 'motion_frame_evidence'
    if rel.startswith('evidence/'): return 'review_evidence'
    return 'payload'


def payload_files() -> list[Path]:
    excluded = {'manifest.json', 'checksums.sha256'}
    return sorted(
        (p for p in ROOT.rglob('*') if p.is_file() and p.name not in excluded and '__pycache__' not in p.parts and not p.name.endswith('.pyc')),
        key=lambda p: p.relative_to(ROOT).as_posix(),
    )


def write_integrity() -> tuple[list[Path], dict]:
    files = payload_files()
    entries = []
    for p in files:
        rel = p.relative_to(ROOT).as_posix()
        entries.append({'path': rel, 'bytes': p.stat().st_size, 'sha256': sha256(p), 'role': role_for(rel)})
    standalone = ROOT / STANDALONE
    manifest = {
        'schema_version': 'P003-R009-MANIFEST-1.0',
        'artifact_id': 'P003_R009_Integrated_Spatial_Revolution_Lab',
        'candidate_status': 'HOLD_FOR_USER_REVIEW',
        'user_go': 'NONE',
        'build_date': '2026-08-05',
        'root_directory': ROOT_NAME,
        'parent_baseline': {
            'artifact': 'P003_R008_Two_Panel_Spatial_Lab',
            'pack_sha256': 'ee7f7660bf3b87dcbb803f2dbe17816458c9aa5b50aef30630b297e914962115',
            'standalone_sha256': '6072923d14e6fdce1826627a0e58e1c7a16b625c7b1265c6e5496630c9c76787',
            'role': 'IMMUTABLE_ADVERSARIAL_BASELINE / NOT_USER_GO',
        },
        'primary_standalone': {
            'path': STANDALONE,
            'bytes': standalone.stat().st_size,
            'sha256': sha256(standalone),
            'role': 'student_standalone',
        },
        'release_profiles_requested': ['STUDENT_DIRECT_USE','CLASSROOM_TOUCHSCREEN','LOCAL_OFFLINE_WEB_APP','WEB_ACCESSIBLE_REVIEW'],
        'runtime_external_requests_expected': 0,
        'image_gen': 'NOT_APPLICABLE_NO_IMAGE_GEN',
        'promotion': 'NONE',
        'payload_file_count': len(entries),
        'pack_file_count_including_integrity': len(entries) + 2,
        'files': entries,
    }
    manifest_path = ROOT / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    checksum_paths = files + [manifest_path]
    lines = [f'{sha256(p)}  {p.relative_to(ROOT).as_posix()}' for p in sorted(checksum_paths, key=lambda p: p.relative_to(ROOT).as_posix())]
    (ROOT / 'checksums.sha256').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return files, manifest


def build_zip(output: Path) -> dict:
    _, manifest = write_integrity()
    all_files = sorted((p for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and not p.name.endswith('.pyc')), key=lambda p: p.relative_to(ROOT).as_posix())
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists(): output.unlink()
    with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
        for path in all_files:
            rel = path.relative_to(ROOT).as_posix()
            arc = f'{ROOT_NAME}/{rel}'
            info = ZipInfo(arc, date_time=FIXED_DATE)
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            mode = 0o755 if path.suffix == '.py' else 0o644
            info.external_attr = (mode & 0xFFFF) << 16
            info.flag_bits |= 0x800
            z.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    return {
        'output': str(output), 'bytes': output.stat().st_size, 'sha256': sha256(output),
        'pack_file_count': len(all_files), 'payload_file_count': manifest['payload_file_count'],
        'standalone_sha256': manifest['primary_standalone']['sha256'],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('output', nargs='?', default=str(ROOT.parent / f'{ROOT_NAME}.zip'))
    args = parser.parse_args()
    print(json.dumps(build_zip(Path(args.output).resolve()), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
