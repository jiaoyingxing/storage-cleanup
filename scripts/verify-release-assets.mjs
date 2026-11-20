#!/usr/bin/env node
/**
 * Release asset readback: compare the published assets against the local
 * build, byte for byte.
 *
 * Why this exists
 * ---------------
 * Before this script every release ended with the same hand-run sequence:
 * `gh release view` to read asset sizes, `gh release download` each asset into
 * a temp directory, `sha256` both sides, and eyeball the result. That is a
 * five-minute manual step that nobody will re-run months later when a release
 * is questioned. This script makes the readback repeatable and gives it an
 * exit code. Adapted from easy-sync's verified implementation (2026-10-29).
 *
 * Usage
 * -----
 *   node scripts/verify-release-assets.mjs --tag 1.0.0
 *   node scripts/verify-release-assets.mjs --tag 1.0.0 --body-file <notes.md>
 *   node scripts/verify-release-assets.mjs --tag 1.0.0 --repo owner/name --dir <artifact dir>
 *
 * Preconditions: `gh` installed and authenticated; the local artifacts
 * (`main.js`, `manifest.json`, `styles.css`, `versions.json`) built from the
 * same commit.
 *
 * Exit codes: 0 all assets match, 1 any mismatch, 2 usage or environment error.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_REPO = "jiaoyingxing/storage-cleanup";
const EXPECTED_ASSETS = ["main.js", "manifest.json", "styles.css", "versions.json"];

function fail(message) {
  process.stderr.write(`verify-release-assets.mjs: ${message}\n`);
  process.exit(2);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
}

/** Release bodies are compared after CRLF normalization and outer trim. */
export function normalizeBody(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").trim();
}

/**
 * Pure comparison of local vs remote assets. `local` and `remote` are objects
 * keyed by asset name with `{ size, sha256 }`; a missing entry means the asset
 * was not found on that side.
 */
export function compareAssets(expected, local, remote) {
  return expected.map((name) => {
    const localEntry = local[name];
    const remoteEntry = remote[name];
    const base = {
      name,
      localSize: localEntry?.size ?? null,
      remoteSize: remoteEntry?.size ?? null,
      localSha: localEntry?.sha256 ?? null,
      remoteSha: remoteEntry?.sha256 ?? null,
    };
    if (!localEntry) return { ...base, ok: false, reason: "missing-local" };
    if (!remoteEntry) return { ...base, ok: false, reason: "missing-remote" };
    if (localEntry.size !== remoteEntry.size) return { ...base, ok: false, reason: "size-mismatch" };
    if (localEntry.sha256 !== remoteEntry.sha256) return { ...base, ok: false, reason: "sha-mismatch" };
    return { ...base, ok: true, reason: "ok" };
  });
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function describeLocal(filePath) {
  const stat = fs.statSync(filePath);
  return { size: stat.size, sha256: sha256File(filePath) };
}

function parseArgs(argv) {
  const options = { tag: undefined, repo: DEFAULT_REPO, dir: REPO_ROOT, bodyFile: undefined, keep: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) fail(`${token} needs a value`);
      i += 1;
      return value;
    };
    if (token === "--tag") options.tag = next();
    else if (token === "--repo") options.repo = next();
    else if (token === "--dir") options.dir = path.resolve(next());
    else if (token === "--body-file") options.bodyFile = path.resolve(next());
    else if (token === "--keep") options.keep = true;
    else if (token === "--help" || token === "-h") {
      process.stdout.write(
        "usage: node scripts/release/verify-release-assets.mjs --tag <tag> [--repo <owner/name>] [--dir <path>] [--body-file <path>] [--keep]\n",
      );
      process.exit(0);
    } else {
      fail(`unknown argument: ${token}`);
    }
  }
  if (!options.tag) fail("--tag is required (for example --tag 1.0.0)");
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  try {
    run("gh", ["auth", "status"]);
  } catch {
    fail("gh is not authenticated; run `gh auth login` first");
  }

  let release;
  try {
    release = JSON.parse(
      run("gh", [
        "release",
        "view",
        options.tag,
        "--repo",
        options.repo,
        "--json",
        "tagName,isDraft,isPrerelease,body,assets",
      ]),
    );
  } catch (error) {
    fail(`cannot read release ${options.tag} in ${options.repo}: ${String(error?.stderr ?? error?.message ?? error).trim()}`);
  }

  process.stdout.write(`release ${options.tag} (${options.repo}): draft=${release.isDraft} prerelease=${release.isPrerelease}\n`);

  const local = {};
  for (const name of EXPECTED_ASSETS) {
    const filePath = path.join(options.dir, name);
    if (!fs.existsSync(filePath)) {
      process.stdout.write(`local ${name}: missing at ${filePath}\n`);
      continue;
    }
    local[name] = describeLocal(filePath);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "storage-cleanup-release-"));
  const remote = {};
  try {
    for (const name of EXPECTED_ASSETS) {
      const listed = release.assets?.find((asset) => asset.name === name);
      if (!listed) {
        process.stdout.write(`remote ${name}: not attached to the release\n`);
        continue;
      }
      run("gh", [
        "release",
        "download",
        options.tag,
        "--repo",
        options.repo,
        "--pattern",
        name,
        "--dir",
        tempDir,
        "--clobber",
      ]);
      const downloaded = path.join(tempDir, name);
      if (!fs.existsSync(downloaded)) {
        process.stdout.write(`remote ${name}: download produced no file\n`);
        continue;
      }
      remote[name] = describeLocal(downloaded);
    }
  } finally {
    if (!options.keep) fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const rows = compareAssets(EXPECTED_ASSETS, local, remote);
  process.stdout.write("\nasset             local size  remote size  sha256  result\n");
  for (const row of rows) {
    const sizes = `${row.localSize ?? "-"}`.padStart(10) + `${row.remoteSize ?? "-"}`.padStart(13);
    const sha = row.ok ? "match" : row.reason === "ok" ? "match" : "MISMATCH";
    process.stdout.write(`${row.name.padEnd(17)}${sizes}  ${sha.padEnd(8)}${row.ok ? "PASS" : `FAIL (${row.reason})`}\n`);
  }

  let bodyOk = true;
  if (options.bodyFile) {
    const expected = normalizeBody(fs.readFileSync(options.bodyFile, "utf8"));
    const actual = normalizeBody(release.body);
    bodyOk = expected === actual;
    process.stdout.write(
      `release body: ${bodyOk ? "matches" : "MISMATCH"} ${options.bodyFile} (${expected.length} vs ${actual.length} chars after normalization)\n`,
    );
  }

  const failed = rows.filter((row) => !row.ok);
  if (failed.length > 0 || !bodyOk) {
    process.stdout.write(`\nFAIL: ${failed.length} asset(s) mismatched${bodyOk ? "" : " and release body differs"}\n`);
    process.exit(1);
  }
  process.stdout.write(`\nPASS: ${rows.length}/${rows.length} assets match, tag ${release.tagName}\n`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) main();
