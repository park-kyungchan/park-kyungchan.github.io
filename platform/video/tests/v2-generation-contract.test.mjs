import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, statSync} from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifestPath = new URL('media/manifest.json', root);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const activeGenerationId = 'megastudy-15-full-film-20260817t133046z';
const generationId = 'motion-canary-review-v2-20260816t224909z';
const videoName = 'motion-canary-review-v2-20260816T224909Z.mp4';
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('v2 remains in history after the full film becomes the newest generation', () => {
  assert.equal(manifest.active_generation, activeGenerationId);
  assert.equal(manifest.generations.length, 4);
  assert.deepEqual(
    manifest.generations.map((item) => item.id),
    [activeGenerationId, generationId, 'motion-canary-review-v1-20260816t195140z', 'storyboard15-emergency-silent-animatic-1080p60'],
  );
  const generation = manifest.generations.find((item) => item.id === generationId);
  assert.equal(generation.artifact_label, 'REVIEW_CANARY');
  assert.equal(generation.qa_status, 'PASS_REVIEW_PUBLICATION');
  assert.equal(generation.release_approved, false);
  assert.equal(generation.duration_seconds, 27);
  assert.equal(generation.fps, 60);
  assert.equal(generation.width, 1920);
  assert.equal(generation.height, 1080);
  assert.equal(generation.silent, true);
  assert.match(generation.summary, /x축/);
  assert.match(generation.summary, /f\(x\)·dx/);
  assert.equal(Object.hasOwn(generation, 'drive_folder_url'), false);
  assert.equal(Object.hasOwn(generation, 'director_timeline_url'), false);
  assert.equal(Object.hasOwn(generation, 'director_timeline_sha256'), false);
});

test('v2 public MP4 is hash-bound without private note or Drive metadata', () => {
  const generation = manifest.generations.find((item) => item.id === generationId);
  assert.ok(generation);
  const videoPath = new URL(`media/${videoName}`, root);
  assert.equal(existsSync(videoPath), true, `missing ${videoName}`);
  assert.equal(generation.source.url, `./media/${videoName}`);
  assert.equal(generation.bytes, statSync(videoPath).size);
  assert.equal(generation.sha256, sha256(videoPath));
  assert.doesNotMatch(JSON.stringify(generation), /drive\.google\.com|director_timeline|directing_hypothesis|feedback_prompt/i);
});
