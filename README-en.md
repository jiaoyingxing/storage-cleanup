# Storage Cleanup

<p align="center">
  <a href="https://github.com/jiaoyingxing/storage-cleanup/releases">
    <img alt="Release downloads" src="https://img.shields.io/github/downloads/jiaoyingxing/storage-cleanup/total.svg?style=flat-square&label=Release%20downloads" />
  </a>
  <a href="https://github.com/jiaoyingxing/storage-cleanup/releases">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/jiaoyingxing/storage-cleanup?style=flat-square&label=Latest%20release" />
  </a>
  <a href="https://community.obsidian.md/plugins/storage-cleanup">
    <img alt="Obsidian Plugin" src="https://img.shields.io/badge/Obsidian-Plugin-7c3aed?style=flat-square" />
  </a>
  <a href="./LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/jiaoyingxing/storage-cleanup?style=flat-square" />
  </a>
  <a href="./README.md">
    <img alt="CN 中文版" src="https://img.shields.io/badge/CN-%E4%B8%AD%E6%96%87%E7%89%88-d32f2f?style=flat-square" />
  </a>
  <a href="./README-en.md">
    <img alt="EN English" src="https://img.shields.io/badge/EN-English-2f6fed?style=flat-square" />
  </a>
</p>

Storage Cleanup maps storage use across your vault, plugin data, and the Obsidian trash (the `.trash` folder) by category. It helps you safely clean up large files, empty files, and empty folders, and empty out `.trash`.

It turns the current vault's storage use into a map you can drill into: content files, plugin data, config & themes, `.trash`, and other & hidden, each with its size, file count, and share of the total. Start from the overview to see where the space goes, then decide what to clean. Every cleanup shows paths, sizes, and a confirmation step.

## 1. Installation

### 1.1 Community plugins

Once the plugin is listed, search for **Storage Cleanup** in the official Obsidian community plugin directory and install it. Until then, use one of the manual options below.

### 1.2 Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from [GitHub Releases](https://github.com/jiaoyingxing/storage-cleanup/releases), place them in `.obsidian/plugins/storage-cleanup/` in your vault (the same path under the app's data folder on mobile), restart Obsidian, and enable the plugin in the community plugins list.

### 1.3 BRAT

Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) and add `jiaoyingxing/storage-cleanup` to follow GitHub Releases.

## 2. Usage

### 2.1 Opening Storage Cleanup

Pick whichever is handy:

- **Ribbon icon**: click the hard-drive icon.
- **Command palette**: run "Open Storage Cleanup".
- **Settings**: Settings → Community plugins → Storage Cleanup → click **Open** on the "Open Storage Cleanup" row.

### 2.2 Reading the storage map

The overview shows total scanned storage (the sum of the five categories), a category share bar, and the size and count of each category: content files, plugin data, config & themes, `.trash`, and other & hidden. Select a category to drill down (when `.trash` is missing, the row only shows a note). Subpages have a clickable breadcrumb; press Esc or use Back to return one level.

- **Content files**: browse by type (notes, images, audio, video, PDF & documents, archives, other files) or switch to folders. The largest files are listed separately below the main list.
- **Plugin data**: the plugin list is sorted by size by default. Open one to see its version, file count, last modified time, and files.
- **Config & themes**: grouped into themes, snippets, icons, configuration, cache & temp, and other. Themes are listed one folder at a time.
- **`.trash`**: view files and folders in the Obsidian trash. When it contains files, the **Empty .trash** action appears at the bottom.
- **Other & hidden**: files whose path contains a hidden segment are counted here, separately from content files.

Expand a file row to see its path, size, and modified time. Content files can be opened; any file's path can be copied. Lists can be sorted by size, name, or modified time. The More menu in the top-right offers Rescan and Copy scan report.

### 2.3 Cleaning up files

1. When candidates exist, the overview shows a Cleanup row with counts of large files, empty files, and empty folders.
2. Open Cleanup, pick a category, choose Select, and check the files or folders you want to handle.
3. Use the action bar at the bottom and confirm in the dialog.
4. Large files and empty files move to `.trash`; empty folders are permanently deleted; emptying `.trash` permanently deletes all files inside it.

Candidates start unselected. Every cleanup is started by you, and nothing runs automatically or on a schedule.

## 3. Features

