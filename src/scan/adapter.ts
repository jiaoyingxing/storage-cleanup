import type { ScanError } from "./types";

export interface FileStat {
  size: number;
  mtime: number;
}

export interface ScanAdapter {
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
  stat(path: string): Promise<FileStat | null>;
}

export const WALK_CONCURRENCY = 8;
export const MAX_DEPTH = 64;
export const MAX_ERRORS = 50;

export async function mapLimit<T>(
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

export function pushError(errors: ScanError[], path: string, message: string): void {
  if (errors.length >= MAX_ERRORS) return;
  errors.push({ path, message });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
