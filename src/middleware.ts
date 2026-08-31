/** Hono ミドルウェア: 認証 / RBAC / CSRF / レート制限 / エラーハンドリング */
import type { Context, Next } from 'hono';
import { D1Client } from './db/client.ts';
import { hashToken } from './auth.ts';
import { Errors, AppError } from './errors.ts';
import { ROLE_RANK } from './config.ts';
import type { AppEnv, UserRow } from './types.ts';

export const SESSION_COOKIE = 'itsm_session';

/** DB クライアント注入 */
export function dbProvider() {
  return async (c: Context<AppEnv>, next: Next) => {
    if (!c.get('db')) {
      const db = new D1Client(c.env.DB);
      c.set('db', db);
    }
    await next();
  };
}

/** セッション認証（失敗時は user=null。要ログインは requireRole で判定） */
export async function sessionAuth(c: Context<AppEnv>, next: Next) {
  c.set('user', null as unknown as UserRow);
  const token = c.req.header('cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) {
    try {
      const tokenHash = await hashToken(decodeURIComponent(token));
      const row = await c.get('db').queryOne<Record<string, unknown>>(
        `SELECT u.id, u.username, u.display_name, u.email, u.role, u.department, u.is_active,
                u.created_at, u.updated_at, s.expires_at, s.id AS session_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.is_active = true`,
        [tokenHash],
      );
      if (row) {
        c.set('user', {
          id: row.id,
          username: row.username,
          display_name: row.display_name,
          email: row.email,
          role: row.role,
          department: row.department,
          is_active: row.is_active,
          last_login_at: null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as UserRow);
        await c.get('db').query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.session_id]).catch(() => {});
      }
    } catch {
      c.set('user', null as unknown as UserRow);
    }
  }
  await next();
}

/** ロール要件（指定ロール以上のみ許可。admin は常に許可） */
export function requireRole(...roles: string[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    if (!user) throw Errors.unauthorized();
    if (roles.length > 0) {
      const userRank = ROLE_RANK[user.role] ?? 0;
      const allowed = user.role === 'admin' || roles.some((r) => userRank >= (ROLE_RANK[r] ?? 0));
      if (!allowed) throw Errors.forbidden();
    }
    await next();
  };
}

/** operator 以上（書込系共通） */
export function requireOperator() {
  return requireRole('operator');
}

/** manager 以上（承認・設定） */
export function requireManager() {
  return requireRole('manager');
}

/** admin のみ（ユーザー管理・監査ログ参照） */
export function requireAdmin() {
  return requireRole('admin');
}

/** CSRF 対策: 変更系リクエストの Origin 検証（同一オリジンのみ許可） */
export async function csrfGuard(c: Context<AppEnv>, next: Next) {
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  const origin = c.req.header('origin');
  if (origin) {
    const host = c.req.header('host');
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      throw Errors.badRequest('Origin が不正です');
    }
    if (originHost !== host) {
      throw new AppError(403, 'オリジンが一致しません', 'CSRF');
    }
  }
  await next();
}

/** 簡易レート制限（isolate 内メモリ。ログイン等に使用） */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(limit: number, windowSec: number, keyPrefix: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    } else if (bucket.count >= limit) {
      throw Errors.tooMany();
    } else {
      bucket.count++;
    }
    await next();
  };
}

/** エラーハンドラー */
export function errorHandler(err: unknown, c: Context<AppEnv>) {
  const e = err as AppError;
  if (e instanceof AppError) {
    return c.json({ error: { code: e.code, message: e.message } }, e.status as never);
  }
  console.error('unhandled error:', err);
  return c.json({ error: { code: 'INTERNAL', message: 'サーバー内部でエラーが発生しました' } }, 500);
}

/** 404 */
export function notFoundHandler(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'リソースが見つかりません' } }, 404);
}

/** セキュリティヘッダー（API 応答） */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
} as const;

/** セキュリティヘッダー適用 */
export async function securityHeaders(c: Context<AppEnv>, next: Next) {
  await next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    c.header(k, v);
  }
}
