# Zotero Cite Helper

基于 Zotero Better BibTeX JSON-RPC 的引用工具，支持在 LaTeX 和 Markdown 文档中管理引用。

## 功能

- **导出 BibLaTeX**：扫描当前文档的引用键，导出到 `.bib` 文件
- **引用并更新文献**：插入引用键的同时更新 `.bib` 文件
- **更新 BibTeX 条目**：从 Zotero 更新 `.bib` 文件的所有条目

## 前置条件

- 安装 [Zotero](https://www.zotero.org/)
- 安装 [Better BibTeX](https://retorque.re/zotero-better-bibtex/) 插件
- 启动 Zotero（Better BibTeX 的 JSON-RPC 服务默认运行在 `http://localhost:23119`）

## 使用

### 导出 BibLaTeX

1. 打开一个 LaTeX 或 Markdown 文档
2. 按 `Ctrl+Shift+P`，输入并选择 **Zotero Cite Helper: 导出 BibLaTeX**
3. 输入文件名（默认 `ref.bib`），回车
4. 生成的 `.bib` 文件会自动打开

### 引用并更新文献

1. 打开文档，按 `Ctrl+Shift+P`，选择 **Zotero Cite Helper: 引用并更新文献**
2. 输入引用键（逗号分隔）
3. 引用键插入文档，同时 `.bib` 文件更新

### 更新 BibTeX 条目

1. 打开文档，按 `Ctrl+Shift+P`，选择 **Zotero Cite Helper: 更新 BibTeX 条目**
2. 从 Zotero 更新 `.bib` 文件的所有条目

## 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `zotero-cite-helper.endpoint` | `http://localhost:23119/better-bibtex/json-rpc` | Zotero Better BibTeX JSON-RPC 接口地址 |
| `zotero-cite-helper.defaultBibName` | `ref.bib` | 导出引用文件的默认文件名 |
| `zotero-cite-helper.latexBibStyle` | `bibtex` | 导出的 LaTeX 引用格式（`bibtex` 或 `biblatex`） |

## 许可证

MIT