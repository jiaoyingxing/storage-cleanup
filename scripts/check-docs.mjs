import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(optionValue("--project") || process.cwd());
const docsDir = path.join(projectRoot, "docs");

// 公开克隆没有 docs/，也不应要求本机文档 skill；开发仓仍照常跑文档契约与审计。
if (!fs.existsSync(docsDir)) {
  console.log(`docs/ not found under ${projectRoot}; skipping documentation gate (public clone).`);
  process.exit(0);
}

const scripts = resolveDocScripts();

if (!scripts) {
  console.error(
    [
      "obsidian-plugin-doc-sync scripts not found.",
      "Install the skill or set OBSIDIAN_DOC_SYNC_SCRIPTS.",
      "Expected: ~/.zcode/skills/obsidian-plugin-doc-sync/scripts"
    ].join("\n")
  );
  process.exit(2);
}

run("doc-contract-check.mjs", ["--project", projectRoot, "--living"]);
run("doc-audit.mjs", ["--project", projectRoot, "--recent-days", "7", "--strict-fields"]);

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(scripts, script), ...args], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveDocScripts() {
  const candidates = [
    process.env.OBSIDIAN_DOC_SYNC_SCRIPTS,
    path.join(os.homedir(), ".zcode", "skills", "obsidian-plugin-doc-sync", "scripts"),
    path.join(os.homedir(), ".codex", "skills", "obsidian-plugin-doc-sync", "scripts")
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "doc-contract-check.mjs"))) ?? null;
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}
