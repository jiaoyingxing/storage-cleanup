import type { App } from "obsidian";
import { basename, isHiddenPath } from "../scan/aggregate";
import type { FileEntry } from "../scan/types";
import { isSafeContentPath, normalizeVaultPath } from "./candidates";

const MAX_FOLDER_DEPTH = 64;
const MTIME_TOLERANCE_MS = 1000;

export type CleanupActionKind =
  | "move-to-trash"
  | "delete-empty-folders"
  | "empty-trash"
  | "restore-trash";

/** Stable failure codes; the view maps them to the active language. */
export type CleanupFailureReason =
  | "not-allowed"
  | "missing"
  | "changed"
  | "not-empty"
  | "contains-hidden"
  | "error";

export interface CleanupFailure {
  path: string;
  status: "skipped" | "failed";
  reason: CleanupFailureReason;
  /** Original technical message for unexpected errors. */
  detail?: string;
}

export interface CleanupResult {
  action: CleanupActionKind;
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  freedBytes: number;
  succeededPaths: string[];
  failures: CleanupFailure[];
  /**
   * Restore-only: source `.trash` path → vault path actually written.
   * The destination can differ from the basename because name clashes get a
   * ` 2`, ` 3` suffix, so the optimistic list patch cannot guess it.
   */
  restoredTo?: Record<string, string>;
}

export async function moveFilesToTrash(
  app: App,
  files: readonly FileEntry[]
): Promise<CleanupResult> {
  const failures: CleanupFailure[] = [];
  const succeededPaths: string[] = [];
  let succeeded = 0;
  let freedBytes = 0;

  for (const file of files) {
    const path = normalizeVaultPath(file.path);
    if (!isSafeContentPath(path, app.vault.configDir)) {
      failures.push({ path, status: "skipped", reason: "not-allowed" });
      continue;
    }
    try {
      const stat = await app.vault.adapter.stat(path);
      if (!stat) {
        failures.push({ path, status: "skipped", reason: "missing" });
        continue;
      }
      if (
        stat.size !== file.size ||
        Math.abs(stat.mtime - file.mtime) > MTIME_TOLERANCE_MS
      ) {
        failures.push({ path, status: "skipped", reason: "changed" });
        continue;
      }
      await app.vault.adapter.trashLocal(path);
      succeeded += 1;
      succeededPaths.push(path);
      freedBytes += stat.size;
    } catch (error) {
      failures.push({
        path,
        status: "failed",
        reason: "error",
        detail: errorMessage(error)
      });
    }
  }

  return buildResult("move-to-trash", files.length, succeeded, failures, freedBytes, succeededPaths);
}

export async function deleteEmptyFolders(
  app: App,
  paths: readonly string[]
): Promise<CleanupResult> {
  const failures: CleanupFailure[] = [];
  const succeededPaths: string[] = [];
  let succeeded = 0;

  for (const rawPath of paths) {
    const path = normalizeVaultPath(rawPath);
    if (!isSafeContentPath(path, app.vault.configDir)) {
      failures.push({ path, status: "skipped", reason: "not-allowed" });
      continue;
    }
    try {
      if (!(await isFolderEmpty(app, path))) {
        failures.push({ path, status: "skipped", reason: "not-empty" });
        continue;
      }
      await deleteEmptyTree(app, path);
      succeeded += 1;
      succeededPaths.push(path);
    } catch (error) {
      if (error instanceof EmptyFolderTreeError) {
        failures.push({ path, status: "failed", reason: error.reason });
      } else {
        failures.push({
          path,
          status: "failed",
          reason: "error",
          detail: errorMessage(error)
        });
      }
    }
  }

  return buildResult("delete-empty-folders", paths.length, succeeded, failures, 0, succeededPaths);
}

export async function emptyTrash(
  app: App,
  trashFiles: readonly FileEntry[]
): Promise<CleanupResult> {
  const total = trashFiles.length;
  const freedBytes = trashFiles.reduce((sum, file) => sum + file.size, 0);
  try {
    if (await app.vault.adapter.exists(".trash")) {
      await app.vault.adapter.rmdir(".trash", true);
      await app.vault.adapter.mkdir(".trash");
    }
    return buildResult(
      "empty-trash",
      total,
      total,
      [],
      freedBytes,
      trashFiles.map((file) => normalizeVaultPath(file.path))
    );
  } catch (error) {
    return buildResult("empty-trash", total, 0, [
      { path: ".trash", status: "failed", reason: "error", detail: errorMessage(error) }
    ], 0, []);
  }
}

/**
 * Moves `.trash` entries back into the vault.
 *
 * Obsidian's own `trashLocal()` flattens every trashed file into `.trash/` and
 * keeps no record of the original parent folder, so the destination has to come
 * from the user. The caller passes one folder for the whole batch; name clashes
 * get the same ` 2`, ` 3` suffix the host itself uses, so nothing is overwritten.
 */
