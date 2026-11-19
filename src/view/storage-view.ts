import { ItemView, Menu, Scope, TFile, setIcon, setTooltip } from "obsidian";
import type { EventRef, WorkspaceLeaf } from "obsidian";
import type StorageCleanupPlugin from "../main";
import type { I18n } from "../i18n";
import {
  deleteEmptyFolders,
  emptyTrash,
  moveFilesToTrash
} from "../cleanup/actions";
import { applyCleanupResult } from "../cleanup/apply-result";
import type { CleanupResult } from "../cleanup/actions";
import {
  LARGE_FILE_THRESHOLD_BYTES,
  selectLargeFiles,
  selectZeroByteFiles
} from "../cleanup/candidates";
import {
  buildFolderTree,
  contentTypeForPath,
  sortEntries
} from "../scan/aggregate";
import {
  formatBytes,
  formatDateTime,
  formatDurationShort,
  formatPercent
} from "../scan/format";
import { buildReportText } from "../scan/report";
import { scanStorage } from "../scan/scanner";
import type {
  ContentTypeKey,
  FileEntry,
  FolderNode,
  PluginEntry,
  ScanResult,
  SortKey
} from "../scan/types";
import { CleanupConfirmModal } from "./cleanup-modal";
import { computeBottomInset } from "./bottom-inset";
import type { InsetRect } from "./bottom-inset";

export const VIEW_TYPE_STORAGE_CLEANUP = "storage-cleanup-view";

type CleanupKind = "large" | "zero" | "folders";

type Page =
  | { kind: "overview" }
  | { kind: "content" }
  | { kind: "content-type"; typeKey: ContentTypeKey }
  | { kind: "folder"; root: "content" | "other"; path: string }
  | { kind: "trash" }
  | { kind: "trash-folder"; path: string }
  | { kind: "plugins" }
  | { kind: "plugin"; pluginId: string }
  | { kind: "plugin-folder"; pluginId: string; path: string }
  | { kind: "config" }
  | { kind: "config-group"; groupKey: string }
  | { kind: "config-folder"; groupKey: string; path: string }
  | { kind: "cleanup-hub" }
  | { kind: "cleanup"; cleanupKind: CleanupKind }
  | { kind: "other" };

type ContentGroup = "type" | "folder";

interface PageState {
  page: Page;
  scrollTop: number;
  sort: SortKey;
  contentGroup: ContentGroup;
  expandedPath: string | null;
  rootFilesOpen: boolean;
  selectedPaths: string[];
  cleanupMulti: boolean;
}

interface CrumbSegment {
  label: string;
  index: number;
  contentGroup?: ContentGroup;
}

interface RowOptions {
  icon: string;
  tileColor?: string;
  label: string;
  sub: string | string[];
  sizeText?: string;
  percentText?: string;
  onClick?: () => void;
}

interface ToolbarAction {
  icon?: string;
  label: string;
  onClick: () => void;
}

interface CleanupCandidate {
  path: string;
  name: string;
  size: number;
  kind: "file" | "folder";
  file?: FileEntry;
}

type StatusScope = "view" | "page";

interface StatusAction {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface StatusState {
  kind: "running" | "success" | "info" | "error";
  scope: StatusScope;
  title: string;
  detail?: string;
  icon?: string;
  details?: string[];
  detailsLabel?: string;
  detailsOpen?: boolean;
  action?: StatusAction;
  dismissible?: boolean;
}

const SORT_KEYS: Record<SortKey, string> = {
  size: "sort.size",
  name: "sort.name",
  mtime: "sort.mtime"
};

const CLEANUP_KEYS: Record<CleanupKind, string> = {
  large: "cleanup.largeLabel",
  zero: "cleanup.zeroTitle",
  folders: "cleanup.foldersTitle"
};

const LARGE_FILE_THRESHOLD_LABEL = formatBytes(
  LARGE_FILE_THRESHOLD_BYTES
).replace(".0 ", " ");

// 分类色染行首底纹（对齐社区插件页：色块 + 反白图标）；
// other 无专属色，保持中性底纹。图标反白色见 createRow 的 --sc-tile-fg。
const CATEGORY_COLORS = {
  content: "var(--color-accent)",
  trash: "var(--color-orange)",
  plugins: "var(--color-cyan)",
  config: "var(--color-blue)"
};

const CONTENT_TYPE_ICONS: Record<ContentTypeKey, string> = {
  notes: "pencil",
  images: "image",
  audio: "volume-2",
  video: "video",
  documents: "book-open",
  archives: "archive",
  other: "file"
};

const CONFIG_GROUP_ICONS: Record<string, string> = {
  themes: "palette",
  snippets: "code",
  icons: "image",
  config: "settings",
  cache: "database",
  other: "folder"
};

export class StorageCleanupView extends ItemView {
  private readonly plugin: StorageCleanupPlugin;
  private stack: PageState[] = [createPageState({ kind: "overview" })];
  private scanning = false;
  private scanError: string | null = null;
  private showingSkeleton = false;
  private cleaning = false;
  private readonly cleanupSelections = new Map<CleanupKind, string[]>();
  private errorsOpen = false;
  private folderCache = new Map<string, FolderNode>();
  private actionsAdded = false;
  private scrollerEl: HTMLElement | null = null;
  private statusLayerEl: HTMLElement | null = null;
  private status: StatusState | null = null;
  private statusRenderKey = "";
  private statusDelayTimer: number | null = null;
  private statusHideTimer: number | null = null;
  private statusMetricsFrame: number | null = null;
  private layoutObserver: ResizeObserver | null = null;
  private bottomInsetObserver: MutationObserver | null = null;
  private bottomBarObserver: ResizeObserver | null = null;
  private bottomInsetResizeHandler: (() => void) | null = null;
  private bottomInsetScrollHandler: (() => void) | null = null;
  private bottomInsetLayoutRef: EventRef | null = null;
  private bottomInsetFrame: number | null = null;
  private bottomInsetTimer: number | null = null;
  private readonly bottomInsetSettleTimers: number[] = [];
  private breadcrumbNav: HTMLElement | null = null;
  private breadcrumbObserver: ResizeObserver | null = null;
  private breadcrumbFrame: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: StorageCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  private get i18n(): I18n {
    return this.plugin.i18n;
  }

  getViewType(): string {
    return VIEW_TYPE_STORAGE_CLEANUP;
  }

  getDisplayText(): string {
    return this.i18n.t("view.title");
  }

  getIcon(): string {
    return "hard-drive";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("storage-cleanup-view");
    this.contentEl.empty();
    const shell = this.contentEl.createDiv({ cls: "sc-shell" });
    this.scrollerEl = shell.createDiv({ cls: "sc-scroll" });
    this.statusLayerEl = shell.createDiv({ cls: "sc-status-layer" });
    this.setupBottomInset();
    if (typeof ResizeObserver !== "undefined") {
      this.layoutObserver = new ResizeObserver(() => {
        this.scheduleStatusMetrics();
      });
      this.layoutObserver.observe(this.contentEl);
    }
    this.addHeaderActions();
    if (!this.scope) {
      this.scope = new Scope(this.app.scope);
      this.scope.register([], "Escape", (event) => {
        if (this.stack.length <= 1) return true;
        event.preventDefault();
        this.back();
        return false;
      });
    }
    if (this.plugin.lastResult) {
      this.renderCurrent();
    } else {
      this.startInitialScan();
    }
  }

  private startInitialScan(): void {
    // 先把总览骨架画上屏，再把扫描让到下一帧之后：
    // 打开瞬间就有内容，扫描不再阻塞视图打开与 revealLeaf。
    this.renderCurrent();
    const run = (): void => {
      if (!this.scrollerEl) return;
      if (this.plugin.lastResult) {
        this.renderCurrent();
        return;
      }
      void this.scan(false);
    };
    const schedule = (): void => {
      window.requestAnimationFrame(() => {
        window.setTimeout(run, 0);
      });
    };
    if (this.app.workspace.layoutReady) {
      schedule();
    } else {
      // 随工作区启动恢复的视图等宿主就绪再扫，避免与启动争主线程、空文件夹候选不全
      this.app.workspace.onLayoutReady(schedule);
    }
  }

  async onClose(): Promise<void> {
    this.teardownBottomInset();
    this.teardownBreadcrumb();
    this.clearStatusTimers();
    if (this.statusMetricsFrame !== null) {
      window.cancelAnimationFrame(this.statusMetricsFrame);
      this.statusMetricsFrame = null;
    }
    this.layoutObserver?.disconnect();
    this.layoutObserver = null;
    this.scrollerEl = null;
    this.statusLayerEl = null;
    this.status = null;
    this.contentEl.empty();
  }

  private addHeaderActions(): void {
    if (this.actionsAdded) return;
    this.actionsAdded = true;
    this.addAction("circle-plus", this.i18n.t("view.more"), (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openQuickActionsMenu(event);
    });
  }

  private async scan(manual: boolean): Promise<boolean> {
    if (this.scanning) return false;
    if (this.cleaning) {
      if (manual) {
        this.showInfoStatus(this.i18n.t("status.busyCleaningScan"), "info", 2500);
      }
      return false;
    }
    this.scanning = true;
    if (manual && this.plugin.lastResult) {
      this.showRunningStatus(this.i18n.t("status.rescanning"));
    }

    try {
      const result = await scanStorage(this.app);
      this.plugin.lastResult = result;
      this.plugin.lastScanAt = Date.now();
      this.folderCache.clear();
      this.scanError = null;
      if (manual) {
        this.showSuccessStatus(
          this.i18n.t("status.scanComplete"),
          this.i18n.t("status.scanCompleteDetail", {
            duration: formatDurationShort(result.durationMs, this.i18n)
          })
        );
      }
      return true;
    } catch (error) {
      this.scanError = errorMessage(error);
      if (manual && this.plugin.lastResult) {
        this.showScanFailureStatus();
      }
      return false;
    } finally {
      this.scanning = false;
      this.saveScroll();
      this.renderCurrent();
    }
  }

  private renderCurrent(): void {
    if (!this.scrollerEl) return;
    const state = this.current();
    this.breadcrumbNav = null;
    this.breadcrumbObserver?.disconnect();
    this.scrollerEl.empty();
    const root = this.scrollerEl.createDiv({ cls: "sc-inner" });

    const result = this.plugin.lastResult;
    if (!result) {
      this.renderScanPlaceholder(root);
      this.scrollerEl.scrollTop = state.scrollTop;
      this.renderStatus();
      this.scheduleStatusMetrics();
      this.scheduleBottomInsetRefresh();
      return;
    }

    if (this.showingSkeleton) {
      this.showingSkeleton = false;
      this.scrollerEl.removeAttribute("aria-busy");
      root.addClass("is-entering");
    }

    switch (state.page.kind) {
      case "overview":
        this.renderOverview(root, result);
        break;
      case "content":
        this.renderContent(root, result);
        break;
      case "content-type":
        this.renderContentType(root, result, state.page.typeKey);
        break;
      case "folder":
        this.renderFolder(root, result, state.page);
        break;
      case "trash":
        this.renderTrash(root, result);
        break;
      case "trash-folder":
        this.renderTrashFolder(root, result, state.page.path);
        break;
      case "plugins":
        this.renderPlugins(root, result);
        break;
      case "plugin":
        this.renderPlugin(root, result, state.page.pluginId);
        break;
      case "plugin-folder":
        this.renderPluginFolder(root, result, state.page.pluginId, state.page.path);
        break;
      case "config":
        this.renderConfig(root, result);
        break;
      case "config-group":
        this.renderConfigGroup(root, result, state.page.groupKey);
        break;
      case "config-folder":
        this.renderConfigFolder(root, result, state.page.groupKey, state.page.path);
        break;
      case "cleanup":
        this.renderCleanup(root, result, state.page.cleanupKind);
        break;
      case "cleanup-hub":
        this.renderCleanupHub(root, result);
        break;
      case "other":
        this.renderOther(root, result);
        break;
    }

    this.scrollerEl.scrollTop = state.scrollTop;
    this.renderStatus();
    this.scheduleStatusMetrics();
    this.scheduleBottomInsetRefresh();
  }

