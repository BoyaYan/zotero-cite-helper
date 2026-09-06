import * as vscode from "vscode";
import { createStatusBarItem } from "./statusBar";

/**
 * 扩展激活入口。
 */
export function activate(context: vscode.ExtensionContext): void {
  // 延迟加载命令模块：axios 等重依赖只在首次执行命令时加载，加快插件激活速度
  let commandsPromise: Promise<typeof import("./commands")> | undefined;
  const loadCommands = (): Promise<typeof import("./commands")> =>
    (commandsPromise ??= import("./commands"));

  // 注册命令（激活时只做轻量注册，不加载重依赖）
  context.subscriptions.push(
    vscode.commands.registerCommand("zotero-cite-helper.exportBibLatex", async () => {
      const { exportBibLatex } = await loadCommands();
      return exportBibLatex();
    }),
    vscode.commands.registerCommand("zotero-cite-helper.citeBibliography", async () => {
      const { citeBibliography } = await loadCommands();
      return citeBibliography();
    }),
    vscode.commands.registerCommand("zotero-cite-helper.updateBibtexEntries", async () => {
      const { updateBibEntries } = await loadCommands();
      return updateBibEntries();
    }),
    vscode.commands.registerCommand("zotero-cite-helper.showTaskPicker", async () => {
      const { showTaskPicker } = await loadCommands();
      return showTaskPicker();
    })
  );

  // 创建状态栏按钮（高优先级，放在右边状态栏最左边）
  const statusBarItem = createStatusBarItem();

  // 根据焦点文件类型显示按钮：仅 LaTeX 和 BibTeX 文件显示
  const updateStatusBar = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const languageId = editor.document.languageId;
      if (languageId === "latex" || languageId === "bibtex") {
        statusBarItem.show();
        return;
      }
    }
    statusBarItem.hide();
  };

  updateStatusBar();
  context.subscriptions.push(
    statusBarItem,
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  );
}

/**
 * 扩展停用入口。
 */
export function deactivate(): void {
  // 无需清理
}