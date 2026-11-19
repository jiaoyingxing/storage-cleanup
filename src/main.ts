import { Notice, Plugin } from "obsidian";
import { I18n } from "./i18n";
import type { ScanResult } from "./scan/types";
import { StorageCleanupSettingTab } from "./view/settings-tab";
import { StorageCleanupView, VIEW_TYPE_STORAGE_CLEANUP } from "./view/storage-view";

export default class StorageCleanupPlugin extends Plugin {
  lastResult: ScanResult | null = null;
  lastScanAt: number | null = null;
  i18n: I18n = new I18n("en");

  onload(): void {
    this.i18n = new I18n(I18n.detectLanguage(this.app));

    this.registerView(
      VIEW_TYPE_STORAGE_CLEANUP,
      (leaf) => new StorageCleanupView(leaf, this)
    );

    this.addSettingTab(new StorageCleanupSettingTab(this.app, this));

    this.addRibbonIcon("hard-drive", this.i18n.t("command.openStorageMap"), () => {
      void this.openStorageView();
    });

    this.addCommand({
      id: "open-storage-map",
      name: this.i18n.t("command.openStorageMap"),
      callback: () => {
        void this.openStorageView();
      }
    });
  }

  async openStorageView(): Promise<void> {
    try {
      const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_STORAGE_CLEANUP);
      if (existing.length > 0) {
        await this.app.workspace.revealLeaf(existing[0]);
        return;
      }

      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_STORAGE_CLEANUP, active: true });
      await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      console.error("Storage Cleanup: failed to open view", error);
      new Notice(this.i18n.t("notice.openFailed"));
    }
  }
}
