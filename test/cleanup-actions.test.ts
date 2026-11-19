import assert from "node:assert/strict";
import test from "node:test";
import type { App } from "obsidian";
import {
  deleteEmptyFolders,
  emptyTrash,
  moveFilesToTrash
} from "../src/cleanup/actions";
import type { FileEntry } from "../src/scan/types";

interface MockFile {
  size: number;
  mtime: number;
}

class MockAdapter {
  readonly files = new Map<string, MockFile>();
  readonly dirs = new Set<string>();

  addFile(path: string, size = 1, mtime = 1000): void {
    this.addDir(parentPath(path));
    this.files.set(path, { size, mtime });
  }

  addDir(path: string): void {
    let current = path;
    while (current) {
      this.dirs.add(current);
      current = parentPath(current);
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.dirs.has(path);
  }

  async stat(path: string): Promise<MockFile | null> {
    return this.files.get(path) ?? null;
  }

  async list(path: string): Promise<{ files: string[]; folders: string[] }> {
    const files = [...this.files.keys()].filter(
      (file) => parentPath(file) === path
    );
    const folders = [...this.dirs].filter(
      (folder) => parentPath(folder) === path
    );
    return { files, folders };
  }

  async trashLocal(path: string): Promise<void> {
    const file = this.files.get(path);
    if (!file) throw new Error("missing file");
    this.addDir(".trash");
    this.files.set(`.trash/${basename(path)}`, file);
    this.files.delete(path);
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }

  async rmdir(path: string, recursive: boolean): Promise<void> {
    const listed = await this.list(path);
    if (recursive) {
      for (const file of listed.files) this.files.delete(file);
      for (const folder of listed.folders) {
        await this.rmdir(folder, true);
      }
      this.dirs.delete(path);
      return;
    }
    if (listed.files.length > 0 || listed.folders.length > 0) {
      throw new Error("folder not empty");
    }
    this.dirs.delete(path);
  }

  async mkdir(path: string): Promise<void> {
    this.addDir(path);
  }
}

function parentPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : "";
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function file(path: string, size: number, mtime = 1000): FileEntry {
  return {
    path,
    name: basename(path),
    size,
    mtime,
    category: "content"
  };
}

function makeApp(): { app: App; adapter: MockAdapter } {
  const adapter = new MockAdapter();
  const app = {
    vault: {
      configDir: ".obsidian",
      adapter
    }
  } as unknown as App;
  return { app, adapter };
}

test("moveFilesToTrash moves safe files and skips changed or protected paths", async () => {
  const { app, adapter } = makeApp();
  adapter.addFile("notes/a.md", 10, 1000);
  adapter.addFile("notes/b.md", 20, 1000);
  adapter.addFile("notes/c.md", 30, 3000);
  adapter.addFile(".obsidian/app.json", 5, 1000);

  const result = await moveFilesToTrash(app, [
    file("notes/a.md", 10, 1000),
    file("notes/b.md", 20, 1000),
    file("notes/c.md", 30, 1000),
    file(".obsidian/app.json", 5, 1000)
  ]);

  assert.equal(result.total, 4);
  assert.equal(result.succeeded, 2);
  assert.equal(result.skipped, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.freedBytes, 30);
  assert.deepEqual(result.succeededPaths, ["notes/a.md", "notes/b.md"]);
  assert.equal(adapter.files.has("notes/a.md"), false);
  assert.equal(adapter.files.has("notes/b.md"), false);
  assert.equal(adapter.files.has("notes/c.md"), true);
  assert.equal(adapter.files.has(".obsidian/app.json"), true);
  assert.equal(adapter.files.has(".trash/a.md"), true);
  assert.equal(adapter.files.has(".trash/b.md"), true);
  assert.deepEqual(
    result.failures.map((failure) => [failure.path, failure.reason]),
    [
      ["notes/c.md", "changed"],
      [".obsidian/app.json", "not-allowed"]
    ]
  );
});

test("moveFilesToTrash reports a stable missing reason", async () => {
  const { app, adapter } = makeApp();
  adapter.addDir("notes");

  const result = await moveFilesToTrash(app, [file("notes/gone.md", 10, 1000)]);

  assert.equal(result.skipped, 1);
  assert.deepEqual(
    result.failures.map((failure) => [failure.path, failure.reason]),
    [["notes/gone.md", "missing"]]
  );
});

test("deleteEmptyFolders removes empty trees but keeps non-empty folders", async () => {
  const { app, adapter } = makeApp();
  adapter.addDir("empty/sub");
  adapter.addDir("nonempty");
  adapter.addFile("nonempty/keep.md", 1, 1000);

  const result = await deleteEmptyFolders(app, ["empty", "nonempty"]);

  assert.equal(result.total, 2);
  assert.equal(result.succeeded, 1);
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.succeededPaths, ["empty"]);
  assert.deepEqual(
    result.failures.map((failure) => [failure.path, failure.reason]),
    [["nonempty", "not-empty"]]
  );
  assert.equal(adapter.dirs.has("empty"), false);
  assert.equal(adapter.dirs.has("empty/sub"), false);
  assert.equal(adapter.files.has("nonempty/keep.md"), true);
});

test("emptyTrash clears contents and keeps the .trash folder", async () => {
  const { app, adapter } = makeApp();
  adapter.addFile(".trash/old.md", 10, 1000);
  adapter.addFile(".trash/sub/nested.md", 20, 1000);

  const result = await emptyTrash(app, [
    file(".trash/old.md", 10),
    file(".trash/sub/nested.md", 20)
  ]);

  assert.equal(result.succeeded, 2);
  assert.equal(result.freedBytes, 30);
  assert.deepEqual(result.succeededPaths, [".trash/old.md", ".trash/sub/nested.md"]);
  assert.equal([...adapter.files.keys()].length, 0);
  assert.equal(adapter.dirs.has(".trash"), true);
  assert.deepEqual(await adapter.list(".trash"), { files: [], folders: [] });
});
