import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeContentPath,
  LARGE_FILE_THRESHOLD_BYTES,
  selectLargeFiles,
  selectZeroByteFiles
} from "../src/cleanup/candidates";
import type { FileEntry } from "../src/scan/types";

function file(path: string, size: number): FileEntry {
  return {
    path,
    name: path.split("/").pop() ?? path,
    size,
    mtime: 0,
    category: "content"
  };
}

test("selectLargeFiles uses the 10 MB threshold", () => {
  const files = [
    file("small.bin", LARGE_FILE_THRESHOLD_BYTES - 1),
    file("exact.bin", LARGE_FILE_THRESHOLD_BYTES),
    file("large.bin", LARGE_FILE_THRESHOLD_BYTES + 1)
  ];
  assert.deepEqual(
    selectLargeFiles(files).map((entry) => entry.path),
    ["exact.bin", "large.bin"]
  );
});

test("selectZeroByteFiles keeps only empty files", () => {
  assert.deepEqual(
    selectZeroByteFiles([file("empty.md", 0), file("note.md", 1)]).map(
      (entry) => entry.path
    ),
    ["empty.md"]
  );
});

test("isSafeContentPath rejects config, trash, hidden and traversal paths", () => {
  assert.equal(isSafeContentPath("notes/a.md", ".obsidian"), true);
  assert.equal(isSafeContentPath("归档/附件/a.png", ".obsidian"), true);
  assert.equal(isSafeContentPath(".obsidian/app.json", ".obsidian"), false);
  assert.equal(isSafeContentPath(".trash/old.md", ".obsidian"), false);
  assert.equal(isSafeContentPath("notes/.hidden.md", ".obsidian"), false);
  assert.equal(isSafeContentPath("../outside.md", ".obsidian"), false);
  assert.equal(isSafeContentPath("/absolute.md", ".obsidian"), false);
  assert.equal(isSafeContentPath("config/obsidian/app.json", "config/obsidian"), false);
  assert.equal(isSafeContentPath("config", "config/obsidian"), false);
});
