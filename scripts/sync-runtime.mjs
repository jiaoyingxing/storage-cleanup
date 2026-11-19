import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { loadConfig, resolveTarget, root, runtimeArtifacts, vaultTargets } from "./runtime-config.mjs";

const projectRoot = path.resolve(optionValue("--project") || root);
const dryRun = process.argv.includes("--dry-run");
const json = process.argv.includes("--json");
const cliTargets = valuesAfter("--target");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Storage Cleanup runtime sync

Usage:
  npm run sync:runtime
  npm run sync:runtime -- --dry-run
  node scripts/sync-runtime.mjs --target <vault-or-plugin-dir> [--target ...]

Options:
  --dry-run     Report actions without writing.
  --target      Override config targets; repeatable. Accepts a vault name,
                vault path, .obsidian path, plugins dir, or plugin dir.
  --config      Use another runtime-artifacts config.
  --project     Plugin source root. Defaults to the repository root.
  --json        Machine-readable output.

Targets come from runtime-artifacts.config.json plus runtime-artifacts.local.json
(local targets win). Relative vault names resolve to <Documents>/<name>; set
OPENVAULT_PATH to move the Documents base, or SC_VAULT_<NAME> to override one vault.
The copy only writes main.js / manifest.json / styles.css into
<vault>/.obsidian/plugins/<pluginId>/; it never touches data.json, enabled state,
or the host.
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

const required = Array.isArray(config.requiredArtifacts)
  ? config.requiredArtifacts
  : artifacts.map((artifact) => artifact.name);
for (const name of required) {
  if (!artifacts.some((artifact) => artifact.name === name)) {
    fail(`Required artifact is not declared: ${name}`);
  }
}

let targets;
try {
  targets = cliTargets.length > 0
    ? cliTargets.map((target) => resolveTarget(target, pluginId))
    : vaultTargets(config, pluginId);
} catch (error) {
  fail(error.message);
}
if (targets.length === 0) fail("Runtime config has no targets.");

const warnings = [];
const issues = [];
const results = [];

for (const target of targets) {
  const result = {
    name: target.name,
    root: target.root,
    dir: target.dir,
    copied: [],
    skipped: []
  };
  results.push(result);

  if (!fs.existsSync(target.root)) {
    const message = `vault missing, skipped (not created): ${target.root}`;
    warnings.push({ target: target.root, issue: message });
    result.skipped.push(message);
    continue;
  }

  for (const artifact of artifacts) {
    if (!fs.existsSync(artifact.source)) {
      const message = `built artifact missing: ${artifact.source}`;
      issues.push({ target: target.dir, artifact: artifact.name, issue: message });
      continue;
    }
    const destination = path.join(target.dir, artifact.name);
    if (dryRun) {
      console.log(`[dry] ${target.name}: ${artifact.name} -> ${destination}`);
      result.copied.push({ name: artifact.name, destination, dryRun: true });
      continue;
    }
    try {
      fs.mkdirSync(target.dir, { recursive: true });
      fs.copyFileSync(artifact.source, destination);
      console.log(`[ok] ${target.name}: ${artifact.name}`);
      result.copied.push({ name: artifact.name, destination });
    } catch (error) {
      issues.push({ target: target.dir, artifact: artifact.name, issue: error.message });
    }
  }
}

if (json) {
  console.log(JSON.stringify({ pluginId, dryRun, targets: results, warnings, issues }, null, 2));
} else {
  console.log(
    `\nsync ${dryRun ? "(dry-run) " : ""}done: ${targets.length} target(s), ${artifacts.length} artifact(s)`
  );
  for (const warning of warnings) console.log(`  ! ${warning.issue}`);
  for (const issue of issues) console.log(`  x ${issue.target} :: ${issue.artifact}: ${issue.issue}`);
}

process.exit(issues.length === 0 ? 0 : 1);

function readManifestId(directory) {
  try {
    return JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")).id;
  } catch {
    return "";
  }
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}

function valuesAfter(flag) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}
