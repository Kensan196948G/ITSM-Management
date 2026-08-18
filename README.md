# ITSM Management / Service Desk

ITSM（ITサービス管理）向け **インシデント管理・問題管理・変更管理・構成管理（CMDB）・ナレッジ管理・資産管理・パッチ管理・セキュリティ管理・サービスリクエスト管理** を備えた Web アプリケーション（MVP）。

OpenDesign の画面設計（`index.html`・`docs/05-画面設計書.md`）と承認済み要件（`docs/01-要件定義書.md`）に基づき、Cloudflare Workers + Neon PostgreSQL 上に構築している。

## 稼働環境（URL）

| 環境 | URL | 用途 |
|------|-----|------|
| 本番 | https://itsm-management.mirai-dx-platform.com | リリース済みの最新版 |
| MVP | https://itsm-management-mvp.mirai-dx-platform.com | MVP・プロトタイプ確認用 |
| API（workers.dev） | https://itsm-management-api.kensan1969.workers.dev | ワーカー直接アクセス |

> デモユーザー: `tanaka` / `Mirai#2026`（admin）ほか、`takahashi`（viewer）等。詳細は `docs/08-テスト計画書.md` 参照。

## 技術スタック

| 層 | 技術 |
|----|------|
| フロントエンド | React 19 + Vite + TypeScript（`web/`） |
| バックエンド | Cloudflare Workers + Hono + Zod（`src/`） |
| DB | Neon PostgreSQL（HTTP SQL / `@neondatabase/serverless` 相当の独自クライアント） |
| 認証 | セッションベース（PBKDF2 ハッシュ + sessions テーブル） |
| RBAC | viewer < operator < manager < admin |
| テスト | node --test（単体・統合）+ Playwright（E2E） |
| CI/CD | GitHub Actions（lint / typecheck / test / build / e2e / integration / deploy） |
| 配信 | Cloudflare Workers（SPA 静的配信 + REST API）+ カスタムドメイン |

## ディレクトリ構成

```
.
├── AGENTS.md / CLAUDE.md / README.md   # 運用契約・設計・手順
├── docs/                               # 要件・設計・運用ドキュメント（正本）
├── migrations/                         # SQLマイグレーション（001_, 002_, ...）
├── scripts/                            # migrate.ts / seed.ts / deploy.mjs / build-worker.mjs
├── src/                                # Cloudflare Workers (Hono) API
│   ├── app.ts / middleware.ts / auth.ts / static-server.ts
│   ├── routes/                         # auth / dashboard / modules / misc / crud
│   └── db/client.ts                    # Neon HTTP SQL クライアント
├── web/                                # React + Vite フロントエンド
├── tests/                              # unit / integration / e2e
├── .github/workflows/ci.yml            # CI/CD
└── index.html                          # OpenDesign 完成版WebUI（モック・参照）
```

## セットアップ

```bash
cp .env.example .env   # DATABASE_URL / SESSION_SECRET / CLOUDFLARE_* を設定
npm ci
npm run dev            # フロント（Vite）+ API（Hono dev server）を同時起動
```

## DB マイグレーション・シード

```bash
npm run db:migrate     # migrations/*.sql を未適用分のみ psql で適用
npm run db:seed        # デモユーザー・ダミーデータを投入（冪等）
```

空の検証 DB への再実行:

```bash
# Neon で検証用ブランチ/DB を用意し、DATABASE_URL を切り替えて実行
npm run db:migrate && npm run db:seed
```

## 検証

```bash
npm run lint          # ESLint（--max-warnings 0）
npm run typecheck     # tsc（src + web）
npm run test:unit     # 単体テスト（認証・SLA計算等）
npm run test:integration  # 統合テスト（実DB）
npm run test:e2e      # Playwright E2E（事前に wrangler dev --port 8793 起動）
npm run build:all     # web build + worker build
```

## CI/CD・デプロイ

GitHub Actions（`.github/workflows/ci.yml`）が以下を実行する:

1. **quality**: lint / typecheck / 単体テスト / フロントビルド / ワーカービルド
2. **e2e**: ローカルワーカー + Neon 検証 DB で Playwright E2E
3. **integration**（main push 時）: Neon 検証 DB へ migrate + seed + 統合テスト
4. **deploy**（main push 時）: `scripts/deploy.mjs` で Cloudflare Workers へデプロイ（`--secrets` で DATABASE_URL / SESSION_SECRET を設定）

手動デプロイ:

```bash
npm run build:all
node scripts/deploy.mjs --secrets   # Cloudflare REST API（.env の CLOUDFLARE_API_TOKEN を使用）
# または
npx wrangler deploy                 # wrangler.toml を使用
```

### ロールバック

Cloudflare Workers は過去のデプロイメントへ即時ロールバック可能:

```bash
npx wrangler deployments list       # デプロイメント一覧（バージョンIDを確認）
npx wrangler rollback               # 直前のデプロイメントへ戻す
```

DB スキーマ変更は原則追加マイグレーションのみ（`migrations/NNN_*.sql`）。破壊的変更は行わない。

## 主要 API（抜粋）

| エンドポイント | 内容 | 認可 |
|----------------|------|------|
| `POST /api/auth/login` / `logout` / `GET /me` | 認証 | 公開（login）/ 要認証 |
| `GET/POST /api/incidents` ほか CRUD モジュール | 各管理 | 閲覧: 全ロール / 書込: operator 以上 |
| `GET /api/dashboard/*` | KPI・推移・SLAリスク | 要認証 |
| `GET /api/audit_logs` | 監査ログ | manager / admin |
| `GET/POST/PUT /api/users` | ユーザー管理 | admin（一覧は manager 以上） |
| `GET /api/health` | ヘルスチェック | 公開 |

詳細は `docs/04-API設計書.md`。

## ドキュメント

- [docs/README.md](docs/README.md) — ドキュメントインデックス
- [docs/01-要件定義書.md](docs/01-要件定義書.md) — 要件
- [docs/02-詳細仕様設計書.md](docs/02-詳細仕様設計書.md) — アーキテクチャ・仕様
- [docs/03-データモデル設計書.md](docs/03-データモデル設計書.md) — データモデル
- [docs/04-API設計書.md](docs/04-API設計書.md) — API 仕様
- [docs/05-画面設計書.md](docs/05-画面設計書.md) — 画面設計（OpenDesign 起点）
- [docs/06-セキュリティ設計書.md](docs/06-セキュリティ設計書.md) — セキュリティ設計
- [docs/07-運用設計書.md](docs/07-運用設計書.md) — 運用・監視・復旧
- [docs/08-テスト計画書.md](docs/08-テスト計画書.md) — テスト計画
- [docs/09-開発計画書.md](docs/09-開発計画書.md) — 開発計画

## 既知の制約・残存リスク

- アカウントロック（連続失敗時の一時ロック）は未実装（レート制限は login に適用済み）
- 多要素認証・外部ID連携（SAML/OIDC）は未実装（要件 Phase 3 対象）
- 監査ログの長期保存・エクスポートは未実装
- バックアップは Neon のブランチ/タイムトラベル機能に依存（外部バックアップは未設定）
- 詳細は `docs/07-運用設計書.md` および GitHub Issue を参照

## ライセンス

UNLICENSED（プライベートリポジトリ）
