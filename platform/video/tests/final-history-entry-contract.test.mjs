import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, statSync} from 'node:fs';
import test from 'node:test';

const videoRoot = new URL('../', import.meta.url);
const repoRoot = new URL('../../../', import.meta.url);
const readOptional = (url) => existsSync(url) ? readFileSync(url, 'utf8') : '';
const parseOptional = (url) => existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : null;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

const landing = readOptional(new URL('index.html', videoRoot));
const portalScript = readOptional(new URL('portal.js', videoRoot));
const historyHtml = readOptional(new URL('history/index.html', videoRoot));
const historyScript = readOptional(new URL('history/history.js', videoRoot));
const historyManifestPath = new URL('media/manifest.json', videoRoot);
const finalHtml = readOptional(new URL('final/index.html', videoRoot));
const finalScript = readOptional(new URL('final/final.js', videoRoot));
const finalManifestPath = new URL('media/final-manifest.json', videoRoot);
const finalManifest = parseOptional(finalManifestPath);
const builder = readOptional(new URL('.github/scripts/build-video-pages.mjs', repoRoot));

const expectedFinals = [
  {
    id: 'megastudy-15-final-part-1-20260817t233214z',
    title: 'Megastudy 15 Final · PART 1',
    bytes: 9_579_967,
    sha256: '4114dbebb8a88c1aae9dd2db3a82c112035ebb706b3da111c14306aea9100e67',
    duration_seconds: 205,
    source: './media/megastudy-15-final-part-1-20260817T233214Z.mp4',
  },
  {
    id: 'megastudy-15-final-part-2-20260818t002711z',
    title: 'Megastudy 15 Final · PART 2',
    bytes: 16_336_375,
    sha256: 'af0bb1b8b3b0f73d600f27f44a3c442f5bbd3dde48e039cda30c5767c95bb5c8',
    duration_seconds: 245,
    source: './media/megastudy-15-final-part-2-20260818T002711Z.mp4',
  },
];

test('root is a two-way Final and History entry, not a player', () => {
  assert.match(landing, /<title>수학교육 영상<\/title>/);
  assert.equal((landing.match(/data-entry=/g) || []).length, 2);
  assert.match(landing, /data-entry=["']final["'][^>]*href=["']\.\/final\/["']/);
  assert.match(landing, /data-entry=["']history["'][^>]*href=["']\.\/history\/["']/);
  assert.match(landing, />\s*Final\s*</);
  assert.match(landing, />\s*History\s*</);
  assert.doesNotMatch(landing, /id=["'](?:video-player|generation-list|final-list)["']/);
  assert.match(landing, /\.\/portal\.js/);
  assert.match(portalScript, /searchParams\.has\(['"]generation['"]\)/);
  assert.match(portalScript, /new URL\(['"]\.\/history\/['"]/);
});

test('History keeps the exact prior manifest and playback workflow behind /history/', () => {
  assert.ok(existsSync(historyManifestPath));
  assert.equal(digest(readFileSync(historyManifestPath)), 'da655c181f3227c0ee9d65ee84faf2afb086a1333307da684e34324f13278b74');
  assert.match(historyHtml, /<title>수학교육 영상 히스토리<\/title>/);
  assert.match(historyHtml, /id=["']video-player["']/);
  assert.match(historyHtml, /id=["']generation-list["']/);
  assert.match(historyHtml, /\.\/history\.js/);
  assert.match(historyScript, /fetch\(['"]\.\.\/media\/manifest\.json['"]/);
  assert.match(historyScript, /active_generation/);
  assert.match(historyScript, /selectGeneration/);
});

test('Final contains exactly the two user-designated completed parts', () => {
  assert.ok(finalManifest, 'final-manifest.json must exist');
  assert.equal(finalManifest.schema_version, 1);
  assert.equal(finalManifest.release_set, 'MEGASTUDY_15_FINAL');
  assert.equal(finalManifest.releases.length, 2);
  assert.deepEqual(finalManifest.releases.map((entry) => entry.id), expectedFinals.map((entry) => entry.id));

  for (const [index, expected] of expectedFinals.entries()) {
    const entry = finalManifest.releases[index];
    assert.equal(entry.title, expected.title);
    assert.equal(entry.part, index + 1);
    assert.equal(entry.artifact_label, 'FINAL_RELEASE');
    assert.equal(entry.qa_status, 'PASS_DRIVE_IMPORT_FULL_DECODE');
    assert.equal(entry.release_approved, true);
    assert.equal(entry.bytes, expected.bytes);
    assert.equal(entry.sha256, expected.sha256);
    assert.equal(entry.duration_seconds, expected.duration_seconds);
    assert.equal(entry.fps, 30);
    assert.equal(entry.width, 1920);
    assert.equal(entry.height, 1080);
    assert.equal(entry.silent, true);
    assert.equal(entry.source.kind, 'video');
    assert.equal(entry.source.storage, 'github-pages');
    assert.equal(entry.source.url, expected.source);

    const mediaPath = new URL(expected.source.replace('./', ''), videoRoot);
    assert.ok(existsSync(mediaPath), `${mediaPath.pathname} must exist`);
    assert.equal(statSync(mediaPath).size, expected.bytes);
    assert.equal(digest(readFileSync(mediaPath)), expected.sha256);
  }

  const publicFinal = JSON.stringify(finalManifest);
  assert.doesNotMatch(publicFinal, /REVIEW|CANARY|LEGACY|SOURCE_FULL_FILM|drive\.google\.com/i);
});

test('Final UI reads only the final manifest and exposes both completed players', () => {
  assert.match(finalHtml, /<title>수학교육 영상 · Final<\/title>/);
  assert.match(finalHtml, /id=["']final-list["']/);
  assert.match(finalHtml, /\.\/final\.js/);
  assert.match(finalScript, /\.\.\/media\/final-manifest\.json/);
  assert.doesNotMatch(finalScript, /['"]\.\.\/media\/manifest\.json['"]/);
  assert.match(finalScript, /document\.createElement\(['"]video['"]\)/);
});

test('Final is player-only and renders no release metadata', () => {
  assert.doesNotMatch(landing, /Megastudy 15|PART 1|PART 2|2 PARTS/);
  assert.doesNotMatch(finalHtml, /Megastudy 15|PART 1|PART 2|완성본만 모았습니다|SHA-256|1920×1080|30fps|무음/);
  for (const visibleMetadataHook of ['final-intro', 'final-copy', 'final-badge', 'final-meta', 'final-summary']) {
    assert.doesNotMatch(finalHtml, new RegExp(visibleMetadataHook));
    assert.doesNotMatch(finalScript, new RegExp(visibleMetadataHook));
  }
  assert.doesNotMatch(finalScript, /textContent\s*=\s*entry\.(?:title|summary)/);
  assert.doesNotMatch(finalScript, /duration_seconds\.toFixed|entry\.width|entry\.height|entry\.fps|SHA-256/);
});

test('Pages builder preserves an explicit Final/History allowlist', () => {
  for (const required of [
    'index.html',
    'portal.css',
    'portal.js',
    'history/index.html',
    'history/history.css',
    'history/history.js',
    'final/index.html',
    'final/final.css',
    'final/final.js',
    'media/manifest.json',
    'media/final-manifest.json',
  ]) assert.match(builder, new RegExp(required.replaceAll('.', '\\.')));
  assert.match(builder, /FINAL_RELEASE/);
  assert.match(builder, /release_approved/);
  assert.doesNotMatch(builder, /\*\.mp4/);
});
