import * as vscode from "vscode";
import { exportBibLatex, citeBibliography, updateBibEntries } from "./commands";

/**
 * 扩展激活入口。
 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("zotero-cite-helper.exportBibLatex", exportBibLatex),
    vscode.commands.registerCommand("zotero-cite-helper.citeBibliography", citeBibliography),
    vscode.commands.registerCommand("zotero-cite-helper.updateBibtexEntries", updateBibEntries)
  );
}

/**
 * 扩展停用入口。
 */
export function deactivate(): void {
  // 无需清理
}