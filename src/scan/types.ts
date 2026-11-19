export type CategoryKey = "content" | "trash" | "plugins" | "config" | "other";

export type ContentTypeKey =
  | "notes"
  | "images"
  | "audio"
  | "video"
  | "documents"
  | "archives"
  | "other";

export type SortKey = "size" | "name" | "mtime";

export interface FileEntry {
  path: string;
  name: string;
  size: number;
  mtime: number;
  category: CategoryKey;
  pluginId?: string;
  contentType?: ContentTypeKey;
  configGroup?: string;
}

export interface CategorySummary {
  fileCount: number;
  totalSize: number;
}

export interface ContentTypeSummary extends CategorySummary {
  key: ContentTypeKey;
}

export interface ConfigGroupSummary extends CategorySummary {
  key: string;
}

export interface PluginEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  size: number;
  fileCount: number;
  mtime: number;
  topFiles: FileEntry[];
  files: FileEntry[];
}

export interface FolderNode {
  path: string;
  name: string;
  size: number;
  fileCount: number;
  mtime: number;
  files: FileEntry[];
  folders: FolderNode[];
}

export interface ScanError {
  path: string;
  message: string;
}

export interface ScanResult {
  vaultName: string;
  configDir: string;
  startedAt: number;
  durationMs: number;
  content: CategorySummary;
  trash: CategorySummary;
  trashExists: boolean;
  plugins: CategorySummary & { entries: PluginEntry[] };
  config: CategorySummary;
  other: CategorySummary;
  totalSize: number;
  contentFiles: FileEntry[];
  trashFiles: FileEntry[];
  configFiles: FileEntry[];
  otherFiles: FileEntry[];
  emptyFolders: string[];
  contentTypes: ContentTypeSummary[];
  configGroups: ConfigGroupSummary[];
  topContentFiles: FileEntry[];
  topTrashFiles: FileEntry[];
  errors: ScanError[];
}
