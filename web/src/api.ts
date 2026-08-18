/**
 * API クライアント（fetch ラッパー）
 * - セッションCookie は credentials: 'include' で自動送信
 * - エラーは { error: { code, message } } を解析して throw
 */

export interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = body as ApiErrorBody;
    throw new ApiError(res.status, err?.error?.message ?? `APIエラー (${res.status})`, err?.error?.code ?? 'API_ERROR');
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
};

/** 一覧クエリビルダー */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 'all') sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
