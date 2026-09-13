/**
 * DB クライアント（Cloudflare D1 / SQLite 版）
 *
 * Neon PostgreSQL を廃止し（2026-08-31）、D1 バインディング（または互換アダプタ）へ移行した。
 * - Worker 実行時: `env.DB`（D1Database）を渡す。
 * - ローカル実行時: `src/db/local-d1.ts` の node:sqlite アダプタを渡す。
 * - スクリプト実行時: `scripts/lib-d1-http.ts` の HTTP アダプタを渡す。
 *
 * 呼び出し側インターフェース（query/queryOne/transaction）は従来の NeonClient と同一。
 * SQL は PostgreSQL 方言の一部を SQLite 方言へ自動変換する（$1→?1, now()→strftime, ...）。
 */
// D1Database は @cloudflare/workers-types のグローバル型（import 不要）

export interface SqlRow {
  [key: string]: unknown;
}

export interface SqlResult {
  rows: SqlRow[];
  rowCount: number;
  command: string;
}

/** D1 互換の最小インターフェース（実物の D1Database も構造的に合致する） */
export interface D1PreparedLike {
  bind(...values: unknown[]): D1PreparedLike;
  all(): Promise<{ results: SqlRow[]; meta?: { changes?: number } }>;
  first(): Promise<SqlRow | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
  /**
   * 結果行を取得する（SELECT 用）。`run()` は書き込み系を想定しており行を返さないため、
   * 読み取りをバッチ実行する場合はこちらを使う。
   */
  queryAll(): Promise<SqlRow[]>;
}

export interface D1Like {
  prepare(sql: string): D1PreparedLike;
  batch(statements: D1PreparedLike[]): Promise<{ results: SqlRow[]; meta?: { changes?: number } }[]>;
  /**
   * 複数の SELECT をまとめて実行し、文ごとの結果行を返す（任意実装）。
   * リモートアダプタは D1 の batch 形式で 1 リクエストに集約する。
   */
  queryMany?(statements: { sql: string; params?: unknown[] }[]): Promise<SqlRow[][]>;
}

/** SQLite で JSON 文字列として保存する列（読み出し時に JSON.parse する） */
const JSON_COLUMNS = new Set(['before_json', 'after_json', 'related_incident_ids']);

/** SQLite で INTEGER(0/1) として保存する真偽値列（読み出し時に boolean 化する） */
const BOOLEAN_COLUMNS = new Set(['is_active']);

/** パラメータ値の型変換（Date → ISO文字列 / boolean → 0/1 / object → JSON文字列） */
function normalizeParam(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

/** 行の型変換（JSON列・真偽値列をアプリ期待の形へ戻す） */
function normalizeRow(row: SqlRow): SqlRow {
  const out: SqlRow = { ...row };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (v === null || v === undefined) continue;
    if (JSON_COLUMNS.has(key) && typeof v === 'string') {
      try {
        out[key] = JSON.parse(v);
      } catch {
        out[key] = v;
      }
    } else if (BOOLEAN_COLUMNS.has(key)) {
      out[key] = v === 1 || v === true;
    }
  }
  return out;
}

/**
 * PostgreSQL 方言 → SQLite 方言への軽量変換。
 * ルート層の SQL をほぼそのまま使えるようにするための互換レイヤ。
 */
export function translateSql(sql: string): string {
  return sql
    // プレースホルダ: $1, $2... → ?1, ?2...
    .replace(/\$(\d+)/g, '?$1')
    // now() → ISO-8601 UTC（JS toISOString() と同形式で文字列比較可能）
    .replace(/\bnow\(\)/g, "strftime('%Y-%m-%dT%H:%M:%fZ','now')")
    // gen_random_uuid() → SQLite の UUID v4 生成式
    .replace(/\bgen_random_uuid\(\)/g, 'lower(hex(randomblob(16)))')
    // ILIKE → LIKE（SQLite の LIKE は ASCII では大文字小文字を区別しない）
    .replace(/\bILIKE\b/g, 'LIKE');
}

export class D1Client {
  private db: D1Like;

  constructor(db: D1Database | D1Like) {
    this.db = db as D1Like;
  }

  /** 単一クエリ実行。params は $1, $2... にバインド（自動で ?1, ?2... に変換） */
  async query(sql: string, params: unknown[] = []): Promise<SqlResult> {
    const stmt = this.db.prepare(translateSql(sql)).bind(...params.map(normalizeParam));
    const res = await stmt.all();
    const rows = (res.results ?? []).map(normalizeRow);
    return {
      rows,
      rowCount: res.meta?.changes !== undefined && res.meta.changes > 0 ? res.meta.changes : rows.length,
      command: sql.trim().split(/\s+/)[0]?.toUpperCase() ?? '',
    };
  }

  /** 単一行取得（0/1行）。複数行時は先頭 */
  async queryOne<T = SqlRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.db.prepare(translateSql(sql)).bind(...params.map(normalizeParam));
    const row = await stmt.first();
    return (row ? normalizeRow(row) : null) as T | null;
  }

  /** 複数ステートメントを単一トランザクションで実行（migration 等） */
  async transaction(statements: { sql: string; params?: unknown[] }[]): Promise<SqlResult[]> {
    const prepared = statements.map((s) =>
      this.db.prepare(translateSql(s.sql)).bind(...(s.params ?? []).map(normalizeParam)),
    );
    const results = await this.db.batch(prepared);
    return results.map((r) => {
      const rows = (r.results ?? []).map(normalizeRow);
      return {
        rows,
        rowCount: r.meta?.changes !== undefined && r.meta.changes > 0 ? r.meta.changes : rows.length,
        command: '',
      };
    });
  }

  /**
   * 複数の SELECT を 1 ラウンドトリップでまとめて実行する。
   *
   * Cloudflare D1 の SQLite は `SQLITE_MAX_COMPOUND_SELECT` が **5** に設定されている
   * （実測: 5 項の UNION ALL は成功、6 項で "too many terms in compound SELECT"）。
   * ローカルの node:sqlite は 500 のため、複数テーブルの件数を UNION ALL で
   * まとめると「ローカルでは通るが本番だけ 500 になる」という環境差が生じる。
   *
   * D1 の batch は SELECT も受け付けるため、集計は UNION ALL ではなく
   * このメソッドで 1 リクエストにまとめる（実行回数は同じ 1 回）。
   *
   * @returns 文ごとの結果行。**呼び出し側は文と結果の順序で対応付ける**ため、
   *          フラット化せず 1 文 = 1 要素の配列で返す。
   */
  async queryMany(statements: { sql: string; params?: unknown[] }[]): Promise<SqlResult[]> {
    // 注意: db.batch() は書き込み系を想定しており結果行を返さない実装があるため、
    // 読み取りには queryMany() を使う（アダプタ側で 1 リクエストにまとめる）。
    let results: SqlRow[][];
    if (typeof this.db.queryMany === 'function') {
      results = await this.db.queryMany(statements);
    } else {
      results = [];
      for (const s of statements) {
        results.push(await this.db.prepare(translateSql(s.sql)).bind(...(s.params ?? []).map(normalizeParam)).queryAll());
      }
    }
    if (results.length !== statements.length) {
      throw new Error(
        `queryMany: 文数と結果数が一致しません (statements=${statements.length}, results=${results.length})`,
      );
    }
    return results.map((rows) => ({
      rows: rows.map(normalizeRow),
      rowCount: rows.length,
      command: '',
    }));
  }
}