export async function restoreTrashItems(
  app: App,
  trashEntries: readonly FileEntry[],
  destinationDir: string
): Promise<CleanupResult> {
  const failures: CleanupFailure[] = [];
  const succeededPaths: string[] = [];
  const restoredTo: Record<string, string> = {};
  let succeeded = 0;

  const target = normalizeDestination(destinationDir);
  if (target === null) {
    return buildResult(
      "restore-trash",
      trashEntries.length,
      0,
      trashEntries.map((entry) => ({
        path: normalizeVaultPath(entry.path),
        status: "skipped" as const,
        reason: "not-allowed" as const
      })),
      0,
      []
    );
  }

  for (const entry of trashEntries) {
    const path = normalizeVaultPath(entry.path);
    if (!isTrashPath(path)) {
      failures.push({ path, status: "skipped", reason: "not-allowed" });
      continue;
    }
    try {
      if (!(await app.vault.adapter.exists(path))) {
        failures.push({ path, status: "skipped", reason: "missing" });
        continue;
      }
      if (target && !(await app.vault.adapter.exists(target))) {
        failures.push({ path, status: "skipped", reason: "missing" });
        continue;
      }
      const destination = await uniqueDestination(app, target, basename(path));
      await app.vault.adapter.rename(path, destination);
      succeeded += 1;
      succeededPaths.push(path);
      restoredTo[path] = destination;
    } catch (error) {
      failures.push({
        path,
        status: "failed",
        reason: "error",
        detail: errorMessage(error)
      });
    }
  }

  return {
    ...buildResult("restore-trash", trashEntries.length, succeeded, failures, 0, succeededPaths),
    restoredTo
  };
}

/** `.trash` root and its children are the only valid restore sources. */
function isTrashPath(path: string): boolean {
  return path === ".trash" || path.startsWith(".trash/");
}

/**
 * Normalizes the user-chosen folder into a vault-relative path.
 * `""` means the vault root. Returns null for paths that leave the safe area.
 */
function normalizeDestination(path: string): string | null {
  if (!path.trim()) return "";
  const normalized = normalizeVaultPath(path);
  if (!normalized) return null;
  if (normalized === ".trash" || normalized.startsWith(".trash/")) return null;
  if (normalized.split("/").some((segment) => segment === "..")) return null;
  return normalized;
}

/**
 * Picks a free name in `dir`, mirroring Obsidian's own collision rule:
 * `note.md` → `note 2.md` → `note 3.md`, keeping the extension in place.
 */
async function uniqueDestination(
  app: App,
  dir: string,
  name: string
): Promise<string> {
  const join = (leaf: string): string => (dir ? `${dir}/${leaf}` : leaf);
  let candidate = join(name);
  if (!(await app.vault.adapter.exists(candidate))) return candidate;

  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : "";
  for (let index = 2; index < 10000; index += 1) {
    candidate = join(`${base} ${index}${ext}`);
    if (!(await app.vault.adapter.exists(candidate))) return candidate;
  }
  throw new Error("no free name found");
}

async function isFolderEmpty(app: App, path: string, depth = 0): Promise<boolean> {
  if (depth > MAX_FOLDER_DEPTH) return false;
  const listed = await app.vault.adapter.list(path);
  if (listed.files.length > 0) return false;
  for (const folder of listed.folders) {
    if (isHiddenPath(folder)) return false;
    if (!(await isFolderEmpty(app, folder, depth + 1))) return false;
  }
  return true;
}

/** Internal error carrying a stable code for the remove-time recheck. */
class EmptyFolderTreeError extends Error {
  constructor(readonly reason: "not-empty" | "contains-hidden") {
    super(reason);
  }
}

async function deleteEmptyTree(app: App, path: string): Promise<void> {
  const listed = await app.vault.adapter.list(path);
  if (listed.files.length > 0) throw new EmptyFolderTreeError("not-empty");
  for (const folder of listed.folders) {
    if (isHiddenPath(folder)) throw new EmptyFolderTreeError("contains-hidden");
    if (!(await isFolderEmpty(app, folder))) {
      throw new EmptyFolderTreeError("not-empty");
    }
  }
  await app.vault.adapter.rmdir(path, true);
}

function buildResult(
  action: CleanupActionKind,
  total: number,
  succeeded: number,
  failures: CleanupFailure[],
  freedBytes: number,
  succeededPaths: string[]
): CleanupResult {
  return {
    action,
    total,
    succeeded,
    skipped: failures.filter((failure) => failure.status === "skipped").length,
    failed: failures.filter((failure) => failure.status === "failed").length,
    freedBytes,
    succeededPaths,
    failures
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
