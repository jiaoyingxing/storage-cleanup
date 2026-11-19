/**
 * Storage Cleanup i18n types.
 *
 * All user-visible strings live in locale files keyed by a stable dot path.
 * English is the authoritative fallback, so every key must exist in `en`.
 * Keys ending in `.one` / `.other` are plural variants selected by `t()` when
 * `params.count` is a number.
 */

/** Locales shipped with the plugin. */
export type LocaleKey = "en" | "zh-cn";

/** Values accepted by `t()` for `{placeholder}` interpolation. */
export type LocaleParams = Record<string, string | number>;

/** All user-visible strings in the plugin. */
export interface LocaleStrings {
  // ---- Command and ribbon ----
  "command.openStorageMap": string;
  "notice.openFailed": string;

  // ---- View shell ----
  "view.title": string;
  "view.more": string;
  "view.scanning": string;
  "view.scanFailedTitle": string;

  // ---- Categories ----
  "category.content": string;
  "category.plugins": string;
  "category.config": string;
  "category.trashSub": string;
  "category.other": string;

  // ---- Content types ----
  "contentType.notes": string;
  "contentType.images": string;
  "contentType.audio": string;
  "contentType.video": string;
  "contentType.documents": string;
  "contentType.archives": string;
  "contentType.other": string;

  // ---- Config groups ----
  "configGroup.themes": string;
  "configGroup.snippets": string;
  "configGroup.icons": string;
  "configGroup.config": string;
  "configGroup.cache": string;
  "configGroup.other": string;

  // ---- .trash ----
  "trash.missing": string;
  "trash.emptyList": string;
  "trash.dangerNote": string;
  "trash.empty": string;
  "trash.actionbar": string;

  // ---- Content grouping ----
  "content.groupByType": string;
  "content.groupByFolder": string;
  "content.largestFiles": string;

  // ---- Empty states ----
  "empty.category": string;
  "empty.configGroup": string;
  "empty.folder": string;
  "empty.folderGone": string;
  "empty.pluginGone": string;
  "empty.plugins": string;

  // ---- Counts (plural variants) ----
  "count.files.one": string;
  "count.files.other": string;
  "count.plugins.one": string;
  "count.plugins.other": string;
  "count.folders.one": string;
  "count.folders.other": string;
  "count.subfolders.one": string;
  "count.subfolders.other": string;
  "total.label": string;

  // ---- Cleanup ----
  "cleanup.title": string;
  "cleanup.none": string;
  "cleanup.noneSelected": string;
  "cleanup.largeTitle": string;
  "cleanup.largeLabel": string;
  "cleanup.zeroTitle": string;
  "cleanup.foldersTitle": string;
  "cleanup.largeCount.one": string;
  "cleanup.largeCount.other": string;
  "cleanup.zeroCount.one": string;
  "cleanup.zeroCount.other": string;
  "cleanup.foldersCount.one": string;
  "cleanup.foldersCount.other": string;
  "cleanup.totalSize": string;
  "cleanup.selectedWithSize": string;
  "cleanup.selectedCount": string;
  "cleanup.selectedFiles.one": string;
  "cleanup.selectedFiles.other": string;
  "cleanup.selectedFolders.one": string;
  "cleanup.selectedFolders.other": string;
  "cleanup.confirmDeleteFoldersTitle.one": string;
  "cleanup.confirmDeleteFoldersTitle.other": string;
  "cleanup.confirmDeleteFoldersMessage.one": string;
  "cleanup.confirmDeleteFoldersMessage.other": string;
  "cleanup.confirmTrashTitle": string;
  "cleanup.confirmTrashMessageLarge.one": string;
  "cleanup.confirmTrashMessageLarge.other": string;
  "cleanup.confirmTrashMessage.one": string;
  "cleanup.confirmTrashMessage.other": string;
  "cleanup.confirmEmptyTrashTitle": string;
  "cleanup.confirmEmptyTrashMessage.one": string;
  "cleanup.confirmEmptyTrashMessage.other": string;
  "cleanup.doneTitle": string;
  "cleanup.failedTitle": string;
  "cleanup.failureLine": string;
  "cleanup.failureLineWithDetail": string;
  "cleanup.unknownPath": string;
  "cleanup.viewFailures": string;
  "cleanup.movedTitle": string;
  "cleanup.deletedTitle": string;
  "cleanup.emptiedTrashTitle": string;
  "cleanup.sizeSuffix": string;
  "cleanup.freedSuffix": string;
  "cleanup.countSucceeded": string;
  "cleanup.countSkipped": string;
  "cleanup.countFailed": string;
  "cleanup.countSeparator": string;
  "cleanup.emptyLarge": string;
  "cleanup.emptyZero": string;
  "cleanup.emptyFolders": string;

