import type { App } from "obsidian";
import { TFolder } from "obsidian";
import {
  basename,
  configGroupForPath,
  contentTypeForPath,
  isHiddenPath,
  maxMtime,
  summarizeConfigGroups,
  summarizeContentTypes,
  summarizeFiles as summarize,
  topFiles
} from "./aggregate";
import type {
  FileEntry,
  PluginEntry,
  ScanError,
  ScanResult
} from "./types";

const TOP_LIMIT = 20;
const PLUGIN_TOP_LIMIT = 5;
const WALK_CONCURRENCY = 8;
const MAX_DEPTH = 64;
const MAX_ERRORS = 50;

interface FileStat {
  size: number;
  mtime: number;
}

interface ManifestInfo {
  name: string;
  version: string;
  author: string;
}

export async function scanStorage(app: App): Promise<ScanResult> {
  const startedAt = Date.now();
  const start = performance.now();
  const errors: ScanError[] = [];
  const configDir = app.vault.configDir;

  const contentFiles: FileEntry[] = [];
  const otherFiles: FileEntry[] = [];
  for (const file of app.vault.getFiles()) {
    if (file.path === ".trash" || file.path.startsWith(".trash/")) continue;
    if (file.path === configDir || file.path.startsWith(`${configDir}/`)) continue;
    const hidden = isHiddenPath(file.path);
    const entry: FileEntry = {
      path: file.path,
      name: file.name,
      size: file.stat?.size ?? 0,
      mtime: file.stat?.mtime ?? 0,
      category: hidden ? "other" : "content",
      contentType: hidden ? undefined : contentTypeForPath(file.path)
    };
    if (hidden) {
      otherFiles.push(entry);
    } else {
      contentFiles.push(entry);
    }
  }

  const trashExists = await safeExists(app, ".trash");
  const trashFiles: FileEntry[] = [];
  if (trashExists) {
    await walk(app, ".trash", 0, errors, (path, stat) => {
      trashFiles.push({
        path,
        name: basename(path),
        size: stat.size,
        mtime: stat.mtime,
        category: "trash"
      });
    });
  }

  const configFiles: FileEntry[] = [];
  const pluginFiles = new Map<string, FileEntry[]>();
  await walk(app, configDir, 0, errors, (path, stat) => {
    const relative = path.slice(configDir.length + 1);
    const pluginId = getPluginId(relative);
    const entry: FileEntry = {
      path,
      name: basename(path),
      size: stat.size,
      mtime: stat.mtime,
      category: pluginId ? "plugins" : "config",
      pluginId: pluginId ?? undefined,
      configGroup: pluginId ? undefined : configGroupForPath(path, configDir)
    };
    if (pluginId) {
      const files = pluginFiles.get(pluginId) ?? [];
      files.push(entry);
      pluginFiles.set(pluginId, files);
    } else {
      configFiles.push(entry);
    }
  });

  const pluginEntries = await buildPluginEntries(app, configDir, pluginFiles, errors);
  const plugins = {
    fileCount: pluginEntries.reduce((sum, plugin) => sum + plugin.fileCount, 0),
    totalSize: pluginEntries.reduce((sum, plugin) => sum + plugin.size, 0),
    entries: pluginEntries
  };

  const content = summarize(contentFiles);
  const trash = summarize(trashFiles);
  const config = summarize(configFiles);
  const other = summarize(otherFiles);
  const totalSize =
    content.totalSize + trash.totalSize + plugins.totalSize + config.totalSize + other.totalSize;
  const emptyFolders = await collectEmptyFolders(app, configDir, errors);

  return {
    vaultName: app.vault.getName(),
    configDir,
    startedAt,
    durationMs: performance.now() - start,
    content,
    trash,
    plugins,
    config,
    other,
    totalSize,
    trashExists,
    contentFiles,
    trashFiles,
    configFiles,
    otherFiles,
    emptyFolders,
    contentTypes: summarizeContentTypes(contentFiles),
    configGroups: summarizeConfigGroups(configFiles),
    topContentFiles: topFiles(contentFiles, TOP_LIMIT),
    topTrashFiles: topFiles(trashFiles, TOP_LIMIT),
    errors
  };
}

async function buildPluginEntries(
  app: App,
  configDir: string,
  pluginFiles: Map<string, FileEntry[]>,
  errors: ScanError[]
): Promise<PluginEntry[]> {
  const pluginRoot = `${configDir}/plugins`;
  let folders: string[] = [];
  try {
    const listed = await app.vault.adapter.list(pluginRoot);
    folders = listed.folders;
  } catch (error) {
    pushError(errors, pluginRoot, errorMessage(error));
  }

  const entries: PluginEntry[] = [];
  for (const folder of folders) {
    const id = basename(folder);
    const files = pluginFiles.get(id) ?? [];
    const manifest = await readManifest(app, `${folder}/manifest.json`, errors);
    entries.push({
      id,
      name: manifest?.name || id,
      version: manifest?.version || "?",
      author: manifest?.author || "",
      size: files.reduce((sum, file) => sum + file.size, 0),
      fileCount: files.length,
      mtime: maxMtime(files),
      topFiles: topFiles(files, PLUGIN_TOP_LIMIT),
      files
    });
  }

  return entries.sort((left, right) => right.size - left.size);
}

