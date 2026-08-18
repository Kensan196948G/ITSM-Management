/**
 * 単体テスト: 認証ユーティリティ
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateSessionToken, hashToken } from '../../src/auth.ts';

test('パスワードをハッシュ化し検証できる', async () => {
  const hash = await hashPassword('Mirai#2026');
  assert.match(hash, /^pbkdf2:/);
  assert.equal(await verifyPassword('Mirai#2026', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});

test('異なるパスワードは異なるハッシュになる', async () => {
  const h1 = await hashPassword('password1');
  const h2 = await hashPassword('password1');
  assert.notEqual(h1, h2); // ソルトにより異なる
});

test('不正なハッシュ形式はfalseを返す', async () => {
  assert.equal(await verifyPassword('x', 'invalid-hash'), false);
  assert.equal(await verifyPassword('x', ''), false);
});

test('セッショントークンを生成しハッシュ化できる', async () => {
  const token = generateSessionToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  const hash = await hashToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(token, hash);
});
