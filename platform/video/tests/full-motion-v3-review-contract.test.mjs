import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, statSync} from 'node:fs';
import test from 'node:test';

const videoRoot = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('media/manifest.json', videoRoot), 'utf8'));
const css = readFileSync(new URL('history/history.css', videoRoot), 'utf8');
const id = 'full-motion-review-v3-20260817t123945z';
const expectedSha256 = '2743c4a82124361921fc73fa8bb3ff905823896b060d97450e1724070e9ba31e';
const expectedBytes = 25_621_767;

test('full motion v3 is a selectable silent review without displacing the Drive full film', () => {
  assert.equal(manifest.active_generation, 'megastudy-15-full-film-20260817t133046z');

  const generation = manifest.generations.find((item) => item.id === id);
  assert.ok(generation, 'full-motion v3 generation must be registered');
  assert.equal(generation.artifact_label, 'SILENT_FULL_MOTION_REVIEW');
  assert.equal(generation.qa_status, 'PASS_SILENT_REVIEW_PUBLICATION');
  assert.equal(generation.release_approved, false);
  assert.equal(generation.duration_seconds, 515);
  assert.equal(generation.fps, 60);
  assert.equal(generation.width, 1920);
  assert.equal(generation.height, 1080);
  assert.equal(generation.silent, true);
  assert.equal(generation.bytes, expectedBytes);
  assert.equal(generation.sha256, expectedSha256);
  assert.equal(generation.source.url, './media/full-motion-review-v3-20260817T123945Z.mp4');
  assert.match(generation.summary, /리뷰/);
  assert.match(generation.summary, /릴리스.*아닙니다/);
  assert.match(css, /\.scope-badge\.silent_full_motion_review/);
});

test('full motion v3 public bytes match the reviewed assembly exactly', () => {
  const path = new URL('media/full-motion-review-v3-20260817T123945Z.mp4', videoRoot);
  const bytes = readFileSync(path);
  assert.equal(statSync(path).size, expectedBytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedSha256);
});

test('full motion v3 registration remains unique and public-safe', () => {
  assert.equal(manifest.generations.filter((item) => item.id === id).length, 1);
  const urls = manifest.generations.map((item) => item.source.url);
  assert.equal(new Set(urls).size, urls.length);
  const publicJson = JSON.stringify(manifest);
  assert.doesNotMatch(publicJson, /drive\.google\.com|\/opt\/data|orchestration\/runs|director.?notes/i);
});
