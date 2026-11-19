#!/usr/bin/env node
// tag / Release 前的发布保护预检（模型 A：完整源码公开仓）。
// 复用 obsidian-plugin-release-protection 的 release-protection-check.mjs：
// 检查版本一致、构筑物齐全、sourcemap 缺席、疑似 secret、禁入路径。
// 与 check-docs.mjs 同一套 wrapper 惯例：skill 缺失时明确跳过，不让公开克隆失败。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(optionValue("--project") || process.cwd());
const scripts = resolveProtectionScripts();

if (!scripts) {
  console.log(
    "obsidian-plugin-release-protection not installed; skipping the release protection check (public clone)."
  );
  process.exit(0);
}

run("release-protection-check.mjs", [
  "--project", projectRoot,
  "--required-artifacts", "main.js,manifest.json,styles.css,versions.json"
]);

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(scripts, script), ...args], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveProtectionScripts() {
  const candidates = [
    process.env.OBSIDIAN_RUNTIME_PROTECTION_SCRIPTS,
    path.join(os.homedir(), ".zcode", "skills", "obsidian-plugin-release-protection", "scripts"),
    path.join(os.homedir(), ".codex", "skills", "obsidian-plugin-release-protection", "scripts")
  ].filter(Boolean);
  return candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "release-protection-check.mjs"))
  ) ?? null;
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}
