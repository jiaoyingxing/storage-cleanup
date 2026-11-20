import assert from "node:assert/strict";
import test from "node:test";
import en from "../src/i18n/en";
import zhCN from "../src/i18n/zh-cn";
import { I18n, detectLanguageFrom, resolveLocale } from "../src/i18n/core";

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test("en and zh-cn expose the same keys", () => {
  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zhCN).sort();
  assert.deepEqual(zhKeys, enKeys);
});

test("plural variants come in one/other pairs", () => {
  const keys = Object.keys(en);
  for (const key of keys) {
    if (key.endsWith(".one")) {
      assert.ok(keys.includes(`${key.slice(0, -4)}.other`), `${key} has no other`);
    }
  }
});

test("every key keeps the same placeholders in both locales", () => {
  for (const key of Object.keys(en) as Array<keyof typeof en>) {
    assert.deepEqual(
      placeholders(zhCN[key]),
      placeholders(en[key]),
      `placeholder mismatch for ${key}`
    );
  }
});

test("dynamic key families used by the view are present", () => {
  const keys = [
    ...["notes", "images", "audio", "video", "documents", "archives", "other"].map(
      (key) => `contentType.${key}`
    ),
    ...["themes", "snippets", "icons", "config", "cache", "other"].map(
      (key) => `configGroup.${key}`
    ),
    ...[
      "not-allowed",
      "missing",
      "changed",
      "not-empty",
      "contains-hidden",
      "error"
    ].map((code) => `cleanup.reason.${code}`)
  ];
  for (const key of keys) {
    assert.ok(key in en, `${key} missing from en`);
    assert.ok(key in zhCN, `${key} missing from zh-cn`);
  }
});

test("restore keys exist in both locales", () => {
  const keys = [
    "restoreTarget.title",
    "restoreTarget.root",
    "action.restore",
    "action.restoreHere",
    "action.retryRestore",
    "status.restoring",
    "status.busyScanningRestore",
    "cleanup.restoredTitle",
    "cleanup.restoredCount.one",
    "cleanup.restoredCount.other"
  ];
  for (const key of keys) {
    assert.ok(key in en, `${key} missing from en`);
    assert.ok(key in zhCN, `${key} missing from zh-cn`);
  }
});

test("settings tab keys are complete and external space keys are gone", () => {
  const settingsKeys = [
    "settings.open.name",
    "settings.open.desc",
    "settings.open.button",
    "settings.about.page",
    "settings.about.pageDesc",
    "settings.about.version",
    "settings.about.author",
    "settings.about.authorName",
    "settings.about.feedback",
    "settings.about.feedbackDesc",
    "settings.notice.page",
    "settings.notice.pageDesc",
    "settings.notice.scope",
    "settings.notice.scopeDesc",
    "settings.notice.readonly",
    "settings.notice.readonlyDesc",
    "settings.notice.cleanup",
    "settings.notice.cleanupDesc",
    "settings.notice.privacy",
    "settings.notice.privacyDesc",
    "settings.notice.caution",
    "settings.notice.cautionDesc",
    "settings.contact.github",
    "settings.contact.xiaohongshu"
  ];
  for (const key of settingsKeys) {
    assert.ok(key in en, `${key} missing from en`);
    assert.ok(key in zhCN, `${key} missing from zh-cn`);
  }
  assert.equal(zhCN["settings.notice.page"], "使用须知");
  assert.equal(en["settings.notice.page"], "Usage notes");

  for (const key of [
    "external.title",
    "external.systemTrash",
    "external.appCache",
    "external.syncPublish",
    "external.cloudBackup"
  ]) {
    assert.ok(!(key in en), `${key} should be removed from en`);
    assert.ok(!(key in zhCN), `${key} should be removed from zh-cn`);
  }
});

test("English locale contains no CJK characters", () => {
  // 作者署名同时保留中文名，属有意例外；其余英文文案不得泄漏中文。
  const cjkAllowed = new Set(["settings.about.authorName"]);
  for (const key of Object.keys(en) as Array<keyof typeof en>) {
    if (cjkAllowed.has(key)) continue;
    assert.doesNotMatch(en[key], /[\u4e00-\u9fff]/, `CJK leaked into ${key}`);
  }
});

test("t() selects plural variants by count", () => {
  const enI18n = new I18n("en");
  assert.equal(enI18n.t("count.files", { count: 1 }), "1 file");
  assert.equal(enI18n.t("count.files", { count: 2 }), "2 files");
  assert.equal(enI18n.t("count.files", { count: 0 }), "0 files");
  assert.equal(enI18n.t("count.files", { count: 12345 }), "12,345 files");
  assert.equal(enI18n.t("cleanup.foldersCount", { count: 1 }), "1 empty folder");

  const zhI18n = new I18n("zh-CN");
  assert.equal(zhI18n.t("count.files", { count: 1 }), "1 个文件");
  assert.equal(zhI18n.t("count.files", { count: 2 }), "2 个文件");
  assert.equal(zhI18n.t("cleanup.foldersCount", { count: 2 }), "2 个空文件夹");
});

test("t() falls back to the base key when no plural variant exists", () => {
  const i18n = new I18n("en");
  assert.equal(
    i18n.t("cleanup.selectedWithSize", { count: 1, size: "2 MB" }),
    "1 selected · 2 MB"
  );
});

test("t() interpolates parameters and falls back to the key", () => {
  const i18n = new I18n("en");
  assert.equal(
    i18n.t("status.scanDuration", { duration: "1.5 s" }),
    "Took 1.5 s"
  );
  assert.equal(i18n.t("missing.key"), "missing.key");
});

test("language tags map to supported locales", () => {
  assert.equal(resolveLocale("zh"), "zh-cn");
  assert.equal(resolveLocale("zh-CN"), "zh-cn");
  assert.equal(resolveLocale("zh-TW"), "zh-cn");
  assert.equal(resolveLocale("zh_CN"), "zh-cn");
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("fr"), "en");
  assert.equal(new I18n("zh-TW").language, "zh-cn");
  assert.equal(new I18n("fr").language, "en");
  assert.equal(new I18n().language, "en");
});

test("detectLanguageFrom prefers the official API, then vault config", () => {
  const app = {
    vault: {
      getConfig: (key: string) => (key === "language" ? "zh-CN" : "")
    }
  };
  assert.equal(detectLanguageFrom("zh", app), "zh");
  assert.equal(detectLanguageFrom("", app), "zh-CN");
  assert.equal(new I18n(detectLanguageFrom("", app)).language, "zh-cn");

  const browserLanguage =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en";
  assert.equal(detectLanguageFrom("", { vault: {} }), browserLanguage);
  assert.equal(detectLanguageFrom("", undefined), browserLanguage);
  assert.equal(new I18n(detectLanguageFrom("", { vault: {} })).language, resolveLocale(browserLanguage));
});
