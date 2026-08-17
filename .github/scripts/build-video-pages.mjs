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
  copyFileSync(source, destination);
  const sourceBytes = readFileSync(source);
  const copiedBytes = readFileSync(destination);
  if (sourceBytes.length !== copiedBytes.length || digest(sourceBytes) !== digest(copiedBytes)) {
    throw new Error(`COPY_VERIFICATION_FAILED: ${source}`);
  }
};

const manifestPath = join(sourceRoot, 'media/manifest.json');
assertRegular(manifestPath);
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
if (manifest.schema_version !== 2 || !Array.isArray(manifest.generations) || manifest.generations.length === 0) {
  throw new Error('MANIFEST_SCHEMA_MISMATCH');
}
if (!manifest.generations.some((entry) => entry.id === manifest.active_generation)) {
  throw new Error('ACTIVE_GENERATION_MISSING');
}
if (new Set(manifest.generations.map((entry) => entry.id)).size !== manifest.generations.length) {
  throw new Error('DUPLICATE_GENERATION_ID');
}

const publicSources = ['index.html', 'history.css', 'history.js'];
const publicText = publicSources.map((name) => readFileSync(join(sourceRoot, name), 'utf8')).join('\n') + manifestBytes.toString('utf8');
if (/drive\.google\.com|director[_-]timeline|탐구Lab|탐구랩|입체도형/i.test(publicText)) {
  throw new Error('PUBLIC_PRIVACY_BOUNDARY_FAILED');
}

const mediaRoot = join(sourceRoot, 'media');
const mediaNames = new Set();
for (const entry of manifest.generations) {
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

mkdirSync(join(outputRoot, 'media'), {recursive: true});
for (const name of publicSources) copyVerified(join(sourceRoot, name), join(outputRoot, name));
copyVerified(manifestPath, join(outputRoot, 'media/manifest.json'));
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
  'history.css',
  'history.js',
  'index.html',
  'media/manifest.json',
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
  active_generation: manifest.active_generation,
  manifest_sha256: digest(manifestBytes),
  media: [...mediaNames].sort(),
  file_count: relativeFiles.length,
  total_bytes: totalBytes,
}, null, 2));
