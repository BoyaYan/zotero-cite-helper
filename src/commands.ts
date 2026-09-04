import * as vscode from "vscode";
import * as path from "path";
import { getActiveEditor, getDocumentCiteKeys } from "./editor";
import { exportBibtex, getBibtexFromZotero, getConfig } from "./zotero";
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

    const bibliography = await exportBibtex(uniqueKeys);
    await vscode.workspace.fs.writeFile(bibPath, Buffer.from(bibliography + "\n", "utf-8"));
    vscode.window.showInformationMessage("导出成功。");
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

    const newEntries = await exportBibtex(uniqueKeys);
    try {
      await appendBibliographyEntries(bibPath, newEntries);
    } catch (error) {
      vscode.window.showErrorMessage(
        `读取参考文献文件失败：${error instanceof Error ? error.message : String(error)}`
      );
      return;
    }
    vscode.window.showInformationMessage(
      `参考文献已更新：向 ${path.basename(bibPath.fsPath)} 追加了 ${uniqueKeys.length} 条新记录。`
    );
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

/**
 * 更新 BibTeX 条目：从 Zotero 更新 .bib 文件的所有条目。
 */
export async function updateBibEntries(): Promise<void> {
  try {
    const editor = getActiveEditor();
    const { defaultBibName } = getConfig();
    const bibPath = resolveBibPath(editor.document.uri, defaultBibName);

    const parsedData = await readBibEntriesFromFile(bibPath);
    const total = parsedData.length;
    let processedCount = 0;
    let updated = false;
    const missingKeys: string[] = [];
    const serializedEntries: string[] = [];

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
    }

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
 * 选择引用键（从 Zotero 获取候选列表）。
 */
async function pickCiteKeys(): Promise<string[]> {
  const result = await vscode.window.showInputBox({
    prompt: "输入引用键（用逗号分隔）：",
    placeHolder: "key1,key2,key3",
  });
  if (result === undefined) {
    return [];
  }
  return result
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
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