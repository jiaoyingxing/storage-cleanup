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

Like opening the storage page on your phone or computer: see at a glance how much space each file, and each type of file, takes in your Obsidian vault.

Every file is listed by category — notes, attachments, hidden files, files inside plugin folders, and the `.trash` trash folder. Open a category to see the individual files; files can be sorted, moved to `.trash` directly, and restored from `.trash`. It runs smoothly on desktop and mobile.

## Table of contents

- [1. Installation](#1-installation)
- [2. Opening the view](#2-opening-the-view)
- [3. Overview](#3-overview)
- [4. The five categories](#4-the-five-categories)
- [5. Viewing files](#5-viewing-files)
- [6. Cleanup](#6-cleanup)
- [7. Restoring from .trash](#7-restoring-from-trash)
- [8. Scanning and privacy](#8-scanning-and-privacy)
- [9. Settings page](#9-settings-page)
- [10. Limitations](#10-limitations)
- [11. FAQ](#11-faq)
- [12. Feedback and license](#12-feedback-and-license)

## 1. Installation

### 1.1 Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/jiaoyingxing/storage-cleanup/releases) and put them in your vault's `.obsidian/plugins/storage-cleanup/`:

```text
<vault>/
└─ .obsidian/
   └─ plugins/
      └─ storage-cleanup/
         ├─ main.js
         ├─ manifest.json
         └─ styles.css
```

Create the folder if it does not exist yet. Once the files are in place, restart Obsidian and enable Storage Cleanup under Settings → Community plugins.

If it already shows up in the community plugin directory, you can install it from Settings → Community plugins → Browse instead.

### 1.2 Requirements

- Obsidian 1.13.4 or later.
- Desktop and mobile are both supported.

## 2. Opening the view

Three entry points, one tab:

| Entry | Action |
|:---|:---|
| Left sidebar | Click the hard-drive icon |
| Command palette | Run "Open Storage Cleanup" |
| Settings | Settings → Community plugins → Storage Cleanup → **Open** |

Every page except the overview has **Back** in the top left; the row of levels in the header is clickable too. Esc does the same as **Back**.

The **More** menu at the top right has **Rescan** and **Copy scan report**.

## 3. Overview

The top shows the total of all five categories and the vault name, then a share bar, then one row per category:

| Category | Contents |
|:---|:---|
| Content files | Notes, attachments, and other regular files |
| Plugin data | Space used by each plugin under `plugins/` |
| Config & themes | Themes, snippets, icons, configuration, caches |
| .trash | The Obsidian trash |
| Other & hidden | Files under a hidden path segment |

Each row shows its size and share on the right; click one to open that category.

When cleanup candidates exist, a **Cleanup** row appears at the end with the number of items. If some locations could not be read, "N locations could not be read" appears below the list.

## 4. The five categories

### 4.1 Content files

Grouped by type by default: notes, images, audio, video, PDF & documents, archives, and other files. Click a type to see its files.

You can also switch to **By folder** and drill down. Both views show the five largest files in the content area.

### 4.2 Plugin data

One row per plugin with its name, version, file count, and size. Open one to see that plugin's files and subfolders; **Copy path** is at the top.

This category is counted only, with no delete actions.

### 4.3 Config & themes

Grouped into themes, snippets, icons, configuration, cache & temp, and other. Click a group to see its files. Each theme gets its own row.

Also counted only.

### 4.4 .trash

`.trash` is the Obsidian trash at the root of your vault — not the system trash.

You can enter subfolders to browse. Expanding a file row gives **Copy path** and **Restore**. When there is content, **Empty .trash** is at the bottom of the page; emptying permanently deletes everything inside.

### 4.5 Other & hidden

Files with any path segment starting with `.` land here, including hidden folders Obsidian's file list does not show.

They are counted only — they cannot be opened or cleaned up.

## 5. Viewing files

Expand a row to see the full path, size, and modified time. Content files can be opened; any file's path can be copied.

The sort button at the right of the toolbar sorts by size, name, or modified time.

## 6. Cleanup

### 6.1 Getting to cleanup

When candidates exist, the last row of the overview is **Cleanup**. It opens three directions, showing only the ones with candidates:

| Direction | Rule |
|:---|:---|
| Large files | 10 MB or larger |
| Empty files | 0 bytes |
| Empty folders | no files inside |

Candidates come only from content files. Files in the configuration folder, hidden paths, and `.trash` never appear.

### 6.2 How to handle them

One item: expand a candidate row and choose **Move to .trash** or **Delete permanently**.

In batches: choose **Select** in the toolbar, check the items, then use the button at the bottom. Candidates start unchecked; **Select all** checks everything.

### 6.3 Where each candidate ends up

| Candidate | Result | Recoverable |
|:---|:---|:---|
| Large files | Moved to `.trash` | Yes, see section 7 |
| Empty files | Moved to `.trash` | Same as above |
| Empty folders | Permanently deleted | No |

Action buttons open a confirmation dialog; permanent deletion uses a destructive button.

### 6.4 Results

When everything succeeds a toast appears at the bottom and dismisses itself after a few seconds. If anything was skipped or failed, a card stays with the counts; expand it to see each reason, and **Retry failed items** runs them again.

Once cleanup finishes, successful items leave the list and the overview updates.

## 7. Restoring from .trash

When Obsidian puts a file into `.trash` it keeps only the file name, not the original folder — so you choose where a restored item goes.

Expand a row in `.trash` and choose **Restore**, or choose **Select**, check several entries, and use **Restore** at the bottom.

You then get the **Choose destination folder** page: start at the vault root, click into folders level by level, and choose **Restore here** at the bottom.

The destination must already exist; the plugin does not create folders. If a file with the same name is already there, the restored one becomes "name 2" rather than overwriting anything.

Once `.trash` has been emptied, nothing inside it can be restored.

## 8. Scanning and privacy

### 8.1 What is scanned

Vault content, the configuration folder (`.obsidian` by default), and `.trash` in the current vault. Files under a hidden path segment are read too and counted separately under "Other & hidden".

App-level caches, Obsidian Sync and Publish, cloud drives, the system trash, and system backups are not scanned.

### 8.2 What is read

File size, modified time, and each plugin's `manifest.json` (name, version, author). Note, attachment, and other file contents are not read.

### 8.3 Privacy

The plugin does not use the network and collects no data: no telemetry, ads, or accounts. The GitHub and Xiaohongshu buttons in settings only open your browser when you click them.

### 8.4 How sizes are measured

Logical file sizes, so the number can be lower than what the disk reports. The total is the sum of the five categories, and each file is counted once.

### 8.5 When scanning happens

The first time you open the view it scans automatically. After adding or removing files, use **More → Rescan**.

## 9. Settings page

Settings → Community plugins → Storage Cleanup has three parts: an entry that opens the view, an About page (version, author, feedback), and usage notes (scan scope, read-only boundaries, cleanup behavior, privacy, tips).

There are no toggles; the 10 MB threshold and the scan scope cannot be changed.

The interface follows Obsidian's language and appears in Chinese or English. Reload the plugin after changing the language.

## 10. Limitations

- No search; you browse by category, type, and folder.
- Plugin data and config & themes are read-only, with no delete actions in the UI.
- The `.trash` page only empties the whole folder — single files cannot be deleted there. Restoring works per file or per folder.
- Files moved to `.trash` keep only their name; the original folder is not preserved, so restoring always asks you for a destination.
- Restoring, deleting empty folders, and emptying `.trash` have no undo.
- In a very large vault (tens of thousands of files), scanning and scrolling slow down.
- The list is the previous scan's result and does not update as files change.

## 11. FAQ

**The total does not match what my system reports.**
The plugin measures logical file sizes while the system reports disk usage; block alignment, compression, and cloud placeholders all create differences.

**A file I just deleted or added is not in the list.**
The list is the previous scan's result. Use **More → Rescan**.

**Why is a large file missing from the cleanup candidates?**
Candidates come only from non-hidden content files. A file in the configuration folder, `.trash`, or a hidden path never appears.

**Cleanup said the file had changed.**
The file was edited, renamed, or replaced after the scan, so the plugin skipped it. Rescan and try again.

**Why did a restored file get a " 2" in its name?**
The destination already had a file with that name, so the plugin looked for the first free name — "name 2", "name 3", and so on — leaving existing files untouched.

**Does emptying .trash delete the .trash folder itself?**
No. The folder stays; its contents are emptied.

**Does cleanup ever start on its own?**
No. Every cleanup needs a click plus a confirmation, and restoring needs a chosen destination. There is no automatic or scheduled cleanup, and no automatic restore.

**Does it work on mobile?**
Yes. Desktop and mobile share one view that adapts to the screen width.

## 12. Feedback and license

Storage Cleanup is open source under the [MIT License](./LICENSE).

- Bug reports, reproducible issues, and feature requests: [GitHub Issues](https://github.com/jiaoyingxing/storage-cleanup/issues). PRs are welcome.
- Community and release news: search Xiaohongshu for **焦应行**.

<details>
<summary>Building from source</summary>

```bash
npm install
npm run dev      # watch sources and build main.js
npm run build    # type-check and build main.js
npm test         # unit tests
npm run check    # full checks
```

</details>
