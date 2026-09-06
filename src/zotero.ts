import * as vscode from "vscode";
import axios from "axios";

/**
 * Zotero Better BibTeX JSON-RPC 通信模块。
 * 通过 HTTP POST 调用 Better BibTeX 的 JSON-RPC 接口。
 */

export interface ZoteroConfig {
  endpoint: string;
  caywUrl: string;
  latexBibStyle: string;
  defaultBibName: string;
}

export function getConfig(): ZoteroConfig {
  const cfg = vscode.workspace.getConfiguration("zotero-cite-helper");
  return {
    endpoint: cfg.get<string>("endpoint", "http://localhost:23119/better-bibtex/json-rpc"),
    caywUrl: cfg.get<string>("caywUrl", "http://localhost:23119/better-bibtex/cayw"),
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
  }, {
    timeout: 10000, // 10 秒超时，避免 Zotero 卡住时请求挂起
  });
  const data = response.data;
  if (data && data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data ? data.result : undefined;
}

/**
 * 导出结果：BibTeX 文本 + 缺失（未找到）的引用键。
 */
export interface ExportResult {
  bibtex: string;
  missingKeys: string[];
}

/**
 * 导出指定引用键的 BibTeX 文本。
 * 使用两参数形式（不带 groupId），可跨所有分组文库导出。
 * 当部分键在 Zotero 中找不到时，自动跳过这些键，并在 missingKeys 中报告。
 * @param keys 引用键数组
 * @returns 导出结果，包含 BibTeX 文本和缺失的引用键
 */
export async function exportBibtex(keys: string[]): Promise<ExportResult> {
  const { latexBibStyle } = getConfig();
  const missingKeys: string[] = [];
  let remaining = keys;
  let bibtex = "";

  // 循环替代递归：BBT 每次报告所有 not found 键，最多迭代 2 次
  while (remaining.length > 0) {
    try {
      const result = await postJsonRpc("item.export", [remaining, latexBibStyle]);
      bibtex += String(result || "");
      break;
    } catch (error) {
      // BBT 在部分键找不到时返回 "not found: key1, key2" 错误
      const message = error instanceof Error ? error.message : String(error);
      const notFoundMatch = message.match(/not found:\s*(.+)/i);
      if (!notFoundMatch) {
        throw error;
      }
      const notFoundKeys = notFoundMatch[1]
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      missingKeys.push(...notFoundKeys);
      const notFoundSet = new Set(notFoundKeys);
      remaining = remaining.filter((k) => !notFoundSet.has(k));
    }
  }
  return { bibtex, missingKeys };
}

/**
 * 从 Zotero 获取单个引用键的 BibTeX 条目。
 * @param citeKey 引用键
 * @returns BibTeX 文本，未找到时返回 null
 */
export async function getBibtexFromZotero(citeKey: string): Promise<string | null> {
  try {
    const { latexBibStyle } = getConfig();
    const result = await postJsonRpc("item.export", [[citeKey], latexBibStyle]);
    return result ? String(result) : null;
  } catch (error) {
    // 未找到或不可达的条目由调用方处理
    return null;
  }
}

/**
 * 通过 CAYW (Cite As You Write) 接口弹出 Zotero 选择窗口。
 * 用户在 Zotero 弹出的窗口中选择条目后，返回 @citeKey 格式的引用键。
 * @returns 选中的引用键数组
 */
export async function pickCiteKeys(): Promise<string[]> {
  const { caywUrl } = getConfig();

  let response;
  try {
    // 参考原插件：使用 GET 请求，通过 params 传递参数
    response = await axios.get(caywUrl, {
      params: {
        format: "pandoc",
        brackets: "1",
        minimize: "1",
      },
    });
  } catch (error) {
    throw new Error(
      `无法连接 Zotero CAYW 接口（${caywUrl}）。请确认 Zotero 和 Better BibTeX 插件已启动。${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const citeKeys: string[] = [];
  const pattern = /@([\w-:\d]+)/g;
  const dataText = String(response.data ?? "");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(dataText)) !== null) {
    citeKeys.push(match[1]);
  }

  if (citeKeys.length === 0) {
    throw new Error("未在 Zotero 中选择任何条目。");
  }
  return citeKeys;
}