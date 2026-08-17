import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, statSync} from 'node:fs';
import test from 'node:test';

const videoRoot = new URL('../', import.meta.url);
const repoRoot = new URL('../../../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('media/manifest.json', videoRoot), 'utf8'));
const html = readFileSync(new URL('index.html', videoRoot), 'utf8');
const css = readFileSync(new URL('history.css', videoRoot), 'utf8');
const workflow = readFileSync(new URL('.github/workflows/deploy.yml', repoRoot), 'utf8');
const builder = readFileSync(new URL('.github/scripts/build-video-pages.mjs', repoRoot), 'utf8');
const readme = readFileSync(new URL('README.md', repoRoot), 'utf8');
const generationId = 'megastudy-15-full-film-20260817t133046z';
const videoName = 'megastudy-15-full-film-20260817T133046Z.mp4';
const expectedSha256 = '436b93e94b15b32671aa36220c8cbbb29799a45761c3e477e186675e3944cc3b';
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('Pages deploys only the math-education video app at the site root', () => {
  assert.match(workflow, /^name: Deploy math education videos to GitHub Pages$/m);
  assert.match(workflow, /^\s+path: _site$/m);
  assert.match(workflow, /node \.github\/scripts\/build-video-pages\.mjs --output _site/);
  assert.doesNotMatch(workflow, /\*\.mp4/);
  assert.doesNotMatch(workflow, /^\s+path: platform(?:\/video)?$/m);
  assert.doesNotMatch(workflow, /탐구Lab|탐구랩|solid-geometry/i);
  assert.doesNotMatch(html, /탐구Lab|탐구랩|\.\.\/index\.html|입체도형/i);
  assert.match(html, /<title>수학교육 영상 히스토리<\/title>/);
  assert.match(html, /<h1>수학교육 영상 · 히스토리<\/h1>/);
  assert.match(readme, /video-only GitHub Pages/i);
  assert.doesNotMatch(readme, /입체도형 탐구 Lab|서로 독립된 두 진입점|탐구Lab Hub/);
  for (const token of ['source.url', 'createHash', 'entry.bytes', 'entry.sha256', 'copyFileSync', 'NO_OVERWRITE']) {
    assert.match(builder, new RegExp(token.replace('.', '\\.')));
  }
  assert.doesNotMatch(builder, /\*\.mp4/);
});

test('the Drive-selected full film remains the active hash-bound public generation', () => {
  assert.equal(manifest.active_generation, generationId);
  assert.equal(manifest.generations.length, 5);
  assert.equal(manifest.generations[0].id, generationId);
  const entry = manifest.generations[0];
  assert.equal(entry.title, 'Megastudy 15 Full Film');
  assert.equal(entry.artifact_label, 'SOURCE_FULL_FILM');
  assert.equal(entry.qa_status, 'PASS_DRIVE_IMPORT_DECODE');
  assert.equal(entry.release_approved, true);
  assert.equal(entry.duration_seconds, 300);
  assert.equal(entry.fps, 30);
  assert.equal(entry.width, 1920);
  assert.equal(entry.height, 1080);
  assert.equal(entry.silent, true);
  assert.equal(entry.bytes, 14752094);
  assert.equal(entry.sha256, expectedSha256);
  assert.equal(entry.source.url, `./media/${videoName}`);
  const videoPath = new URL(`media/${videoName}`, videoRoot);
  assert.equal(existsSync(videoPath), true);
  assert.equal(statSync(videoPath).size, entry.bytes);
  assert.equal(digest(videoPath), expectedSha256);
  assert.doesNotMatch(JSON.stringify(entry), /drive\.google\.com|packr0723|director_timeline/i);
  assert.match(css, /\.scope-badge\.source_full_film/);
});
