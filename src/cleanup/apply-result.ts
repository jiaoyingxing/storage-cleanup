import {
  basename,
  contentTypeForPath,
  isHiddenPath,
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
  if (cleanup.action === "restore-trash") {
    return restoreFromTrash(result, cleanup);
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
    // `adapter.trashLocal()` flattens every file into the `.trash` root and keeps
    // only the basename, so the parent folder is dropped here too.
    const name = file.name || basename(file.path);
    const trashPath = `.trash/${name}`;
    trashByPath.set(trashPath, {
      path: trashPath,
      name,
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

/**
 * Puts restored entries back where the user chose. Restored folders keep their
 * whole subtree, so nested trash entries disappear together with their folder.
 * `restoredTo` is authoritative: `succeededPaths` may name a folder that never
 * appears in `trashFiles` (which only holds files), and a name clash can rewrite
 * the destination, so neither side can be derived from the other.
 * Hidden destinations go to "other" so the two buckets stay mutually exclusive.
 */
function restoreFromTrash(result: ScanResult, cleanup: CleanupResult): ScanResult {
  const sources = cleanup.succeededPaths.filter(
    (path) => cleanup.restoredTo?.[path] !== undefined
  );
  if (sources.length === 0) return result;

  const covers = (path: string): boolean =>
    sources.some((source) => path === source || path.startsWith(`${source}/`));
  const trashFiles = result.trashFiles.filter((file) => !covers(file.path));
  const contentFiles = [...result.contentFiles];
  const otherFiles = [...result.otherFiles];
  for (const source of sources) {
    const destination = cleanup.restoredTo?.[source];
    if (!destination) continue;
    const within = result.trashFiles.filter(
      (file) => file.path === source || file.path.startsWith(`${source}/`)
    );
    const size = within.reduce((sum, file) => sum + file.size, 0);
    const mtime = within.reduce((latest, file) => Math.max(latest, file.mtime), 0);
    const hidden = isHiddenPath(destination);
    const entry: FileEntry = {
      path: destination,
      name: basename(destination),
      size,
      mtime,
      category: hidden ? "other" : "content",
      contentType: hidden ? undefined : contentTypeForPath(destination)
    };
    if (hidden) {
      otherFiles.push(entry);
    } else {
      contentFiles.push(entry);
    }
  }

  const patched = rebuildContentAndTrash(result, contentFiles, trashFiles, result.trashExists);
  const other = summarizeFiles(otherFiles);
  return {
    ...patched,
    other,
    otherFiles,
    totalSize:
      patched.content.totalSize +
      patched.trash.totalSize +
      result.plugins.totalSize +
      result.config.totalSize +
      other.totalSize
  };
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
