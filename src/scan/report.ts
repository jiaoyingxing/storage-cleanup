import { I18n } from "../i18n/core";
import { formatBytes, formatDuration } from "./format";
import type { FileEntry, ScanResult } from "./types";

/**
 * Build the plain-text scan report. Host-less callers (for example the
 * synthetic vault script) get the English report by default.
 */
export function buildReportText(
  result: ScanResult,
  i18n: I18n = new I18n("en")
): string {
  const files = (count: number): string => i18n.t("count.files", { count });
  const lines: string[] = [
    i18n.t("report.title"),
    i18n.t("report.vault", { vault: result.vaultName }),
    i18n.t("report.configDir", { configDir: result.configDir }),
    i18n.t("report.duration", { duration: formatDuration(result.durationMs) }),
    "",
    i18n.t("report.content", {
      size: formatBytes(result.content.totalSize),
      files: files(result.content.fileCount)
    }),
    result.trashExists
      ? i18n.t("report.trash", {
          size: formatBytes(result.trash.totalSize),
          files: files(result.trash.fileCount)
        })
      : i18n.t("report.trashMissing"),
    i18n.t("report.plugins", {
      size: formatBytes(result.plugins.totalSize),
      files: files(result.plugins.fileCount),
      plugins: i18n.t("count.plugins", { count: result.plugins.entries.length })
    }),
    i18n.t("report.config", {
      size: formatBytes(result.config.totalSize),
      files: files(result.config.fileCount)
    }),
    i18n.t("report.other", {
      size: formatBytes(result.other.totalSize),
      files: files(result.other.fileCount)
    }),
    i18n.t("report.total", { size: formatBytes(result.totalSize) }),
    "",
    i18n.t("report.topContent"),
    ...formatEntries(result.topContentFiles, i18n),
    "",
    i18n.t("report.topTrash"),
    ...formatEntries(result.topTrashFiles, i18n),
    "",
    i18n.t("report.pluginsHeading"),
    ...formatPlugins(result, i18n),
    ""
  ];

  if (result.errors.length > 0) {
    lines.push(
      i18n.t("report.errors"),
      ...result.errors.map((error) =>
        i18n.t("report.errorLine", { path: error.path, message: error.message })
      ),
      ""
    );
  }

  return lines.join("\n");
}

function formatEntries(entries: FileEntry[], i18n: I18n): string[] {
  if (entries.length === 0) return [`  ${i18n.t("report.none")}`];
  return entries.map(
    (entry) => `  ${formatBytes(entry.size).padStart(10)}  ${entry.path}`
  );
}

function formatPlugins(result: ScanResult, i18n: I18n): string[] {
  if (result.plugins.entries.length === 0) {
    return [`  ${i18n.t("report.none")}`];
  }
  return result.plugins.entries
    .slice(0, 20)
    .map((plugin) =>
      i18n.t("report.pluginLine", {
        size: formatBytes(plugin.size).padStart(10),
        name: plugin.name,
        id: plugin.id,
        version: plugin.version,
        files: i18n.t("count.files", {
          count: plugin.fileCount
        })
      })
    );
}
