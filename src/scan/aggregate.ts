import type {
  CategorySummary,
  ConfigGroupSummary,
  ContentTypeKey,
  ContentTypeSummary,
  FileEntry,
  FolderNode,
  SortKey
} from "./types";

export interface ContentTypeDefinition {
  key: ContentTypeKey;
  extensions: readonly string[];
}

/** Stable content-type keys; display names live in the i18n locale files. */
export const CONTENT_TYPES: readonly ContentTypeDefinition[] = [
  { key: "notes", extensions: ["md", "canvas", "base", "markdown"] },
  {
    key: "images",
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "heic", "tif", "tiff", "ico"]
  },
  {
    key: "audio",
    extensions: ["mp3", "wav", "m4a", "ogg", "opus", "flac", "aac"]
  },
  {
    key: "video",
    extensions: ["mp4", "mov", "webm", "mkv", "avi", "m4v", "mpeg", "mpg"]
  },
  {
    key: "documents",
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "epub", "odt", "rtf"]
  },
  {
    key: "archives",
    extensions: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz"]
  },
  { key: "other", extensions: [] }
];

const TYPE_BY_EXTENSION = new Map<string, ContentTypeKey>();
for (const definition of CONTENT_TYPES) {
  for (const extension of definition.extensions) {
    TYPE_BY_EXTENSION.set(extension, definition.key);
  }
}

const CONFIG_GROUP_ORDER = ["themes", "snippets", "icons", "config", "cache", "other"] as const;

export interface SortableEntry {
  name: string;
  size: number;
  mtime: number;
}

export function summarizeFiles(files: readonly FileEntry[]): CategorySummary {
  return {
    fileCount: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0)
  };
}

export function topFiles(files: readonly FileEntry[], limit: number): FileEntry[] {
  return [...files].sort((left, right) => right.size - left.size).slice(0, limit);
}

export function contentTypeForPath(path: string): ContentTypeKey {
  const extension = extensionOf(path);
  return TYPE_BY_EXTENSION.get(extension) ?? "other";
}

export function summarizeContentTypes(files: readonly FileEntry[]): ContentTypeSummary[] {
  const totals = new Map<ContentTypeKey, { fileCount: number; totalSize: number }>();
  for (const definition of CONTENT_TYPES) {
    totals.set(definition.key, { fileCount: 0, totalSize: 0 });
  }
  for (const file of files) {
    const key = file.contentType ?? contentTypeForPath(file.path);
    const current = totals.get(key) ?? { fileCount: 0, totalSize: 0 };
    current.fileCount += 1;
    current.totalSize += file.size;
    totals.set(key, current);
  }
  return CONTENT_TYPES.map((definition) => {
    const current = totals.get(definition.key) ?? { fileCount: 0, totalSize: 0 };
    return {
      key: definition.key,
      fileCount: current.fileCount,
      totalSize: current.totalSize
    };
  });
}

export function configGroupForPath(path: string, configDir: string): string {
  const prefix = `${configDir}/`;
  const relative = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const parts = relative.split("/");
  const top = parts[0] ?? "";
  if (top === "themes" || top === "snippets" || top === "icons") return top;
  if (top === "cache" || top.startsWith("cache-")) return "cache";
  if (top === "plugins") return "other";
  if (parts.length > 1) return "other";
  return "config";
}

export function summarizeConfigGroups(files: readonly FileEntry[]): ConfigGroupSummary[] {
  const totals = new Map<string, { fileCount: number; totalSize: number }>();
  for (const file of files) {
    const key = file.configGroup ?? "other";
    const current = totals.get(key) ?? { fileCount: 0, totalSize: 0 };
    current.fileCount += 1;
    current.totalSize += file.size;
    totals.set(key, current);
  }
  return CONFIG_GROUP_ORDER.filter((key) => (totals.get(key)?.fileCount ?? 0) > 0).map((key) => {
    const current = totals.get(key) ?? { fileCount: 0, totalSize: 0 };
    return {
      key,
      fileCount: current.fileCount,
      totalSize: current.totalSize
    };
  });
}

export function isHiddenPath(path: string): boolean {
  return path.split("/").some((segment) => segment.startsWith("."));
}

export function buildFolderTree(files: readonly FileEntry[], rootPath: string): FolderNode {
  const root = createFolder(rootPath, basename(rootPath));
  const nodes = new Map<string, FolderNode>([[root.path, root]]);

  for (const file of files) {
    const relative = relativeToRoot(file.path, rootPath);
    if (!relative) continue;
    const parts = relative.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;
    addFileToFolder(current, file);
    for (let index = 0; index < parts.length - 1; index += 1) {
      const path = joinPath(rootPath, parts.slice(0, index + 1).join("/"));
      let child = nodes.get(path);
      if (!child) {
        child = createFolder(path, parts[index]);
        nodes.set(path, child);
        current.folders.push(child);
      }
      current = child;
      addFileToFolder(current, file);
    }
    current.files.push(file);
  }

  return root;
}

export function sortEntries<T extends SortableEntry>(items: readonly T[], sort: SortKey): T[] {
  return [...items].sort((left, right) => {
    if (sort === "name") {
      return left.name.localeCompare(right.name, "zh-CN") || right.size - left.size;
    }
    if (sort === "mtime") {
      return right.mtime - left.mtime || right.size - left.size;
    }
    return right.size - left.size || left.name.localeCompare(right.name, "zh-CN");
  });
}

export function maxMtime(files: readonly FileEntry[]): number {
  return files.reduce((latest, file) => Math.max(latest, file.mtime), 0);
}

export function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function createFolder(path: string, name: string): FolderNode {
  return {
    path,
    name,
    size: 0,
    fileCount: 0,
    mtime: 0,
    files: [],
    folders: []
  };
}

function addFileToFolder(folder: FolderNode, file: FileEntry): void {
  folder.size += file.size;
  folder.fileCount += 1;
  folder.mtime = Math.max(folder.mtime, file.mtime);
}

function relativeToRoot(path: string, rootPath: string): string {
  if (!rootPath) return path;
  if (path === rootPath) return "";
  return path.startsWith(`${rootPath}/`) ? path.slice(rootPath.length + 1) : "";
}

function joinPath(rootPath: string, relative: string): string {
  return rootPath ? `${rootPath}/${relative}` : relative;
}

function extensionOf(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}
