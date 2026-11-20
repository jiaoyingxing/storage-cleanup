#!/usr/bin/env node
// 注释与声明面机械核对：注释里的文件路径、行号锚点、反引号符号、最低宿主版本。
// 复用 obsidian-plugin-source-maintenance 的 comment-lint（与 check-docs.mjs /
// check-locales.mjs / check-release.mjs 同一套 wrapper 惯例：skill 缺失时明确跳过，
// 不让公开克隆失败）。配置在 scripts/dev/comment-lint.config.json。
// 只查可检索事实，不判断注释承诺是否仍然成立——那部分仍靠人工 review。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(optionValue("--project") || process.cwd());
const tool = resolveCommentLint();

if (!tool) {
  console.log(
    "obsidian-plugin-source-maintenance not installed; skipping the comment check (public clone)."
  );
  process.exit(0);
}

const config = path.join(projectRoot, "scripts", "dev", "comment-lint.config.json");
if (!fs.existsSync(config)) {
  console.log(`comment-lint config not found: ${config}; skipping the comment check.`);
  process.exit(0);
}

run(tool, ["--project", projectRoot, "--config", config, "--jsdoc"]);

function run(cli, args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveCommentLint() {
  const candidates = [
    process.env.OBSIDIAN_SOURCE_MAINTENANCE_SCRIPTS,
    path.join(os.homedir(), ".zcode", "skills", "obsidian-plugin-source-maintenance", "scripts"),
    path.join(os.homedir(), ".codex", "skills", "obsidian-plugin-source-maintenance", "scripts")
  ].filter(Boolean);
  return (
    candidates
      .map((root) => path.join(root, "comment-lint", "cli.mjs"))
      .find((cli) => fs.existsSync(cli)) ?? null
  );
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}
