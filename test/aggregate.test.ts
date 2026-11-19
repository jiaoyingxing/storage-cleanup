import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFolderTree,
  configGroupForPath,
  contentTypeForPath,
  isHiddenPath,
  sortEntries,
  summarizeContentTypes,
  summarizeConfigGroups
} from "../src/scan/aggregate";
import type { CategoryKey, ContentTypeKey, FileEntry } from "../src/scan/types";

function file(
  path: string,
  size: number,
  mtime = 0,
  category: CategoryKey = "content",
  extra: { contentType?: ContentTypeKey; configGroup?: string } = {}
): FileEntry {
  return {
    path,
    name: path.split("/").pop() ?? path,
    size,
    mtime,
    category,
    ...extra
  };
}

test("contentTypeForPath maps common extensions", () => {
  assert.equal(contentTypeForPath("notes/a.md"), "notes");
  assert.equal(contentTypeForPath("assets/a.PNG"), "images");
  assert.equal(contentTypeForPath("audio/a.m4a"), "audio");
  assert.equal(contentTypeForPath("video/a.mp4"), "video");
  assert.equal(contentTypeForPath("docs/a.pdf"), "documents");
  assert.equal(contentTypeForPath("backup/a.zip"), "archives");
  assert.equal(contentTypeForPath("misc/a.bin"), "other");
});

test("summarizeContentTypes keeps all seven groups and totals", () => {
  const summaries = summarizeContentTypes([
    file("a.md", 100),
    file("b.png", 200),
    file("c.m4a", 300),
    file("d.mp4", 400),
    file("e.pdf", 500),
    file("f.zip", 600),
    file("g.bin", 700)
  ]);
  assert.deepEqual(
    summaries.map((summary) => [summary.key, summary.fileCount, summary.totalSize]),
    [
      ["notes", 1, 100],
      ["images", 1, 200],
      ["audio", 1, 300],
      ["video", 1, 400],
      ["documents", 1, 500],
      ["archives", 1, 600],
      ["other", 1, 700]
    ]
  );
});

test("configGroupForPath separates themes, snippets, cache and config", () => {
  assert.equal(configGroupForPath(".obsidian/themes/a.css", ".obsidian"), "themes");
  assert.equal(configGroupForPath(".obsidian/snippets/a.css", ".obsidian"), "snippets");
  assert.equal(configGroupForPath(".obsidian/cache/a.bin", ".obsidian"), "cache");
  assert.equal(configGroupForPath(".obsidian/workspace.json", ".obsidian"), "config");
  assert.equal(configGroupForPath(".obsidian/custom/a.json", ".obsidian"), "other");
});

test("summarizeConfigGroups only returns present groups in stable order", () => {
  const summaries = summarizeConfigGroups([
    file(".obsidian/themes/a.css", 100, 0, "config", { configGroup: "themes" }),
    file(".obsidian/workspace.json", 50, 0, "config", { configGroup: "config" }),
    file(".obsidian/cache/a.bin", 25, 0, "config", { configGroup: "cache" })
  ]);
  assert.deepEqual(
    summaries.map((summary) => summary.key),
    ["themes", "config", "cache"]
  );
});

test("buildFolderTree aggregates nested folders without double counting files", () => {
  const tree = buildFolderTree(
    [
      file("attachments/2026-10/a.png", 100),
      file("attachments/2026-10/b.png", 50),
      file("attachments/2026-09/c.pdf", 25),
      file("root.md", 10)
    ],
    ""
  );
  assert.equal(tree.fileCount, 4);
  assert.equal(tree.size, 185);
  assert.equal(tree.files[0]?.path, "root.md");
  assert.equal(tree.folders.length, 1);
  const attachments = tree.folders[0];
  assert.equal(attachments.path, "attachments");
  assert.equal(attachments.fileCount, 3);
  assert.equal(attachments.size, 175);
  assert.equal(attachments.folders.length, 2);
  assert.equal(attachments.folders[0]?.path, "attachments/2026-10");
  assert.equal(attachments.folders[0]?.size, 150);
});

test("sortEntries handles size, name and mtime", () => {
  const entries = [file("b.md", 10, 2), file("a.md", 20, 1), file("c.md", 5, 3)];
  assert.deepEqual(
    sortEntries(entries, "size").map((entry) => entry.name),
    ["a.md", "b.md", "c.md"]
  );
  assert.deepEqual(
    sortEntries(entries, "name").map((entry) => entry.name),
    ["a.md", "b.md", "c.md"]
  );
  assert.deepEqual(
    sortEntries(entries, "mtime").map((entry) => entry.name),
    ["c.md", "b.md", "a.md"]
  );
});

test("isHiddenPath detects dot segments", () => {
  assert.equal(isHiddenPath(".smart-env/index.json"), true);
  assert.equal(isHiddenPath("notes/.private/a.md"), true);
  assert.equal(isHiddenPath("notes/a.md"), false);
});
