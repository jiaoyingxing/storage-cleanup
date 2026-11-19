import { isHiddenPath } from "../scan/aggregate";
import type { FileEntry } from "../scan/types";

export const LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024;

export function selectLargeFiles(files: readonly FileEntry[]): FileEntry[] {
  return files.filter((file) => file.size >= LARGE_FILE_THRESHOLD_BYTES);
}

export function selectZeroByteFiles(files: readonly FileEntry[]): FileEntry[] {
  return files.filter((file) => file.size === 0);
}

export function isSafeContentPath(path: string, configDir: string): boolean {
  const normalized = normalizeVaultPath(path);
  if (!normalized) return false;
  const config = normalizeVaultPath(configDir);
  if (normalized.split("/").some((segment) => segment === "..")) return false;
  if (normalized === ".trash" || normalized.startsWith(".trash/")) return false;
  if (
    config &&
    (normalized === config ||
      normalized.startsWith(`${config}/`) ||
      config.startsWith(`${normalized}/`))
  ) {
    return false;
  }
  return !isHiddenPath(normalized);
}

export function normalizeVaultPath(path: string): string {
  const trimmed = path.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.startsWith("/") || /^[A-Za-z]:\//.test(trimmed)) return "";
  return trimmed.replace(/\/+/g, "/").replace(/\/+$/, "");
}