  // ---- Cleanup failure reasons (stable codes) ----
  "cleanup.reason.not-allowed": string;
  "cleanup.reason.missing": string;
  "cleanup.reason.changed": string;
  "cleanup.reason.not-empty": string;
  "cleanup.reason.contains-hidden": string;
  "cleanup.reason.error": string;

  // ---- Actions ----
  "action.retry": string;
  "action.rescan": string;
  "action.details": string;
  "action.collapse": string;
  "action.copyPath": string;
  "action.copyReport": string;
  "action.openFile": string;
  "action.moveToTrash": string;
  "action.deletePermanently": string;
  "action.emptyTrash": string;
  "action.selectMultiple": string;
  "action.cancelSelection": string;
  "action.selectAll": string;
  "action.deselectAll": string;
  "action.retryFailed": string;
  "action.retryEmptyTrash": string;

  // ---- Status ----
  "status.busyCleaningScan": string;
  "status.busyScanningCleanup": string;
  "status.busyScanningEmptyTrash": string;
  "status.rescanning": string;
  "status.scanComplete": string;
  "status.scanCompleteDetail": string;
  "status.lastScanResult": string;
  "status.scanDuration": string;
  "status.scanFinishedAt": string;
  "status.deletingFolders": string;
  "status.movingToTrash": string;
  "status.emptyingTrash": string;
  "status.rescanFailedNote": string;
  "status.noteSeparator": string;
  "status.cleanupRescanFailedTitle": string;
  "status.cleanupRescanFailedDetail": string;
  "status.unknownError": string;
  "status.scanFailedShowingLast": string;
  "status.dismissAria": string;

  // ---- Plugin metadata ----
  "plugins.unknownVersion": string;
  "plugins.metaVersion": string;
  "plugins.metaFileCount": string;
  "plugins.metaModified": string;

  // ---- File metadata ----
  "file.size": string;
  "file.modified": string;

  // ---- Navigation ----
  "nav.back": string;
  "nav.backAria": string;
  "nav.breadcrumbAria": string;

  // ---- Sorting ----
  "sort.aria": string;
  "sort.label": string;
  "sort.size": string;
  "sort.name": string;
  "sort.mtime": string;

  // ---- Folder rows ----
  "folder.rootFiles": string;

  // ---- Settings tab ----
  "settings.open.name": string;
  "settings.open.desc": string;
  "settings.open.button": string;
  "settings.about.page": string;
  "settings.about.pageDesc": string;
  "settings.about.version": string;
  "settings.about.author": string;
  "settings.about.authorName": string;
  "settings.about.feedback": string;
  "settings.about.feedbackDesc": string;
  "settings.notice.page": string;
  "settings.notice.pageDesc": string;
  "settings.notice.scope": string;
  "settings.notice.scopeDesc": string;
  "settings.notice.readonly": string;
  "settings.notice.readonlyDesc": string;
  "settings.notice.cleanup": string;
  "settings.notice.cleanupDesc": string;
  "settings.notice.privacy": string;
  "settings.notice.privacyDesc": string;
  "settings.notice.caution": string;
  "settings.notice.cautionDesc": string;
  "settings.contact.github": string;
  "settings.contact.xiaohongshu": string;

  // ---- Notices ----
  "notice.pathCopied": string;
  "notice.pluginPathCopied": string;
  "notice.reportCopied": string;
  "notice.noReport": string;
  "notice.copyFailed": string;
  "notice.fileMissing": string;

  // ---- Read errors ----
  "errors.unreadable.one": string;
  "errors.unreadable.other": string;

  // ---- Formatting ----
  "format.unknown": string;
  "format.seconds": string;

  // ---- Confirm modal ----
  "modal.cancel": string;
  "modal.morePaths": string;

  // ---- Copy report ----
  "report.title": string;
  "report.vault": string;
  "report.configDir": string;
  "report.duration": string;
  "report.content": string;
  "report.trash": string;
  "report.trashMissing": string;
  "report.plugins": string;
  "report.config": string;
  "report.other": string;
  "report.total": string;
  "report.topContent": string;
  "report.topTrash": string;
  "report.pluginsHeading": string;
  "report.errors": string;
  "report.none": string;
  "report.pluginLine": string;
  "report.errorLine": string;
}

/** Resolved locale map. */
export type LocaleMap = Record<LocaleKey, LocaleStrings>;
