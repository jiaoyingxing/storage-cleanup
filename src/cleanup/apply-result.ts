import {
  basename,
  summarizeContentTypes,
  summarizeFiles,
  topFiles
} from "../scan/aggregate";
import type { FileEntry, ScanResult } from "../scan/types";
import type { CleanupResult } from "./actions";

const TOP_LIMIT = 20;

/**
 * Applies an already-finished cleanup to the last scan result so the focused
 * list can drop removed entries before the follow-up rescan finishes.
 */
export function applyCleanupResult(
  result: ScanResult,
  cleanup: CleanupResult
): ScanResult {
  if (cleanup.succeededPaths.length === 0) return result;

  if (cleanup.action === "move-to-trash") {
    return moveToTrash(result, cleanup.succeededPaths);
  }
  if (cleanup.action === "delete-empty-folders") {
    return removeEmptyFolders(result, cleanup.succeededPaths);
  }
  return removeTrashFiles(result, cleanup.succeededPaths);
}

function moveToTrash(result: ScanResult, paths: readonly string[]): ScanResult {
  const removed = new Set(paths);
  const movedFiles = result.contentFiles.filter((file) => removed.has(file.path));
  if (movedFiles.length === 0) return result;

  const contentFiles = result.contentFiles.filter((file) => !removed.has(file.path));
  const trashByPath = new Map(result.trashFiles.map((file) => [file.path, file]));
  for (const file of movedFiles) {
    const trashPath = `.trash/${file.path}`;
    trashByPath.set(trashPath, {
      path: trashPath,
      name: file.name || basename(file.path),
      size: file.size,
      mtime: file.mtime,
      category: "trash"
    });
  }
  return rebuildContentAndTrash(
    result,
    contentFiles,
    [...trashByPath.values()],
    true
  );
}

function removeEmptyFolders(result: ScanResult, paths: readonly string[]): ScanResult {
  const removed = unique(paths);
  if (removed.length === 0) return result;
  return {
    ...result,
    emptyFolders: result.emptyFolders.filter(
      (folder) => !removed.some((path) => folder === path || folder.startsWith(`${path}/`))
    )
  };
}

function removeTrashFiles(result: ScanResult, paths: readonly string[]): ScanResult {
  const removed = new Set(paths);
  const trashFiles = result.trashFiles.filter((file) => !removed.has(file.path));
  if (trashFiles.length === result.trashFiles.length) return result;
  return rebuildContentAndTrash(result, result.contentFiles, trashFiles, true);
}

function rebuildContentAndTrash(
  result: ScanResult,
  contentFiles: FileEntry[],
  trashFiles: FileEntry[],
  trashExists: boolean
): ScanResult {
  const content = summarizeFiles(contentFiles);
  const trash = summarizeFiles(trashFiles);
  return {
    ...result,
    content,
    trash,
    trashExists,
    contentFiles,
    trashFiles,
    contentTypes: summarizeContentTypes(contentFiles),
    topContentFiles: topFiles(contentFiles, TOP_LIMIT),
    topTrashFiles: topFiles(trashFiles, TOP_LIMIT),
    totalSize:
      content.totalSize +
      trash.totalSize +
      result.plugins.totalSize +
      result.config.totalSize +
      result.other.totalSize
  };
}

function unique(paths: readonly string[]): string[] {
  return [...new Set(paths)];
}
