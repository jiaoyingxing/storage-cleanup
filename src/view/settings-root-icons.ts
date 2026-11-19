import { setIcon } from "obsidian";
import type { I18n } from "../i18n";

/**
 * 设置页图标装饰（做法参照 OpenPlug）。
 *
 * - 设置窗左栏本插件那一行：官方 `SettingTab.icon`（构造期设置）；宿主对
 *   第三方插件整栏隐藏图标元素，由 styles.css 按 `data-setting-id` 只放开
 *   本插件这一格。
 * - 根级导航行行首：`SettingDefinitionPage` 没有图标字段（d.ts 1.13+ 复核
 *   一致），只能在行渲染后按「行名 = 页名」补挂。
 *
 * 装饰是纯呈现：不动定义树、不动行文案、不承载语义（`aria-hidden`）。
 * 宿主改版导致类名 / 属性变化时静默退化为纯文字，不影响功能。
 */

/** 设置窗左栏插件行的页签图标（lucide 裸 id，宿主自行加前缀）。 */
export const SETTINGS_TAB_ICON = "hard-drive";

/** 根级两个信息页的页名；定义树与行首图标装饰共用这一份。 */
export interface SettingsRootPages {
  about: string;
  notice: string;
}

/** 按当前语言计算根级页名，避免定义树与装饰各写一套文案。 */
export function getSettingsRootPages(i18n: I18n): SettingsRootPages {
  return {
    about: i18n.t("settings.about.page"),
    notice: i18n.t("settings.notice.page")
  };
}

/** 页角色 → lucide 裸 id（`关于` 用 info，`使用须知` 用 scroll-text）。 */
const ROOT_ICON_BY_ROLE: Record<keyof SettingsRootPages, string> = {
  about: "info",
  notice: "scroll-text"
};

/** 行首图标的标记类：幂等判据与 styles.css 挂点共用同一常量。 */
export const SETTINGS_ROOT_ROW_ICON_CLASS = "sc-settings-root-icon";

/** 行名：宿主结构 `.setting-item > .setting-item-info > .setting-item-name`。 */
function settingsRowName(row: HTMLElement): string {
  const nameEl = row.querySelector<HTMLElement>(
    ":scope > .setting-item-info > .setting-item-name"
  );
  return nameEl?.textContent?.trim() ?? "";
}

/**
 * 给根级导航行补挂行首图标（幂等：行首已是自家图标类即跳过）。
 * 只装饰根级；`.setting-page` 子树里可能有一行与页同名，不排除会误挂。
 */
export function decorateSettingsRootRowIcons(
  container: HTMLElement,
  pages: SettingsRootPages
): void {
  const iconByPage = new Map<string, string>([
    [pages.about, ROOT_ICON_BY_ROLE.about],
    [pages.notice, ROOT_ICON_BY_ROLE.notice]
  ]);
  const rows = Array.from(
    container.querySelectorAll<HTMLElement>(".setting-item")
  );
  for (const row of rows) {
    if (row.closest(".setting-page")) continue;
    const icon = iconByPage.get(settingsRowName(row));
    if (!icon) continue;
    if (
      row.firstElementChild?.classList.contains(SETTINGS_ROOT_ROW_ICON_CLASS)
    ) {
      continue;
    }
    const iconEl = row.createSpan({ cls: SETTINGS_ROOT_ROW_ICON_CLASS });
    setIcon(iconEl, icon);
    iconEl.setAttribute("aria-hidden", "true");
    row.prepend(iconEl);
  }
}