async function readManifest(
  app: App,
  path: string,
  errors: ScanError[]
): Promise<ManifestInfo | null> {
  try {
    const raw = await app.vault.adapter.read(path);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      version: typeof parsed.version === "string" ? parsed.version : "",
      author: typeof parsed.author === "string" ? parsed.author : ""
    };
  } catch (error) {
    pushError(errors, path, errorMessage(error));
    return null;
  }
}

async function walk(
  app: App,
  root: string,
  depth: number,
  errors: ScanError[],
  visit: (path: string, stat: FileStat) => void
): Promise<void> {
  if (depth > MAX_DEPTH) {
    pushError(errors, root, "maximum folder depth reached");
    return;
  }

  let listed: { files: string[]; folders: string[] };
  try {
    listed = await app.vault.adapter.list(root);
  } catch (error) {
    pushError(errors, root, errorMessage(error));
    return;
  }

  await mapLimit(listed.files, WALK_CONCURRENCY, async (path) => {
    try {
      const stat = await app.vault.adapter.stat(path);
      if (!stat) {
        pushError(errors, path, "stat returned null");
        return;
      }
      visit(path, { size: stat.size, mtime: stat.mtime });
    } catch (error) {
      pushError(errors, path, errorMessage(error));
    }
  });

  for (const folder of listed.folders) {
    await walk(app, folder, depth + 1, errors, visit);
  }
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const current = index;
        index += 1;
        await run(items[current]);
      }
    }
  );
  await Promise.all(workers);
}

async function safeExists(app: App, path: string): Promise<boolean> {
  try {
    return await app.vault.adapter.exists(path);
  } catch {
    return false;
  }
}

function getPluginId(relativePath: string): string | null {
  if (!relativePath.startsWith("plugins/")) return null;
  const rest = relativePath.slice("plugins/".length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return rest.slice(0, slash);
}

function collectEmptyFolders(
  app: App,
  configDir: string,
  errors: ScanError[]
): Promise<string[]> {
  const preliminary = findCandidateEmptyFolders(app, configDir);
  return filterEmptyFolders(app, preliminary, errors);
}

function findCandidateEmptyFolders(app: App, configDir: string): string[] {
  if (typeof app.vault.getAllLoadedFiles !== "function") return [];
  const protectedDirs = new Set<string>();
  const protectAncestors = (path: string): void => {
    let parent = parentPath(path);
    while (parent) {
      protectedDirs.add(parent);
      parent = parentPath(parent);
    }
  };

  for (const file of app.vault.getFiles()) {
    if (isExcludedPath(file.path, configDir)) continue;
    protectAncestors(file.path);
  }

  const folders = app.vault
    .getAllLoadedFiles()
    .filter((entry): entry is TFolder => entry instanceof TFolder);

  for (const folder of folders) {
    if (folder.path === "/" || isExcludedPath(folder.path, configDir)) continue;
    if (isHiddenPath(folder.path)) protectAncestors(folder.path);
  }
  protectAncestors(configDir);

  const chosen = new Set<string>();
  const emptyFolders: string[] = [];
  const candidates = folders
    .filter(
      (folder) =>
        folder.path !== "/" &&
        !isExcludedPath(folder.path, configDir) &&
        !isHiddenPath(folder.path) &&
        !protectedDirs.has(folder.path)
    )
    .sort(
      (left, right) =>
        pathDepth(left.path) - pathDepth(right.path) ||
        left.path.localeCompare(right.path, "zh-CN")
    );

  for (const folder of candidates) {
    if (hasChosenAncestor(folder.path, chosen)) continue;
    chosen.add(folder.path);
    emptyFolders.push(folder.path);
  }
  return emptyFolders;
}

async function filterEmptyFolders(
  app: App,
  paths: string[],
  errors: ScanError[]
): Promise<string[]> {
  const verified: string[] = [];
  for (const path of paths) {
    try {
      if (await isFolderEmptyOnDisk(app, path)) verified.push(path);
    } catch (error) {
      pushError(errors, path, errorMessage(error));
    }
  }
  return verified;
}

async function isFolderEmptyOnDisk(
  app: App,
  path: string,
  depth = 0
): Promise<boolean> {
  if (depth > MAX_DEPTH) return false;
  const listed = await app.vault.adapter.list(path);
  if (listed.files.length > 0) return false;
  for (const folder of listed.folders) {
    if (isHiddenPath(folder)) return false;
    if (!(await isFolderEmptyOnDisk(app, folder, depth + 1))) return false;
  }
  return true;
}

function isExcludedPath(path: string, configDir: string): boolean {
  return (
    path === ".trash" ||
    path.startsWith(".trash/") ||
    path === configDir ||
    path.startsWith(`${configDir}/`)
  );
}

function parentPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : "";
}

function pathDepth(path: string): number {
  return path.split("/").length;
}

function hasChosenAncestor(path: string, chosen: Set<string>): boolean {
  let parent = parentPath(path);
  while (parent) {
    if (chosen.has(parent)) return true;
    parent = parentPath(parent);
  }
  return false;
}

function pushError(errors: ScanError[], path: string, message: string): void {
  if (errors.length >= MAX_ERRORS) return;
  errors.push({ path, message });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
