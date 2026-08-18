/** 認証ルーター: ログイン / ログアウト / セッション確認 */
import { Hono } from 'hono';
import { verifyPassword, generateSessionToken, hashToken } from '../auth.ts';
import { Errors } from '../errors.ts';
import { SESSION_COOKIE, rateLimit } from '../middleware.ts';
import { SESSION_TTL_HOURS } from '../config.ts';
import type { AppEnv, UserRow } from '../types.ts';

export const authRoutes = new Hono<AppEnv>();

/** ログイン */
authRoutes.post('/login', rateLimit(10, 900, 'login'), async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => null);
  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '');
  if (!username || !password) throw Errors.badRequest('ユーザー名とパスワードを入力してください');

  const user = await db.queryOne<UserRow>(
    'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
    [username],
  );
  if (!user) throw Errors.unauthorized('ユーザー名またはパスワードが正しくありません');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw Errors.unauthorized('ユーザー名またはパスワードが正しくありません');

  // セッション作成
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const sessionId = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  await db.query(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [sessionId, user.id, tokenHash, expiresAt],
  );
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  // セキュアCookie設定
  const isProd = c.env.ENVIRONMENT === 'production';
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_HOURS * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`,
  );

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
});

/** ログアウト（セッション無効化） */
authRoutes.post('/logout', async (c) => {
  const db = c.get('db');
  const token = c.req.header('cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) {
    const tokenHash = await hashToken(decodeURIComponent(token));
    await db.query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [tokenHash]).catch(() => {});
  }
  c.header('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return c.json({ ok: true });
});

/** セッション確認（ログイン状態） */
authRoutes.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();
  return c.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
});
