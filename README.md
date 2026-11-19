# Storage Cleanup 存储清理

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

像手机和电脑里的「存储空间」一样，一眼看清 Obsidian 仓库里每个文件、每类文件占了多少空间。

所有文件都按类目列出：你的笔记与附件、隐藏文件、插件目录里的文件，以及 Obsidian 回收站（`.trash` 文件夹）里的文件。每类显示大小、占比和数量，点进去可以看到具体文件。可以排序，也可以直接移入 `.trash`。桌面和手机都好用。

## 1. 安装

### 1.1 官方社区商店

上架后可在 Obsidian 官方社区插件目录中搜索 **Storage Cleanup** 安装并启用；当前可先用手动安装或 BRAT。

### 1.2 手动安装

从 [GitHub Releases](https://github.com/jiaoyingxing/storage-cleanup/releases) 下载 `main.js`、`manifest.json`、`styles.css`，放入仓库的 `.obsidian/plugins/storage-cleanup/` 目录（手机为对应应用文件夹内的同一路径），重启 Obsidian 后在第三方插件列表中启用。

### 1.3 BRAT

安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 后添加 `jiaoyingxing/storage-cleanup`，可跟随 GitHub Releases 更新。

## 2. 使用方式

### 2.1 打开存储清理

任选其一：

- **Ribbon 图标**：点击硬盘图标。
- **命令面板**：执行「打开存储清理」。
- **设置页**：设置 → 第三方插件 → 存储清理 → 在「打开存储清理」行点击「打开」。

### 2.2 查看存储地图

总览显示扫描到的总占用（五类之和）、各类占比条和各类的大小与数量：内容文件、插件数据、配置与主题、`.trash`、其他与隐藏。点击类目进入下一层（`.trash` 不存在时只显示提示）；子页顶部有可点击的面包屑，按 ESC 或点返回回到上一级。

- **内容文件**：默认按类型（笔记、图片、音频、视频、PDF 与文档、压缩包、其他文件）浏览，也可切换为按文件夹；最大文件在列表下方单独列出。
- **插件数据**：插件列表默认按占用排序，进入后可看版本、文件数、最后修改时间和目录内文件。
- **配置与主题**：按主题、片段、图标、配置、缓存与临时等分组；主题按主题文件夹分行。
- **`.trash`**：查看回收站内的文件和文件夹；存在文件时底部提供「清空 `.trash`」。
- **其他与隐藏**：路径中含隐藏段的文件单独统计，不与内容文件混在一起；包括 Obsidian 文件列表不显示的隐藏目录（如工具生成的 `.cache`、`.resojot-temp`）。这类文件只统计占用，不提供打开或清理入口。

文件行可点开查看路径、大小和修改时间；内容文件可以直接打开，任意文件都可以复制路径。列表支持按大小、名称、修改时间排序。右上角「更多」提供「重新扫描」和「复制扫描报告」。

### 2.3 清理文件

1. 总览有清理候选时会出现「清理」行，显示大文件、0 字节文件和空文件夹的数量。
2. 进入「清理」后选择一类，点「多选」，勾选要处理的文件或文件夹。
3. 点底部动作按钮，在确认弹窗中确认。
4. 大文件与 0 字节文件会移入 `.trash`；空文件夹会被永久删除，清空 `.trash` 会永久删除其中全部文件。

候选默认不勾选，所有清理都由你手动发起；插件不会自动或定时清理。

## 3. 主要功能

| 功能 | 说明 |
| --- | --- |
| 五类地图 | 内容文件、插件数据、配置与主题、`.trash`、其他与隐藏分别显示大小、数量（文件数或插件数）和占比；总占用为五类之和。 |
| 内容类型 / 文件夹 | 内容文件可按类型或文件夹浏览；类型包括笔记、图片、音频、视频、PDF 与文档、压缩包和其他文件。 |
| 插件列表 / 详情 | 插件默认按占用排序，详情显示版本、文件数、最后修改时间和目录内文件。 |
| 配置与主题分组 | 按主题、片段、图标、配置、缓存与临时、其他分组；主题按主题文件夹展示。 |
| 其他与隐藏 | 路径中含隐藏段的文件单独归入此类，不混入内容文件；包括 Obsidian 文件列表不显示的隐藏目录。 |
| 文件行内展开 | 展开查看路径、大小和修改时间；内容文件可打开，任意文件可复制路径。 |
| 清理候选与多选 | 汇总大文件（≥10 MB）、0 字节文件和空文件夹；候选默认不选，多选后批量处理。 |
| 确认弹窗 | 移入 `.trash` 与永久删除使用不同的确认文案；永久删除使用危险样式按钮。 |
| 排序与扫描报告 | 支持按大小、名称、修改时间排序；可复制包含各类占用、最大文件与读取错误的文本报告。 |
| 中英双语 | 界面跟随 Obsidian 当前语言显示简体中文或英文。 |
| 桌面 / 手机 | 同一套视图适配桌面与手机，按宽度调整布局。 |

## 4. 存储范围与隐私披露

- **扫描范围**：只扫描当前仓库的 Vault 内容（配置目录和 `.trash` 之外的文件，包括 Obsidian 文件列表不显示的隐藏文件与隐藏目录）、配置目录（默认 `.obsidian`）和 Obsidian 回收站（`.trash` 文件夹）。扫描到的插件数据、配置、主题、片段、图标和缓存都位于配置目录内，随配置目录一起统计。
- **读取内容**：扫描只读取文件元数据（大小、修改时间）和插件的 `manifest.json`（名称、版本、作者），不读取笔记、附件或其他文件正文。
- **只读对象**：插件数据、配置、主题、片段、图标和缓存只统计占用，不提供删除入口。
- **不联网**：插件不发起网络请求，不收集数据，无遥测、无广告、无账号。设置页中的 GitHub / 小红书按钮只在你点击时打开浏览器。
- **不在范围**：应用级缓存、Obsidian Sync 与 Publish、云盘、系统回收站和系统备份不在扫描范围；插件无法枚举或清理这些位置。
- **统计口径**：按逻辑文件大小统计；云盘占位、磁盘块占用和远程存储不可见，显示值可能低于磁盘实际占用。

## 5. 安全清理语义

- **可恢复**：大文件（≥10 MB）与 0 字节文件只会被移入 `.trash`；需要时可以把文件从 `.trash` 移回原路径恢复。
- **永久删除**：空文件夹和清空 `.trash` 无法恢复。空文件夹只列内容区最上层的空文件夹，删除时连同其空子文件夹一起删除；清空 `.trash` 会删除其中全部文件，但保留 `.trash` 文件夹。
- **手动发起**：候选默认不勾选；进入「多选」后勾选，再在确认弹窗中确认。所有清理都由你手动触发，插件不会自动或定时清理。
- **执行前复核**：移动文件前会重新核对大小与修改时间，已变化的文件会被跳过；删除空文件夹前会再次确认它仍为空且不含隐藏文件夹。
- **只读保护**：插件数据、配置、主题、片段、图标和缓存不会进入清理候选，也没有删除入口。
- **备份提示**：清理会改变仓库文件。执行前请核对路径与大小；重要内容请先备份。

## 6. 兼容性

- 最低 Obsidian 版本：`1.13.4`。
- 桌面与移动端均支持（`isDesktopOnly: false`）。
- 界面中英双语跟随 Obsidian 当前语言：中文环境显示简体中文，其余环境显示英文。切换 Obsidian 语言后，重新加载插件或重启 Obsidian 即可生效。

## 7. 已知边界与首版限制

- 1.0 不做自动或定时清理。
- 1.0 不清理未使用附件、重复文件、插件日志或插件缓存；插件数据、配置、主题、片段、图标和缓存只读。
- 不提供搜索功能，也不读取文件正文。
- 不扫描系统回收站、应用级缓存、Obsidian Sync 与 Publish、云盘和系统备份。
- 首版一次性在内存中持有完整文件列表并全量渲染；10k+ 文件的真实大库性能仍在验证，超大仓库可能出现较慢的扫描或滚动。
- 扫描结果保存在当前插件会话中；关闭视图再打开会显示上次结果，重载插件后需要重新扫描。
- 空文件夹候选依赖 Obsidian 已加载的文件夹结构；极端情况下可能漏列，重新扫描可再次检查。

## 8. 开发与验证

源码与问题反馈：<https://github.com/jiaoyingxing/storage-cleanup>

```bash
npm install
npm run dev      # 监听源码并生成 main.js
npm run build    # 类型检查并生成 main.js
npm test         # 单元测试
npm run check    # 类型检查、Lint、单元测试、元数据与文档检查
```

## 9. 许可与支持

- Storage Cleanup 以 [MIT License](./LICENSE) 开源。
- 问题反馈与改进建议：[GitHub Issues](https://github.com/jiaoyingxing/storage-cleanup/issues)，也欢迎提交 PR。
- 使用交流与产品动态：小红书搜索 **焦应行**。
