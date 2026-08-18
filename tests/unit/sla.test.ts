/**
 * 単体テスト: SLA計算 / チケット採番ユーティリティ
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcSlaStatus, calcDueAt } from '../../src/utils.ts';

test('SLA状態: 未解決・余裕あり → safe', () => {
  const due = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
  assert.equal(calcSlaStatus(due, null), 'safe');
});

test('SLA状態: 未解決・2時間以内 → risk', () => {
  const due = new Date(Date.now() + 1 * 3600 * 1000).toISOString();
  assert.equal(calcSlaStatus(due, null), 'risk');
});

test('SLA状態: 未解決・期限超過 → urgent', () => {
  const due = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
  assert.equal(calcSlaStatus(due, null), 'urgent');
});

test('SLA状態: 期限前解決 → safe', () => {
  const due = new Date(Date.now() + 10 * 3600 * 1000).toISOString();
  const resolved = new Date(Date.now() + 1 * 3600 * 1000).toISOString();
  assert.equal(calcSlaStatus(due, resolved), 'safe');
});

test('SLA状態: 期限後解決 → urgent', () => {
  const due = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
  const resolved = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
  assert.equal(calcSlaStatus(due, resolved), 'urgent');
});

test('SLA状態: due_atなし → safe', () => {
  assert.equal(calcSlaStatus(null, null), 'safe');
});

test('SLA期限: 優先度別の時間が正しい', () => {
  const base = new Date('2026-08-18T09:00:00Z');
  const critical = new Date(calcDueAt('critical', base)!);
  assert.equal((critical.getTime() - base.getTime()) / 3600000, 2);
  const high = new Date(calcDueAt('high', base)!);
  assert.equal((high.getTime() - base.getTime()) / 3600000, 4);
  const medium = new Date(calcDueAt('medium', base)!);
  assert.equal((medium.getTime() - base.getTime()) / 3600000, 8);
  const low = new Date(calcDueAt('low', base)!);
  assert.equal((low.getTime() - base.getTime()) / 3600000, 24);
});
