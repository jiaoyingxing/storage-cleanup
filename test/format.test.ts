import assert from "node:assert/strict";
import test from "node:test";
import { I18n } from "../src/i18n/core";
import {
  formatBytes,
  formatClock,
  formatCount,
  formatDateTime,
  formatDuration,
  formatDurationShort,
  formatPercent
} from "../src/scan/format";

const en = new I18n("en");
const zh = new I18n("zh-CN");

test("formatBytes handles zero and units", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
  assert.equal(formatBytes(1024 * 1024 * 1024), "1.0 GB");
});

test("formatCount groups thousands per locale", () => {
  assert.equal(formatCount(12345, "en"), "12,345");
  assert.equal(formatCount(12345, "zh-cn"), "12,345");
  assert.equal(formatCount(12345), "12,345");
});

test("formatDuration switches units", () => {
  assert.equal(formatDuration(120), "120 ms");
  assert.equal(formatDuration(1500), "1.50 s");
  assert.equal(formatDurationShort(1500, en), "1.5 s");
  assert.equal(formatDurationShort(1500, zh), "1.5 秒");
});

test("formatPercent keeps small nonzero categories visible", () => {
  assert.equal(formatPercent(0, 100), "0%");
  assert.equal(formatPercent(70, 100), "70%");
  assert.equal(formatPercent(1, 1000), "<1%");
  assert.equal(formatPercent(50, 0), "0%");
});

test("formatClock and formatDateTime handle timestamps", () => {
  const stamp = new Date(2026, 9, 1, 18, 22).getTime();
  assert.equal(formatClock(stamp), "18:22");
  assert.equal(formatDateTime(stamp, en), "2026-10-01 18:22");
  assert.equal(formatDateTime(stamp, zh), "2026-10-01 18:22");
  assert.equal(formatClock(0), "");
  assert.equal(formatDateTime(0, en), "Unknown");
  assert.equal(formatDateTime(0, zh), "未知");
});
