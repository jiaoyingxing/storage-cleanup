import assert from "node:assert/strict";
import test from "node:test";
import { applyCleanupResult } from "../src/cleanup/apply-result";
import type { CleanupResult } from "../src/cleanup/actions";
import type { FileEntry, ScanResult } from "../src/scan/types";

function file(path: string, size: number, category: FileEntry["category"]): FileEntry {
  return {
    path,
    name: path.split("/").pop() ?? path,
    size,
    mtime: 1000,
    category,
    contentType: category === "content" ? "notes" : undefined
  };
}

function makeResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    vaultName: "vault",
    configDir: ".obsidian",
    startedAt: 0,
    durationMs: 10,
    content: { fileCount: 2, totalSize: 30 },
    trash: { fileCount: 1, totalSize: 5 },
    trashExists: true,
    plugins: { fileCount: 0, totalSize: 0, entries: [] },
    config: { fileCount: 0, totalSize: 0 },
    other: { fileCount: 0, totalSize: 0 },
    totalSize: 35,
    contentFiles: [file("notes/a.md", 10, "content"), file("notes/b.md", 20, "content")],
    trashFiles: [file(".trash/old.md", 5, "trash")],
    configFiles: [],
    otherFiles: [],
    emptyFolders: [],
    contentTypes: [],
    configGroups: [],
    topContentFiles: [],
    topTrashFiles: [],
    errors: [],
    ...overrides
  };
}

function cleanup(overrides: Partial<CleanupResult>): CleanupResult {
  return {
    action: "move-to-trash",
    total: 1,
    succeeded: 1,
    skipped: 0,
    failed: 0,
    freedBytes: 10,
    succeededPaths: [],
    failures: [],
    ...overrides
  };
}

test("move-to-trash removes content entries and adds matching trash entries immediately", () => {
  const patched = applyCleanupResult(
    makeResult(),
    cleanup({ succeededPaths: ["notes/a.md"] })
  );

  assert.deepEqual(
    patched.contentFiles.map((entry) => entry.path),
    ["notes/b.md"]
  );
  assert.deepEqual(
    patched.trashFiles.map((entry) => entry.path),
    [".trash/old.md", ".trash/notes/a.md"]
  );
  assert.deepEqual(patched.content, { fileCount: 1, totalSize: 20 });
  assert.deepEqual(patched.trash, { fileCount: 2, totalSize: 15 });
  assert.equal(patched.totalSize, 35);
});

test("delete-empty-folders removes the folder and its descendants from candidates", () => {
  const patched = applyCleanupResult(
    makeResult({ emptyFolders: ["empty", "empty/sub", "other"] }),
    cleanup({
      action: "delete-empty-folders",
      freedBytes: 0,
      succeededPaths: ["empty"]
    })
  );

  assert.deepEqual(patched.emptyFolders, ["other"]);
});

test("empty-trash removes matched trash files and lowers the total size", () => {
  const patched = applyCleanupResult(
    makeResult(),
    cleanup({
      action: "empty-trash",
      total: 1,
      freedBytes: 5,
      succeededPaths: [".trash/old.md"]
    })
  );

  assert.deepEqual(patched.trashFiles, []);
  assert.deepEqual(patched.trash, { fileCount: 0, totalSize: 0 });
  assert.equal(patched.totalSize, 30);
});

test("a cleanup without succeeded paths leaves the scan result untouched", () => {
  const result = makeResult();
  const patched = applyCleanupResult(
    result,
    cleanup({ succeeded: 0, failed: 1, succeededPaths: [], failures: [] })
  );
  assert.equal(patched, result);
});

test("a path that is no longer in the scan does not create a trash entry", () => {
  const result = makeResult();
  const patched = applyCleanupResult(
    result,
    cleanup({ succeededPaths: ["notes/missing.md"] })
  );
  assert.equal(patched, result);
});
