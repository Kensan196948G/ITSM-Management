/**
 * リモート D1 互換アダプタ（Cloudflare D1 HTTP query API）
 *
 * Worker の D1 バインディングと同じ最小インターフェースを REST API で実装する。
 * scripts/migrate.ts / scripts/seed.ts など、Node 側から本番 D1 へアクセスする際に使用する。
 *
 *   必要環境変数: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / D1_DATABASE_ID
 */
import type { D1Like, D1PreparedLike, SqlRow } from '../src/db/client.ts';

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
    // D1 HTTP API はバッチ配列を直接受け付けないため逐次実行する（非トランザクション）。
    // トランザクションが必要な箇所は現状コードベースに存在しない。
    const out: { results: SqlRow[]; meta?: { changes?: number } }[] = [];
    for (const s of statements) {
      const r = await s.run();
      out.push({ results: [], meta: r.meta });
    }
    return out;
  }

  async exec(sql: string, params: unknown[] = []): Promise<QueryResultShape> {
    const res = await fetch(`${CF_API}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params: params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p)) }),
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
      throw new D1HttpError(res.status, `${msg}: ${sql.slice(0, 200)}`);
    }
    return json.result?.[0] ?? { results: [] };
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
