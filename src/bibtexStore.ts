import * as vscode from "vscode";
import * as path from "path";

/**
 * BibTeX 文件读写模块。
 */

export interface BibEntry {
  citationKey: string;
  raw: string;
}

/**
 * 解析 BibTeX 文件，返回所有条目。
 * 自动处理文件末尾无换行符的情况。
 */
export function parseBibtex(text: string): BibEntry[] {
  const entries: BibEntry[] = [];
  // 末尾补换行，确保最后一个条目（无结尾换行）也能匹配 \n}
  const normalized = text.endsWith("\n") ? text : text + "\n";
  const regex = /@(\w+)\s*\{([^,]+),([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(normalized)) !== null) {
    const citationKey = m[2].trim();
    entries.push({ citationKey, raw: m[0] });
  }
  return entries;
}

/**
 * 按引用键替换 .bib 文本中的条目，保留注释、@comment、@string、@preamble 等非条目内容。
 * @param text 原始 .bib 文本
 * @param replacements 引用键 -> 新条目文本 的映射
 * @returns 替换后的完整文本
 */
export function replaceBibEntries(text: string, replacements: Map<string, string>): string {
  const normalized = text.endsWith("\n") ? text : text + "\n";
  const regex = /@(\w+)\s*\{([^,]+),([\s\S]*?)\n\}/g;
  let result = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(normalized)) !== null) {
    // 保留条目之前的非条目内容（注释、@comment、@string、@preamble 等）
    result += normalized.slice(lastIndex, m.index);
    const key = m[2].trim();
    const replacement = replacements.get(key);
    result += replacement !== undefined ? replacement : m[0];
    lastIndex = regex.lastIndex;
  }
  // 保留末尾内容
  result += normalized.slice(lastIndex);
  return result;
}

/**
 * 读取 .bib 文件的所有条目。
 */
export async function readBibEntriesFromFile(bibPath: vscode.Uri): Promise<BibEntry[]> {
  const text = await vscode.workspace.fs.readFile(bibPath);
  return parseBibtex(Buffer.from(text).toString("utf-8"));
}

/**
 * 将条目序列化为 BibTeX 文本。
 */
export function toBibtex(entry: BibEntry): string {
  return entry.raw;
}

/**
 * 写入 .bib 文件。
 */
export async function writeBibEntries(bibPath: vscode.Uri, entries: string[]): Promise<void> {
  const content = entries.join("\n\n") + "\n";
  await vscode.workspace.fs.writeFile(bibPath, Buffer.from(content, "utf-8"));
}

/**
 * 追加条目到 .bib 文件。
 */
export async function appendBibliographyEntries(bibPath: vscode.Uri, newEntries: string): Promise<void> {
  const existing = await vscode.workspace.fs.readFile(bibPath);
  const existingText = Buffer.from(existing).toString("utf-8");
  const content = existingText.trimEnd() + "\n\n" + newEntries.trim() + "\n";
  await vscode.workspace.fs.writeFile(bibPath, Buffer.from(content, "utf-8"));
}

/**
 * 解析 .bib 文件路径。
 */
export function resolveBibPath(documentUri: vscode.Uri, bibName: string): vscode.Uri {
  return vscode.Uri.joinPath(documentUri, "..", bibName);
}