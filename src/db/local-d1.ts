/**
 * ローカル D1 互換アダプタ（node:sqlite / DatabaseSync）
 *
 * Worker の D1 バインディングと同じ最小インターフェース
 * （prepare().bind().all()/first()/run() + batch()）を node:sqlite で実装する。
 * ローカル開発サーバー・テスト・マイグレーション/シードで使用する。
 */
import { DatabaseSync } from 'node:sqlite';
import type { D1Like, D1PreparedLike, SqlRow } from './client.ts';

class LocalPrepared implements D1PreparedLike {
  private stmt: { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown; run(...args: unknown[]): { changes: number | bigint } };
  private values: unknown[];

  constructor(
    stmt: { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown; run(...args: unknown[]): { changes: number | bigint } },
    values: unknown[] = [],
  ) {
    this.stmt = stmt;
    this.values = values;
  }

  bind(...values: unknown[]): D1PreparedLike {
    return new LocalPrepared(this.stmt, values);
  }

  async all(): Promise<{ results: SqlRow[] }> {
    const rows = this.stmt.all(...this.values) as SqlRow[];
    return { results: rows };
  }

  async first(): Promise<SqlRow | null> {
    const row = this.stmt.get(...this.values) as SqlRow | undefined;
    return row ?? null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const info = this.stmt.run(...this.values) as { changes: number | bigint };
    return { meta: { changes: Number(info.changes) } };
  }
}

export class LocalD1 implements D1Like {
  private db: DatabaseSync;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  /** スキーマ等の複数文をそのまま実行（開発・テスト用） */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /** node:sqlite の生インスタンス（特殊用途） */
  get raw(): DatabaseSync {
    return this.db;
  }

  prepare(sql: string): D1PreparedLike {
    return new LocalPrepared(this.db.prepare(sql) as never);
  }

  async batch(statements: D1PreparedLike[]): Promise<{ results: SqlRow[]; meta?: { changes?: number } }[]> {
    const out: { results: SqlRow[]; meta?: { changes?: number } }[] = [];
    this.db.exec('BEGIN');
    try {
      for (const s of statements) {
        const r = await s.run();
        out.push({ results: [], meta: r.meta });
      }
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  /** 複数の SELECT をまとめて実行し、文ごとの結果行を返す */
  async queryMany(statements: { sql: string; params?: unknown[] }[]): Promise<SqlRow[][]> {
    const out: SqlRow[][] = [];
    for (const s of statements) {
      const rows = this.db.prepare(s.sql).all(...(s.params ?? []) as never[]) as unknown as SqlRow[];
      out.push(rows);
    }
    return out;
  }

  close(): void {
    this.db.close();
  }
}
