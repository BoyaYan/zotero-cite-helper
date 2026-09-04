import * as vscode from "vscode";
import axios from "axios";

/**
 * Zotero Better BibTeX JSON-RPC 通信模块。
 * 通过 HTTP POST 调用 Better BibTeX 的 JSON-RPC 接口。
 */

export interface ZoteroConfig {
  endpoint: string;
  latexBibStyle: string;
  defaultBibName: string;
}

export function getConfig(): ZoteroConfig {
  const cfg = vscode.workspace.getConfiguration("zotero-cite-helper");
  return {
    endpoint: cfg.get<string>("endpoint", "http://localhost:23119/better-bibtex/json-rpc"),
    latexBibStyle: cfg.get<string>("latexBibStyle", "bibtex"),
    defaultBibName: cfg.get<string>("defaultBibName", "ref.bib"),
  };
}

/**
 * 调用 Better BibTeX JSON-RPC 方法。
 * @param method 方法名，如 "item.export"
 * @param params 参数数组
 */
export async function postJsonRpc(method: string, params: unknown[]): Promise<unknown> {
  const { endpoint } = getConfig();
  const response = await axios.post(endpoint, {
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  });
  const data = response.data;
  if (data && data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data ? data.result : undefined;
}

/**
 * 导出指定引用键的 BibTeX 文本。
 * 使用两参数形式（不带 groupId），可跨所有分组文库导出。
 * @param keys 引用键数组
 */
export async function exportBibtex(keys: string[]): Promise<string> {
  const { latexBibStyle } = getConfig();
  const result = await postJsonRpc("item.export", [keys, latexBibStyle]);
  return String(result || "");
}

/**
 * 从 Zotero 获取单个引用键的 BibTeX 条目。
 * @param citeKey 引用键
 * @returns BibTeX 文本，未找到时返回 null
 */
export async function getBibtexFromZotero(citeKey: string): Promise<string | null> {
  try {
    const result = await postJsonRpc("item.export", [[citeKey], "bibtex"]);
    return result ? String(result) : null;
  } catch (error) {
    // 未找到或不可达的条目由调用方处理
    return null;
  }
}