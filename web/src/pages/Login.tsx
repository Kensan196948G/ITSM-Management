/** ログイン画面 */
import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ログインに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-card__logo">IT</div>
        <h1>ITSM Management</h1>
        <div className="sub">Service Desk — 統合ITサービスマネジメント</div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="username">ユーザー名</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label htmlFor="password">パスワード</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn btn--primary" style={{ width: '100%', padding: '11px' }} disabled={busy} type="submit">
            {busy ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <div className="login-hint">
          デモアカウント:<br />
          admin: tanaka / Mirai#2026<br />
          operator: sato / Mirai#2026<br />
          viewer: takahashi / Mirai#2026
        </div>
      </div>
    </div>
  );
}
