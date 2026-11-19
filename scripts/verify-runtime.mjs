import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { loadConfig, root, runtimeArtifacts, vaultTargets } from "./runtime-config.mjs";

const projectRoot = path.resolve(optionValue("--project") || root);
const json = process.argv.includes("--json");
const allowFewer = process.argv.includes("--allow-fewer");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Storage Cleanup runtime verification

Usage:
  npm run verify:runtime
  node scripts/verify-runtime.mjs --config <runtime-artifacts.config.json>

Options:
  --project       Plugin source root. Defaults to the repository root.
  --config        Runtime config. Defaults to ./runtime-artifacts.config.json.
  --allow-fewer   Allow fewer than three targets (for temporary test configs).
  --json          Machine-readable output.

Compares each configured artifact against <vault>/.obsidian/plugins/<pluginId>/
with SHA-256. Missing vaults are skipped with a warning; missing plugin directories,
missing artifacts, and hash mismatches fail the run.
`);
  process.exit(0);
}

let config;
try {
  config = loadConfig({ projectRoot, configPath: optionValue("--config") || undefined });
} catch (error) {
  fail(error.message);
}

const pluginId = config.pluginId || readManifestId(projectRoot);
if (!pluginId) fail("Runtime config has no pluginId and manifest.json has no id.");

let artifacts;
try {
  artifacts = runtimeArtifacts(config, projectRoot);
} catch (error) {
  fail(error.message);
}

let targets;
try {
  targets = vaultTargets(config, pluginId);
} catch (error) {
  fail(error.message);
}
if (targets.length === 0) fail("Runtime config has no targets.");
if (!allowFewer && targets.length < 3) {
  fail(`Expected at least 3 runtime targets, found ${targets.length}. Use --allow-fewer for temporary configs.`);
}

const required = Array.isArray(config.requiredArtifacts)
  ? config.requiredArtifacts
  : artifacts.map((artifact) => artifact.name);
for (const name of required) {
  if (!artifacts.some((artifact) => artifact.name === name)) {
    fail(`Required artifact is not declared: ${name}`);
  }
}

const warnings = [];
const issues = [];
const results = [];

for (const target of targets) {
  const result = {
    name: target.name,
    root: target.root,
    dir: target.dir,
    status: "PASS",
    artifacts: [],
    skipped: []
  };
  results.push(result);

  if (!fs.existsSync(target.root)) {
    result.status = "SKIP";
    const message = `vault missing, skipped: ${target.root}`;
    warnings.push({ target: target.root, issue: message });
    result.skipped.push(message);
    continue;
  }

  if (!fs.existsSync(target.dir)) {
    result.status = "FAIL";
    issues.push({ target: target.dir, artifact: "", issue: "plugin directory missing" });
    continue;
  }

  for (const artifact of artifacts) {
    if (!fs.existsSync(artifact.source)) {
      result.status = "FAIL";
      issues.push({ target: target.dir, artifact: artifact.name, issue: `source missing: ${artifact.source}` });
      continue;
    }
    const targetPath = path.join(target.dir, artifact.name);
    if (!fs.existsSync(targetPath)) {
      result.status = "FAIL";
      issues.push({ target: target.dir, artifact: artifact.name, issue: "target missing" });
      continue;
    }
    const sourceHash = sha256(artifact.source);
    const targetHash = sha256(targetPath);
    if (sourceHash !== targetHash) {
      result.status = "FAIL";
      issues.push({
        target: target.dir,
        artifact: artifact.name,
        issue: `hash mismatch (source ${sourceHash.slice(0, 12)}, target ${targetHash.slice(0, 12)})`
      });
      continue;
    }
    result.artifacts.push({ name: artifact.name, hash: sourceHash });
  }
}

if (json) {
  console.log(JSON.stringify({ pluginId, targets: results, warnings, issues }, null, 2));
} else {
  console.log(`Runtime verification: ${targets.length} target(s), ${artifacts.length} artifact(s)`);
  for (const result of results) {
    console.log(`${result.status} ${result.dir}`);
    for (const artifact of result.artifacts) {
      console.log(`  ${artifact.name} ${artifact.hash.slice(0, 12)}`);
    }
    for (const message of result.skipped) {
      console.log(`  ! ${message}`);
    }
  }
  for (const issue of issues) {
    console.log(`  x ${issue.target}${issue.artifact ? ` :: ${issue.artifact}` : ""}: ${issue.issue}`);
  }
}

process.exit(issues.length === 0 ? 0 : 1);

function readManifestId(directory) {
  try {
    return JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")).id;
  } catch {
    return "";
  }
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}

function fail(message) {
  console.error(message);
  process.exit(2);
}
