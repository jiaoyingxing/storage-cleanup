#!/usr/bin/env node
// Locale 健康对账：死键 / 占位符对等 / 键集一致。
// 复用 obsidian-plugin-language-maintenance 的 copy-scan.mjs（与 check-docs.mjs
// 同一套 wrapper 惯例：先解析 skill 路径，找不到时明确跳过，不让公开克隆失败）。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(optionValue("--project") || process.cwd());
const scripts = resolveLocaleScripts();

if (!scripts) {
  console.log(
    "obsidian-plugin-language-maintenance not installed; skipping the locale check (public clone)."
  );
  process.exit(0);
}

if (!fs.existsSync(path.join(projectRoot, "src", "i18n"))) {
  console.log("src/i18n not present; skipping locale check.");
  process.exit(0);
}

run("copy-scan.mjs", ["--project", projectRoot, "--check-locales"]);

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(scripts, script), ...args], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveLocaleScripts() {
  const candidates = [
    process.env.OBSIDIAN_LANGUAGE_MAINTENANCE_SCRIPTS,
    path.join(os.homedir(), ".zcode", "skills", "obsidian-plugin-language-maintenance", "scripts"),
    path.join(os.homedir(), ".codex", "skills", "obsidian-plugin-language-maintenance", "scripts")
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "copy-scan.mjs"))) ?? null;
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}
