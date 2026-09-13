/**
 * リモート D1 互換アダプタ（Cloudflare D1 HTTP query API）
 *
 * Worker の D1 バインディングと同じ最小インターフェースを REST API で実装する。
 * scripts/migrate.ts / scripts/seed.ts など、Node 側から本番 D1 へアクセスする際に使用する。
 *
 *   必要環境変数: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / D1_DATABASE_ID
 */
import { translateSql, type D1Like, type D1PreparedLike, type SqlRow } from '../src/db/client.ts';

const CF_API = 'https://api.cloudflare.com/client/v4';

interface QueryResultShape {
  results?: SqlRow[];
  meta?: { changes?: number };
  success?: boolean;
}

export class D1HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

class HttpPrepared implements D1PreparedLike {
  private adapter: RemoteD1;
  private sql: string;
  private values: unknown[];

  constructor(adapter: RemoteD1, sql: string, values: unknown[] = []) {
    this.adapter = adapter;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: unknown[]): D1PreparedLike {
    return new HttpPrepared(this.adapter, this.sql, values);
  }

  private async exec(): Promise<QueryResultShape> {
    return this.adapter.exec(this.sql, this.values);
  }

  async all(): Promise<{ results: SqlRow[] }> {
    const r = await this.exec();
    return { results: r.results ?? [] };
  }

  async first(): Promise<SqlRow | null> {
    const r = await this.exec();
    return r.results?.[0] ?? null;
  }

  async run(): Promise<{ meta: { changes?: number } }> {
    const r = await this.exec();
    return { meta: r.meta ?? {} };
  }

  /** 結果行を取得する（SELECT 用） */
  async queryAll(): Promise<SqlRow[]> {
    const r = await this.exec();
    return r.results ?? [];
  }
}

export class RemoteD1 implements D1Like {
  private accountId: string;
  private apiToken: string;
  private databaseId: string;

  constructor(accountId: string, apiToken: string, databaseId: string) {
    this.accountId = accountId;
    this.apiToken = apiToken;
    this.databaseId = databaseId;
  }

  prepare(sql: string): D1PreparedLike {
    return new HttpPrepared(this, sql);
  }

  async batch(statements: D1PreparedLike[]): Promise<{ results: SqlRow[]; meta?: { changes?: number } }[]> {
    const out: { results: SqlRow[]; meta?: { changes?: number } }[] = [];
    for (const s of statements) {
      const r = await s.run();
      out.push({ results: [], meta: r.meta });
    }
    return out;
  }

  /**
   * 複数ステートメントを 1 リクエストで実行する（D1 HTTP API の batch 形式）。
   *
   * 注意: D1 の `/query` エンドポイントは `{ sql, params }`（単文）と
   * `{ batch: [{ sql, params }, ...] }`（複文）の両方を受け付ける。
   * 単文形式をループで呼ぶとラウンドトリップが文数分だけ発生するため、
   * 読み取りをまとめる用途では batch 形式を使う。
   */
  async exec(sql: string, params: unknown[] = []): Promise<QueryResultShape> {
    const results = await this.execBatch([{ sql, params }]);
    return results[0] ?? { results: [] };
  }

  /** 複数の SELECT を batch 形式で実行し、文ごとの結果行を返す */
  async queryMany(statements: { sql: string; params?: unknown[] }[]): Promise<SqlRow[][]> {
    const mapped = statements.map((s) => ({ sql: translateSql(s.sql), params: s.params }));
    const results = await this.execBatch(mapped);
    return results.map((r) => r.results ?? []);
  }

  /** batch 形式でまとめて実行し、文ごとの結果を返す */
  async execBatch(statements: { sql: string; params?: unknown[] }[]): Promise<QueryResultShape[]> {
    const res = await fetch(`${CF_API}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch: statements.map((s) => ({
          sql: s.sql,
          params: (s.params ?? []).map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p)),
        })),
      }),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok || !json?.success) {
      const msg = json?.errors?.[0]?.message ?? `D1 query error (${res.status})`;
      throw new D1HttpError(res.status, `${msg}: ${statements.map((s) => s.sql.slice(0, 80)).join(' | ')}`);
    }
    return (json.result ?? []) as QueryResultShape[];
  }
}

/** .env から RemoteD1 を生成 */
export function createRemoteD1FromEnv(env: Record<string, string>): RemoteD1 {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const databaseId = env.D1_DATABASE_ID;
  if (!accountId || !apiToken || !databaseId) {
    console.error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / D1_DATABASE_ID が .env に必要です');
    process.exit(1);
  }
  return new RemoteD1(accountId, apiToken, databaseId);
}
