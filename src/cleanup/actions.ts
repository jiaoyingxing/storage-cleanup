import type { App } from "obsidian";
import { isHiddenPath } from "../scan/aggregate";
import type { FileEntry } from "../scan/types";
import { isSafeContentPath, normalizeVaultPath } from "./candidates";

const MAX_FOLDER_DEPTH = 64;
const MTIME_TOLERANCE_MS = 1000;

export type CleanupActionKind = "move-to-trash" | "delete-empty-folders" | "empty-trash";

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