| Feature | Description |
| --- | --- |
| Five categories | Content files, plugin data, config & themes, `.trash`, and other & hidden each shows size, count (files or plugins), and share of the total. The total is the sum of the five. |
| Content types / folders | Browse content files by type or by folder. Types include notes, images, audio, video, PDF & documents, archives, and other files. |
| Plugin list / details | Plugins are sorted by size by default. Details show version, file count, last modified time, and files. |
| Config & themes groups | Grouped into themes, snippets, icons, configuration, cache & temp, and other. Themes are shown one folder at a time. |
| Other & hidden | Files with a hidden path segment are counted here, separately from content files. |
| Inline file details | Expand a row to see path, size, and modified time. Content files can be opened; any file's path can be copied. |
| Cleanup candidates & multi-select | Collects large files (10 MB or larger), empty files (0 bytes), and empty folders. Candidates start unselected; select them in batches. |
| Confirmation dialog | Moving to `.trash` and permanent deletion use different confirmation text. Permanent deletion uses a destructive button. |
| Sorting & scan report | Sort by size, name, or modified time. Copy a text report with category totals, largest files, and read errors. |
| Chinese & English | The interface follows Obsidian's current language and shows Simplified Chinese or English. |
| Desktop / mobile | The same view adapts to desktop and mobile widths. |

## 4. Storage scope & privacy

- **Scope**: scans only the current vault's content files (files outside the configuration folder and `.trash`), the configuration folder (defaults to `.obsidian`), and the Obsidian trash (the `.trash` folder). Plugin data, configuration, themes, snippets, icons, and caches that the scan can see live inside the configuration folder and are counted there.
- **What is read**: file metadata (size and modified time) and each plugin's `manifest.json` (name, version, author). The plugin does not read notes, attachments, or other file contents.
- **Read-only data**: plugin data, configuration, themes, snippets, icons, and caches are counted but have no delete actions.
- **No network**: the plugin makes no network requests, collects no data, and has no telemetry, ads, or account. The GitHub and Xiaohongshu buttons in settings only open your browser when you click them.
- **Outside the scope**: app-level caches, Obsidian Sync and Publish, cloud drives, the system trash, and system backups are not scanned. The plugin cannot list or clean them.
- **How sizes are measured**: sizes are logical file sizes. Cloud placeholders, disk block usage, and remote storage are not visible, so the reported total may be lower than the space used on disk.

## 5. Cleanup behavior

- **Recoverable**: large files (10 MB or larger) and empty files (0 bytes) are only moved to `.trash`. Move a file back to its original path to restore it.
- **Permanent**: empty folders and emptying `.trash` cannot be undone. Only top-level empty folders in the content area are listed; deleting one also removes its empty subfolders. Emptying `.trash` deletes all files inside it but keeps the `.trash` folder.
- **Manual only**: candidates start unselected. Choose Select, check the items you want, and confirm in the dialog. Every cleanup is started by you, and nothing runs automatically or on a schedule.
- **Rechecks**: before moving a file, the plugin checks its size and modified time again and skips files that changed. Before deleting an empty folder, it confirms the folder is still empty and contains no hidden folders.
- **Read-only protection**: plugin data, configuration, themes, snippets, icons, and caches never appear as cleanup candidates and have no delete actions.
- **Back up first**: cleanup changes files in your vault. Check paths and sizes before you start, and keep a backup of anything important.

## 6. Compatibility

- Minimum Obsidian version: `1.13.4`.
- Desktop and mobile are both supported (`isDesktopOnly: false`).
- The interface follows Obsidian's current language: Simplified Chinese for Chinese locales, English otherwise. After changing Obsidian's language, reload the plugin or restart Obsidian for the change to take effect.

## 7. Known limitations

- 1.0 does not run automatic or scheduled cleanups.
- 1.0 does not clean up unused attachments, duplicate files, plugin logs, or plugin caches. Plugin data, configuration, themes, snippets, icons, and caches are read-only.
- There is no search, and the plugin does not read file contents.
- The system trash, app-level caches, Obsidian Sync and Publish, cloud drives, and system backups are not scanned.
- The first version keeps the full file list in memory and renders it in full. Performance on very large vaults (10k+ files) is still being verified; scanning or scrolling may be slower in a large vault.
- Scan results live in the current plugin session. Reopening the view shows the last result; reloading the plugin starts a new scan.
- Empty folder candidates depend on the folder structure Obsidian has loaded. In rare cases some may be missed; rescan to check again.

## 8. Development

Source and issue tracker: <https://github.com/jiaoyingxing/storage-cleanup>

```bash
npm install
npm run dev      # watch sources and build main.js
npm run build    # type-check and build main.js
npm test         # unit tests
npm run check    # type-check, lint, unit tests, metadata, and docs checks
```

## 9. License & support

- Storage Cleanup is open source under the [MIT License](./LICENSE).
- Bugs and suggestions: [GitHub Issues](https://github.com/jiaoyingxing/storage-cleanup/issues); PRs welcome.
- Community and product updates: search Xiaohongshu for **焦应行**.
