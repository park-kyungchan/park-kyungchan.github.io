import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('media/manifest.json', root), 'utf8'));
const html = readFileSync(new URL('index.html', root), 'utf8');
const script = readFileSync(new URL('history.js', root), 'utf8');

const sha256 = /^[a-f0-9]{64}$/;
const qaStatuses = new Set(['PASS_DRIVE_IMPORT_DECODE', 'PASS_REVIEW_PUBLICATION', 'LEGACY_UNVERIFIED', 'FINAL_RELEASE']);
const artifactLabels = new Set(['SOURCE_FULL_FILM', 'REVIEW_CANARY', 'LEGACY_REVIEW', 'FINAL_RELEASE']);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('manifest v2 preserves a selectable generation history', () => {
  assert.equal(manifest.schema_version, 2);
  assert.ok(Array.isArray(manifest.generations));
  assert.ok(manifest.generations.length >= 2);
  assert.equal(new Set(manifest.generations.map((entry) => entry.id)).size, manifest.generations.length);
  assert.ok(manifest.generations.some((entry) => entry.id === manifest.active_generation));
});

test('history excludes the unrelated four-second launch preview', () => {
  assert.equal(manifest.generations.length, 4);
  assert.ok(!manifest.generations.some((entry) => entry.id === 'launch-2026-08-16'));
  assert.doesNotMatch(JSON.stringify(manifest), /초기 4초 런치 프리뷰/);
});

test('every generation is scope-labelled and artifact-bound', () => {
  for (const entry of manifest.generations) {
    assert.match(entry.id, /^[a-z0-9][a-z0-9._-]+$/);
    assert.ok(artifactLabels.has(entry.artifact_label));
    assert.ok(qaStatuses.has(entry.qa_status));
    assert.match(entry.sha256, sha256);
    assert.ok(Number.isFinite(entry.bytes) && entry.bytes > 0);
    assert.ok(Number.isFinite(entry.duration_seconds) && entry.duration_seconds > 0);
    assert.ok(Number.isInteger(entry.fps) && entry.fps > 0);
    assert.ok(Number.isInteger(entry.width) && entry.width > 0);
    assert.ok(Number.isInteger(entry.height) && entry.height > 0);
    assert.equal(entry.source.kind, 'video');
    assert.equal(typeof entry.source.url, 'string');
    assert.ok(entry.source.url.length > 0);
    assert.equal(typeof entry.published_at_utc, 'string');
  }
});

test('the active full film exposes no private package locator', () => {
  const active = manifest.generations.find((entry) => entry.id === manifest.active_generation);
  assert.equal(active.artifact_label, 'SOURCE_FULL_FILM');
  assert.equal(active.qa_status, 'PASS_DRIVE_IMPORT_DECODE');
  assert.equal(active.release_approved, true);
  assert.equal(Object.hasOwn(active, 'director_timeline_url'), false);
  assert.equal(Object.hasOwn(active, 'director_timeline_sha256'), false);
  assert.equal(Object.hasOwn(active, 'drive_folder_url'), false);
});

test('public video is hash-bound without private package metadata', () => {
  const active = manifest.generations.find((entry) => entry.id === manifest.active_generation);
  const videoBytes = readFileSync(new URL(active.source.url.replace('./', ''), root));
  assert.equal(digest(videoBytes), active.sha256);
  assert.doesNotMatch(JSON.stringify(active), /drive\.google\.com|director_timeline/i);
});

test('video page exposes only public playback and history hooks', () => {
  for (const id of ['video-player', 'generation-list']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /history\.js/);
  assert.match(html, /history\.css/);
});

test('history client selects public generations without private note loading', () => {
  assert.match(script, /active_generation/);
  assert.match(script, /selectGeneration/);
  assert.doesNotMatch(script, /director_timeline|drive_folder_url|loadDirectorNote/);
});