  private renderScanPlaceholder(root: HTMLElement): void {
    if (this.scanError) {
      this.showingSkeleton = false;
      this.scrollerEl?.removeAttribute("aria-busy");
      const error = root.createDiv({ cls: "sc-empty sc-empty-error" });
      error.createDiv({ cls: "sc-empty-title", text: this.i18n.t("view.scanFailedTitle") });
      error.createDiv({ cls: "sc-empty-note", text: this.scanError });
      const retry = this.createActionButton(error, null, this.i18n.t("action.retry"), () => {
        void this.scan(true);
      });
      retry.addClass("sc-empty-action");
      return;
    }

    // 骨架复用总览几何（头部 / 比例条 / 五行列表），扫描完成后同尺寸换内容，不跳版。
    this.showingSkeleton = true;
    this.scrollerEl?.setAttr("aria-busy", "true");

    const head = root.createDiv({ cls: "sc-overview-head" });
    const scanning = head.createDiv({ cls: "sc-scan-head" });
    scanning.setAttr("role", "status");
    scanning.setAttr("aria-live", "polite");
    const spinner = scanning.createSpan({
      cls: "sc-scan-spinner",
      attr: { "aria-hidden": "true" }
    });
    setIcon(spinner, "refresh-cw");
    scanning.createSpan({ text: this.i18n.t("view.scanning") });
    head.createDiv({ cls: "sc-vault", text: this.app.vault.getName() });

    const bar = root.createDiv({ cls: "sc-bar sc-skeleton-bar", attr: { "aria-hidden": "true" } });
    bar.createSpan({ cls: "sc-skeleton-block" });

    const widths = [
      { title: 34, sub: 23, size: 58, pct: 30 },
      { title: 28, sub: 18, size: 52, pct: 26 },
      { title: 37, sub: 20, size: 56, pct: 28 },
      { title: 22, sub: 30, size: 48, pct: 24 },
      { title: 31, sub: 19, size: 50, pct: 25 }
    ];
    for (const width of widths) {
      const row = root.createDiv({
        cls: "sc-row sc-row-static",
        attr: { "aria-hidden": "true" }
      });
      row.createSpan({ cls: "sc-row-icon sc-skeleton-tile" });
      const main = row.createSpan({ cls: "sc-row-main" });
      this.createSkeletonBlock(main, `${width.title}%`, 13);
      this.createSkeletonBlock(main, `${width.sub}%`, 11);
      const value = row.createSpan({ cls: "sc-row-value" });
      this.createSkeletonBlock(value, `${width.size}px`, 12);
      this.createSkeletonBlock(value, `${width.pct}px`, 10);
    }
  }

  private createSkeletonBlock(parent: HTMLElement, width: string, height: number): void {
    const block = parent.createSpan({ cls: "sc-skeleton-block" });
    block.style.width = width;
    block.style.height = `${height}px`;
  }

  private renderOverview(root: HTMLElement, result: ScanResult): void {
    const head = root.createDiv({ cls: "sc-overview-head" });
    const used = head.createDiv({ cls: "sc-used" });
    used.createSpan({ cls: "sc-used-value", text: formatBytes(result.totalSize) });
    head.createDiv({ cls: "sc-vault", text: result.vaultName });

    this.renderBar(root, result);

    this.createRow(root, {
      icon: "file-text",
      tileColor: CATEGORY_COLORS.content,
      label: this.i18n.t("category.content"),
      sub: this.i18n.t("count.files", { count: result.content.fileCount }),
      sizeText: formatBytes(result.content.totalSize),
      percentText: formatPercent(result.content.totalSize, result.totalSize),
      onClick: () => this.push({ kind: "content" })
    });

    this.createRow(root, {
      icon: "puzzle",
      tileColor: CATEGORY_COLORS.plugins,
      label: this.i18n.t("category.plugins"),
      sub: this.i18n.t("count.plugins", { count: result.plugins.entries.length }),
      sizeText: formatBytes(result.plugins.totalSize),
      percentText: formatPercent(result.plugins.totalSize, result.totalSize),
      onClick: () => this.push({ kind: "plugins" })
    });

    this.createRow(root, {
      icon: "sliders-horizontal",
      tileColor: CATEGORY_COLORS.config,
      label: this.i18n.t("category.config"),
      sub: this.i18n.t("count.files", { count: result.config.fileCount }),
      sizeText: formatBytes(result.config.totalSize),
      percentText: formatPercent(result.config.totalSize, result.totalSize),
      onClick: () => this.push({ kind: "config" })
    });

    if (result.trashExists) {
      this.createRow(root, {
        icon: "trash-2",
        tileColor: CATEGORY_COLORS.trash,
        label: ".trash",
        sub: [
          this.i18n.t("category.trashSub"),
          this.i18n.t("count.files", { count: result.trash.fileCount })
        ],
        sizeText: formatBytes(result.trash.totalSize),
        percentText: formatPercent(result.trash.totalSize, result.totalSize),
        onClick: () => this.push({ kind: "trash" })
      });
    } else {
      this.createRow(root, {
        icon: "trash-2",
        tileColor: CATEGORY_COLORS.trash,
        label: ".trash",
        sub: this.i18n.t("trash.missing")
      });
    }

    this.createRow(root, {
      icon: "folder",
      label: this.i18n.t("category.other"),
      sub: this.i18n.t("count.files", { count: result.other.fileCount }),
      sizeText: formatBytes(result.other.totalSize),
      percentText: formatPercent(result.other.totalSize, result.totalSize),
      onClick: () => this.push({ kind: "other" })
    });

    this.renderCleanupEntry(root, result);

    if (result.errors.length > 0) {
      this.renderErrors(root, result);
    }
  }

  private renderBar(root: HTMLElement, result: ScanResult): void {
    const bar = root.createDiv({ cls: "sc-bar" });
    bar.setAttr("aria-hidden", "true");
    if (result.totalSize <= 0) return;

    const segments: Array<{ size: number; cls: string }> = [
      { size: result.content.totalSize, cls: "sc-bar-content" },
      { size: result.plugins.totalSize, cls: "sc-bar-plugins" },
      { size: result.config.totalSize, cls: "sc-bar-config" },
      { size: result.trash.totalSize, cls: "sc-bar-trash" },
      { size: result.other.totalSize, cls: "sc-bar-other" }
    ];
    for (const segment of segments) {
      if (segment.size <= 0) continue;
      const element = bar.createSpan({ cls: `sc-bar-seg ${segment.cls}` });
      element.setCssProps({ "--sc-flex-grow": String(segment.size) });
    }
  }

  private renderCleanupEntry(root: HTMLElement, result: ScanResult): void {
    const largeFiles = selectLargeFiles(result.contentFiles);
    const zeroFiles = selectZeroByteFiles(result.contentFiles);
    const emptyFolders = result.emptyFolders;
    const parts: string[] = [];
    if (largeFiles.length > 0) {
      parts.push(this.i18n.t("cleanup.largeCount", { count: largeFiles.length }));
    }
    if (zeroFiles.length > 0) {
      parts.push(this.i18n.t("cleanup.zeroCount", { count: zeroFiles.length }));
    }
    if (emptyFolders.length > 0) {
      parts.push(this.i18n.t("cleanup.foldersCount", { count: emptyFolders.length }));
    }
    if (parts.length === 0) return;

    this.createRow(root, {
      icon: "brush-cleaning",
      label: this.i18n.t("cleanup.title"),
      sub: parts,
      onClick: () => this.push({ kind: "cleanup-hub" })
    });
  }

