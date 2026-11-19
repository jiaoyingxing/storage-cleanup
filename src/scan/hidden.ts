import { basename, isHiddenPath } from "./aggregate";
import {
  errorMessage,
  mapLimit,
  MAX_DEPTH,
  pushError,
  WALK_CONCURRENCY
} from "./adapter";
import type { ScanAdapter } from "./adapter";
import type { FileEntry, ScanError } from "./types";

export function isExcludedPath(path: string, configDir: string): boolean {
  return (
    path === ".trash" ||
    path.startsWith(".trash/") ||
    path === configDir ||
    path.startsWith(`${configDir}/`)
  );
}

export async function scanHiddenEntries(
  adapter: ScanAdapter,
  configDir: string,
  errors: ScanError[]
): Promise<FileEntry[]> {
  const entries = new Map<string, FileEntry>();
  await walkHidden(adapter, "", 0, configDir, errors, entries);
  return [...entries.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

async function walkHidden(
  adapter: ScanAdapter,
  root: string,
  depth: number,
  configDir: string,
  errors: ScanError[],
  entries: Map<string, FileEntry>
): Promise<void> {
  if (depth > MAX_DEPTH) {
    pushError(errors, root, "maximum folder depth reached");
    return;
  }

  let listed: { files: string[]; folders: string[] };
  try {
    listed = await adapter.list(root);
  } catch (error) {
    pushError(errors, root, errorMessage(error));
    return;
  }

  await mapLimit(listed.files, WALK_CONCURRENCY, async (path) => {
    if (!isHiddenPath(path) || entries.has(path)) return;
    try {
      const stat = await adapter.stat(path);
      if (!stat) {
        pushError(errors, path, "stat returned null");
        return;
      }
      entries.set(path, {
        path,
        name: basename(path),
        size: stat.size,
        mtime: stat.mtime,
        category: "other"
      });
    } catch (error) {
      pushError(errors, path, errorMessage(error));
    }
  });

  for (const folder of listed.folders) {
    if (isExcludedPath(folder, configDir)) continue;
    await walkHidden(adapter, folder, depth + 1, configDir, errors, entries);
  }
}
