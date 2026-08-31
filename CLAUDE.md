# CLAUDE.md — 開発者向け作業マニュアル

このリポジトリでの作業手順・コマンド・注意事項を記載します。**AGENTS.md を必ず先に読んでください。**

## クイックスタート

```bash
# 依存インストール
npm install

# 環境変数（Git管理外）
cp .env.example .env
#   D1_DATABASE_ID=<Cloudflare D1 データベースID>
#   SESSION_SECRET=<ランダム32byte以上>
#   CLOUDFLARE_ACCOUNT_ID=<account id>
#   CLOUDFLARE_API_TOKEN=<Workers Edit権限トークン>

# DBマイグレーション + シード
npm run db:migrate
npm run db:seed

# 開発サーバー（web + API）
npm run dev

# 検証
npm run typecheck
npm run lint
npm run test
npm run build:all

# デプロイ（Cloudflare Workers）
npm run deploy
```

## スクリプト一覧（package.json）

| スクリプト | 内容 |
|------------|------|
| `dev` | web (Vite) + API 開発サーバー同時起動 |
| `typecheck` | 全TSの型検査（tsc --noEmit） |
| `lint` | ESLint（警告0で成功） |
| `build:web` | Vite フロントビルド |
| `build:worker` | Workers単一バンドル生成 |
| `build:all` | web + worker 両方 |
| `test` | node --test 全テスト |
| `test:unit` | 単体テスト |
| `test:integration` | 統合テスト（ローカル D1 in-memory） |
| `test:e2e` | Playwright E2E |
| `db:migrate` | migrations/*.sql を未適用分のみ適用 |
| `db:seed` | ダミーデータ投入（冪等） |
| `deploy` | ビルド + Workersデプロイ |

## 環境変数

| 変数 | 必須 | 説明 |
|------|:----:|------|
| `D1_DATABASE_ID` | ✅ | Cloudflare D1 データベースID |
| `SESSION_SECRET` | ✅ | セッション署名用シークレット |
| `CLOUDFLARE_ACCOUNT_ID` | デプロイ時 | Cloudflare アカウントID |
| `CLOUDFLARE_API_TOKEN` | デプロイ時 | Workers Scripts: Edit 権限トークン |
| `SEED_DEMO_PASSWORD` | 本番seed時 | デモユーザー初期パスワード |

## 開発時の注意

1. **フロントは `web/` が本番**。ルート `index.html` はOpenDesign参照用（モック）であり編集しない。
2. **APIパスは `docs/04-API設計書.md` に準拠**。`/api/incidents` 等。
3. **DBカラムは `docs/03-データモデル設計書.md` に準拠**。スネークケース。
4. **テーブル追加時**は `migrations/` に新規SQLを追加し、必ず `npm run db:migrate` を実行。
5. **E2E** は Playwright（`npm run test:e2e`）。ビジュアル回帰は `web/e2e/` に格納。
6. **ブランチ命名**: `feature/<slug>`。コミットメッセージは Conventional Commits（feat:/fix:/docs:/chore:）。
7. **PR説明**に「変更内容 / 検証結果 / デプロイ手順」を記載する。
