# API設計書

**システム名**: ITSM Management / Service Desk
**文書番号**: ITSM-API-001
**ステータス**: ドラフト（実装開始前）

---

## 改訂履歴

| 日付 | 版 | 内容 | 担当 |
|------|-----|------|------|
| 2026-08-18 | 0.1 | 初版作成。既存実装（`backend/app/routers/`）の精査結果に基づく | 開発チーム |

---

## 1. 概要

本APIはRESTful設計に基づき、JSONを返す。全エンドポイントは `/api` プレフィックス配下に配置される。

- **ベースURL**: `/api`
- **形式**: JSON（application/json）
- **認証**: OAuth2 Bearer Token（JWT）
- **ドキュメント**: `/api/docs`（Swagger UI, デバッグ時のみ）
- **文字コード**: UTF-8
- **日時形式**: ISO 8601（例: `2026-08-18T09:00:00+09:00`、UTC保存）

---

## 2. 共通仕様

### 2.1 認証ヘッダー

```
Authorization: Bearer <access_token>
```

認証が必要なエンドポイントはすべて `Authorization` ヘッダー必須。認証失敗時は 401。

### 2.2 共通レスポンス形式（一覧）

```json
{
  "items": [ ... ],
  "total": 20,
  "page": 1,
  "size": 50
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| items | array | 該当レコード配列 |
| total | integer | 総件数 |
| page | integer | 現在ページ（skip/limitから算出） |
| size | integer | 1ページ件数 |

### 2.3 一覧のクエリパラメータ（共通）

| パラメータ | 型 | 説明 |
|------------|-----|------|
| skip | integer | スキップ件数（default 0） |
| limit | integer | 取得件数（default 50） |
| keyword | string | タイトル・説明の部分一致検索 |
| status / priority / assignee_id / site / system_name 等 | string/integer | モジュール別フィルタ |

### 2.4 エラー仕様

| HTTPステータス | 意味 | レスポンス例 |
|----------------|------|--------------|
| 400 Bad Request | バリデーションエラー | `{"detail": [{...}]}`（Pydantic） |
| 401 Unauthorized | 認証失敗 | `{"detail": "Could not validate credentials"}` |
| 403 Forbidden | 権限不足 | `{"detail": "Insufficient role"}` |
| 404 Not Found | リソース不存在 | `{"detail": "Incident not found"}` |
| 422 Unprocessable Entity | スキーマ不適合 | `{"detail": [{...}]}` |
| 500 Internal Server Error | サーバ内部エラー | `{"detail": "Internal Server Error"}` |

> Phase 1でエラーレスポンスの統一（error code 付与）を計画。

### 2.5 ロール別アクセス制御

| 操作 | 要求ロール |
|------|------------|
| GET（一覧・詳細・コメント参照） | 全ロール（認証必須） |
| POST / PUT / DELETE | operator 以上 |
| ユーザー管理・設定変更 | admin（設計） |

---

## 3. エンドポイント一覧

### 3.1 ヘルスチェック

#### `GET /api/health`

認証不要のヘルスチェック。

**レスポンス 200**:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

### 3.2 認証

#### `POST /api/auth/login`

ユーザーログイン。OAuth2 password flow。

**リクエスト**（application/x-www-form-urlencoded）:

| フィールド | 型 | 必須 |
|------------|-----|------|
| username | string | ✅ |
| password | string | ✅ |

**レスポンス 200**:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

**エラー**: 401（認証情報が不正）

#### `POST /api/auth/refresh`（Phase 1 追加予定）

Refresh Token によるトークン再発行。

---

### 3.3 ユーザー

#### `GET /api/users` — ユーザー一覧

#### `POST /api/users` — ユーザー作成（admin）

**リクエスト**:

```json
{
  "username": "tanaka",
  "display_name": "田中 太郎",
  "email": "tanaka@example.com",
  "password": "********",
  "role": "admin",
  "department": "IT管理課"
}
```

#### `PUT /api/users/{user_id}` — ユーザー更新（admin）

#### `DELETE /api/users/{user_id}` — ユーザー削除・無効化（admin）

**UserResponse スキーマ**（主要フィールド）:

```json
{
  "id": 1,
  "display_name": "田中 太郎",
  "email": "tanaka@example.com",
  "role": "admin",
  "department": "IT管理課",
  "is_active": true
}
```

---

### 3.4 インシデント

#### `GET /api/incidents` — インシデント一覧

**クエリパラメータ**（共通＋インシデント固有）:

| パラメータ | 型 | 説明 |
|------------|-----|------|
| status | string | open / in_progress / waiting / resolved / closed |
| priority | string | critical / high / medium / low |
| assignee_id | integer | 担当者ID |
| site | string | 拠点 |
| system_name | string | 対象システム |
| keyword | string | タイトル・説明検索 |

**レスポンス 200**（Item 例）:

```json
{
  "items": [
    {
      "id": 1,
      "ticket_no": "INC-2026-0001",
      "title": "Microsoft 365 メール送信不可",
      "description": "Outlook経由のメール送信が全社で不可。",
      "priority": "critical",
      "status": "in_progress",
      "category": "メール",
      "assignee_id": 2,
      "reporter_id": null,
      "location": null,
      "site": "本社",
      "system_name": "Microsoft 365",
      "impact": null,
      "urgency": null,
      "due_at": "2026-08-18T12:00:00+09:00",
      "resolved_at": null,
      "created_at": "2026-08-18T08:00:00+09:00",
      "updated_at": "2026-08-18T10:00:00+09:00",
      "assignee": { "id": 2, "display_name": "佐藤 花子", "email": "sato@example.com", "role": "operator", "department": "ヘルプデスク" },
      "reporter": null,
      "sla_status": "safe"
    }
  ],
  "total": 20,
  "page": 1,
  "size": 50
}
```

#### `GET /api/incidents/{incident_id}` — インシデント詳細

**エラー**: 404

#### `POST /api/incidents` — インシデント作成（operator以上）

**リクエスト**（IncidentCreate）:

```json
{
  "title": "VPN接続タイムアウト",
  "description": "現場AからのVPN接続が頻繁にタイムアウトする。",
  "priority": "high",
  "status": "open",
  "category": "ネットワーク",
  "assignee_id": 3,
  "site": "現場A",
  "system_name": "VPN",
  "due_at": "2026-08-19T17:00:00+09:00"
}
```

**レスポンス 201**: IncidentResponse（ticket_no は自動採番）

#### `PUT /api/incidents/{incident_id}` — インシデント更新（operator以上）

**リクエスト**（IncidentUpdate）: 部分更新（指定フィールドのみ更新）

**レスポンス 200**: IncidentResponse

#### `DELETE /api/incidents/{incident_id}` — インシデント削除（operator以上）

**レスポンス 204**: No Content

#### `POST /api/incidents/{incident_id}/comments` — コメント追加

**リクエスト**:

```json
{
  "comment": "一次対応として再接続を案内。状況確認中。"
}
```

**レスポンス 201**:

```json
{
  "id": 1,
  "incident_id": 1,
  "user_id": 2,
  "comment": "一次対応として再接続を案内。状況確認中。",
  "created_at": "2026-08-18T10:30:00+09:00",
  "author": { "id": 2, "display_name": "佐藤 花子" }
}
```

#### `GET /api/incidents/{incident_id}/comments` — コメント一覧

**レスポンス 200**: IncidentCommentResponse 配列

---

### 3.5 ダッシュボード

#### `GET /api/dashboard/summary` — ダッシュボード集計（設計）

**レスポンス 200**:

```json
{
  "total": 20,
  "open": 8,
  "overdue": 3,
  "resolved": 12,
  "avgHours": 4.5,
  "slaRate": 83,
  "problems": 4,
  "changes": 5,
  "assets": 6,
  "security": 5
}
```

| フィールド | 説明 |
|------------|------|
| total | 総チケット数 |
| open | 未対応（open / in_progress / waiting） |
| overdue | SLA違反（期限超過の未解決） |
| resolved | 解決済み |
| avgHours | 平均解決時間（時間） |
| slaRate | SLA遵守率（%） |

> フロントの `MockAPI.getDashboardSummary()` と同仕様。実装時に確定。

---

### 3.6 エクスポート

#### `GET /api/export/incidents.csv` — インシデントCSV出力（設計）

- Content-Type: text/csv
- 認証必須

---

### 3.7 監査ログ

#### `GET /api/audit_logs` — 監査ログ一覧（admin）

**クエリパラメータ**: entity_type / entity_id / action / user_id

**レスポンス 200**:

```json
{
  "items": [
    {
      "id": 1,
      "entity_type": "incident",
      "entity_id": 1,
      "action": "update",
      "before_json": "{\"id\": \"1\", \"status\": \"open\", ...}",
      "after_json": "{\"id\": \"1\", \"status\": \"in_progress\", ...}",
      "user_id": 2,
      "ip_address": "192.168.1.10",
      "created_at": "2026-08-18T10:00:00+09:00"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 50
}
```

---

### 3.8 その他モジュール（Phase 2 実装予定）

各モジュールはインシデントと同様のRESTパターンに従う。

| モジュール | 一覧 | 詳細 | 作成 | 更新 | 削除 |
|------------|------|------|------|------|------|
| 問題 | GET `/api/problems` | GET `/api/problems/{id}` | POST | PUT | DELETE |
| 変更 | GET `/api/changes` | GET `/api/changes/{id}` | POST | PUT | DELETE |
| CMDB | GET `/api/cmdb` | GET `/api/cmdb/{id}` | POST | PUT | DELETE |
| ナレッジ | GET `/api/knowledge` | GET `/api/knowledge/{id}` | POST | PUT | DELETE |
| 資産 | GET `/api/assets` | GET `/api/assets/{id}` | POST | PUT | DELETE |
| パッチ | GET `/api/patches` | GET `/api/patches/{id}` | POST | PUT | DELETE |
| セキュリティ | GET `/api/security_events` | GET `/api/security_events/{id}` | POST | PUT | DELETE |
| サービス要求 | GET `/api/service_requests` | GET `/api/service_requests/{id}` | POST | PUT | DELETE |
| 設定 | GET `/api/settings` | — | PUT `/api/settings` | — | — |

---

## 4. スキーマ定義（Pydantic）

### 4.1 インシデント

```
IncidentPriority = Literal["low", "medium", "high", "critical"]
IncidentStatus   = Literal["open", "in_progress", "resolved", "closed"]

IncidentBase:
  title: str (必須)
  description: str | None
  priority: IncidentPriority = "medium"
  status: IncidentStatus = "open"
  category: str | None
  assignee_id: int | None
  reporter_id: int | None
  location: str | None
  site: str | None
  system_name: str | None
  impact: str | None
  urgency: str | None
  due_at: datetime | None

IncidentCreate = IncidentBase（継承）
IncidentUpdate:
  全フィールド optional（部分更新。exclude_unset=True）

IncidentResponse = IncidentBase + :
  id: int
  ticket_no: str
  resolved_at: datetime | None
  created_at / updated_at: datetime
  assignee / reporter: UserResponse | None
  sla_status: str = "safe"   # safe / risk / urgent（計算値）
```

### 4.2 コメント

```
IncidentCommentCreate:
  comment: str

IncidentCommentResponse:
  id, incident_id, user_id, comment, created_at
  author: UserResponse | None
```

---

## 5. フロントエンド連携（MockAPI → 実API 置換）

現行フロントは `MockAPI`（ブラウザ内モック）を使用する。Phase 2で実APIへ置換する際の対応表:

| MockAPI メソッド | 実API |
|------------------|-------|
| `list(module, params)` | `GET /api/{module}?skip=&limit=&keyword=&...` |
| `get(module, id)` | `GET /api/{module}/{id}` |
| `create(module, data)` | `POST /api/{module}` |
| `update(module, id, data)` | `PUT /api/{module}/{id}` |
| `remove(module, id)` | `DELETE /api/{module}/{id}` |
| `getDashboardSummary()` | `GET /api/dashboard/summary` |

**置換時注意**:

- モックの `dataKey`（incidents / problems / changes / cmdb / knowledge / assets / patches / security / requests）とAPIパスを対応させる
- `users` は `GET /api/users` に置換
- モックは `sortKey` / `sortDir` をクライアント側で処理するが、実APIはサーバ側ソートを設計
- 認証ヘッダーの付与はAPIクライアント層（fetchラッパー）で一元管理

---

## 6. バージョニング

- APIの破壊的変更時は `/api/v1/` 等のプレフィックスでバージョン管理を検討
- 現行はバージョンレス（`/api/...`）で運用し、`settings.app_version` で管理
