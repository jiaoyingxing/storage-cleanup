/**
 * Storage Cleanup Simplified Chinese locale (zh-CN).
 * Key set and placeholders must match `en.ts` exactly.
 */
import type { LocaleStrings } from "./types";

const zhCN: LocaleStrings = {
  // ---- 命令与 ribbon ----
  "command.openStorageMap": "打开存储清理",
  "notice.openFailed": "打开存储清理失败",

  // ---- 视图外壳 ----
  "view.title": "存储清理",
  "view.more": "更多",
  "view.scanning": "正在扫描…",
  "view.scanFailedTitle": "扫描失败",

  // ---- 类目 ----
  "category.content": "内容文件",
  "category.plugins": "插件数据",
  "category.config": "配置与主题",
  "category.trashSub": "Obsidian 回收站",
  "category.other": "其他与隐藏",

  // ---- 内容类型 ----
  "contentType.notes": "笔记",
  "contentType.images": "图片",
  "contentType.audio": "音频",
  "contentType.video": "视频",
  "contentType.documents": "PDF 与文档",
  "contentType.archives": "压缩包",
  "contentType.other": "其他文件",

  // ---- 配置分组 ----
  "configGroup.themes": "主题",
  "configGroup.snippets": "片段",
  "configGroup.icons": "图标",
  "configGroup.config": "配置",
  "configGroup.cache": "缓存与临时",
  "configGroup.other": "其他",

  // ---- .trash ----
  "trash.missing": "未找到 .trash。系统回收站不在扫描范围内。",
  "trash.emptyList": "没有可显示的 .trash 文件。",
  "trash.dangerNote": "Obsidian 回收站；清空后永久删除，无法恢复。",
  "trash.empty": ".trash 为空。",
  "trash.actionbar": "{files} · {size}",

  // ---- 内容分组 ----
  "content.groupByType": "按类型",
  "content.groupByFolder": "按文件夹",
  "content.largestFiles": "最大文件",

  // ---- 空状态 ----
  "empty.category": "这个类目还没有文件。",
  "empty.configGroup": "这个分组还没有文件。",
  "empty.folder": "这个文件夹还没有文件。",
  "empty.folderGone": "文件夹已不存在。",
  "empty.pluginGone": "插件已不存在。",
  "empty.plugins": "没有找到插件数据。",

  // ---- 数量（复数变体） ----
  "count.files.one": "{count} 个文件",
  "count.files.other": "{count} 个文件",
  "count.plugins.one": "{count} 个插件",
  "count.plugins.other": "{count} 个插件",
  "count.folders.one": "{count} 个文件夹",
  "count.folders.other": "{count} 个文件夹",
  "count.subfolders.one": "{count} 个子文件夹",
  "count.subfolders.other": "{count} 个子文件夹",
  "total.label": "合计",

  // ---- 清理 ----
  "cleanup.title": "清理",
  "cleanup.none": "没有可清理项。",
  "cleanup.noneSelected": "未选择",
  "cleanup.largeTitle": "大文件（≥{threshold}）",
  "cleanup.largeLabel": "大文件",
  "cleanup.zeroTitle": "0 字节文件",
  "cleanup.foldersTitle": "空文件夹",
  "cleanup.largeCount.one": "{count} 个大文件",
  "cleanup.largeCount.other": "{count} 个大文件",
  "cleanup.zeroCount.one": "{count} 个 0 字节文件",
  "cleanup.zeroCount.other": "{count} 个 0 字节文件",
  "cleanup.foldersCount.one": "{count} 个空文件夹",
  "cleanup.foldersCount.other": "{count} 个空文件夹",
  "cleanup.totalSize": "共 {size}",
  "cleanup.selectedWithSize": "已选 {count} 个 · {size}",
  "cleanup.selectedCount": "已选 {count} 个",
  "cleanup.selectedFiles.one": "已选 {count} 个文件",
  "cleanup.selectedFiles.other": "已选 {count} 个文件",
  "cleanup.selectedFolders.one": "已选 {count} 个文件夹",
  "cleanup.selectedFolders.other": "已选 {count} 个文件夹",
  "cleanup.confirmDeleteFoldersTitle.one": "永久删除 {count} 个空文件夹？",
  "cleanup.confirmDeleteFoldersTitle.other": "永久删除 {count} 个空文件夹？",
  "cleanup.confirmDeleteFoldersMessage.one": "这个文件夹内没有任何文件；删除后无法恢复。",
  "cleanup.confirmDeleteFoldersMessage.other": "这些文件夹内没有任何文件；删除后无法恢复。",
  "cleanup.confirmTrashTitle": "移入 .trash？",
  "cleanup.confirmTrashMessageLarge.one": "将 {count} 个文件（共 {size}）移入 .trash，之后可从 .trash 恢复。",
  "cleanup.confirmTrashMessageLarge.other": "将 {count} 个文件（共 {size}）移入 .trash，之后可从 .trash 恢复。",
  "cleanup.confirmTrashMessage.one": "将 {count} 个文件移入 .trash，之后可从 .trash 恢复。",
  "cleanup.confirmTrashMessage.other": "将 {count} 个文件移入 .trash，之后可从 .trash 恢复。",
  "cleanup.confirmEmptyTrashTitle": "清空 .trash？",
  "cleanup.confirmEmptyTrashMessage.one": "将永久删除 {count} 个文件，共 {size}。此操作无法撤销。",
  "cleanup.confirmEmptyTrashMessage.other": "将永久删除 {count} 个文件，共 {size}。此操作无法撤销。",
  "cleanup.doneTitle": "清理完成",
  "cleanup.failedTitle": "清理失败",
  "cleanup.failureLine": "{path}：{reason}",
  "cleanup.failureLineWithDetail": "{path}：{reason}（{detail}）",
  "cleanup.unknownPath": "未知路径",
  "cleanup.viewFailures": "查看失败项",
  "cleanup.movedTitle": "已移入 .trash",
  "cleanup.deletedTitle": "已永久删除",
  "cleanup.emptiedTrashTitle": "已清空 .trash",
  "cleanup.sizeSuffix": "，共 {size}",
  "cleanup.freedSuffix": "，释放 {size}",
  "cleanup.countSucceeded": "{count} 个成功",
  "cleanup.countSkipped": "{count} 个跳过",
  "cleanup.countFailed": "{count} 个失败",
  "cleanup.countSeparator": "，",
  "cleanup.emptyLarge": "没有超过 {threshold} 的内容文件。",
  "cleanup.emptyZero": "没有 0 字节文件。",
  "cleanup.emptyFolders": "没有空文件夹。",

  // ---- 清理失败原因（稳定 code） ----
  "cleanup.reason.not-allowed": "不在允许清理的范围",
  "cleanup.reason.missing": "文件已不存在",
  "cleanup.reason.changed": "文件已变化，未处理",
  "cleanup.reason.not-empty": "文件夹已不空",
  "cleanup.reason.contains-hidden": "包含隐藏文件夹",
  "cleanup.reason.error": "操作未能完成",

  // ---- 动作 ----
  "action.retry": "重试",
  "action.rescan": "重新扫描",
  "action.details": "详情",
  "action.collapse": "收起",
  "action.copyPath": "复制路径",
  "action.copyReport": "复制扫描报告",
  "action.openFile": "打开文件",
  "action.moveToTrash": "移入 .trash",
  "action.deletePermanently": "永久删除",
  "action.emptyTrash": "清空 .trash",
  "action.selectMultiple": "多选",
  "action.cancelSelection": "取消多选",
  "action.selectAll": "全选",
  "action.deselectAll": "取消全选",
  "action.retryFailed": "重试失败项",
  "action.retryEmptyTrash": "重试清空",

  // ---- 状态 ----
  "status.busyCleaningScan": "正在清理，完成后再扫描",
  "status.busyScanningCleanup": "正在扫描，完成后再清理",
  "status.busyScanningEmptyTrash": "正在扫描，完成后再清空",
  "status.rescanning": "正在重新扫描…",
  "status.scanComplete": "扫描完成",
  "status.scanCompleteDetail": "用时 {duration}",
  "status.lastScanResult": "上次扫描结果",
  "status.scanDuration": "用时：{duration}",
  "status.scanFinishedAt": "完成于：{time}",
  "status.deletingFolders": "正在删除空文件夹…",
  "status.movingToTrash": "正在移入 .trash…",
  "status.emptyingTrash": "正在清空 .trash…",
  "status.rescanFailedNote": "重新扫描失败，总览可能未更新",
  "status.noteSeparator": "；",
  "status.cleanupRescanFailedTitle": "清理完成，但重新扫描失败",
  "status.cleanupRescanFailedDetail": "成功项已从列表移除；总览数据可能尚未更新。",
  "status.unknownError": "未知错误",
  "status.scanFailedShowingLast": "扫描失败，显示上次结果",
  "status.dismissAria": "关闭状态提示",

  // ---- 插件元数据 ----
  "plugins.unknownVersion": "版本未知",
  "plugins.metaVersion": "版本：{version}",
  "plugins.metaFileCount": "文件数：{count}",
  "plugins.metaModified": "最后修改：{time}",

  // ---- 文件元数据 ----
  "file.size": "大小：{size}",
  "file.modified": "修改于：{time}",

  // ---- 导航 ----
  "nav.back": "返回",
  "nav.backAria": "返回上一级",
  "nav.breadcrumbAria": "所在位置",

  // ---- 排序 ----
  "sort.aria": "排序方式",
  "sort.label": "排序：{sort}",
  "sort.size": "大小",
  "sort.name": "名称",
  "sort.mtime": "修改时间",

  // ---- 文件夹行 ----
  "folder.rootFiles": "根目录文件",

  // ---- 设置页 ----
  "settings.open.name": "打开存储清理",
  "settings.open.desc": "查看仓库、插件数据与 .trash 的存储占用。",
  "settings.open.button": "打开",
  "settings.about.page": "关于",
  "settings.about.pageDesc": "产品、作者与问题反馈。",
  "settings.about.version": "版本 {version}",
  "settings.about.author": "作者",
  "settings.about.authorName": "焦应行（Jiao Yingxing）",
  "settings.about.feedback": "问题反馈",
  "settings.about.feedbackDesc": "使用中遇到问题，可在 GitHub 提交 Issue，或通过小红书私信联系我。",
  "settings.notice.page": "使用须知",
  "settings.notice.pageDesc": "扫描范围、只读边界、清理语义、隐私与操作提示。",
  "settings.notice.scope": "扫描范围",
  "settings.notice.scopeDesc": "只扫描当前仓库的 Vault 内容、配置目录与 .trash。应用级缓存、Obsidian Sync 与 Publish、云盘与系统回收站不在扫描范围内。",
  "settings.notice.readonly": "只读边界",
  "settings.notice.readonlyDesc": "插件数据、配置、主题与缓存只读，不提供删除入口。",
  "settings.notice.cleanup": "清理语义",
  "settings.notice.cleanupDesc": "大文件与 0 字节文件移入 .trash 后可恢复；空文件夹与清空 .trash 为永久删除，执行前会二次确认。没有自动清理。",
  "settings.notice.privacy": "隐私",
  "settings.notice.privacyDesc": "本插件开源，不联网、不收集数据、无遥测、无广告、无账号。",
  "settings.notice.caution": "操作提示",
  "settings.notice.cautionDesc": "清理会改变仓库文件。执行前请核对路径与大小；删除动作只由你手动发起。",
  "settings.contact.github": "GitHub",
  "settings.contact.xiaohongshu": "小红书",

  // ---- 提示 ----
  "notice.pathCopied": "路径已复制",
  "notice.pluginPathCopied": "插件路径已复制",
  "notice.reportCopied": "报告已复制",
  "notice.noReport": "还没有可复制的报告",
  "notice.copyFailed": "复制失败",
  "notice.fileMissing": "文件不存在",

  // ---- 读取错误 ----
  "errors.unreadable.one": "有 {count} 个位置无法读取",
  "errors.unreadable.other": "有 {count} 个位置无法读取",

  // ---- 格式化 ----
  "format.unknown": "未知",
  "format.seconds": "{value} 秒",

  // ---- 确认弹窗 ----
  "modal.cancel": "取消",
  "modal.morePaths": "还有 {count} 个…",

  // ---- 复制报告 ----
  "report.title": "存储清理扫描报告",
  "report.vault": "仓库：{vault}",
  "report.configDir": "配置目录：{configDir}",
  "report.duration": "用时：{duration}",
  "report.content": "内容文件：{size} / {files}",
  "report.trash": ".trash：{size} / {files}",
  "report.trashMissing": ".trash：未找到",
  "report.plugins": "插件数据：{size} / {files} / {plugins}",
  "report.config": "配置与主题：{size} / {files}",
  "report.other": "其他与隐藏：{size} / {files}",
  "report.total": "总计：{size}",
  "report.topContent": "最大的内容文件：",
  "report.topTrash": "最大的 .trash 文件：",
  "report.pluginsHeading": "插件数据：",
  "report.errors": "读取错误：",
  "report.none": "（无）",
  "report.pluginLine": "  {size}  {name} ({id}) {version} / {files}",
  "report.errorLine": "  {path}：{message}"
};

export default zhCN;
