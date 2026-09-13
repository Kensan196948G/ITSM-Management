/**
 * マイグレーション適用コア（ローカル D1 / リモート D1 共通）
 * migrations/*.sql を未適用分のみ、文単位で適用する。
 * D1 HTTP API は複数文を一括実行できないため、SQL を文単位に分割して逐次実行する。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { D1Like } from '../src/db/client.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'migrations');

/** 走査状態 */
type ScanState =
  | 'top'
  | 'single'
  | 'double'
  | 'backtick'
  | 'bracket'
  | 'line-comment'
  | 'block-comment'
  | 'trigger-body';

const KEYWORD_CHAR = /[A-Za-z_]/;

/**
 * SQL を文単位に分割する。
 *
 * D1 HTTP API は複数文を一括実行できないため 1 文ずつ実行する必要があるが、
 * 単純な `;` 分割では以下を壊す:
 *   - `CREATE TRIGGER ... BEGIN ... END;` の本体内の `;`（incomplete input になる）
 *   - 文字列リテラル内の `;`（例: DEFAULT 'a;b'）
 *   - 引用符付き識別子内の `;`
 *   - コメント（`--` / ブロックコメント）内の `;`
 *
 * 1 パスで走査し、**コメント以外の文字だけをバッファへ蓄積**する。
 * トップレベルの `;` でバッファを 1 文として確定するため、
 * コメントだけの断片が空文として混入しない。
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let buf = '';
  let state: ScanState = 'top';
  /**
   * 引用符を閉じた後に戻るべき状態。
   * `state` は引用符内を表すため、TRIGGER 本体内で `'...'` を閉じた際に
   * top へ戻ってしまうと本体が途中で分割される。本体状態はここで保持する。
   */
  let bodyState: 'top' | 'trigger-body' = 'top';
  let lastWord = '';

  /** 識別子語を追跡し、TRIGGER 本体の開始 / 終了を検出する */
  const trackWord = (): void => {
    const upper = lastWord.toUpperCase();
    if (bodyState === 'top') {
      if (upper === 'BEGIN') bodyState = 'trigger-body';
    } else if (upper === 'END') {
      bodyState = 'top';
    }
    lastWord = '';
  };

  /** バッファを 1 文として確定する（空文は捨てる） */
  const flush = (): void => {
    const stmt = buf.trim();
    if (stmt.length > 0) statements.push(stmt);
    buf = '';
    lastWord = '';
    state = 'top';
    bodyState = 'top';
  };

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    // ── コメント: 本体をバッファへ入れない ──
    if (state === 'line-comment') {
      if (ch === '\n') state = bodyState;
      continue;
    }
    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        i++;
        state = bodyState;
      }
      continue;
    }

    // ── 引用符内: 内容をそのまま保持する（閉じたら本体状態へ戻る） ──
    if (state === 'single') {
      buf += ch;
      if (ch === "'" && next === "'") {
        buf += next;
        i++;
      } else if (ch === "'") {
        state = bodyState;
      }
      continue;
    }
    if (state === 'double') {
      buf += ch;
      if (ch === '"' && next === '"') {
        buf += next;
        i++;
      } else if (ch === '"') {
        state = bodyState;
      }
      continue;
    }
    if (state === 'backtick') {
      buf += ch;
      if (ch === '`') state = bodyState;
      continue;
    }
    if (state === 'bracket') {
      buf += ch;
      if (ch === ']') state = bodyState;
      continue;
    }

    // ── ここから state は bodyState（'top' か 'trigger-body'） ──
    if (ch === '-' && next === '-') {
      i++;
      state = 'line-comment';
      continue;
    }
    if (ch === '/' && next === '*') {
      i++;
      state = 'block-comment';
      continue;
    }
    if (ch === "'") {
      buf += ch;
      state = 'single';
      continue;
    }
    if (ch === '"') {
      buf += ch;
      state = 'double';
      continue;
    }
    if (ch === '`') {
      buf += ch;
      state = 'backtick';
      continue;
    }
    if (ch === '[') {
      buf += ch;
      state = 'bracket';
      continue;
    }
    if (ch === ';') {
      // 注意: この判定は識別子語の確定より前に行う必要がある。
      // 'END' を確定させると bodyState が top へ戻るため、TRIGGER 本体末尾の ';' が
      // 文区切りと誤認され "END" 単独の文に分裂してしまう。
      if (bodyState === 'top') {
        flush();
      } else {
        // TRIGGER 本体末尾の ';'（直前の語が END）は文の終端。
        // 複数の CREATE TRIGGER が 1 つの塊にならないようここで確定する。
        if (lastWord.toUpperCase() === 'END') {
          buf += ch;
          flush();
        } else {
          // 本体内の文区切り（SELECT ...; 等）は文の一部
          buf += ch;
        }
      }
      continue;
    }
    if (KEYWORD_CHAR.test(ch)) {
      lastWord += ch;
    } else if (lastWord) {
      trackWord();
    }
    buf += ch;
  }

  if (lastWord) trackWord();
  flush();
  return statements;
}

/** 未適用のマイグレーションを適用し、適用ファイル名を返す */
export async function applyMigrations(db: D1Like): Promise<string[]> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )`,
    )
    .run();

  const appliedRows = await db.prepare('SELECT filename FROM schema_migrations').all();
  const applied = new Set(appliedRows.results.map((r) => String(r.filename)));

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const appliedNow: string[] = [];
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip    ${file} (already applied)`);
      continue;
    }
    console.log(`apply   ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const stmt of splitStatements(sql)) {
      await db.prepare(stmt).run();
    }
    await db.prepare('INSERT INTO schema_migrations (filename) VALUES (?1)').bind(file).run();
    appliedNow.push(file);
  }
  if (appliedNow.length === 0) console.log('全て適用済みです');
  return appliedNow;
}
