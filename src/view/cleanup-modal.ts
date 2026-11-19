import { App, ConfirmationModal } from "obsidian";
import type { ConfirmationButton } from "obsidian";
import type { I18n } from "../i18n/core";

export interface CleanupConfirmOptions {
  title: string;
  message: string;
  paths: string[];
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export class CleanupConfirmModal extends ConfirmationModal {
  private readonly options: CleanupConfirmOptions;
  private readonly i18n: I18n;

  constructor(app: App, i18n: I18n, options: CleanupConfirmOptions) {
    super(app);
    this.i18n = i18n;
    this.options = options;
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.options.title);
    contentEl.addClass("sc-cleanup-modal");
    contentEl.createEl("p", { text: this.options.message });

    if (this.options.paths.length > 0) {
      const list = contentEl.createEl("ul", { cls: "sc-cleanup-modal-list" });
      for (const path of this.options.paths.slice(0, 5)) {
        list.createEl("li", { text: path });
      }
      if (this.options.paths.length > 5) {
        contentEl.createEl("p", {
          cls: "sc-cleanup-modal-more",
          text: this.i18n.t("modal.morePaths", {
            count: this.options.paths.length - 5
          })
        });
      }
    }

    this.addCancelButton(this.i18n.t("modal.cancel"));
    let confirmButton: ConfirmationButton | null = null;
    this.addButton((button) => {
      confirmButton = button;
      button.setButtonText(this.options.confirmLabel);
      if (this.options.danger) {
        button.setDestructive().setCta();
      } else {
        button.setCta();
      }
      button.setDisabled(true);
      button.onClick(() => {
        void this.options.onConfirm();
      });
    });
    window.setTimeout(() => {
      confirmButton?.setDisabled(false);
    }, 200);

    contentEl.setAttr("tabindex", "-1");
    queueMicrotask(() => contentEl.focus({ preventScroll: true }));
  }

  onClose(): void {
    super.onClose();
    this.contentEl.empty();
  }
}
