# AGENTS.md — ITSM Management / Service Desk

本ファイルは、このリポジトリで作業するすべてのエージェント（人間・AI）に対する運用契約です。作業前に必ず読み、以下のルールを守ってください。

## 1. プロジェクトの正本・基盤

| 基盤 | 役割 | 現状 |
|------|------|------|
| GitHub | ソース・Issue・PR・CI/CD・文書の正本 | `Kensan196948G/ITSM-Management`（private, main） |
| OpenDesign | 画面構成・UI/UX・デザイン仕様の起点 | `docs/05-画面設計書.md` + 完成版 `index.html` |
| Cloudflare | Workers（SPA配信+API）/ Secrets / 監視 | 構築済み: `itsm-management-api` + `itsm-management.mirai-dx-platform.com`（本番）/ `itsm-management-mvp.mirai-dx-platform.com`（MVP） |
| D1 | SQLite / Migration / Seed / 検証DB | `itsm-management-db`（Cloudflare D1、2026-08-31 Neon 廃止に伴い移行） |
| DeepSeek Harness | Goal / Workflow / SubAgent / Ralph 統合管理 | 進行中 |

## 2. 技術スタック（承認済み）

- **フロントエンド**: React + Vite + TypeScript。既存 `index.html`（React CDN + Babel）のUI・デザイン・全モジュールを `web/` へ移植する。`v2/` のデザイントークン（`--c-primary-*`）を基準とする。
- **バックエンド**: Cloudflare Workers + Hono。REST API は `docs/04-API設計書.md` に準拠。
- **DB**: Cloudflare D1（SQLite）。マイグレーションは `migrations/*.sql`（`scripts/migrate.ts` で D1 へ適用）。シードは `scripts/seed.ts`。
- **認証**: セッションベース（sessionsテーブル + PBKDF2パスワードハッシュ）。`docs/06-セキュリティ設計書.md` に準拠。
- **RBAC**: `viewer < operator < manager < admin`（`docs/01-要件定義書.md` §3.1）。
- **テスト**: node --test（単体/統合）+ Playwright（E2E）。
- **CI/CD**: GitHub Actions（lint / typecheck / build / test / integration / deploy）。

## 3. ディレクトリ構成

```
.
├── AGENTS.md / CLAUDE.md / README.md   # 運用契約・設計・手順
├── docs/                               # 要件・設計・運用ドキュメント（正本）
├── migrations/                         # SQLマイグレーション（001_, 002_, ...）
├── scripts/                            # migrate.ts / seed.ts / deploy.mjs
├── src/                                # Cloudflare Workers (Hono) API
│   ├── app.ts                          # Hono アプリ組み立て
│   ├── middleware.ts                   # DB / 認証 / RBAC / エラー / セキュリティ
│   ├── auth.ts                         # パスワード・セッション・トークン
│   ├── db/client.ts                    # D1 (SQLite) クライアント
│   ├── routes/                         # モジュール別ルーター
│   └── types.ts                        # 共有型
├── web/                                # React + Vite フロントエンド
│   ├── src/                            # コンポーネント・ページ・APIクライアント
│   └── vite.config.ts
├── tests/                              # unit / integration / e2e
├── .github/workflows/                  # CI/CD
└── index.html                          # OpenDesign 完成版WebUI（モック・参照）
```

## 4. 絶対ルール

1. **既存変更を上書きしない**: エージェントは自分の担当ファイルのみ編集し、共有ファイル（`src/app.ts` のルーティング登録、`docs/` の仕様）の変更は Main Agent が判断する。
2. **同一ファイルの競合を避ける**: サブエージェントには重複しないファイル担当を割り当てる。
3. **仕様変更は docs と同期**: 実装と `docs/` が乖離したら、該当ドキュメントを更新する。
4. **シークレットをコミットしない**: `.env`、`*.local`、実トークンは Git 管理外（`.gitignore` 済み）。`.env.example` のみコミットする。
5. **DBはマイグレーション経由**: スキーマ変更は必ず `migrations/NNN_*.sql` を追加し、`scripts/migrate.ts` で適用する。直接のDDL変更をしない。
6. **IDはUUID**: 新規テーブルの主キーは TEXT（アプリで `crypto.randomUUID()` 生成 or SQLite `lower(hex(randomblob(16)))`）。
7. **日時はISO-8601(UTC)**: すべてUTC保存（TEXT）、表示はクライアントでJST変換。DBデフォルトは `strftime('%Y-%m-%dT%H:%M:%fZ','now')`。
8. **監査ログ**: 重要操作（create/update/delete）は `audit_logs` に記録する。
9. **テスト必須**: 新規機能は単体テストを追加する。既存テストを壊さない。
10. **PR必須**: main への直接 push を禁止。featureブランチ → PR → 必須チェック成功 → Squash Merge。

## 5. 作業フロー

1. `git pull`（最新mainを取得）→ 新規ブランチ `feature/<slug>` を作成
2. 対象の実装・テスト・ドキュメント更新
3. ローカル検証（typecheck / lint / test / build）
4. PR作成（説明に変更内容・検証結果を記載）
5. 必須チェック成功を確認 → Squash Merge
6. デプロイ（`scripts/deploy.mjs` または CI/CD）

## 6. 完了条件（MVP）

- [x] 主要業務フロー（ログイン → ダッシュボード → インシデントCRUD → SLA監視 → 問題/変更/CMDB等）が操作可能
- [x] ダミーデータで正常・空・エラー・権限別状態を確認可能
- [x] D1 Migration + Seed を空の検証DBへ再実行可能（`itsm-management-db` で実証済み）
- [x] typecheck / lint / 主要テスト / E2E / build が成功
- [x] レスポンシブ・キーボード操作・アクセシビリティ確認済み
- [x] Cloudflare Previewで画面・API・認証・DB接続を確認済み（本番 E2E 7件成功）
- [x] README・要件・設計・API・DB・テスト・運用手順を更新済み
- [x] Critical/High問題が解消され、残存リスクが記録済み（README・GitHub Issue 参照）

## 7. 停止条件（即停止して報告）

- 認証情報不足（GitHub / Cloudflare の権限・トークン欠如）
- 外部障害（Cloudflare の障害）
- 破壊的DB変更（DROP TABLE / 本番データ削除 / 復元困難な変更）
- 費用・契約・請求・権限・認証方式の変更が必要な場合
