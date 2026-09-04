#!/usr/bin/env node
/**
 * Builds a reproducible, minimal Chrome Web Store release ZIP from the
 * exact approved source — never a manual zip of the repository.
 *
 * Deliberately allowlist-based, not exclude-list-based: the staging
 * directory this script assembles only ever receives `manifest.json`,
 * the freshly-built `dist/`, and the three referenced icon PNGs. Every
 * repo-only file class (source `.ts`, tests, internal docs, `legacy/`,
 * `design.zip`, `.claude/`, `.git`, `node_modules`, ...) is therefore
 * structurally absent from the artifact by construction, not by a
 * filter that has to remember to exclude something new later. The
 * forbidden-file-class scan below is defense in depth on top of that,
 * not the primary safety mechanism.
 *
 * Cleanliness guard: only TRACKED files are required to match HEAD
 * (staged or unstaged changes to a tracked file both fail the build).
 * Untracked files — `.claude/` in particular, which is intentionally
 * never committed — are explicitly allowed to exist, since packaging
 * never reads from the working tree by exclude-list; it only ever
 * copies the small, named allowlist above.
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'release');
const STAGING_DIR = path.join(RELEASE_DIR, 'staging');
const ICON_NAMES = ['icon-16.png', 'icon-48.png', 'icon-128.png'];

// Matched against staged-package-relative paths (forward-slash, no
// leading "./") for the defense-in-depth scan in step 5, and against
// raw ZIP entry names for the post-creation verification in step 7.
const FORBIDDEN_PATTERNS = [
  /\.ts$/,
  /\.tsx$/,
  /\.map$/,
  /\.test\./,
  /(^|\/)\.git($|\/)/,
  /(^|\/)\.claude($|\/)/,
  /\.md$/,
  /\.zip$/,
  /(^|\/)node_modules($|\/)/,
];

function fail(message) {
  console.error(`\n[package] FAILED: ${message}\n`);
  process.exit(1);
}

function log(message) {
  console.log(`[package] ${message}`);
}

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT }).toString();
}

function run(command) {
  log(`$ ${command}`);
  execSync(command, { cwd: ROOT, stdio: 'inherit' });
}

/** Relative, forward-slash paths for every file under `dir`, for the forbidden-class scan. */
function listFilesRelative(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFilesRelative(path.join(dir, entry.name), rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

// 1. Tracked-tree cleanliness guard.
log('Checking tracked-tree cleanliness (untracked files, e.g. .claude/, are allowed)...');
const trackedStatus = git('status --porcelain --untracked-files=no');
if (trackedStatus.trim().length > 0) {
  console.error(trackedStatus);
  fail(
    'Tracked files differ from HEAD/index (staged or unstaged changes present). ' +
      'Commit or discard changes before packaging.'
  );
}

const headSha = git('rev-parse HEAD').trim();
log(`Building from commit ${headSha}`);

// 2. Remove stale output.
log('Removing stale dist/ and release/staging/...');
rmSync(DIST_DIR, { recursive: true, force: true });
rmSync(STAGING_DIR, { recursive: true, force: true });

// 3. Production build.
log('Running production build...');
run('npm run build');
if (!existsSync(DIST_DIR)) fail('dist/ was not produced by the build.');

// 4. Assemble the staging directory — allowlist copy only.
log('Assembling release/staging/...');
mkdirSync(STAGING_DIR, { recursive: true });

const manifestSrc = path.join(ROOT, 'manifest.json');
if (!existsSync(manifestSrc)) fail('manifest.json not found at repo root.');
cpSync(manifestSrc, path.join(STAGING_DIR, 'manifest.json'));

cpSync(DIST_DIR, path.join(STAGING_DIR, 'dist'), { recursive: true });

mkdirSync(path.join(STAGING_DIR, 'images'), { recursive: true });
for (const icon of ICON_NAMES) {
  const src = path.join(ROOT, 'images', icon);
  if (!existsSync(src)) fail(`Required icon missing: images/${icon}`);
  cpSync(src, path.join(STAGING_DIR, 'images', icon));
}

// 5. Validate every manifest-referenced local resource exists in the staged package.
log('Validating manifest-referenced resources...');
const manifest = JSON.parse(readFileSync(path.join(STAGING_DIR, 'manifest.json'), 'utf-8'));

const referencedPaths = [];
if (manifest.background?.service_worker) referencedPaths.push(manifest.background.service_worker);
if (manifest.action?.default_popup) referencedPaths.push(manifest.action.default_popup);
if (manifest.icons) referencedPaths.push(...Object.values(manifest.icons));
if (manifest.action?.default_icon) referencedPaths.push(...Object.values(manifest.action.default_icon));
for (const group of manifest.web_accessible_resources ?? []) {
  referencedPaths.push(...(group.resources ?? []));
}

const missingResources = referencedPaths.filter((p) => !existsSync(path.join(STAGING_DIR, p)));
if (missingResources.length > 0) {
  fail(`Manifest references resources missing from the staged package:\n${missingResources.map((m) => `  - ${m}`).join('\n')}`);
}
log(`All ${referencedPaths.length} manifest-referenced resources present.`);

// 6. Defense-in-depth scan of the staged package for forbidden file classes.
// Should always be empty given step 4's allowlist copy — this only
// guards against a future mistake in that allowlist itself.
log('Scanning staged package for forbidden file classes...');
const stagedFiles = listFilesRelative(STAGING_DIR);
const forbiddenStaged = stagedFiles.filter((f) => FORBIDDEN_PATTERNS.some((pattern) => pattern.test(f)));
if (forbiddenStaged.length > 0) {
  fail(`Forbidden file class(es) found in staged package:\n${forbiddenStaged.map((f) => `  - ${f}`).join('\n')}`);
}

// 7. Create the ZIP with manifest.json at its root — zip STAGING_DIR's
// contents, never the "staging" folder itself.
const version = manifest.version;
if (!version) fail('manifest.json has no version field.');

const zipPath = path.join(RELEASE_DIR, `boomrng-${version}.zip`);
rmSync(zipPath, { force: true });

log(`Creating ${path.relative(ROOT, zipPath)}...`);
const zip = new AdmZip();
zip.addLocalFolder(STAGING_DIR);

// Normalize every entry's timestamp to a fixed value so two packaging
// runs from the same commit produce a byte-identical ZIP. Without this,
// adm-zip stamps each entry with the file's real filesystem mtime — the
// moment *this specific build* happened to write it to disk — which
// necessarily differs between separate runs even when every file's
// actual content (confirmed via per-entry CRC-32) is identical. 1980-01-01
// is the epoch MS-DOS/ZIP date fields can represent at all (ZIP's
// traditional date encoding has no representation for anything earlier),
// so it's the natural "no real timestamp" choice — not a made-up
// metadata file, just a constant replacing an otherwise-nondeterministic
// value the format already carries for every entry.
const REPRODUCIBLE_TIMESTAMP = new Date('1980-01-01T00:00:00.000Z');
for (const entry of zip.getEntries()) {
  entry.header.time = REPRODUCIBLE_TIMESTAMP;
}

zip.writeZip(zipPath);

// 8. Post-creation package-level verification — read the actual ZIP back, don't trust the staging step alone.
log('Verifying the produced ZIP...');
const verifyZip = new AdmZip(zipPath);
const entries = verifyZip.getEntries().map((e) => e.entryName.replace(/\/$/, '')).filter((e) => e.length > 0);

if (entries.length === 0) fail('Produced ZIP is empty.');
if (!entries.includes('manifest.json')) fail('manifest.json is not at the ZIP root.');
if (entries.some((e) => e.startsWith('staging/') || e.startsWith('release/'))) {
  fail('ZIP entries carry a staging/ or release/ path prefix — manifest.json would not be at the archive root.');
}
for (const icon of ICON_NAMES) {
  if (!entries.includes(`images/${icon}`)) fail(`ZIP is missing images/${icon}`);
}
if (!entries.includes('dist/service-worker.js')) fail('ZIP is missing dist/service-worker.js');

const forbiddenInZip = entries.filter((e) => FORBIDDEN_PATTERNS.some((pattern) => pattern.test(e)));
if (forbiddenInZip.length > 0) {
  fail(`Forbidden file class(es) found inside the produced ZIP:\n${forbiddenInZip.map((f) => `  - ${f}`).join('\n')}`);
}

log(`ZIP verified: ${entries.length} entries, manifest.json at root, no forbidden classes.`);
log('');
log(`Artifact:    ${zipPath}`);
log(`Version:     ${version}`);
log(`Source SHA:  ${headSha}`);
