-- =====================================================================
-- 002_audit_logs_immutable.sql — 監査ログの追記専用を DB 層で強制する
--
-- 背景（Root Cause）:
--   docs/06-セキュリティ設計書.md §4.3 は「削除・更新を禁止（追記専用）」を
--   要求しているが、001_initial.sql にはこれを担保する仕組みが一切無く、
--   アプリケーション層に DELETE / PUT エンドポイントを作らないことだけが
--   暗黙の前提になっていた。結果として DB へ直接到達できる経路
--   （D1 コンソール / 将来の管理 API / SQL 実行者）では改ざんが可能だった。
--
-- 対応:
--   audit_logs への UPDATE / DELETE を TRIGGER で常に拒否し、
--   設計書の主張を DB 層で実効化する。
--
-- 結果整合性への配慮:
--   001_initial.sql は audit_logs.user_id に ON DELETE SET NULL を定義している。
--   監査証跡（何を・いつ・どう変えたか）は不変でなければならないが、
--   「操作者アカウントの物理削除に伴う user_id の NULL 化」は参照整合性の
--   維持であり、証跡の改ざんではない。
--   そこで本トリガは「証跡を構成する列」の変更のみを拒否し、
--   user_id のみの変更（＝ON DELETE SET NULL）は許可する。
--   これにより監査の不変性と参照整合性を両立させる。
--
-- 冪等性: CREATE TRIGGER IF NOT EXISTS により再適用可能。
-- =====================================================================

-- 監査証跡を構成する列の変更を禁止する。
-- INSERT は許可、DELETE は無条件で禁止（下の trg_audit_logs_no_delete）。
CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
BEFORE UPDATE ON audit_logs
WHEN NEW.entity_type IS NOT OLD.entity_type
  OR NEW.entity_id   IS NOT OLD.entity_id
  OR NEW.action      IS NOT OLD.action
  OR NEW.before_json IS NOT OLD.before_json
  OR NEW.after_json  IS NOT OLD.after_json
  OR NEW.ip_address  IS NOT OLD.ip_address
  OR NEW.created_at  IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only: UPDATE is forbidden');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only: DELETE is forbidden');
END;
