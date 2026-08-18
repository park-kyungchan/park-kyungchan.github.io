import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const historyRoot = new URL('history/', root);
const finalRoot = new URL('final/', root);
const manifest = JSON.parse(readFileSync(new URL('media/manifest.json', root), 'utf8'));
const finalManifest = JSON.parse(readFileSync(new URL('media/final-manifest.json', root), 'utf8'));
const landing = readFileSync(new URL('index.html', root), 'utf8');
const portalScript = readFileSync(new URL('portal.js', root), 'utf8');
const html = readFileSync(new URL('index.html', historyRoot), 'utf8');
const script = readFileSync(new URL('history.js', historyRoot), 'utf8');
const css = readFileSync(new URL('history.css', historyRoot), 'utf8');
const finalHtml = readFileSync(new URL('index.html', finalRoot), 'utf8');
const finalScript = readFileSync(new URL('final.js', finalRoot), 'utf8');
const finalCss = readFileSync(new URL('final.css', finalRoot), 'utf8');
const publicText = [
  ['index.html', landing],
  ['portal.js', portalScript],
  ['history/index.html', html],
  ['history/history.js', script],
  ['history/history.css', css],
  ['final/index.html', finalHtml],
  ['final/final.js', finalScript],
  ['final/final.css', finalCss],
  ['media/manifest.json', JSON.stringify(manifest)],
  ['media/final-manifest.json', JSON.stringify(finalManifest)],
];

const privateManifestKeys = [
  'director_timeline_url',
  'director_timeline_sha256',
  'drive_folder_url',
];

test('public manifest contains no private note or Drive package locator', () => {
  for (const entry of [...manifest.generations, ...finalManifest.releases]) {
    for (const key of privateManifestKeys) assert.equal(Object.hasOwn(entry, key), false, `${entry.id} exposes ${key}`);
  }
  assert.doesNotMatch(JSON.stringify([manifest, finalManifest]), /drive\.google\.com|director[-_]intent|directing_hypothesis|feedback_prompt/i);
});

test('public site contains no private note payload', () => {
  const notes = new URL('notes/', root);
  const noteFiles = existsSync(notes) ? readdirSync(notes).filter((name) => name.endsWith('.json')) : [];
  assert.deepEqual(noteFiles, []);
});

test('public UI and client expose only video playback and generation history', () => {
  for (const [path, text] of publicText) {
    assert.doesNotMatch(text, /의도 해석과 타임라인 연출 노트|Drive 검증 패키지 보기|drive-link|director_timeline|drive_folder_url/i, path);
  }
  for (const forbiddenId of ['director-summary', 'timeline-list', 'current-phase', 'fixed-list', 'creative-list', 'drive-link']) {
    assert.doesNotMatch(html, new RegExp(`id=["']${forbiddenId}["']`), forbiddenId);
  }
  assert.doesNotMatch(script, /loadDirectorNote|renderDirectorNote|activeTimeline|driveLink|timeupdate|seeked/);
  for (const requiredId of ['video-player', 'generation-list']) assert.match(html, new RegExp(`id=["']${requiredId}["']`));
});

test('public source tree contains no Drive folder URL', () => {
  for (const [path, text] of publicText) assert.doesNotMatch(text, /https:\/\/drive\.google\.com\/drive\/folders\//, path);
});