  private renderContent(root: HTMLElement, result: ScanResult): void {
    this.renderPageHeader(root);
    const controls = root.createDiv({ cls: "sc-controls" });
    this.renderSegmented(controls);
    this.renderSortControl(controls);

    let hasList = false;
    if (this.current().contentGroup === "type") {
      const types = sortEntries(
        result.contentTypes.map((type) => ({
          ...type,
          name: this.i18n.t(`contentType.${type.key}`),
          size: type.totalSize,
          mtime: 0
        })),
        this.current().sort
      );
      for (const type of types) {
        this.createRow(root, {
          icon: CONTENT_TYPE_ICONS[type.key],
          label: type.name,
          sub: this.i18n.t("count.files", { count: type.fileCount }),
          sizeText: formatBytes(type.totalSize),
          onClick: () => this.push({ kind: "content-type", typeKey: type.key })
        });
      }
      hasList = types.length > 0;
    } else {
      const tree = this.getFolderTree("content", result.contentFiles, "");
      hasList = this.renderFolderContents(
        root,
        tree,
        (node) => this.push({ kind: "folder", root: "content", path: node.path }),
        true
      );
    }

    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: result.content.fileCount }),
        result.content.totalSize
      );
    }

    this.renderTopFiles(root, result.topContentFiles);
  }

  private renderSegmented(root: HTMLElement): void {
    const segmented = root.createDiv({ cls: "sc-segmented" });
    const options: Array<{ key: ContentGroup; label: string }> = [
      { key: "type", label: this.i18n.t("content.groupByType") },
      { key: "folder", label: this.i18n.t("content.groupByFolder") }
    ];
    for (const option of options) {
      const active = this.current().contentGroup === option.key;
      const tab = segmented.createEl("button", {
        cls: `sc-tab${active ? " is-active" : ""}`,
        text: option.label
      });
      tab.setAttr("aria-pressed", active ? "true" : "false");
      tab.addEventListener("click", () => {
        if (this.current().contentGroup === option.key) return;
        this.current().contentGroup = option.key;
        this.current().expandedPath = null;
        this.current().scrollTop = 0;
        this.renderCurrent();
      });
    }
  }

  private renderContentType(
    root: HTMLElement,
    result: ScanResult,
    typeKey: ContentTypeKey
  ): void {
    this.renderPageHeader(root);
    const files = result.contentFiles.filter(
      (file) => (file.contentType ?? contentTypeForPath(file.path)) === typeKey
    );
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    this.renderToolbar(root);
    const hasList = this.renderFileList(root, files, this.i18n.t("empty.category"));
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: files.length }),
        totalSize
      );
    }
  }

  private renderFolder(
    root: HTMLElement,
    result: ScanResult,
    page: Extract<Page, { kind: "folder" }>
  ): void {
    const files = page.root === "content" ? result.contentFiles : result.otherFiles;
    const tree = this.getFolderTree(page.root, files, "");
    const node = findFolder(tree, page.path);
    this.renderPageHeader(root);
    if (!node) {
      this.renderEmpty(root, this.i18n.t("empty.folderGone"));
      return;
    }
    this.renderToolbar(root);
    const hasList = this.renderFolderContents(root, node, (child) =>
      this.push({ kind: "folder", root: page.root, path: child.path })
    );
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: node.fileCount }),
        node.size
      );
    }
  }

  private renderTrash(root: HTMLElement, result: ScanResult): void {
    this.renderPageHeader(root);
    if (!result.trashExists) {
      this.renderEmpty(root, this.i18n.t("trash.missing"));
      return;
    }
    root.createDiv({
      cls: "sc-danger-note",
      text: this.i18n.t("trash.dangerNote")
    });
    if (result.trashFiles.length === 0) {
      this.renderEmpty(root, this.i18n.t("trash.empty"));
      return;
    }
    this.renderToolbar(root);
    const tree = this.getFolderTree("trash", result.trashFiles, ".trash");
    this.renderFolderContents(root, tree, (node) =>
      this.push({ kind: "trash-folder", path: node.path })
    );

    const actionbar = root.createDiv({ cls: "sc-cleanup-actions" });
    const selected = actionbar.createSpan({ cls: "sc-cleanup-selected" });
    selected.createSpan({
      text: this.i18n.t("count.files", { count: result.trash.fileCount })
    });
    selected.createSpan({ text: formatBytes(result.trash.totalSize) });
    this.createActionButton(
      actionbar,
      "trash-2",
      this.i18n.t("action.emptyTrash"),
      () => this.confirmEmptyTrash(result),
      "danger"
    );
  }

  private renderTrashFolder(root: HTMLElement, result: ScanResult, path: string): void {
    const tree = this.getFolderTree("trash", result.trashFiles, ".trash");
    const node = findFolder(tree, path);
    if (!node) {
      this.renderPageHeader(root);
      this.renderEmpty(root, this.i18n.t("empty.folderGone"));
      return;
    }
    this.renderPageHeader(root);
    this.renderToolbar(root);
    const hasList = this.renderFolderContents(root, node, (child) =>
      this.push({ kind: "trash-folder", path: child.path })
    );
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: node.fileCount }),
        node.size
      );
    }
  }

  private renderPlugins(root: HTMLElement, result: ScanResult): void {
    this.renderPageHeader(root);
    this.renderToolbar(root);
    if (result.plugins.entries.length === 0) {
      this.renderEmpty(root, this.i18n.t("empty.plugins"));
      return;
    }
    const entries = sortEntries(result.plugins.entries, this.current().sort);
    for (const plugin of entries) {
      this.createRow(root, {
        icon: "puzzle",
        tileColor: CATEGORY_COLORS.plugins,
        label: plugin.name,
        sub: [
          plugin.version === "?" ? this.i18n.t("plugins.unknownVersion") : `v${plugin.version}`,
          this.i18n.t("count.files", { count: plugin.fileCount })
        ],
        sizeText: formatBytes(plugin.size),
        onClick: () => this.push({ kind: "plugin", pluginId: plugin.id })
      });
    }
    this.renderTotal(
      root,
      this.i18n.t("count.plugins", { count: entries.length }),
      result.plugins.totalSize
    );
  }

  private renderPlugin(root: HTMLElement, result: ScanResult, pluginId: string): void {
    const plugin = findPlugin(result, pluginId);
    if (!plugin) {
      this.renderPageHeader(root);
      this.renderEmpty(root, this.i18n.t("empty.pluginGone"));
      return;
    }
    this.renderPageHeader(root);
    this.renderToolbar(root, [
      {
        icon: "copy",
        label: this.i18n.t("action.copyPath"),
        onClick: () => {
          void this.copyText(
            `${result.configDir}/plugins/${plugin.id}`,
            this.i18n.t("notice.pluginPathCopied")
          );
        }
      }
    ]);
    const rootPath = `${result.configDir}/plugins/${plugin.id}`;
    const tree = this.getFolderTree(`plugin:${plugin.id}`, plugin.files, rootPath);
    const hasList = this.renderFolderContents(root, tree, (node) =>
      this.push({ kind: "plugin-folder", pluginId: plugin.id, path: node.path })
    );

    const meta = root.createDiv({ cls: "sc-plugin-meta sc-plugin-meta-bottom" });
    meta.createSpan({
      text: this.i18n.t("plugins.metaVersion", {
        version: plugin.version === "?" ? this.i18n.t("format.unknown") : `v${plugin.version}`
      })
    });
    meta.createSpan({
      text: this.i18n.t("plugins.metaModified", {
        time: formatDateTime(plugin.mtime, this.i18n)
      })
    });

    if (hasList && plugin.fileCount > 0) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: plugin.fileCount }),
        plugin.size
      );
    }
  }

  private renderPluginFolder(
    root: HTMLElement,
    result: ScanResult,
    pluginId: string,
    path: string
  ): void {
    const plugin = findPlugin(result, pluginId);
    if (!plugin) {
      this.renderPageHeader(root);
      this.renderEmpty(root, this.i18n.t("empty.pluginGone"));
      return;
    }
    const rootPath = `${result.configDir}/plugins/${plugin.id}`;
    const tree = this.getFolderTree(`plugin:${plugin.id}`, plugin.files, rootPath);
    const node = findFolder(tree, path);
    if (!node) {
      this.renderPageHeader(root);
      this.renderEmpty(root, this.i18n.t("empty.folderGone"));
      return;
    }
    this.renderPageHeader(root);
    this.renderToolbar(root);
    const hasList = this.renderFolderContents(root, node, (child) =>
      this.push({ kind: "plugin-folder", pluginId: plugin.id, path: child.path })
    );
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: node.fileCount }),
        node.size
      );
    }
  }

  private renderConfig(root: HTMLElement, result: ScanResult): void {
    this.renderPageHeader(root);
    this.renderToolbar(root);
    if (result.configGroups.length === 0) {
      this.renderEmpty(root, this.i18n.t("empty.category"));
      return;
    }
    const groups = sortEntries(
      result.configGroups.map((group) => ({
        ...group,
        name: this.i18n.t(`configGroup.${group.key}`),
        size: group.totalSize,
        mtime: 0
      })),
      this.current().sort
    );
    for (const group of groups) {
      this.createRow(root, {
        icon: CONFIG_GROUP_ICONS[group.key] ?? "folder",
        tileColor: CATEGORY_COLORS.config,
        label: group.name,
        sub: this.i18n.t("count.files", { count: group.fileCount }),
        sizeText: formatBytes(group.totalSize),
        onClick: () => this.push({ kind: "config-group", groupKey: group.key })
      });
    }
    if (result.config.fileCount > 0) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: result.config.fileCount }),
        result.config.totalSize
      );
    }
  }

  private renderConfigGroup(
    root: HTMLElement,
    result: ScanResult,
    groupKey: string
  ): void {
    this.renderPageHeader(root);
    const files = result.configFiles.filter((file) => (file.configGroup ?? "other") === groupKey);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    this.renderToolbar(root);
    if (files.length === 0) {
      this.renderEmpty(root, this.i18n.t("empty.configGroup"));
      return;
    }
    const rootPath = configGroupRootPath(result.configDir, groupKey);
    const tree = this.getFolderTree(`config:${groupKey}`, files, rootPath);
    const node = findFolder(tree, rootPath) ?? tree;
    const hasList = this.renderFolderContents(root, node, (folder) =>
      this.push({ kind: "config-folder", groupKey, path: folder.path })
    );
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: files.length }),
        totalSize
      );
    }
  }

  private renderConfigFolder(
    root: HTMLElement,
    result: ScanResult,
    groupKey: string,
    path: string
  ): void {
    this.renderPageHeader(root);
    const files = result.configFiles.filter((file) => (file.configGroup ?? "other") === groupKey);
    const rootPath = configGroupRootPath(result.configDir, groupKey);
    const tree = this.getFolderTree(`config:${groupKey}`, files, rootPath);
    const node = findFolder(tree, path);
    if (!node) {
      this.renderEmpty(root, this.i18n.t("empty.folderGone"));
      return;
    }
    this.renderToolbar(root);
    const hasList = this.renderFolderContents(root, node, (folder) =>
      this.push({ kind: "config-folder", groupKey, path: folder.path })
    );
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: node.fileCount }),
        node.size
      );
    }
  }

  private renderCleanupHub(root: HTMLElement, result: ScanResult): void {
    this.renderPageHeader(root);
    const largeFiles = selectLargeFiles(result.contentFiles);
    const zeroFiles = selectZeroByteFiles(result.contentFiles);
    const emptyFolders = result.emptyFolders;
    if (largeFiles.length === 0 && zeroFiles.length === 0 && emptyFolders.length === 0) {
      this.renderEmpty(root, this.i18n.t("cleanup.none"));
      return;
    }

    if (largeFiles.length > 0) {
      this.createRow(root, {
        icon: "file-up",
        label: this.i18n.t("cleanup.largeTitle", { threshold: LARGE_FILE_THRESHOLD_LABEL }),
        sub: this.i18n.t("count.files", { count: largeFiles.length }),
        sizeText: formatBytes(
          largeFiles.reduce((sum, file) => sum + file.size, 0)
        ),
        onClick: () => this.push({ kind: "cleanup", cleanupKind: "large" })
      });
    }
    if (zeroFiles.length > 0) {
      this.createRow(root, {
        icon: "file-x",
        label: this.i18n.t("cleanup.zeroTitle"),
        sub: this.i18n.t("count.files", { count: zeroFiles.length }),
        onClick: () => this.push({ kind: "cleanup", cleanupKind: "zero" }, "name")
      });
    }
    if (emptyFolders.length > 0) {
      this.createRow(root, {
        icon: "folder-minus",
        label: this.i18n.t("cleanup.foldersTitle"),
        sub: this.i18n.t("count.folders", { count: emptyFolders.length }),
        onClick: () => this.push({ kind: "cleanup", cleanupKind: "folders" }, "name")
      });
    }
  }

  private renderCleanup(
    root: HTMLElement,
    result: ScanResult,
    kind: CleanupKind
  ): void {
    this.renderPageHeader(root);

    const candidates = this.buildCleanupCandidates(result, kind);
    const state = this.current();
    if (candidates.length === 0) {
      state.selectedPaths = [];
      state.cleanupMulti = false;
      this.cleanupSelections.set(kind, []);
      this.renderEmpty(root, cleanupEmptyText(kind, this.i18n));
      return;
    }

    const candidatePaths = new Set(candidates.map((candidate) => candidate.path));
    state.selectedPaths = state.selectedPaths.filter((path) => candidatePaths.has(path));
    this.cleanupSelections.set(kind, state.selectedPaths);

    if (state.cleanupMulti) {
      this.renderCleanupMulti(root, kind, candidates, state);
    } else {
      this.renderCleanupBrowse(root, kind, candidates);
    }
  }

  private renderCleanupBrowse(
    root: HTMLElement,
    kind: CleanupKind,
    candidates: CleanupCandidate[]
  ): void {
    const toolbar = root.createDiv({ cls: "sc-toolbar" });
    const leading = toolbar.createDiv({ cls: "sc-toolbar-leading" });
    this.createToolbarButton(leading, null, this.i18n.t("action.selectMultiple"), () => {
      if (this.cleaning) return;
      const state = this.current();
      state.cleanupMulti = true;
      state.expandedPath = null;
      state.selectedPaths = [];
      this.saveScroll();
      this.renderCurrent();
    });
    this.renderSortControl(toolbar);

    if (kind === "folders") {
      for (const candidate of candidates) {
        this.renderCleanupFolderRow(root, candidate);
      }
      this.renderCleanupTotal(root, kind, candidates);
      return;
    }
    for (const candidate of candidates) {
      if (candidate.file) {
        this.renderFileRow(root, candidate.file, { hideSize: kind === "zero" });
      }
    }
    this.renderCleanupTotal(root, kind, candidates);
  }

  private renderCleanupMulti(
    root: HTMLElement,
    kind: CleanupKind,
    candidates: CleanupCandidate[],
    state: PageState
  ): void {
    const toolbar = root.createDiv({ cls: "sc-toolbar" });
    const leading = toolbar.createDiv({ cls: "sc-toolbar-leading" });
    this.createToolbarButton(leading, null, this.i18n.t("action.cancelSelection"), () => {
      if (this.cleaning) return;
      state.cleanupMulti = false;
      state.selectedPaths = [];
      this.cleanupSelections.set(kind, []);
      this.saveScroll();
      this.renderCurrent();
    });
    const selectAll = this.createToolbarButton(leading, null, this.i18n.t("action.selectAll"), () => {
      if (this.cleaning) return;
      const allSelected = candidates.every((candidate) =>
        state.selectedPaths.includes(candidate.path)
      );
      state.selectedPaths = allSelected
        ? []
        : candidates.map((candidate) => candidate.path);
      this.saveScroll();
      this.renderCurrent();
    });
    this.renderSortControl(toolbar);

    const list = root.createDiv({ cls: "sc-select-list" });
    const actionbar = root.createDiv({ cls: "sc-cleanup-actions" });
    const selectedText = actionbar.createSpan({ cls: "sc-cleanup-selected" });
    const action = this.createActionButton(
      actionbar,
      null,
      kind === "folders"
        ? this.i18n.t("action.deletePermanently")
        : this.i18n.t("action.moveToTrash"),
      () => this.confirmCleanup(kind, candidates),
      kind === "folders" ? "danger" : "primary"
    );

    const update = (): void => {
      const selected = candidates.filter((candidate) =>
        state.selectedPaths.includes(candidate.path)
      );
      const count = selected.length;
      if (count === 0) {
        selectedText.textContent = this.i18n.t("cleanup.noneSelected");
      } else if (kind === "large") {
        selectedText.empty();
        selectedText.createSpan({
          text: this.i18n.t("cleanup.selectedCount", { count })
        });
        selectedText.createSpan({
          text: formatBytes(selected.reduce((sum, candidate) => sum + candidate.size, 0))
        });
      } else if (kind === "zero") {
        selectedText.textContent = this.i18n.t("cleanup.selectedFiles", { count });
      } else {
        selectedText.textContent = this.i18n.t("cleanup.selectedFolders", { count });
      }
      action.disabled = count === 0 || this.cleaning;
      selectAll.disabled = this.cleaning;
      selectAll.textContent =
        count === candidates.length
          ? this.i18n.t("action.deselectAll")
          : this.i18n.t("action.selectAll");
    };

    for (const candidate of candidates) {
      this.renderCleanupCandidate(list, candidate, update);
    }
    this.renderCleanupTotal(list, kind, candidates);
    update();
  }

  private renderCleanupFolderRow(
    parent: HTMLElement,
    candidate: CleanupCandidate
  ): void {
    const expanded = this.current().expandedPath === candidate.path;
    const wrapper = parent.createDiv({
      cls: `sc-file-wrap${expanded ? " is-expanded" : ""}`
    });
    const row = wrapper.createEl("button", { cls: "sc-file-row" });
    row.setAttr("aria-expanded", expanded ? "true" : "false");
    const icon = row.createSpan({ cls: "sc-select-icon" });
    setIcon(icon, "folder");
    row.createSpan({ cls: "sc-file-name", text: candidate.name });
    const chevron = row.createSpan({ cls: "sc-chev" });
    setIcon(chevron, expanded ? "chevron-down" : "chevron-right");
    row.addEventListener("click", () => {
      const state = this.current();
      if (state.expandedPath === candidate.path) {
        state.expandedPath = null;
        this.collapseFileDetail(wrapper);
        return;
      }
      this.collapseExpandedFile(this.contentEl);
      state.expandedPath = candidate.path;
      this.renderCleanupFolderDetail(wrapper, candidate);
    });

    if (expanded) {
      this.renderCleanupFolderDetail(wrapper, candidate);
    }
  }

  private renderCleanupFolderDetail(
    wrapper: HTMLElement,
    candidate: CleanupCandidate
  ): void {
    wrapper.classList.add("is-expanded");
    const row = wrapper.querySelector<HTMLElement>(".sc-file-row");
    row?.setAttr("aria-expanded", "true");
    const chevron = wrapper.querySelector<HTMLElement>(".sc-chev");
    if (chevron) setIcon(chevron, "chevron-down");
    wrapper.querySelector(".sc-expanded")?.remove();

    const panel = wrapper.createDiv({ cls: "sc-expanded" });
    panel.createDiv({ cls: "sc-path", text: candidate.path });
    panel.createDiv({ cls: "sc-meta", text: this.i18n.t("cleanup.foldersTitle") });
    const actions = panel.createDiv({ cls: "sc-actions" });
    this.createActionButton(
      actions,
      "trash-2",
      this.i18n.t("action.deletePermanently"),
      () => this.confirmCleanupItems("folders", [candidate]),
      "danger"
    );
  }

  private renderCleanupCandidate(
    parent: HTMLElement,
    candidate: CleanupCandidate,
    onChange: () => void
  ): void {
    const state = this.current();
    const selected = state.selectedPaths.includes(candidate.path);
    const row = parent.createEl("label", {
      cls: `sc-select-row${selected ? " is-selected" : ""}`
    });
    const checkbox = row.createEl("input", { cls: "sc-select-checkbox" });
    checkbox.type = "checkbox";
    checkbox.checked = selected;
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      if (this.cleaning) {
        checkbox.checked = !checkbox.checked;
        return;
      }
      const next = new Set(state.selectedPaths);
      if (checkbox.checked) {
        next.add(candidate.path);
      } else {
        next.delete(candidate.path);
      }
      state.selectedPaths = [...next];
      row.toggleClass("is-selected", checkbox.checked);
      if (state.page.kind === "cleanup") {
        this.cleanupSelections.set(state.page.cleanupKind, state.selectedPaths);
      }
      onChange();
    });

    if (candidate.kind === "folder") {
      const icon = row.createSpan({ cls: "sc-select-icon" });
      setIcon(icon, "folder");
    }

    const main = row.createSpan({ cls: "sc-select-main" });
    main.createSpan({ cls: "sc-select-name", text: candidate.name });
    main.createSpan({ cls: "sc-select-path", text: candidate.path });
    if (
      candidate.kind === "file" &&
      state.page.kind === "cleanup" &&
      state.page.cleanupKind === "large"
    ) {
      row.createSpan({
        cls: "sc-select-size",
        text: formatBytes(candidate.size)
      });
    }
  }

  private buildCleanupCandidates(
    result: ScanResult,
    kind: CleanupKind
  ): CleanupCandidate[] {
    const sort = this.current().sort;
    if (kind === "large" || kind === "zero") {
      const files =
        kind === "large"
          ? selectLargeFiles(result.contentFiles)
          : selectZeroByteFiles(result.contentFiles);
      return sortEntries(files, sort).map((file) => ({
        path: file.path,
        name: file.name,
        size: file.size,
        kind: "file",
        file
      }));
    }
    return sortEntries(
      result.emptyFolders.map((path) => ({
        path,
        name: leafName(path),
        size: 0,
        mtime: 0
      })),
      sort
    ).map((folder) => ({
      path: folder.path,
      name: folder.name,
      size: 0,
      kind: "folder"
    }));
  }

  private confirmCleanup(kind: CleanupKind, candidates: CleanupCandidate[]): void {
    const state = this.current();
    const selected = candidates.filter((candidate) =>
      state.selectedPaths.includes(candidate.path)
    );
    if (selected.length === 0) return;
    this.confirmCleanupItems(kind, selected);
  }

  private confirmCleanupItems(
    kind: CleanupKind,
    selected: CleanupCandidate[]
  ): void {
    if (selected.length === 0) return;
    const paths = selected.map((candidate) => candidate.path);
    if (kind === "folders") {
      new CleanupConfirmModal(this.app, this.i18n, {
        title: this.i18n.t("cleanup.confirmDeleteFoldersTitle", {
          count: selected.length
        }),
        message: this.i18n.t("cleanup.confirmDeleteFoldersMessage", {
          count: selected.length
        }),
        paths,
        confirmLabel: this.i18n.t("action.deletePermanently"),
        danger: true,
        onConfirm: () => void this.runCleanup(kind, selected)
      }).open();
      return;
    }
    const size = selected.reduce((sum, candidate) => sum + candidate.size, 0);
    new CleanupConfirmModal(this.app, this.i18n, {
      title: this.i18n.t("cleanup.confirmTrashTitle"),
      message:
        kind === "large"
          ? this.i18n.t("cleanup.confirmTrashMessageLarge", {
              count: selected.length,
              size: formatBytes(size)
            })
          : this.i18n.t("cleanup.confirmTrashMessage", {
              count: selected.length
            }),
      paths,
      confirmLabel: this.i18n.t("action.moveToTrash"),
      onConfirm: () => void this.runCleanup(kind, selected)
    }).open();
  }

  private async runCleanup(
    kind: CleanupKind,
    candidates: CleanupCandidate[]
  ): Promise<void> {
    if (this.cleaning) return;
    if (this.scanning) {
      this.showInfoStatus(this.i18n.t("status.busyScanningCleanup"), "info", 2500);
      return;
    }
    this.cleaning = true;
    this.setCleaningUi(true);
    this.showRunningStatus(
      kind === "folders"
        ? this.i18n.t("status.deletingFolders")
        : this.i18n.t("status.movingToTrash")
    );

    let result: CleanupResult;
    try {
      result =
        kind === "folders"
          ? await deleteEmptyFolders(
              this.app,
              candidates.map((candidate) => candidate.path)
            )
          : await moveFilesToTrash(
              this.app,
              candidates
                .map((candidate) => candidate.file)
                .filter((file): file is FileEntry => Boolean(file))
            );
    } catch (error) {
      result = {
        action: kind === "folders" ? "delete-empty-folders" : "move-to-trash",
        total: candidates.length,
        succeeded: 0,
        skipped: 0,
        failed: 1,
        freedBytes: 0,
        succeededPaths: [],
        failures: [{ path: "", status: "failed", reason: "error", detail: errorMessage(error) }]
      };
    }

    this.cleaning = false;
    this.setCleaningUi(false);
    this.applyCleanupOutcome(result);
    this.saveScroll();
    this.renderCurrent();
    this.showCleanupResultStatus(result);
    const refreshed = await this.scan(false);
    if (!refreshed && this.scanError) {
      this.showCleanupRescanFailure();
    }
  }

  private confirmEmptyTrash(result: ScanResult): void {
    const files = result.trashFiles;
    new CleanupConfirmModal(this.app, this.i18n, {
      title: this.i18n.t("cleanup.confirmEmptyTrashTitle"),
      message: this.i18n.t("cleanup.confirmEmptyTrashMessage", {
        count: files.length,
        size: formatBytes(result.trash.totalSize)
      }),
      paths: files.slice(0, 5).map((file) => file.path),
      confirmLabel: this.i18n.t("action.deletePermanently"),
      danger: true,
      onConfirm: () => void this.runEmptyTrash(result)
    }).open();
  }

  private async runEmptyTrash(result: ScanResult): Promise<void> {
    if (this.cleaning) return;
    if (this.scanning) {
      this.showInfoStatus(this.i18n.t("status.busyScanningEmptyTrash"), "info", 2500);
      return;
    }
    this.cleaning = true;
    this.setCleaningUi(true);
    this.showRunningStatus(this.i18n.t("status.emptyingTrash"));
    let outcome: CleanupResult;
    try {
      outcome = await emptyTrash(this.app, result.trashFiles);
    } catch (error) {
      outcome = {
        action: "empty-trash",
        total: result.trashFiles.length,
        succeeded: 0,
        skipped: 0,
        failed: 1,
        freedBytes: 0,
        succeededPaths: [],
        failures: [{ path: ".trash", status: "failed", reason: "error", detail: errorMessage(error) }]
      };
    }

    this.cleaning = false;
    this.setCleaningUi(false);
    this.applyCleanupOutcome(outcome);
    this.saveScroll();
    this.renderCurrent();
    this.showCleanupResultStatus(outcome);
    const refreshed = await this.scan(false);
    if (!refreshed && this.scanError) {
      this.showCleanupRescanFailure();
    }
  }

  private applyCleanupOutcome(result: CleanupResult): void {
    if (result.succeededPaths.length > 0 && this.plugin.lastResult) {
      this.plugin.lastResult = applyCleanupResult(this.plugin.lastResult, result);
      this.folderCache.clear();
    }
    const state = this.current();
    state.selectedPaths = result.failures
      .map((failure) => failure.path)
      .filter(Boolean);
    if (state.page.kind === "cleanup") {
      this.cleanupSelections.set(state.page.cleanupKind, state.selectedPaths);
    }
  }

  private showCleanupResultStatus(result: CleanupResult): void {
    if (result.failed === 0 && result.skipped === 0) {
      const text = cleanupSuccessText(result, this.i18n);
      this.showSuccessStatus(text.title, text.detail);
      return;
    }

    const page = this.current().page;
    const retry =
      page.kind === "cleanup"
        ? {
            label: this.i18n.t("action.retryFailed"),
            icon: "refresh-cw",
            onClick: () => this.retryCleanupFailures(result)
          }
        : page.kind === "trash" && result.action === "empty-trash"
          ? {
              label: this.i18n.t("action.retryEmptyTrash"),
              icon: "refresh-cw",
              onClick: () => {
                const current = this.plugin.lastResult;
                if (!current) return;
                this.dismissStatus(true);
                this.confirmEmptyTrash(current);
              }
            }
          : undefined;

    this.showErrorStatus({
      scope: "page",
      title: result.succeeded > 0
        ? this.i18n.t("cleanup.doneTitle")
        : this.i18n.t("cleanup.failedTitle"),
      detail: cleanupCountsText(result, this.i18n),
      details: result.failures.map((failure) =>
        this.formatCleanupFailure(failure)
      ),
      detailsLabel: result.failures.length > 0
        ? this.i18n.t("cleanup.viewFailures")
        : undefined,
      action: retry,
      dismissible: true
    });
  }

  private formatCleanupFailure(failure: CleanupResult["failures"][number]): string {
    const path = failure.path || this.i18n.t("cleanup.unknownPath");
    const reason = this.i18n.t(`cleanup.reason.${failure.reason}`);
    return failure.detail
      ? this.i18n.t("cleanup.failureLineWithDetail", {
          path,
          reason,
          detail: failure.detail
        })
      : this.i18n.t("cleanup.failureLine", { path, reason });
  }

  private retryCleanupFailures(result: CleanupResult): void {
    const state = this.current();
    if (state.page.kind !== "cleanup") return;
    state.selectedPaths = result.failures
      .map((failure) => failure.path)
      .filter(Boolean);
    state.cleanupMulti = true;
    this.cleanupSelections.set(state.page.cleanupKind, state.selectedPaths);
    this.dismissStatus(true);
    this.saveScroll();
    this.renderCurrent();
  }

  private showCleanupRescanFailure(): void {
    if (this.status?.kind === "error" && this.status.scope === "page") {
      const note = this.i18n.t("status.rescanFailedNote");
      this.status.detail = this.status.detail
        ? `${this.status.detail}${this.i18n.t("status.noteSeparator")}${note}`
        : note;
      this.renderStatus(true);
      return;
    }
    this.showErrorStatus({
      scope: "view",
      title: this.i18n.t("status.cleanupRescanFailedTitle"),
      detail: this.i18n.t("status.cleanupRescanFailedDetail"),
      action: {
        label: this.i18n.t("action.rescan"),
        icon: "refresh-cw",
        onClick: () => void this.scan(true)
      },
      dismissible: true
    });
  }

  private showScanFailureStatus(): void {
    const error = this.scanError ?? this.i18n.t("status.unknownError");
    this.showErrorStatus({
      scope: "view",
      title: this.i18n.t("status.scanFailedShowingLast"),
      detail: error,
      detailsLabel: error.length > 40 ? this.i18n.t("action.details") : undefined,
      action: {
        label: this.i18n.t("action.retry"),
        icon: "refresh-cw",
        onClick: () => void this.scan(true)
      },
      dismissible: true
    });
  }

  private showRunningStatus(title: string): void {
    if (!this.statusLayerEl) return;
    this.clearStatusTimers();
    this.status = null;
    this.clearStatusDom();
    const state: StatusState = { kind: "running", scope: "view", title };
    this.statusDelayTimer = window.setTimeout(() => {
      this.statusDelayTimer = null;
      if (!this.scanning && !this.cleaning) return;
      this.status = state;
      this.renderStatus(true);
    }, 150);
  }

  private showSuccessStatus(
    title: string,
    detail?: string,
    duration = 4000
  ): void {
    if (!this.statusLayerEl) return;
    this.clearStatusTimers();
    this.status = { kind: "success", scope: "view", title, detail };
    this.renderStatus(true);
    this.statusHideTimer = window.setTimeout(() => {
      this.statusHideTimer = null;
      this.dismissStatus();
    }, duration);
  }

  private showInfoStatus(
    title: string,
    icon = "info",
    duration = 3000
  ): void {
    if (!this.statusLayerEl) return;
    this.clearStatusTimers();
    this.status = { kind: "info", scope: "view", title, icon };
    this.renderStatus(true);
    this.statusHideTimer = window.setTimeout(() => {
      this.statusHideTimer = null;
      this.dismissStatus();
    }, duration);
  }

  private showErrorStatus(state: {
    scope: StatusScope;
    title: string;
    detail?: string;
    details?: string[];
    detailsLabel?: string;
    action?: StatusAction;
    dismissible?: boolean;
  }): void {
    if (!this.statusLayerEl) return;
    this.clearStatusTimers();
    this.status = { kind: "error", dismissible: true, ...state };
    this.renderStatus(true);
  }

  private dismissStatus(immediate = false): void {
    this.clearStatusTimers();
    const layer = this.statusLayerEl;
    this.status = null;
    this.statusRenderKey = "";
    this.contentEl.removeClass("has-status-card");
    this.contentEl.style.removeProperty("--sc-status-card-height");
    if (!layer) return;
    const item = layer.querySelector<HTMLElement>(".sc-status");
    if (!immediate && item && !prefersReducedMotion()) {
      item.addClass("is-leaving");
      window.setTimeout(() => {
        if (!this.status) layer.empty();
      }, 120);
      return;
    }
    layer.empty();
  }

  private clearStatusTimers(): void {
    if (this.statusDelayTimer !== null) {
      window.clearTimeout(this.statusDelayTimer);
      this.statusDelayTimer = null;
    }
    if (this.statusHideTimer !== null) {
      window.clearTimeout(this.statusHideTimer);
      this.statusHideTimer = null;
    }
  }

  private clearStatusDom(): void {
    this.statusRenderKey = "";
    this.statusLayerEl?.empty();
    this.contentEl.removeClass("has-status-card");
    this.contentEl.style.removeProperty("--sc-status-card-height");
  }

  private setCleaningUi(active: boolean): void {
    this.contentEl.toggleClass("is-cleaning", active);
    if (!active) return;
    this.scrollerEl
      ?.querySelectorAll<HTMLButtonElement>(
        ".sc-cleanup-actions .sc-action-btn, .sc-toolbar .sc-tool-btn"
      )
      .forEach((button) => {
        button.disabled = true;
      });
  }

  private renderStatus(force = false): void {
    const layer = this.statusLayerEl;
    if (!layer) return;
    if (
      this.status?.scope === "page" &&
      !this.isPageStatusVisible()
    ) {
      this.dismissStatus(true);
      return;
    }
    if (!this.status) {
      if (layer.childElementCount > 0) layer.empty();
      this.statusRenderKey = "";
      this.contentEl.removeClass("has-status-card");
      this.contentEl.style.removeProperty("--sc-status-card-height");
      return;
    }

    const status = this.status;
    const key = [
      status.kind,
      status.scope,
      status.title,
      status.detail ?? "",
      status.detailsOpen ? "1" : "0",
      String(status.details?.length ?? 0),
      status.action?.label ?? "",
      status.dismissible ? "1" : "0"
    ].join("|");
    if (!force && key === this.statusRenderKey && layer.childElementCount > 0) {
      return;
    }
    this.statusRenderKey = key;
    const hadStatus = layer.childElementCount > 0;
    layer.empty();

    const anchor = layer.createDiv({ cls: "sc-status-anchor" });
    const isCard = status.kind === "error";
    const item = anchor.createDiv({
      cls: `sc-status ${isCard ? "sc-status-card" : "sc-status-pill"} sc-status-${status.kind}`
    });
    if (hadStatus) item.addClass("is-static");
    if (isCard) {
      item.setAttr("role", "alert");
      this.renderStatusCard(item, status);
    } else {
      item.setAttr("role", "status");
      item.setAttr("aria-live", "polite");
      item.setAttr("aria-atomic", "true");
      this.renderStatusPill(item, status);
    }
    this.scheduleStatusMetrics();
  }

  private renderStatusPill(item: HTMLElement, status: StatusState): void {
    const icon = item.createSpan({ cls: "sc-status-icon" });
    if (status.kind === "running") {
      icon.addClass("sc-status-spinner");
      setIcon(icon, "refresh-cw");
    } else if (status.kind === "success") {
      setIcon(icon, "check");
    } else {
      setIcon(icon, status.icon ?? "info");
    }
    item.createSpan({ cls: "sc-status-title", text: status.title });
    if (status.detail) {
      item.createSpan({ cls: "sc-status-divider" });
      item.createSpan({ cls: "sc-status-detail", text: status.detail });
    }
  }

  private renderStatusCard(item: HTMLElement, status: StatusState): void {
    const icon = item.createSpan({ cls: "sc-status-icon sc-status-icon-warning" });
    setIcon(icon, "alert-triangle");

    const main = item.createDiv({ cls: "sc-status-main" });
    const title = main.createDiv({ cls: "sc-status-title-row" });
    title.createSpan({ cls: "sc-status-title", text: status.title });
    if (status.detail) {
      main.createDiv({
        cls: `sc-status-detail${status.detailsOpen ? " is-open" : ""}`,
        text: status.detail
      });
    }

    const actions = main.createDiv({ cls: "sc-status-actions" });
    if (status.action) {
      this.createStatusButton(actions, status.action);
    }
    if (status.detailsLabel && (status.details?.length || status.detail)) {
      const toggle = actions.createEl("button", { cls: "sc-tool-btn" });
      toggle.setAttr(
        "aria-expanded",
        status.detailsOpen ? "true" : "false"
      );
      toggle.createSpan({
        text: status.detailsOpen
          ? this.i18n.t("action.collapse")
          : status.detailsLabel
      });
      toggle.addEventListener("click", () => {
        if (!this.status) return;
        this.status.detailsOpen = !this.status.detailsOpen;
        this.renderStatus(true);
      });
    }

    if (status.detailsOpen && status.details?.length) {
      const list = main.createDiv({ cls: "sc-status-details" });
      for (const line of status.details) {
        list.createDiv({ cls: "sc-status-detail-line", text: line });
      }
    }

    const close = item.createEl("button", { cls: "sc-status-close" });
    close.setAttr("aria-label", this.i18n.t("status.dismissAria"));
    setTooltip(close, this.i18n.t("status.dismissAria"));
    setIcon(close, "x");
    close.addEventListener("click", () => this.dismissStatus());
  }

  private createStatusButton(parent: HTMLElement, action: StatusAction): void {
    const button = parent.createEl("button", {
      cls: "sc-tool-btn is-primary"
    });
    if (action.icon) {
      const icon = button.createSpan({ cls: "sc-tool-btn-icon" });
      setIcon(icon, action.icon);
    }
    button.createSpan({ text: action.label });
    button.addEventListener("click", action.onClick);
  }

  private isPageStatusVisible(): boolean {
    const kind = this.current().page.kind;
    return kind === "cleanup" || kind === "trash" || kind === "trash-folder";
  }

  private scheduleStatusMetrics(): void {
    if (this.statusMetricsFrame !== null) return;
    this.statusMetricsFrame = window.requestAnimationFrame(() => {
      this.statusMetricsFrame = null;
      this.updateStatusMetrics();
    });
  }

  private updateStatusMetrics(): void {
    const actionbar =
      this.scrollerEl?.querySelector<HTMLElement>(".sc-cleanup-actions") ?? null;
    const offset = actionbar ? actionbar.offsetHeight : 0;
    this.contentEl.style.setProperty(
      "--sc-status-actionbar-offset",
      `${offset}px`
    );

    const card =
      this.statusLayerEl?.querySelector<HTMLElement>(".sc-status-card") ?? null;
    if (card) {
      this.contentEl.addClass("has-status-card");
      this.contentEl.style.setProperty(
        "--sc-status-card-height",
        `${card.offsetHeight + 12}px`
      );
    } else {
      this.contentEl.removeClass("has-status-card");
      this.contentEl.style.removeProperty("--sc-status-card-height");
    }
  }

  private setupBottomInset(): void {
    if (!activeDocument.body.classList.contains("is-mobile")) return;
    this.observeBottomBars();
    this.scheduleBottomInsetRefresh();
    for (const delay of [80, 200, 450]) {
      const id = window.setTimeout(() => {
        const index = this.bottomInsetSettleTimers.indexOf(id);
        if (index >= 0) this.bottomInsetSettleTimers.splice(index, 1);
        this.refreshBottomInset();
      }, delay);
      this.bottomInsetSettleTimers.push(id);
    }
    if (!this.bottomInsetObserver) {
      const appContainer = activeDocument.querySelector(".app-container");
      if (appContainer) {
        this.bottomInsetObserver = new MutationObserver(() => {
          this.observeBottomBars();
          this.scheduleBottomInsetSettle();
        });
        this.bottomInsetObserver.observe(appContainer, { childList: true });
      }
    }
    if (!this.bottomInsetResizeHandler) {
      this.bottomInsetResizeHandler = () => {
        this.observeBottomBars();
        this.scheduleBottomInsetRefresh();
        this.scheduleBottomInsetSettle();
      };
      window.addEventListener("resize", this.bottomInsetResizeHandler);
    }
    if (!this.bottomInsetScrollHandler) {
      this.bottomInsetScrollHandler = () => this.scheduleBottomInsetRefresh();
      window.addEventListener("scroll", this.bottomInsetScrollHandler, {
        capture: true,
        passive: true
      });
    }
    if (this.bottomInsetLayoutRef === null) {
      this.bottomInsetLayoutRef = this.app.workspace.on("layout-change", () => {
        this.observeBottomBars();
        this.scheduleBottomInsetRefresh();
        this.scheduleBottomInsetSettle();
      });
    }
  }

  private refreshBottomInset(): void {
    if (!activeDocument.body.classList.contains("is-mobile")) {
      this.contentEl.style.removeProperty("--sc-bottom-inset");
      return;
    }
    const scroll = this.scrollerEl;
    if (!scroll) return;
    const scrollRect = scroll.getBoundingClientRect();
    if (scrollRect.height <= 0) return;
    const bars: InsetRect[] = [];
    for (const selector of [".mobile-toolbar", ".mobile-navbar"]) {
      const bar = activeDocument.querySelector<HTMLElement>(selector);
      if (!bar) continue;
      const style = getComputedStyle(bar);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = bar.getBoundingClientRect();
      if (rect.height > 0) {
        bars.push({ top: rect.top, bottom: rect.bottom, height: rect.height });
      }
    }
    const safeArea =
      Number.parseFloat(
        getComputedStyle(this.contentEl).getPropertyValue(
          "--safe-area-inset-bottom"
        )
      ) || 0;
    const inset = computeBottomInset(scrollRect, bars, safeArea);
    this.contentEl.style.setProperty("--sc-bottom-inset", `${inset}px`);
  }

  private observeBottomBars(): void {
    if (typeof ResizeObserver === "undefined") return;
    if (!this.bottomBarObserver) {
      this.bottomBarObserver = new ResizeObserver(() => {
        this.scheduleBottomInsetRefresh();
      });
    }
    this.bottomBarObserver.disconnect();
    for (const selector of [".mobile-toolbar", ".mobile-navbar"]) {
      const bar = activeDocument.querySelector<HTMLElement>(selector);
      if (bar) this.bottomBarObserver.observe(bar);
    }
  }

  private scheduleBottomInsetRefresh(): void {
    if (this.bottomInsetFrame !== null) return;
    this.bottomInsetFrame = window.requestAnimationFrame(() => {
      this.bottomInsetFrame = null;
      this.refreshBottomInset();
    });
  }

  private scheduleBottomInsetSettle(): void {
    if (this.bottomInsetTimer !== null) {
      window.clearTimeout(this.bottomInsetTimer);
    }
    this.bottomInsetTimer = window.setTimeout(() => {
      this.bottomInsetTimer = null;
      this.refreshBottomInset();
    }, 300);
  }

  private teardownBottomInset(): void {
    this.bottomInsetObserver?.disconnect();
    this.bottomInsetObserver = null;
    this.bottomBarObserver?.disconnect();
    this.bottomBarObserver = null;
    if (this.bottomInsetResizeHandler) {
      window.removeEventListener("resize", this.bottomInsetResizeHandler);
      this.bottomInsetResizeHandler = null;
    }
    if (this.bottomInsetScrollHandler) {
      window.removeEventListener("scroll", this.bottomInsetScrollHandler, true);
      this.bottomInsetScrollHandler = null;
    }
    if (this.bottomInsetLayoutRef) {
      this.app.workspace.offref(this.bottomInsetLayoutRef);
      this.bottomInsetLayoutRef = null;
    }
    if (this.bottomInsetFrame !== null) {
      window.cancelAnimationFrame(this.bottomInsetFrame);
      this.bottomInsetFrame = null;
    }
    if (this.bottomInsetTimer !== null) {
      window.clearTimeout(this.bottomInsetTimer);
      this.bottomInsetTimer = null;
    }
    for (const id of this.bottomInsetSettleTimers) {
      window.clearTimeout(id);
    }
    this.bottomInsetSettleTimers.length = 0;
    this.contentEl.style.removeProperty("--sc-bottom-inset");
  }

  private observeBreadcrumb(nav: HTMLElement): void {
    this.breadcrumbNav = nav;
    if (!this.breadcrumbObserver && typeof ResizeObserver !== "undefined") {
      this.breadcrumbObserver = new ResizeObserver(() => {
        this.scheduleBreadcrumbFit();
      });
    }
    this.breadcrumbObserver?.disconnect();
    this.breadcrumbObserver?.observe(nav);
    this.scheduleBreadcrumbFit();
  }

  private scheduleBreadcrumbFit(): void {
    if (this.breadcrumbFrame !== null) return;
    this.breadcrumbFrame = window.requestAnimationFrame(() => {
      this.breadcrumbFrame = null;
      this.fitBreadcrumb();
    });
  }

  private fitBreadcrumb(): void {
    const nav = this.breadcrumbNav;
    if (!nav || !nav.isConnected) return;
    const crumbs = Array.from(
      nav.querySelectorAll<HTMLElement>(".sc-crumb-link, .sc-crumb-current")
    );
    if (crumbs.length === 0) return;
    const seps = Array.from(
      nav.querySelectorAll<HTMLElement>(".sc-crumb-sep:not(.sc-crumb-ellipsis-sep)")
    );
    const ellipsis = nav.querySelector<HTMLElement>(".sc-crumb-ellipsis");
    const ellipsisSep = nav.querySelector<HTMLElement>(".sc-crumb-ellipsis-sep");

    for (const crumb of crumbs) {
      crumb.classList.remove("sc-crumb-hidden", "sc-crumb-truncated");
      crumb.style.removeProperty("max-width");
    }
    for (const sep of seps) {
      sep.classList.remove("sc-crumb-hidden");
    }
    ellipsis?.classList.remove("is-visible");
    ellipsisSep?.classList.remove("is-visible");

    if (!activeDocument.body.classList.contains("is-phone")) return;
    if (!ellipsis || !ellipsisSep) return;

    // Measure the full hierarchy first; the same frame hides what does not fit.
    ellipsis.classList.add("is-visible");
    ellipsisSep.classList.add("is-visible");
    const available = nav.clientWidth;
    if (available <= 0) {
      ellipsis.classList.remove("is-visible");
      ellipsisSep.classList.remove("is-visible");
      return;
    }
    const gap = Number.parseFloat(getComputedStyle(nav).columnGap) || 0;
    const widths = crumbs.map((crumb) => crumb.offsetWidth);
    const sepWidth = seps[0]?.offsetWidth ?? 0;
    const ellipsisWidth = ellipsis.offsetWidth + ellipsisSep.offsetWidth;
    const suffixWidth = (start: number): number => {
      const items =
        (start > 0 ? 2 : 0) +
        (crumbs.length - start) +
        (crumbs.length - start - 1);
      const raw =
        (start > 0 ? ellipsisWidth : 0) +
        widths.slice(start).reduce((sum, width) => sum + width, 0) +
        sepWidth * (crumbs.length - start - 1);
      return raw + gap * Math.max(0, items - 1);
    };

    let chosen = -1;
    for (let start = 0; start < crumbs.length; start += 1) {
      if (suffixWidth(start) <= available) {
        chosen = start;
        break;
      }
    }

    if (chosen === -1) {
      // Even the current page plus the ellipsis does not fit: show the current
      // page alone and truncate only if it still exceeds the available width.
      ellipsis.classList.remove("is-visible");
      ellipsisSep.classList.remove("is-visible");
      for (let index = 0; index < crumbs.length - 1; index += 1) {
        crumbs[index].classList.add("sc-crumb-hidden");
        seps[index]?.classList.add("sc-crumb-hidden");
      }
      const current = crumbs[crumbs.length - 1];
      if (widths[widths.length - 1] > available) {
        current.classList.add("sc-crumb-truncated");
        current.style.maxWidth = `${Math.max(0, available)}px`;
      }
      return;
    }

    if (chosen === 0) {
      ellipsis.classList.remove("is-visible");
      ellipsisSep.classList.remove("is-visible");
      return;
    }
    for (let index = 0; index < chosen; index += 1) {
      crumbs[index].classList.add("sc-crumb-hidden");
      seps[index]?.classList.add("sc-crumb-hidden");
    }
  }

  private teardownBreadcrumb(): void {
    this.breadcrumbObserver?.disconnect();
    this.breadcrumbObserver = null;
    this.breadcrumbNav = null;
    if (this.breadcrumbFrame !== null) {
      window.cancelAnimationFrame(this.breadcrumbFrame);
      this.breadcrumbFrame = null;
    }
  }

  private renderOther(root: HTMLElement, result: ScanResult): void {
    this.renderPageHeader(root);
    this.renderToolbar(root);
    const tree = this.getFolderTree("other", result.otherFiles, "");
    const hasList = this.renderFolderContents(root, tree, (node) =>
      this.push({ kind: "folder", root: "other", path: node.path })
    );
    if (hasList) {
      this.renderTotal(
        root,
        this.i18n.t("count.files", { count: result.other.fileCount }),
        result.other.totalSize
      );
    }
  }

  private renderTopFiles(root: HTMLElement, files: FileEntry[]): void {
    root.createDiv({ cls: "sc-section-label", text: this.i18n.t("content.largestFiles") });
    if (files.length === 0) {
      this.renderEmpty(root, this.i18n.t("empty.category"));
      return;
    }
    for (const file of files.slice(0, 5)) {
      this.renderFileRow(root, file);
    }
  }

  private renderFileList(root: HTMLElement, files: FileEntry[], emptyText: string): boolean {
    if (files.length === 0) {
      this.renderEmpty(root, emptyText);
      return false;
    }
    for (const file of sortEntries(files, this.current().sort)) {
      this.renderFileRow(root, file);
    }
    return true;
  }

  private renderFileRow(
    parent: HTMLElement,
    file: FileEntry,
    options: { hideSize?: boolean } = {}
  ): void {
    const expanded = this.current().expandedPath === file.path;
    const wrapper = parent.createDiv({
      cls: `sc-file-wrap${expanded ? " is-expanded" : ""}`
    });
    const row = wrapper.createEl("button", { cls: "sc-file-row" });
    row.setAttr("aria-expanded", expanded ? "true" : "false");
    row.createSpan({ cls: "sc-file-name", text: file.name });
    if (!options.hideSize) {
      row.createSpan({ cls: "sc-file-size", text: formatBytes(file.size) });
    }
    const chevron = row.createSpan({ cls: "sc-chev" });
    setIcon(chevron, expanded ? "chevron-down" : "chevron-right");
    row.addEventListener("click", () => {
      const state = this.current();
      if (state.expandedPath === file.path) {
        state.expandedPath = null;
        this.collapseFileDetail(wrapper);
        return;
      }
      this.collapseExpandedFile(this.contentEl);
      state.expandedPath = file.path;
      this.renderFileDetail(wrapper, file, options);
    });

    if (expanded) {
      this.renderFileDetail(wrapper, file, options);
    }
  }

  private collapseExpandedFile(container: HTMLElement): void {
    const expanded = container.querySelector<HTMLElement>(".sc-file-wrap.is-expanded");
    if (expanded) this.collapseFileDetail(expanded);
  }

  private collapseFileDetail(wrapper: HTMLElement): void {
    wrapper.classList.remove("is-expanded");
    const row = wrapper.querySelector<HTMLElement>(".sc-file-row");
    row?.setAttr("aria-expanded", "false");
    const chevron = wrapper.querySelector<HTMLElement>(".sc-chev");
    if (chevron) setIcon(chevron, "chevron-right");
    wrapper.querySelector(".sc-expanded")?.remove();
  }

  private renderFileDetail(
    wrapper: HTMLElement,
    file: FileEntry,
    options: { hideSize?: boolean } = {}
  ): void {
    wrapper.classList.add("is-expanded");
    const row = wrapper.querySelector<HTMLElement>(".sc-file-row");
    row?.setAttr("aria-expanded", "true");
    const chevron = wrapper.querySelector<HTMLElement>(".sc-chev");
    if (chevron) setIcon(chevron, "chevron-down");
    wrapper.querySelector(".sc-expanded")?.remove();

    const page = this.current().page;
    const cleanupKind =
      page.kind === "cleanup" &&
      (page.cleanupKind === "large" || page.cleanupKind === "zero")
        ? page.cleanupKind
        : null;

    const panel = wrapper.createDiv({ cls: "sc-expanded" });
    panel.createDiv({ cls: "sc-path", text: file.path });
    const meta = panel.createDiv({ cls: "sc-meta" });
    if (!options.hideSize) {
      meta.createSpan({
        text: this.i18n.t("file.size", { size: formatBytes(file.size) })
      });
    }
    meta.createSpan({
      text: this.i18n.t("file.modified", {
        time: formatDateTime(file.mtime, this.i18n)
      })
    });
    const actions = panel.createDiv({ cls: "sc-actions" });
    if (file.category === "content") {
      this.createActionButton(
        actions,
        "external-link",
        this.i18n.t("action.openFile"),
        () => {
          this.openFile(file);
        },
        cleanupKind ? "default" : "primary"
      );
    }
    this.createActionButton(actions, "copy", this.i18n.t("action.copyPath"), () => {
      void this.copyText(file.path, this.i18n.t("notice.pathCopied"));
    });
    if (cleanupKind) {
      this.createActionButton(
        actions,
        "trash-2",
        this.i18n.t("action.moveToTrash"),
        () =>
          this.confirmCleanupItems(cleanupKind, [
            {
              path: file.path,
              name: file.name,
              size: file.size,
              kind: "file",
              file
            }
          ]),
        "primary"
      );
    }
  }

  private renderFolderContents(
    parent: HTMLElement,
    node: FolderNode,
    onFolder: (folder: FolderNode) => void,
    groupRootFiles = false
  ): boolean {
    const folders = sortEntries(node.folders, this.current().sort);
    const files = sortEntries(node.files, this.current().sort);
    if (folders.length === 0 && files.length === 0) {
      this.renderEmpty(parent, this.i18n.t("empty.folder"));
      return false;
    }
    for (const folder of folders) {
      this.createRow(parent, {
        icon: "folder",
        label: folder.name,
        sub: this.i18n.t("count.files", { count: folder.fileCount }),
        sizeText: formatBytes(folder.size),
        onClick: () => onFolder(folder)
      });
    }
    if (groupRootFiles && folders.length > 0 && files.length > 0) {
      this.renderRootFileGroup(parent, files);
      return true;
    }
    for (const file of files) {
      this.renderFileRow(parent, file);
    }
    return true;
  }

  private renderRootFileGroup(parent: HTMLElement, files: FileEntry[]): void {
    const state = this.current();
    const open = state.rootFilesOpen;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    let body: HTMLElement | null = null;
    const row = this.createRow(parent, {
      icon: "files",
      label: this.i18n.t("folder.rootFiles"),
      sub: this.i18n.t("count.files", { count: files.length }),
      sizeText: formatBytes(totalSize),
      onClick: () => {
        state.rootFilesOpen = !state.rootFilesOpen;
        if (body) body.hidden = !state.rootFilesOpen;
        row.setAttr("aria-expanded", state.rootFilesOpen ? "true" : "false");
        const chevron = row.querySelector<HTMLElement>(".sc-chev");
        if (chevron) {
          setIcon(chevron, state.rootFilesOpen ? "chevron-down" : "chevron-right");
        }
        if (!state.rootFilesOpen) {
          if (body) this.collapseExpandedFile(body);
          if (state.expandedPath && files.some((file) => file.path === state.expandedPath)) {
            state.expandedPath = null;
          }
        }
      }
    });
    row.addClass("sc-row-group");
    row.setAttr("aria-expanded", open ? "true" : "false");

    body = parent.createDiv({ cls: "sc-rootfiles" });
    body.hidden = !open;
    for (const file of files) {
      this.renderFileRow(body, file);
    }
  }

  private renderPageHeader(root: HTMLElement): void {
    const bar = root.createDiv({ cls: "sc-pagebar" });
    if (this.stack.length > 1) {
      const back = bar.createEl("button", { cls: "sc-back" });
      back.setAttr("aria-label", this.i18n.t("nav.backAria"));
      const icon = back.createSpan({ cls: "sc-back-icon" });
      setIcon(icon, "arrow-left");
      back.createSpan({ text: this.i18n.t("nav.back") });
      back.addEventListener("click", () => {
        this.back();
      });
    }

    const nav = bar.createEl("nav", { cls: "sc-breadcrumb" });
    nav.setAttr("aria-label", this.i18n.t("nav.breadcrumbAria"));
    const crumbs = this.buildBreadcrumb();
    if (crumbs.length > 1) {
      const ellipsis = nav.createSpan({ cls: "sc-crumb-ellipsis", text: "…" });
      ellipsis.setAttr("aria-hidden", "true");
      const ellipsisSep = nav.createSpan({
        cls: "sc-crumb-sep sc-crumb-ellipsis-sep",
        text: "/"
      });
      ellipsisSep.setAttr("aria-hidden", "true");
    }
    crumbs.forEach((crumb, index) => {
      if (index > 0) {
        const separator = nav.createSpan({ cls: "sc-crumb-sep", text: "/" });
        separator.setAttr("aria-hidden", "true");
      }
      if (index === crumbs.length - 1) {
        const current = nav.createSpan({ cls: "sc-crumb-current", text: crumb.label });
        current.setAttr("aria-current", "page");
        return;
      }
      const link = nav.createEl("button", { cls: "sc-crumb-link", text: crumb.label });
      link.addEventListener("click", () => {
        this.goToBreadcrumb(crumb);
      });
    });
    this.observeBreadcrumb(nav);

    if (this.stack.length > 1) {
      bar.createSpan({ cls: "sc-pagebar-spacer" });
    }
  }

  private buildBreadcrumb(): CrumbSegment[] {
    const crumbs: CrumbSegment[] = [];
    const result = this.plugin.lastResult;
    this.stack.forEach((state, index) => {
      const page = state.page;
      switch (page.kind) {
        case "overview":
          return;
        case "content":
          crumbs.push({ label: this.i18n.t("category.content"), index });
          return;
        case "content-type":
          crumbs.push({
            label: this.i18n.t(`contentType.${page.typeKey}`),
            index
          });
          return;
        case "folder": {
          if (page.root === "content" && this.stack[index - 1]?.page.kind === "content") {
            crumbs.push({
              label: this.i18n.t("content.groupByFolder"),
              index: index - 1,
              contentGroup: "folder"
            });
          }
          crumbs.push({ label: leafName(page.path), index });
          return;
        }
        case "trash":
          crumbs.push({ label: ".trash", index });
          return;
        case "trash-folder":
          crumbs.push({ label: leafName(page.path), index });
          return;
        case "plugins":
          crumbs.push({ label: this.i18n.t("category.plugins"), index });
          return;
        case "plugin": {
          const plugin = result ? findPlugin(result, page.pluginId) : undefined;
          crumbs.push({ label: plugin?.name ?? page.pluginId, index });
          return;
        }
        case "plugin-folder":
          crumbs.push({ label: leafName(page.path), index });
          return;
        case "config":
          crumbs.push({ label: this.i18n.t("category.config"), index });
          return;
        case "config-group":
          crumbs.push({
            label: this.i18n.t(`configGroup.${page.groupKey}`),
            index
          });
          return;
        case "config-folder":
          crumbs.push({ label: leafName(page.path), index });
          return;
        case "cleanup-hub":
          crumbs.push({ label: this.i18n.t("cleanup.title"), index });
          return;
        case "cleanup":
          crumbs.push({
            label: this.i18n.t(CLEANUP_KEYS[page.cleanupKind]),
            index
          });
          return;
        case "other":
          crumbs.push({ label: this.i18n.t("category.other"), index });
          return;
      }
    });
    return crumbs;
  }

  private goToBreadcrumb(crumb: CrumbSegment): void {
    if (crumb.index >= this.stack.length - 1) return;
    this.saveScroll();
    this.stack = this.stack.slice(0, crumb.index + 1);
    const target = this.stack[this.stack.length - 1];
    if (crumb.contentGroup && target.contentGroup !== crumb.contentGroup) {
      target.contentGroup = crumb.contentGroup;
      target.expandedPath = null;
      target.scrollTop = 0;
    }
    this.renderCurrent();
  }

  private renderToolbar(root: HTMLElement, actions: ToolbarAction[] = []): void {
    const toolbar = root.createDiv({ cls: "sc-toolbar" });
    const leading = toolbar.createDiv({ cls: "sc-toolbar-leading" });
    for (const action of actions) {
      this.createToolbarButton(leading, action.icon ?? null, action.label, action.onClick);
    }
    this.renderSortControl(toolbar);
  }

  private createToolbarButton(
    parent: HTMLElement,
    iconId: string | null,
    label: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = parent.createEl("button", { cls: "sc-tool-btn" });
    if (iconId) {
      const icon = button.createSpan({ cls: "sc-tool-btn-icon" });
      setIcon(icon, iconId);
    }
    button.createSpan({ text: label });
    button.addEventListener("click", onClick);
    return button;
  }

  private renderSortControl(parent: HTMLElement): void {
    const sort = parent.createEl("button", { cls: "sc-tool-btn" });
    sort.setAttr("aria-label", this.i18n.t("sort.aria"));
    const icon = sort.createSpan({ cls: "sc-tool-btn-icon" });
    setIcon(icon, "arrow-up-down");
    sort.createSpan({
      text: this.i18n.t("sort.label", {
        sort: this.i18n.t(SORT_KEYS[this.current().sort])
      })
    });
    sort.addEventListener("click", (event) => {
      this.openSortMenu(event);
    });
  }

  private renderTotal(
    parent: HTMLElement,
    countText: string,
    totalSize?: number
  ): void {
    const total = parent.createDiv({ cls: "sc-list-total" });
    const main = total.createDiv({ cls: "sc-list-total-main" });
    main.createSpan({
      cls: "sc-list-total-label",
      text: this.i18n.t("total.label")
    });
    main.createSpan({ text: countText });
    if (totalSize !== undefined && totalSize > 0) {
      total.createSpan({
        cls: "sc-list-total-size",
        text: formatBytes(totalSize)
      });
    }
  }

  private renderCleanupTotal(
    parent: HTMLElement,
    kind: CleanupKind,
    candidates: CleanupCandidate[]
  ): void {
    const countText =
      kind === "folders"
        ? this.i18n.t("cleanup.foldersCount", { count: candidates.length })
        : this.i18n.t("count.files", { count: candidates.length });
    const totalSize =
      kind === "large"
        ? candidates.reduce((sum, candidate) => sum + candidate.size, 0)
        : 0;
    this.renderTotal(parent, countText, totalSize);
  }

  private renderEmpty(root: HTMLElement, text: string): void {
    const empty = root.createDiv({ cls: "sc-empty" });
    empty.createDiv({ cls: "sc-empty-note", text });
  }

  private renderErrors(root: HTMLElement, result: ScanResult): void {
    const box = root.createDiv({ cls: "sc-error" });
    const head = box.createEl("button", { cls: "sc-error-head" });
    head.setAttr("aria-expanded", this.errorsOpen ? "true" : "false");
    const icon = head.createSpan({ cls: "sc-error-icon" });
    setIcon(icon, "alert-triangle");
    head.createSpan({
      text: this.i18n.t("errors.unreadable", { count: result.errors.length })
    });
    const chevron = head.createSpan({ cls: "sc-chev" });
    setIcon(chevron, this.errorsOpen ? "chevron-down" : "chevron-right");
    head.addEventListener("click", () => {
      this.errorsOpen = !this.errorsOpen;
      this.saveScroll();
      this.renderCurrent();
    });
    if (!this.errorsOpen) return;
    const list = box.createDiv({ cls: "sc-error-list" });
    for (const error of result.errors) {
      const row = list.createDiv({ cls: "sc-error-row" });
      row.createDiv({ cls: "sc-error-path", text: error.path });
      row.createDiv({ cls: "sc-error-message", text: error.message });
    }
  }

  private createRow(parent: HTMLElement, options: RowOptions): HTMLElement {
    const row = options.onClick
      ? parent.createEl("button", { cls: "sc-row" })
      : parent.createDiv({ cls: "sc-row sc-row-static" });
    if (options.onClick) {
      row.addEventListener("click", options.onClick);
    }

    const icon = row.createSpan({ cls: "sc-row-icon" });
    if (options.tileColor) {
      icon.setCssProps({ "--sc-tile-bg": options.tileColor, "--sc-tile-fg": "var(--text-on-accent)" });
    }
    setIcon(icon, options.icon);

    const main = row.createSpan({ cls: "sc-row-main" });
    main.createSpan({ cls: "sc-row-title", text: options.label });
    const sub = main.createSpan({ cls: "sc-row-sub" });
    const subParts = Array.isArray(options.sub) ? options.sub : [options.sub];
    for (const part of subParts) {
      sub.createSpan({ text: part });
    }

    const value = row.createSpan({ cls: "sc-row-value" });
    if (options.sizeText) {
      value.createSpan({ cls: "sc-row-size", text: options.sizeText });
    }
    if (options.percentText) {
      value.createSpan({ cls: "sc-row-pct", text: options.percentText });
    }
    if (options.onClick) {
      const chevron = row.createSpan({ cls: "sc-chev" });
      setIcon(chevron, "chevron-right");
    }
    return row;
  }

  private createActionButton(
    parent: HTMLElement,
    iconId: string | null,
    label: string,
    onClick: () => void,
    variant: "default" | "primary" | "danger" = "default"
  ): HTMLButtonElement {
    const variantClass =
      variant === "primary" ? " mod-cta" : variant === "danger" ? " mod-warning" : "";
    const button = parent.createEl("button", {
      cls: `sc-action-btn${variantClass}`
    });
    if (iconId) {
      const icon = button.createSpan({ cls: "sc-btn-icon" });
      setIcon(icon, iconId);
    }
    button.createSpan({ text: label });
    button.addEventListener("click", onClick);
    return button;
  }

  private openSortMenu(event: MouseEvent): void {
    const menu = new Menu();
    const keys: SortKey[] = ["size", "name", "mtime"];
    for (const key of keys) {
      menu.addItem((item) => {
        item
          .setTitle(this.i18n.t(SORT_KEYS[key]))
          .setChecked(this.current().sort === key)
          .onClick(() => {
            this.current().sort = key;
            this.current().expandedPath = null;
            this.current().scrollTop = 0;
            this.renderCurrent();
          });
      });
    }
    this.showMenuAtTrigger(menu, event);
  }

  private openQuickActionsMenu(event: MouseEvent): void {
    const menu = new Menu();

    menu.addItem((item) => {
      item
        .setTitle(this.i18n.t("action.rescan"))
        .setIcon("refresh-cw")
        .setDisabled(this.scanning)
        .onClick(() => {
          void this.scan(true);
        });
    });

    menu.addItem((item) => {
      item
        .setTitle(this.i18n.t("action.copyReport"))
        .setIcon("copy")
        .setDisabled(!this.plugin.lastResult)
        .onClick(() => {
          const result = this.plugin.lastResult;
          if (!result) {
            this.showInfoStatus(this.i18n.t("notice.noReport"));
            return;
          }
          void this.copyText(
            buildReportText(result, this.i18n),
            this.i18n.t("notice.reportCopied")
          );
        });
    });

    this.showMenuAtTrigger(menu, event);
  }

  private showMenuAtTrigger(menu: Menu, event: MouseEvent): void {
    const trigger = event.currentTarget;
    if (trigger instanceof HTMLElement) {
      const rect = trigger.getBoundingClientRect();
      menu.showAtPosition({
        x: rect.left,
        y: rect.bottom
      });
      return;
    }
    menu.showAtMouseEvent(event);
  }

  private openFile(file: FileEntry): void {
    const target = this.app.vault.getAbstractFileByPath(file.path);
    if (!(target instanceof TFile)) {
      this.showInfoStatus(this.i18n.t("notice.fileMissing"), "alert-triangle");
      return;
    }
    void this.app.workspace.getLeaf("tab").openFile(target);
  }

  private async copyText(text: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccessStatus(successMessage, undefined, 2500);
    } catch {
      this.showInfoStatus(this.i18n.t("notice.copyFailed"), "alert-triangle", 3000);
    }
  }

  private getFolderTree(
    key: string,
    files: readonly FileEntry[],
    rootPath: string
  ): FolderNode {
    const cached = this.folderCache.get(key);
    if (cached) return cached;
    const tree = buildFolderTree(files, rootPath);
    this.folderCache.set(key, tree);
    return tree;
  }

  private push(page: Page, sort?: SortKey): void {
    this.saveScroll();
    const previous = this.current();
    const state = createPageState(page, sort ?? previous.sort, previous.contentGroup);
    if (page.kind === "cleanup") {
      state.selectedPaths = [...(this.cleanupSelections.get(page.cleanupKind) ?? [])];
    }
    this.stack.push(state);
    this.renderCurrent();
  }

  private back(): void {
    this.saveScroll();
    if (this.stack.length <= 1) return;
    this.stack.pop();
    this.renderCurrent();
  }

  private current(): PageState {
    return this.stack[this.stack.length - 1];
  }

  private saveScroll(): void {
    this.current().scrollTop = this.scrollEl().scrollTop;
  }

  private scrollEl(): HTMLElement {
    return this.scrollerEl ?? this.contentEl;
  }
}

