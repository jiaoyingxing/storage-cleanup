/**
 * Storage Cleanup English locale.
 * Authoritative fallback: every key must have a value here.
 */
import type { LocaleStrings } from "./types";

const en: LocaleStrings = {
  // ---- Command and ribbon ----
  "command.openStorageMap": "Open Storage Cleanup",
  "notice.openFailed": "Could not open Storage Cleanup",

  // ---- View shell ----
  "view.title": "Storage Cleanup",
  "view.more": "More",
  "view.scanning": "Scanning…",
  "view.scanFailedTitle": "Scan failed",

  // ---- Categories ----
  "category.content": "Content files",
  "category.plugins": "Plugin data",
  "category.config": "Config & themes",
  "category.trashSub": "Obsidian trash",
  "category.other": "Other & hidden",

  // ---- Content types ----
  "contentType.notes": "Notes",
  "contentType.images": "Images",
  "contentType.audio": "Audio",
  "contentType.video": "Video",
  "contentType.documents": "PDF & documents",
  "contentType.archives": "Archives",
  "contentType.other": "Other files",

  // ---- Config groups ----
  "configGroup.themes": "Themes",
  "configGroup.snippets": "Snippets",
  "configGroup.icons": "Icons",
  "configGroup.config": "Configuration",
  "configGroup.cache": "Cache & temp",
  "configGroup.other": "Other",

  // ---- .trash ----
  "trash.missing": "No .trash found. The system trash is outside the scan scope.",
  "trash.emptyList": "No .trash files to show.",
  "trash.dangerNote": "Obsidian trash. Emptying it permanently deletes its contents and cannot be undone.",
  "trash.empty": ".trash is empty.",
  "trash.actionbar": "{files} · {size}",

  // ---- Restore from .trash ----
  "restoreTarget.title": "Choose destination folder",
  "restoreTarget.root": "Vault root",

  // ---- Content grouping ----
  "content.groupByType": "By type",
  "content.groupByFolder": "By folder",
  "content.largestFiles": "Largest files",

  // ---- Empty states ----
  "empty.category": "No files in this category yet.",
  "empty.configGroup": "No files in this group yet.",
  "empty.folder": "No files in this folder yet.",
  "empty.folderGone": "This folder no longer exists.",
  "empty.pluginGone": "This plugin no longer exists.",
  "empty.plugins": "No plugin data found.",

  // ---- Counts (plural variants) ----
  "count.files.one": "{count} file",
  "count.files.other": "{count} files",
  "count.plugins.one": "{count} plugin",
  "count.plugins.other": "{count} plugins",
  "count.folders.one": "{count} folder",
  "count.folders.other": "{count} folders",
  "count.subfolders.one": "{count} subfolder",
  "count.subfolders.other": "{count} subfolders",
  "total.label": "Total",

  // ---- Cleanup ----
  "cleanup.title": "Cleanup",
  "cleanup.none": "Nothing to clean up.",
  "cleanup.noneSelected": "None selected",
  "cleanup.largeTitle": "Large files (≥{threshold})",
  "cleanup.largeLabel": "Large files",
  "cleanup.zeroTitle": "Empty files (0 bytes)",
  "cleanup.foldersTitle": "Empty folders",
  "cleanup.largeCount.one": "{count} large file",
  "cleanup.largeCount.other": "{count} large files",
  "cleanup.zeroCount.one": "{count} empty file",
  "cleanup.zeroCount.other": "{count} empty files",
  "cleanup.foldersCount.one": "{count} empty folder",
  "cleanup.foldersCount.other": "{count} empty folders",
  "cleanup.totalSize": "{size} total",
  "cleanup.selectedWithSize": "{count} selected · {size}",
  "cleanup.selectedCount": "{count} selected",
  "cleanup.selectedFiles.one": "{count} file selected",
  "cleanup.selectedFiles.other": "{count} files selected",
  "cleanup.selectedFolders.one": "{count} folder selected",
  "cleanup.selectedFolders.other": "{count} folders selected",
  "cleanup.confirmDeleteFoldersTitle.one": "Permanently delete {count} empty folder?",
  "cleanup.confirmDeleteFoldersTitle.other": "Permanently delete {count} empty folders?",
  "cleanup.confirmDeleteFoldersMessage.one": "This folder contains no files. Deleting it cannot be undone.",
  "cleanup.confirmDeleteFoldersMessage.other": "These folders contain no files. Deleting them cannot be undone.",
  "cleanup.confirmTrashTitle": "Move to .trash?",
  "cleanup.confirmTrashMessageLarge.one": "Move {count} file ({size} total) to .trash. You can restore it to a folder you choose from the .trash page in this plugin.",
  "cleanup.confirmTrashMessageLarge.other": "Move {count} files ({size} total) to .trash. You can restore them to a folder you choose from the .trash page in this plugin.",
  "cleanup.confirmTrashMessage.one": "Move {count} file to .trash. You can restore it to a folder you choose from the .trash page in this plugin.",
  "cleanup.confirmTrashMessage.other": "Move {count} files to .trash. You can restore them to a folder you choose from the .trash page in this plugin.",
  "cleanup.confirmEmptyTrashTitle": "Empty .trash?",
  "cleanup.confirmEmptyTrashMessage.one": "This permanently deletes {count} file ({size} total). This cannot be undone.",
  "cleanup.confirmEmptyTrashMessage.other": "This permanently deletes {count} files ({size} total). This cannot be undone.",
  "cleanup.doneTitle": "Cleanup finished",
  "cleanup.failedTitle": "Cleanup failed",
  "cleanup.failureLine": "{path}: {reason}",
  "cleanup.failureLineWithDetail": "{path}: {reason} ({detail})",
  "cleanup.unknownPath": "Unknown path",
  "cleanup.viewFailures": "View failed items",
  "cleanup.movedTitle": "Moved to .trash",
  "cleanup.deletedTitle": "Permanently deleted",
  "cleanup.emptiedTrashTitle": "Emptied .trash",
  "cleanup.restoredTitle": "Restored",
  "cleanup.restoredCount.one": "{count} file restored to {path}",
  "cleanup.restoredCount.other": "{count} files restored to {path}",
  "cleanup.sizeSuffix": " ({size} total)",
  "cleanup.freedSuffix": ", {size} freed",
  "cleanup.countSucceeded": "{count} succeeded",
  "cleanup.countSkipped": "{count} skipped",
  "cleanup.countFailed": "{count} failed",
  "cleanup.countSeparator": ", ",
  "cleanup.emptyLarge": "No content files larger than {threshold}.",
  "cleanup.emptyZero": "No empty files.",
  "cleanup.emptyFolders": "No empty folders.",

  // ---- Cleanup failure reasons (stable codes) ----
  "cleanup.reason.not-allowed": "Not in an allowed cleanup location",
  "cleanup.reason.missing": "File no longer exists",
  "cleanup.reason.changed": "File changed; skipped",
  "cleanup.reason.not-empty": "Folder is no longer empty",
  "cleanup.reason.contains-hidden": "Contains a hidden folder",
  "cleanup.reason.error": "Could not complete the operation",

  // ---- Actions ----
  "action.retry": "Retry",
  "action.rescan": "Rescan",
  "action.details": "Details",
  "action.collapse": "Collapse",
  "action.copyPath": "Copy path",
  "action.copyReport": "Copy scan report",
  "action.openFile": "Open file",
  "action.moveToTrash": "Move to .trash",
  "action.deletePermanently": "Delete permanently",
  "action.emptyTrash": "Empty .trash",
  "action.selectMultiple": "Select",
  "action.cancelSelection": "Cancel selection",
  "action.selectAll": "Select all",
  "action.deselectAll": "Deselect all",
  "action.retryFailed": "Retry failed items",
  "action.retryEmptyTrash": "Retry emptying",
  "action.restore": "Restore",
  "action.restoreHere": "Restore here",
  "action.retryRestore": "Retry restore",

  // ---- Status ----
  "status.busyCleaningScan": "Cleaning is still running. Rescan when it finishes.",
  "status.busyScanningCleanup": "A scan is still running. Clean up when it finishes.",
  "status.busyScanningEmptyTrash": "A scan is still running. Empty .trash when it finishes.",
  "status.busyScanningRestore": "A scan is still running. Restore when it finishes.",
  "status.rescanning": "Rescanning…",
  "status.scanComplete": "Scan complete",
  "status.scanCompleteDetail": "Took {duration}",
  "status.lastScanResult": "Showing last scan result",
  "status.scanDuration": "Took {duration}",
  "status.scanFinishedAt": "Finished {time}",
  "status.deletingFolders": "Deleting empty folders…",
  "status.movingToTrash": "Moving to .trash…",
  "status.emptyingTrash": "Emptying .trash…",
  "status.restoring": "Restoring…",
  "status.rescanFailedNote": "The rescan failed; the overview may be out of date.",
  "status.noteSeparator": " ",
  "status.cleanupRescanFailedTitle": "Cleanup finished, but the rescan failed",
  "status.cleanupRescanFailedDetail": "Successful items were removed from the list. Overview totals may not be up to date yet.",
  "status.unknownError": "Unknown error",
  "status.scanFailedShowingLast": "Scan failed; showing the last result",
  "status.dismissAria": "Dismiss status message",

  // ---- Plugin metadata ----
  "plugins.unknownVersion": "Unknown version",
  "plugins.metaVersion": "Version: {version}",
  "plugins.metaFileCount": "Files: {count}",
  "plugins.metaModified": "Last modified: {time}",

  // ---- File metadata ----
  "file.size": "Size: {size}",
  "file.modified": "Modified: {time}",

  // ---- Navigation ----
  "nav.back": "Back",
  "nav.backAria": "Back one level",
  "nav.breadcrumbAria": "Location",

  // ---- Sorting ----
  "sort.aria": "Sort by",
  "sort.label": "Sort: {sort}",
  "sort.size": "Size",
  "sort.name": "Name",
  "sort.mtime": "Modified",

  // ---- Folder rows ----
  "folder.rootFiles": "Files in the root folder",

  // ---- Settings tab ----
  "settings.open.name": "Open Storage Cleanup",
  "settings.open.desc": "View storage use across vault content, plugin data, and .trash.",
  "settings.open.button": "Open",
  "settings.about.page": "About",
  "settings.about.pageDesc": "Product, author, and feedback.",
  "settings.about.version": "Version {version}",
  "settings.about.author": "Author",
  "settings.about.authorName": "Jiao Yingxing (焦应行)",
  "settings.about.feedback": "Feedback",
  "settings.about.feedbackDesc": "If you run into a problem, open an issue on GitHub or send me a message on Xiaohongshu.",
  "settings.notice.page": "Usage notes",
  "settings.notice.pageDesc": "Scan scope, read-only boundaries, cleanup behavior, privacy, and tips.",
  "settings.notice.scope": "What is scanned",
  "settings.notice.scopeDesc": "Scans only vault content, the configuration folder, and .trash in the current vault. App-level caches, Sync and Publish, cloud drives, and the system trash are not scanned.",
  "settings.notice.readonly": "Read-only boundaries",
  "settings.notice.readonlyDesc": "Plugin data, configuration, themes, and caches are read-only; no delete actions are offered.",
  "settings.notice.cleanup": "How cleanup works",
  "settings.notice.cleanupDesc": "Large files and zero-byte files are moved to .trash and can be restored to a folder you choose in this plugin. Empty folders and emptying .trash are permanent and require confirmation. Nothing is cleaned automatically.",
  "settings.notice.privacy": "Privacy",
  "settings.notice.privacyDesc": "This plugin is open source. It does not connect to the network, collect data, or include telemetry, ads, or accounts.",
  "settings.notice.caution": "Before you clean",
  "settings.notice.cautionDesc": "Cleanup changes files in your vault. Check paths and sizes before you start; deletions only run when you start them.",
  "settings.contact.github": "GitHub",
  "settings.contact.xiaohongshu": "Xiaohongshu",

  // ---- Notices ----
  "notice.pathCopied": "Path copied",
  "notice.pluginPathCopied": "Plugin path copied",
  "notice.reportCopied": "Report copied",
  "notice.noReport": "No report to copy yet",
  "notice.copyFailed": "Could not copy",
  "notice.fileMissing": "File no longer exists",

  // ---- Read errors ----
  "errors.unreadable.one": "{count} location could not be read",
  "errors.unreadable.other": "{count} locations could not be read",

  // ---- Formatting ----
  "format.unknown": "Unknown",
  "format.seconds": "{value} s",

  // ---- Confirm modal ----
  "modal.cancel": "Cancel",
  "modal.morePaths": "and {count} more…",

  // ---- Copy report ----
  "report.title": "Storage Cleanup scan",
  "report.vault": "Vault: {vault}",
  "report.configDir": "Config: {configDir}",
  "report.duration": "Duration: {duration}",
  "report.content": "Content: {size} / {files}",
  "report.trash": ".trash: {size} / {files}",
  "report.trashMissing": ".trash: not found",
  "report.plugins": "Plugins: {size} / {files} / {plugins}",
  "report.config": "Config & themes: {size} / {files}",
  "report.other": "Other & hidden: {size} / {files}",
  "report.total": "Total: {size}",
  "report.topContent": "Largest content files:",
  "report.topTrash": "Largest .trash files:",
  "report.pluginsHeading": "Plugins:",
  "report.errors": "Errors:",
  "report.none": "(none)",
  "report.pluginLine": "  {size}  {name} ({id}) {version} / {files}",
  "report.errorLine": "  {path}: {message}"
};

export default en;
