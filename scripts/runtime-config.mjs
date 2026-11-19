// 运行时配置的唯一解析点：sync-runtime / verify-runtime 共用。
// 基座 runtime-artifacts.config.json 只登记相对库名，可随源码公开；
// 本机真实路径放同目录 runtime-artifacts.local.json（gitignore），本地 targets 整体优先。
// 任何 vault 解析规则只在这里改一次。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(__dirname, "..");

const DEFAULT_ARTIFACTS = [
  { name: "main.js", source: "main.js" },
  { name: "manifest.json", source: "manifest.json" },
  { name: "styles.css", source: "styles.css" }
];

/** 读基座配置，再用同目录的本地覆盖文件覆盖；本地 targets 整体替换基座 targets。 */
export function loadConfig(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || root);
  const basePath = options.configPath
    ? path.resolve(options.configPath)
    : path.join(projectRoot, "runtime-artifacts.config.json");
  const base = readJson(basePath);
  const localPath = path.join(path.dirname(basePath), "runtime-artifacts.local.json");
  if (!fs.existsSync(localPath)) return base;
  const local = readJson(localPath);
  return {
    ...base,
    ...local,
    requiredArtifacts: local.requiredArtifacts ?? base.requiredArtifacts
  };
}

/** 解析配置里的 artifacts，source 统一按项目根解析。 */
export function runtimeArtifacts(cfg, projectRoot = root) {
  const list = Array.isArray(cfg.artifacts) && cfg.artifacts.length > 0
    ? cfg.artifacts
    : DEFAULT_ARTIFACTS;
  return list.map((item) => {
    if (typeof item === "string") {
      return { name: item, source: path.resolve(projectRoot, item) };
    }
    if (!item || typeof item !== "object" || typeof item.name !== "string" || item.name.length === 0) {
      throw new Error("Each runtime artifact needs a name.");
    }
    return {
      name: item.name,
      source: path.resolve(projectRoot, item.source || item.name)
    };
  });
}

/** 解析配置里的 targets；兼容 targets / vaults 两种键。 */
export function vaultTargets(cfg, pluginId) {
  if (!pluginId) throw new Error("Runtime config has no pluginId.");
  const rawTargets = Array.isArray(cfg.targets)
    ? cfg.targets
    : Array.isArray(cfg.vaults)
      ? cfg.vaults
      : [];
  return rawTargets.map((target) => normalizeTarget(target, pluginId));
}

/**
 * 解析 CLI / 配置里的单个目标。
 * - 相对名：~/Documents/<name>，可用 SC_VAULT_<NAME> 覆盖单个库；
 * - 绝对路径：按 vault 根解析；识别 .obsidian / plugins / <pluginId> 三种显式目录形态；
 * - 对象：{ vault } / { path } / { pluginDir }。
 */
export function resolveTarget(target, pluginId) {
  if (!pluginId) throw new Error("Runtime config has no pluginId.");
  if (typeof target === "string") {
    if (!target) throw new Error("Runtime target must not be empty.");
    return path.isAbsolute(target)
      ? resolveAbsoluteTarget(target, pluginId)
      : resolveRelativeVault(target, pluginId);
  }
  return normalizeTarget(target, pluginId);
}

function normalizeTarget(target, pluginId) {
  if (typeof target === "string") return resolveTarget(target, pluginId);
  if (!target || typeof target !== "object") throw new Error("Invalid runtime target.");
  if (typeof target.pluginDir === "string" && target.pluginDir.length > 0) {
    const dir = path.resolve(target.pluginDir);
    return {
      name: target.name || path.basename(dir) || pluginId,
      root: path.dirname(dir),
      dir
    };
  }
  const raw = target.vault ?? target.path;
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("Each runtime target needs vault, path, or pluginDir.");
  }
  const resolved = resolveTarget(raw, pluginId);
  return target.name ? { ...resolved, name: target.name } : resolved;
}

function resolveRelativeVault(name, pluginId) {
  const envKey = "SC_VAULT_" + name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const override = process.env[envKey];
  const vaultRoot = override ? path.resolve(override) : path.join(documentsBase(), name);
  return {
    name,
    root: vaultRoot,
    dir: path.join(vaultRoot, ".obsidian", "plugins", pluginId),
    envKey
  };
}

function resolveAbsoluteTarget(value, pluginId) {
  const resolved = path.resolve(value);
  const parts = resolved.split(path.sep);
  const last = (offset) => (parts[parts.length - offset] || "").toLowerCase();
  const id = pluginId.toLowerCase();

  // <vault>/.obsidian/plugins/<pluginId>
  if (last(1) === id && last(2) === "plugins" && last(3) === ".obsidian") {
    const vaultRoot = path.dirname(path.dirname(path.dirname(resolved)));
    return { name: path.basename(vaultRoot) || id, root: vaultRoot, dir: resolved };
  }
  // <vault>/.obsidian/plugins
  if (last(1) === "plugins" && last(2) === ".obsidian") {
    const vaultRoot = path.dirname(path.dirname(resolved));
    return { name: path.basename(vaultRoot) || id, root: vaultRoot, dir: path.join(resolved, pluginId) };
  }
  // <vault>/.obsidian
  if (last(1) === ".obsidian") {
    const vaultRoot = path.dirname(resolved);
    return { name: path.basename(vaultRoot) || id, root: vaultRoot, dir: path.join(resolved, "plugins", pluginId) };
  }
  // Plain vault root.
  return {
    name: path.basename(resolved) || id,
    root: resolved,
    dir: path.join(resolved, ".obsidian", "plugins", pluginId)
  };
}

function documentsBase() {
  if (process.env.OPENVAULT_PATH) return path.resolve(process.env.OPENVAULT_PATH);
  return path.join(os.homedir(), "Documents");
}

function readJson(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}