function createPageState(
  page: Page,
  sort: SortKey = "size",
  contentGroup: ContentGroup = "type"
): PageState {
  return {
    page,
    scrollTop: 0,
    sort,
    contentGroup,
    expandedPath: null,
    rootFilesOpen: false,
    selectedPaths: [],
    cleanupMulti: false
  };
}

function findPlugin(result: ScanResult, pluginId: string): PluginEntry | undefined {
  return result.plugins.entries.find((plugin) => plugin.id === pluginId);
}

function findFolder(node: FolderNode, path: string): FolderNode | null {
  if (node.path === path) return node;
  for (const child of node.folders) {
    const found = findFolder(child, path);
    if (found) return found;
  }
  return null;
}

function configGroupRootPath(configDir: string, groupKey: string): string {
  if (groupKey === "themes" || groupKey === "snippets" || groupKey === "icons") {
    return `${configDir}/${groupKey}`;
  }
  return configDir;
}

function leafName(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const index = trimmed.lastIndexOf("/");
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

function cleanupEmptyText(kind: CleanupKind, i18n: I18n): string {
  if (kind === "large") {
    return i18n.t("cleanup.emptyLarge", {
      threshold: LARGE_FILE_THRESHOLD_LABEL
    });
  }
  if (kind === "zero") return i18n.t("cleanup.emptyZero");
  return i18n.t("cleanup.emptyFolders");
}

function cleanupSuccessText(
  result: CleanupResult,
  i18n: I18n
): {
  title: string;
  detail: string;
} {
  if (result.action === "move-to-trash") {
    const detail =
      result.freedBytes > 0
        ? `${i18n.t("count.files", { count: result.succeeded })}${i18n.t(
            "cleanup.sizeSuffix",
            { size: formatBytes(result.freedBytes) }
          )}`
        : i18n.t("count.files", { count: result.succeeded });
    return {
      title: i18n.t("cleanup.movedTitle"),
      detail
    };
  }
  if (result.action === "delete-empty-folders") {
    return {
      title: i18n.t("cleanup.deletedTitle"),
      detail: i18n.t("cleanup.foldersCount", { count: result.succeeded })
    };
  }
  return {
    title: i18n.t("cleanup.emptiedTrashTitle"),
    detail: `${i18n.t("count.files", { count: result.succeeded })}${i18n.t(
      "cleanup.freedSuffix",
      { size: formatBytes(result.freedBytes) }
    )}`
  };
}

function cleanupCountsText(result: CleanupResult, i18n: I18n): string {
  const parts = [i18n.t("cleanup.countSucceeded", { count: result.succeeded })];
  if (result.skipped > 0) {
    parts.push(i18n.t("cleanup.countSkipped", { count: result.skipped }));
  }
  if (result.failed > 0) {
    parts.push(i18n.t("cleanup.countFailed", { count: result.failed }));
  }
  return parts.join(i18n.t("cleanup.countSeparator"));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
