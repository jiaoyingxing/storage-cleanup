import {
  App,
  ButtonComponent,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  setIcon
} from "obsidian";
import type StorageCleanupPlugin from "../main";
import {
  SETTINGS_TAB_ICON,
  decorateSettingsRootRowIcons,
  getSettingsRootPages
} from "./settings-root-icons";
import type { SettingsRootPages } from "./settings-root-icons";

/** 作者 GitHub 仓库（与 README / Release 地址一致）。 */
const GITHUB_URL = "https://github.com/jiaoyingxing/storage-cleanup";
/** 作者小红书主页固定用户 ID 链接（与 OpenPlug / EasySync 保持一致）。 */
const XIAOHONGSHU_URL =
  "https://www.xiaohongshu.com/user/profile/605dfc23000000000101cfdb";

/** 「关于-作者」行的联系方式按钮：图标 + 短标签一体化小按钮。
 *  按钮先清空宿主默认文本，再自行挂 icon / label 两个 span。 */
function configureAboutContactButton(
  button: ButtonComponent,
  options: {
    label: string;
    icon: string;
    url: string;
    extraClassName?: string;
  }
): void {
  button.setClass("sc-settings-about-contact-button");
  button.setTooltip(options.label);
  button.buttonEl.setAttribute("aria-label", options.label);
  button.onClick(() => {
    window.open(options.url, "_blank", "noopener,noreferrer");
  });
  button.buttonEl.empty();
  if (options.extraClassName) {
    button.buttonEl.addClass(options.extraClassName);
  }
  const iconEl = button.buttonEl.createSpan({
    cls: "sc-settings-about-contact-button-icon"
  });
  setIcon(iconEl, options.icon);
  button.buttonEl.createSpan({
    cls: "sc-settings-about-contact-button-label",
    text: options.label
  });
}

/**
 * 设置页。当前 `minAppVersion` 为 1.13.4（声明式设置的公版稳定基线），
 * 因此只实现 `getSettingDefinitions()`，不保留 `<1.13` 的 `display()` 回退。
 * 静态信息行进设置搜索索引；带按钮 / 联系方式的行动态用 render 回调构建。
 */
export class StorageCleanupSettingTab extends PluginSettingTab {
  plugin: StorageCleanupPlugin;

  /** 根级页名：定义树与行首图标装饰共用同一份 i18n 结果。 */
  private readonly pages: SettingsRootPages;
  /** 根级导航行行首图标补挂观察器（unload 时由 plugin.register 断开）。 */
  private rootRowIconObserver: MutationObserver | null = null;

  constructor(app: App, plugin: StorageCleanupPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    // 设置窗左栏页签图标；宿主默认隐藏第三方插件行的图标元素，由
    // styles.css 按 data-setting-id 只放开本插件那一行。
    this.icon = SETTINGS_TAB_ICON;
    this.containerEl.addClass("sc-settings-tab");
    this.pages = getSettingsRootPages(plugin.i18n);
    this.observeRootRowIcons();
  }

  /**
   * 1.13+ 根级导航行的行首图标补挂。宿主进子页再返回会重建根行，
   * 所以盯 `containerEl` 的 DOM 变化同步补挂；不用 rAF 合帧——设置窗在
   * 前台时主窗 `document.hidden === true`，rAF 实测不触发。
   */
  private observeRootRowIcons(): void {
    this.rootRowIconObserver = new MutationObserver(() => {
      this.decorateRootRowIcons();
    });
    this.rootRowIconObserver.observe(this.containerEl, {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true
    });
    this.plugin.register(() => {
      this.rootRowIconObserver?.disconnect();
      this.rootRowIconObserver = null;
    });
  }

  private decorateRootRowIcons(): void {
    decorateSettingsRootRowIcons(this.containerEl, this.pages);
  }

  /**
   * 声明式设置定义（Obsidian ≥1.13）：一个入口组 + 两个信息页。
   * 此方法每次打开设置页与建立搜索索引时都会被调用，保持廉价、无 I/O。
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        items: [
          {
            name: this.plugin.i18n.t("settings.open.name"),
            desc: this.plugin.i18n.t("settings.open.desc"),
            render: (setting) => this.renderOpenRow(setting)
          }
        ]
      },
      {
        type: "group",
        items: [
          {
            type: "page",
            name: this.pages.about,
            desc: this.plugin.i18n.t("settings.about.pageDesc"),
            items: [
              {
                name: "Storage Cleanup",
                desc: this.plugin.i18n.t("settings.about.version", {
                  version: this.plugin.manifest.version?.trim() || ""
                })
              },
              {
                name: this.plugin.i18n.t("settings.about.author"),
                desc: this.plugin.i18n.t("settings.about.authorName"),
                render: (setting) => this.renderAuthorRow(setting)
              },
              {
                name: this.plugin.i18n.t("settings.about.feedback"),
                desc: this.plugin.i18n.t("settings.about.feedbackDesc")
              }
            ]
          },
          {
            type: "page",
            name: this.pages.notice,
            desc: this.plugin.i18n.t("settings.notice.pageDesc"),
            items: [
              {
                name: this.plugin.i18n.t("settings.notice.scope"),
                desc: this.plugin.i18n.t("settings.notice.scopeDesc")
              },
              {
                name: this.plugin.i18n.t("settings.notice.readonly"),
                desc: this.plugin.i18n.t("settings.notice.readonlyDesc")
              },
              {
                name: this.plugin.i18n.t("settings.notice.cleanup"),
                desc: this.plugin.i18n.t("settings.notice.cleanupDesc")
              },
              {
                name: this.plugin.i18n.t("settings.notice.privacy"),
                desc: this.plugin.i18n.t("settings.notice.privacyDesc")
              },
              {
                name: this.plugin.i18n.t("settings.notice.caution"),
                desc: this.plugin.i18n.t("settings.notice.cautionDesc")
              }
            ]
          }
        ]
      }
    ];
  }

  /** 顶部高频入口：一键打开存储清理视图。 */
  private renderOpenRow(setting: Setting): void {
    setting
      .setName(this.plugin.i18n.t("settings.open.name"))
      .setDesc(this.plugin.i18n.t("settings.open.desc"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.i18n.t("settings.open.button"))
          .setCta()
          .onClick(() => {
            // 桌面设置是 modal、手机是满屏 pane：不收走设置，打开视图会
            // 被遮挡（用户感知「没反应」）。先收设置再开视图，让跳转
            // 意图当场可见；本行在设置页首位，想回来重开即可。
            // app.setting 未进公开 d.ts，窄声明接管。
            const settingsDialog = this.app as unknown as {
              setting: { close: () => void };
            };
            settingsDialog.setting.close();
            void this.plugin.openStorageView();
          });
      });
  }

  /** 作者行：GitHub / 小红书图标 + 短标签按钮（两个信息轨道共用）。 */
  private renderAuthorRow(setting: Setting): void {
    setting
      .setClass("sc-settings-about-contact-setting")
      .setName(this.plugin.i18n.t("settings.about.author"))
      .setDesc(this.plugin.i18n.t("settings.about.authorName"));
    setting.addButton((button) => {
      configureAboutContactButton(button, {
        label: this.plugin.i18n.t("settings.contact.github"),
        icon: "github",
        url: GITHUB_URL
      });
    });
    setting.addButton((button) => {
      configureAboutContactButton(button, {
        label: this.plugin.i18n.t("settings.contact.xiaohongshu"),
        icon: "book-open",
        url: XIAOHONGSHU_URL,
        extraClassName: "sc-settings-about-contact-button--xiaohongshu"
      });
    });
  }
}
