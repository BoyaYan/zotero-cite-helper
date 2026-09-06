import * as vscode from "vscode";
import * as path from "path";
import { getActiveEditor, getDocumentCiteKeys } from "./editor";
import { exportBibtex, getBibtexFromZotero, getConfig, pickCiteKeys } from "./zotero";
import { hideStatusBarItem, showStatusBarItem } from "./statusBar";
import {
  readBibEntriesFromFile,
  writeBibEntries,
  appendBibliographyEntries,
  resolveBibPath,
  toBibtex,
} from "./bibtexStore";

/**
 * 导出 BibLaTeX：扫描当前文档的引用键，导出到 .bib 文件。
 */
export async function exportBibLatex(): Promise<void> {
  try {
    const editor = getActiveEditor();
    if (editor.document.isUntitled) {
      vscode.window.showErrorMessage("请先保存当前文件再导出 BibTeX。");
      return;
    }
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("未打开工作区文件夹。");
      return;
    }

    const currentFileUri = editor.document.uri;
    const { defaultBibName } = getConfig();
    const bibName = await vscode.window.showInputBox({
      value: defaultBibName,
      prompt: "文件名：",
    });
    if (bibName === undefined) {
      return;
    }

    const bibPath = vscode.Uri.joinPath(currentFileUri, "..", bibName);
    const keys = getDocumentCiteKeys(editor);
    const uniqueKeys = Array.from(new Set(keys));
    if (uniqueKeys.length === 0) {
      vscode.window.showErrorMessage("未检测到引用键。");
      return;
    }

    const { bibtex: bibliography, missingKeys } = await exportBibtex(uniqueKeys);
    if (!bibliography.trim()) {
      vscode.window.showInformationMessage("所选引用键在 Zotero 中均未找到，未导出任何内容。");
      return;
    }
    await vscode.workspace.fs.writeFile(bibPath, Buffer.from(bibliography + "\n", "utf-8"));
    if (missingKeys.length > 0) {
      vscode.window.showWarningMessage(
        `导出成功，但有 ${missingKeys.length} 个条目在 Zotero 中未找到：${missingKeys.join(", ")}`
      );
    } else {
      vscode.window.showInformationMessage("导出成功。");
    }
    await vscode.window.showTextDocument(bibPath);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

/**
 * 引用并更新文献：插入引用键，同时更新 .bib 文件。
 */
export async function citeBibliography(): Promise<void> {
  try {
    const editor = getActiveEditor();
    if (editor.document.isUntitled) {
      vscode.window.showErrorMessage("请先保存当前标签页。");
      return;
    }

    const { defaultBibName } = getConfig();
    const bibPath = resolveBibPath(editor.document.uri, defaultBibName);

    // 选择引用键
    const citeKeys = await pickCiteKeys();
    if (citeKeys.length === 0) {
      return;
    }

    // 插入引用
    insertCiteKeys(citeKeys, editor);

    // 更新 .bib 文件
    const bibKeys = await getBibliographyKeyFromFile(bibPath);
    const uniqueKeys = citeKeys.filter((key) => !bibKeys.includes(key));
    if (uniqueKeys.length === 0) {
      return;
    }

    const { bibtex: newEntries, missingKeys } = await exportBibtex(uniqueKeys);
    if (!newEntries.trim()) {
      vscode.window.showInformationMessage("所选引用键在 Zotero 中均未找到，未更新参考文献文件。");
      return;
    }
    try {
      await appendBibliographyEntries(bibPath, newEntries);
    } catch (error) {
      vscode.window.showErrorMessage(
        `读取参考文献文件失败：${error instanceof Error ? error.message : String(error)}`
      );
      return;
    }
    if (missingKeys.length > 0) {
      vscode.window.showWarningMessage(
        `参考文献已更新：向 ${path.basename(bibPath.fsPath)} 追加了 ${uniqueKeys.length} 条新记录，但有 ${missingKeys.length} 个条目在 Zotero 中未找到：${missingKeys.join(", ")}`
      );
    } else {
      vscode.window.showInformationMessage(
        `参考文献已更新：向 ${path.basename(bibPath.fsPath)} 追加了 ${uniqueKeys.length} 条新记录。`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

/**
 * 更新 BibTeX 条目：从 Zotero 更新 .bib 文件的所有条目。
 * 焦点处理：当焦点是 .bib 文件时，直接更新当前打开的 .bib 文件；
 * 否则解析同目录下的默认 .bib 文件。
 * 执行期间隐藏状态栏按钮（避免鼠标悬停触发 tooltip），并显示进度。
 */
export async function updateBibEntries(): Promise<void> {
  // 执行期间隐藏状态栏按钮，避免悬停显示 tooltip
  hideStatusBarItem();
  try {
    const editor = getActiveEditor();
    const { defaultBibName } = getConfig();

    // 焦点处理：焦点是 .bib 文件时直接使用当前文件
    let bibPath: vscode.Uri;
    if (editor.document.languageId === "bibtex") {
      bibPath = editor.document.uri;
    } else {
      bibPath = resolveBibPath(editor.document.uri, defaultBibName);
    }

    const parsedData = await readBibEntriesFromFile(bibPath);
    const total = parsedData.length;
    let processedCount = 0;
    let updated = false;
    const missingKeys: string[] = [];
    const serializedEntries: string[] = [];

    // 用进度通知包裹耗时循环，用户可看到更新进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "正在从 Zotero 更新 BibTeX 条目...",
        cancellable: false,
      },
      async (progress) => {
        for (const entry of parsedData) {
          const citeKey = entry.citationKey;
          const result = await getBibtexFromZotero(citeKey);
          if (result === null) {
            missingKeys.push(citeKey);
            serializedEntries.push(toBibtex(entry));
            continue;
          }
          processedCount += 1;
          updated = true;
          serializedEntries.push(result);
          progress.report({ message: `已处理 ${processedCount}/${total}` });
        }
      }
    );

    if (updated) {
      await writeBibEntries(bibPath, serializedEntries);
    }

    if (missingKeys.length > 0) {
      vscode.window.showInformationMessage(
        `有 ${missingKeys.length} 条 bib 记录未在 Zotero 中找到：${missingKeys.join(", ")}`
      );
    }

    vscode.window.showInformationMessage(`已成功更新 ${processedCount}/${total} 条 bib 记录。`);
  } catch (error) {
    vscode.window.showErrorMessage(
      `更新 BibTeX 文件失败：${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // 命令执行完毕，恢复状态栏按钮显示
    showStatusBarItem();
  }
}

/**
 * 从 .bib 文件获取所有引用键。
 */
async function getBibliographyKeyFromFile(bibPath: vscode.Uri): Promise<string[]> {
  try {
    const entries = await readBibEntriesFromFile(bibPath);
    return entries.map((e) => e.citationKey);
  } catch {
    return [];
  }
}

/**
 * 在文档中插入引用键。
 */
function insertCiteKeys(citeKeys: string[], editor: vscode.TextEditor): void {
  const languageId = editor.document.languageId;
  let text: string;
  if (languageId === "markdown") {
    text = citeKeys.map((k) => `[^${k}]`).join("");
  } else {
    text = `\\cite{${citeKeys.join(",")}}`;
  }
  editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, text);
  });
}

/**
 * 状态栏命令选择器：弹出可用命令列表供用户选择。
 */
interface CommandQuickPickItem extends vscode.QuickPickItem {
  commandId: string;
}

export async function showTaskPicker(): Promise<void> {
  try {
    const editor = getActiveEditor();
    const languageId = editor.document.languageId;

    // 根据当前文件格式显示对应的命令
    const items: CommandQuickPickItem[] = [];

    // LaTeX / Markdown 文件：支持引用和导出
    if (languageId === "latex" || languageId === "markdown" || languageId === "pandoc") {
      items.push(
        {
          label: "$(zap) 引用并更新文献",
          description: "弹出 Zotero 选择窗口，插入引用并更新 .bib 文件",
          commandId: "zotero-cite-helper.citeBibliography",
        },
        {
          label: "$(file-code) 导出 BibLaTeX",
          description: "扫描当前文档引用键，导出到 .bib 文件",
          commandId: "zotero-cite-helper.exportBibLatex",
        }
      );
    }

    // BibTeX 文件：支持更新条目
    if (languageId === "bibtex" || languageId === "latex" || languageId === "markdown") {
      items.push({
        label: "$(refresh) 更新 BibTeX 条目",
        description: "从 Zotero 更新 .bib 文件的所有条目",
        commandId: "zotero-cite-helper.updateBibtexEntries",
      });
    }

    if (items.length === 0) {
      vscode.window.showInformationMessage(
        `当前文件类型（${languageId}）不支持 Zotero Cite Helper 命令。请在 LaTeX、Markdown 或 BibTeX 文件中使用。`
      );
      return;
    }

    const picked = await vscode.window.showQuickPick(items, {
      title: "Zotero Cite Helper",
      placeHolder: "选择要执行的命令",
      matchOnDescription: true,
    });

    if (!picked) {
      return;
    }
    await vscode.commands.executeCommand(picked.commandId);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}