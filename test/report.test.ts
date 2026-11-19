import assert from "node:assert/strict";
import test from "node:test";
import { I18n } from "../src/i18n/core";
import { buildReportText } from "../src/scan/report";
import type { ScanResult } from "../src/scan/types";

const sample: ScanResult = {
  vaultName: "Test Vault",
  configDir: ".obsidian",
  startedAt: 0,
  durationMs: 1500,
  content: { fileCount: 10, totalSize: 2048 },
  trash: { fileCount: 2, totalSize: 1024 },
  trashExists: true,
  plugins: {
    fileCount: 3,
    totalSize: 4096,
    entries: [
      {
        id: "demo",
        name: "Demo Plugin",
        version: "1.0.0",
        author: "Test",
        size: 4096,
        fileCount: 3,
        mtime: 0,
        topFiles: [],
        files: []
      }
    ]
  },
  config: { fileCount: 1, totalSize: 512 },
  other: { fileCount: 1, totalSize: 0 },
  totalSize: 7680,
  contentFiles: [],
  trashFiles: [],
  configFiles: [],
  otherFiles: [],
  emptyFolders: [],
  contentTypes: [],
  configGroups: [],
  topContentFiles: [
    { path: "notes/big.md", name: "big.md", size: 2048, mtime: 0, category: "content" }
  ],
  topTrashFiles: [
    { path: ".trash/old.md", name: "old.md", size: 1024, mtime: 0, category: "trash" }
  ],
  errors: []
};

test("buildReportText includes category totals and top files", () => {
  const text = buildReportText(sample, new I18n("en"));
  assert.match(text, /Storage Cleanup scan/);
  assert.match(text, /Content: 2\.0 KB \/ 10 files/);
  assert.match(text, /\.trash: 1\.0 KB \/ 2 files/);
  assert.match(text, /Other & hidden: 0 B \/ 1 file/);
  assert.match(text, /Largest \.trash files:/);
  assert.match(text, /Plugins: 4\.0 KB \/ 3 files \/ 1 plugin/);
  assert.match(text, /notes\/big\.md/);
  assert.match(text, /Demo Plugin \(demo\)/);
});

test("buildReportText localizes Chinese hosts", () => {
  const text = buildReportText(sample, new I18n("zh-CN"));
  assert.match(text, /存储清理扫描报告/);
  assert.match(text, /内容文件：2\.0 KB \/ 10 个文件/);
  assert.match(text, /\.trash：1\.0 KB \/ 2 个文件/);
  assert.match(text, /其他与隐藏：0 B \/ 1 个文件/);
  assert.match(text, /最大的 \.trash 文件：/);
  assert.match(text, /插件数据：4\.0 KB \/ 3 个文件 \/ 1 个插件/);
  assert.match(text, /用时：1\.50 s/);
});

test("buildReportText marks missing trash", () => {
  const enText = buildReportText({ ...sample, trashExists: false }, new I18n("en"));
  assert.match(enText, /\.trash: not found/);
  const zhText = buildReportText(
    { ...sample, trashExists: false },
    new I18n("zh-cn")
  );
  assert.match(zhText, /\.trash：未找到/);
});
