# Zotero Cite Helper

基于 Zotero Better BibTeX 的引用管理工具，支持在 **LaTeX**、**Markdown** 和 **BibTeX** 文档中便捷地管理引用。通过 JSON-RPC 和 CAYW (Cite As You Write) 接口与 Zotero 通信，无需离开编辑器即可完成引用插入与文献库同步。

## 功能

### 引用并更新文献

弹出 Zotero 选择窗口（CAYW），选中条目后自动完成两件事：

1. 在当前文档光标处插入引用键
   - LaTeX：`\cite{key1,key2}`
   - Markdown（脚注）：`[^key1][^key2]`
   - Pandoc Markdown：`@key1 @key2`
2. 将对应 BibTeX 条目追加到 `.bib` 文件

### 导出 BibLaTeX

扫描当前文档中所有引用键（`\cite{}`、`[^key]`、`@key`），批量导出到 `.bib` 文件。用于初次创建文献库或补全缺失条目。

### 更新 BibTeX 条目

从 Zotero 批量更新 `.bib` 文件中的所有条目，保留文件中的注释、`@comment`、`@string`、`@preamble` 等非条目内容。

### 状态栏快捷入口

编辑 LaTeX 或 BibTeX 文件时，状态栏右侧显示 **Zotero** 按钮，点击弹出命令选择器，根据当前文件类型列出可用命令。

## 前置条件

- 安装 [Zotero](https://www.zotero.org/)
- 安装 [Better BibTeX](https://retorque.re/zotero-better-bibtex/) 插件
- 启动 Zotero（Better BibTeX 的 JSON-RPC 和 CAYW 服务默认运行在 `http://localhost:23119`）

## 使用

### 引用并更新文献

1. 打开 LaTeX 或 Markdown 文档
2. 按 `Ctrl+Shift+P`，选择 **Zotero Cite Helper: 引用并更新文献**
   - 或点击状态栏的 **Zotero** 按钮，在弹出菜单中选择
3. 在 Zotero 弹出窗口中选择文献条目
4. 引用键自动插入文档，同时 `.bib` 文件更新

### 导出 BibLaTeX

1. 打开包含引用键的文档
2. 按 `Ctrl+Shift+P`，选择 **Zotero Cite Helper: 导出 BibLaTeX**
3. 输入文件名（默认 `ref.bib`），回车
4. 生成的 `.bib` 文件会自动打开

### 更新 BibTeX 条目

1. 打开 `.bib` 文件或包含引用的文档
2. 按 `Ctrl+Shift+P`，选择 **Zotero Cite Helper: 更新 BibTeX 条目**
3. 所有条目从 Zotero 重新导出并替换

### 命令选择器

按 `Ctrl+Shift+P`，选择 **Zotero Cite Helper: 选择命令**（或点击状态栏按钮），根据当前文件类型显示可用命令：

| 文件类型 | 可用命令 |
|----------|----------|
| LaTeX / Pandoc Markdown | 引用并更新文献、导出 BibLaTeX、更新 BibTeX 条目 |
| 普通 Markdown | 引用并更新文献、导出 BibLaTeX、更新 BibTeX 条目 |
| BibTeX | 更新 BibTeX 条目 |

## 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `zotero-cite-helper.endpoint` | `http://localhost:23119/better-bibtex/json-rpc` | Zotero Better BibTeX JSON-RPC 接口地址 |
| `zotero-cite-helper.caywUrl` | `http://localhost:23119/better-bibtex/cayw` | Zotero CAYW (Cite As You Write) 接口地址，用于弹出选择窗口 |
| `zotero-cite-helper.defaultBibName` | `ref.bib` | 导出引用文件的默认文件名 |
| `zotero-cite-helper.latexBibStyle` | `bibtex` | 导出的 LaTeX 引用格式（`bibtex` 或 `biblatex`） |

## 许可证

MIT