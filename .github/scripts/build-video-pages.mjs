#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const sourceRoot = join(repoRoot, 'platform/video');
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
if (outputIndex < 0 || !args[outputIndex + 1]) throw new Error('OUTPUT_REQUIRED');
const outputRoot = resolve(repoRoot, args[outputIndex + 1]);
if (existsSync(outputRoot)) throw new Error(`NO_OVERWRITE: ${outputRoot}`);

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assertRegular = (path) => {
  const status = lstatSync(path);
  if (!status.isFile() || status.isSymbolicLink()) throw new Error(`SOURCE_NOT_REGULAR: ${path}`);
};
const assertInside = (base, path) => {
  const rel = relative(realpathSync(base), realpathSync(path));
  if (rel.startsWith('..' + sep) || rel === '..') throw new Error(`SOURCE_ESCAPE: ${path}`);
};
const copyVerified = (source, destination) => {
  assertRegular(source);
  mkdirSync(dirname(destination), {recursive: true});
  copyFileSync(source, destination);
  const sourceBytes = readFileSync(source);
  const copiedBytes = readFileSync(destination);
  if (sourceBytes.length !== copiedBytes.length || digest(sourceBytes) !== digest(copiedBytes)) {
    throw new Error(`COPY_VERIFICATION_FAILED: ${source}`);
  }
};

const historyManifestPath = join(sourceRoot, 'media/manifest.json');
const finalManifestPath = join(sourceRoot, 'media/final-manifest.json');
assertRegular(historyManifestPath);
assertRegular(finalManifestPath);
const historyManifestBytes = readFileSync(historyManifestPath);
const finalManifestBytes = readFileSync(finalManifestPath);
const historyManifest = JSON.parse(historyManifestBytes.toString('utf8'));
const finalManifest = JSON.parse(finalManifestBytes.toString('utf8'));

if (historyManifest.schema_version !== 2 || !Array.isArray(historyManifest.generations) || historyManifest.generations.length === 0) {
  throw new Error('HISTORY_MANIFEST_SCHEMA_MISMATCH');
}
if (!historyManifest.generations.some((entry) => entry.id === historyManifest.active_generation)) {
  throw new Error('ACTIVE_GENERATION_MISSING');
}
if (new Set(historyManifest.generations.map((entry) => entry.id)).size !== historyManifest.generations.length) {
  throw new Error('DUPLICATE_GENERATION_ID');
}

if (finalManifest.schema_version !== 1 || finalManifest.release_set !== 'MEGASTUDY_15_FINAL' || !Array.isArray(finalManifest.releases) || finalManifest.releases.length === 0) {
  throw new Error('FINAL_MANIFEST_SCHEMA_MISMATCH');
}
if (new Set(finalManifest.releases.map((entry) => entry.id)).size !== finalManifest.releases.length) {
  throw new Error('DUPLICATE_FINAL_ID');
}
for (const entry of finalManifest.releases) {
  if (entry.artifact_label !== 'FINAL_RELEASE' || entry.qa_status !== 'PASS_DRIVE_IMPORT_FULL_DECODE' || entry.release_approved !== true) {
    throw new Error(`FINAL_ONLY_CONTRACT_FAILED: ${entry.id}`);
  }
}

const publicSources = [
  'index.html',
  'portal.css',
  'portal.js',
  'history/index.html',
  'history/history.css',
  'history/history.js',
  'final/index.html',
  'final/final.css',
  'final/final.js',
];
const publicText = [
  ...publicSources.map((name) => readFileSync(join(sourceRoot, name), 'utf8')),
  historyManifestBytes.toString('utf8'),
  finalManifestBytes.toString('utf8'),
].join('\n');
if (/drive\.google\.com|director[_-]timeline|탐구Lab|탐구랩|입체도형/i.test(publicText)) {
  throw new Error('PUBLIC_PRIVACY_BOUNDARY_FAILED');
}

const mediaRoot = join(sourceRoot, 'media');
const mediaNames = new Set();
const collectMedia = (entries) => {
  for (const entry of entries) {
    if (entry.source?.kind !== 'video' || entry.source?.storage !== 'github-pages') {
      throw new Error(`SOURCE_CONTRACT_MISMATCH: ${entry.id}`);
    }
    const match = /^\.\/media\/([^/]+\.mp4)$/.exec(entry.source.url);
    if (!match) throw new Error(`SOURCE_URL_INVALID: ${entry.id}`);
    const mediaName = match[1];
    const mediaPath = join(mediaRoot, mediaName);
    if (!existsSync(mediaPath)) throw new Error(`SOURCE_MEDIA_MISSING: ${entry.id}`);
    assertInside(mediaRoot, mediaPath);
    assertRegular(mediaPath);
    const entryBytes = readFileSync(mediaPath);
    if (entry.bytes !== entryBytes.length) throw new Error(`SOURCE_BYTES_MISMATCH: ${entry.id}`);
    if (entry.sha256 !== digest(entryBytes)) throw new Error(`SOURCE_SHA256_MISMATCH: ${entry.id}`);
    mediaNames.add(mediaName);
  }
};
collectMedia(historyManifest.generations);
collectMedia(finalManifest.releases);

for (const name of publicSources) copyVerified(join(sourceRoot, name), join(outputRoot, name));
copyVerified(historyManifestPath, join(outputRoot, 'media/manifest.json'));
copyVerified(finalManifestPath, join(outputRoot, 'media/final-manifest.json'));
for (const mediaName of [...mediaNames].sort()) {
  copyVerified(join(mediaRoot, mediaName), join(outputRoot, 'media', mediaName));
}
writeFileSync(join(outputRoot, '.nojekyll'), '');

const relativeFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else relativeFiles.push(relative(outputRoot, path));
  }
};
walk(outputRoot);
const expectedFiles = [
  '.nojekyll',
  'final/final.css',
  'final/final.js',
  'final/index.html',
  'history/history.css',
  'history/history.js',
  'history/index.html',
  'index.html',
  'media/final-manifest.json',
  'media/manifest.json',
  'portal.css',
  'portal.js',
  ...[...mediaNames].sort().map((name) => `media/${name}`),
].sort();
relativeFiles.sort();
if (JSON.stringify(relativeFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`ARTIFACT_FILESET_MISMATCH: ${JSON.stringify(relativeFiles)}`);
}
const totalBytes = relativeFiles.reduce((sum, path) => sum + statSync(join(outputRoot, path)).size, 0);
console.log(JSON.stringify({
  status: 'PASS_VIDEO_ONLY_PAGES_BUILD',
  output: outputRoot,
  entry_routes: ['/final/', '/history/'],
  active_history_generation: historyManifest.active_generation,
  final_release_count: finalManifest.releases.length,
  history_manifest_sha256: digest(historyManifestBytes),
  final_manifest_sha256: digest(finalManifestBytes),
  media: [...mediaNames].sort(),
  file_count: relativeFiles.length,
  total_bytes: totalBytes,
}, null, 2));
