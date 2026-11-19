import assert from "node:assert/strict";
import test from "node:test";
import { scanHiddenEntries } from "../src/scan/hidden";
import type { ScanError } from "../src/scan/types";

interface TreeEntry {
  files: string[];
  folders: string[];
}

function createAdapter(
  tree: Record<string, TreeEntry>,
  stats: Record<string, { size: number; mtime: number }>
) {
  const listed: string[] = [];
  const statted: string[] = [];
  return {
    listed,
    statted,
    adapter: {
      async list(path: string): Promise<TreeEntry> {
        listed.push(path);
        const entry = tree[path];
        if (!entry) throw new Error(`missing folder: ${path}`);
        return entry;
      },
      async stat(path: string) {
        statted.push(path);
        return stats[path] ?? null;
      }
    }
  };
}

test("scanHiddenEntries finds hidden files at root and nested levels", async () => {
  const { adapter, listed } = createAdapter(
    {
      "": {
        files: ["note.md", ".gitignore", ".DS_Store"],
        folders: ["notes", ".resojot-temp", ".obsidian", ".trash"]
      },
      notes: {
        files: ["notes/a.md"],
        folders: ["notes/.private"]
      },
      "notes/.private": {
        files: ["notes/.private/secret.md"],
        folders: []
      },
      ".resojot-temp": {
        files: [".resojot-temp/rec.m4a"],
        folders: [".resojot-temp/nested"]
      },
      ".resojot-temp/nested": {
        files: [".resojot-temp/nested/diag.json"],
        folders: []
      },
      ".obsidian": {
        files: [".obsidian/app.json"],
        folders: []
      },
      ".trash": {
        files: [".trash/old.md"],
        folders: []
      }
    },
    {
      ".gitignore": { size: 100, mtime: 1 },
      ".DS_Store": { size: 200, mtime: 2 },
      "notes/.private/secret.md": { size: 300, mtime: 3 },
      ".resojot-temp/rec.m4a": { size: 400, mtime: 4 },
      ".resojot-temp/nested/diag.json": { size: 500, mtime: 5 }
    }
  );
  const errors: ScanError[] = [];

  const files = await scanHiddenEntries(adapter, ".obsidian", errors);

  assert.deepEqual(
    files.map((file) => file.path),
    [
      ".DS_Store",
      ".gitignore",
      ".resojot-temp/nested/diag.json",
      ".resojot-temp/rec.m4a",
      "notes/.private/secret.md"
    ]
  );
  assert.deepEqual(
    files.map((file) => file.size),
    [200, 100, 500, 400, 300]
  );
  assert.equal(files.every((file) => file.category === "other"), true);
  assert.equal(files[4].name, "secret.md");
  assert.deepEqual(errors, []);
  assert.equal(listed.includes(".obsidian"), false);
  assert.equal(listed.includes(".trash"), false);
  assert.equal(listed.filter((path) => path === "notes/.private").length, 1);
});

test("scanHiddenEntries reports unreadable folders and missing stats", async () => {
  const { adapter } = createAdapter(
    {
      "": { files: [".broken"], folders: ["gone"] }
    },
    {}
  );
  const errors: ScanError[] = [];

  const files = await scanHiddenEntries(adapter, ".obsidian", errors);

  assert.deepEqual(files, []);
  assert.equal(errors.length, 2);
  assert.deepEqual(
    errors.map((error) => error.path),
    [".broken", "gone"]
  );
  assert.match(
    errors.find((error) => error.path === ".broken")?.message ?? "",
    /stat returned null/
  );
});

test("scanHiddenEntries does not count visible files or enter excluded folders", async () => {
  const { adapter, statted, listed } = createAdapter(
    {
      "": {
        files: ["note.md", ".cache"],
        folders: [".obsidian", ".trash"]
      },
      ".obsidian": { files: [".obsidian/app.json"], folders: [] },
      ".trash": { files: [".trash/old.md"], folders: [] }
    },
    {
      ".cache": { size: 10, mtime: 0 }
    }
  );

  const files = await scanHiddenEntries(adapter, ".obsidian", []);

  assert.equal(files.length, 1);
  assert.equal(files[0].path, ".cache");
  assert.equal(statted.includes("note.md"), false);
  assert.equal(listed.includes(".obsidian"), false);
  assert.equal(listed.includes(".trash"), false);
});
