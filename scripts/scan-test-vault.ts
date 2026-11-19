import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { App } from "obsidian";
import { buildReportText } from "../src/scan/report";
import { scanStorage } from "../src/scan/scanner";

const vaultRoot = path.resolve(process.argv[2] ?? "");
if (!vaultRoot || !fs.existsSync(vaultRoot)) {
  throw new Error(`Vault path not found: ${vaultRoot}`);
}

const posix = path.posix;
const configDir = ".obsidian";

function absolute(relativePath: string): string {
  return path.join(vaultRoot, ...relativePath.split("/"));
}

function list(relativePath: string): { files: string[]; folders: string[] } {
  const directory = absolute(relativePath);
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  const folders: string[] = [];
  for (const entry of entries) {
    const child = posix.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      folders.push(child);
    } else {
      files.push(child);
    }
  }
  return { files, folders };
}

function walkContent(): Array<{
  path: string;
  name: string;
  stat: { size: number; mtime: number };
}> {
  const files: Array<{
    path: string;
    name: string;
    stat: { size: number; mtime: number };
  }> = [];
  const stack = [""];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const absoluteDirectory = absolute(current);
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const child = current ? posix.join(current, entry.name) : entry.name;
      if (child === configDir || child === ".trash") continue;
      if (entry.isDirectory()) {
        stack.push(child);
        continue;
      }
      const stat = fs.statSync(absolute(child));
      files.push({
        path: child,
        name: entry.name,
        stat: { size: stat.size, mtime: stat.mtimeMs }
      });
    }
  }
  return files;
}

const mockApp = {
  vault: {
    configDir,
    getName: () => path.basename(vaultRoot),
    getFiles: () => walkContent(),
    adapter: {
      exists: async (relativePath: string) => fs.existsSync(absolute(relativePath)),
      list: async (relativePath: string) => list(relativePath),
      stat: async (relativePath: string) => {
        const stat = fs.statSync(absolute(relativePath));
        return { size: stat.size, mtime: stat.mtimeMs };
      },
      read: async (relativePath: string) =>
        fs.readFileSync(absolute(relativePath), "utf8")
    }
  }
} as unknown as App;

async function main(): Promise<void> {
  const result = await scanStorage(mockApp);
  console.log(buildReportText(result));
  console.log("JSON summary:");
  console.log(
    JSON.stringify(
      {
        content: result.content,
        trash: result.trash,
        plugins: {
          fileCount: result.plugins.fileCount,
          totalSize: result.plugins.totalSize,
          entries: result.plugins.entries.map((plugin) => ({
            id: plugin.id,
            name: plugin.name,
            size: plugin.size,
            fileCount: plugin.fileCount
          }))
        },
        config: result.config,
        other: result.other,
        contentTypes: result.contentTypes,
        configGroups: result.configGroups,
        totalSize: result.totalSize,
        durationMs: result.durationMs,
        errors: result.errors
      },
      null,
      2
    )
  );
}

void main();
