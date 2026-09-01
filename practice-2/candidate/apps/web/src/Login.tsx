import { useState } from 'react';
import { api } from './api.js';
import { saveSession, type Session } from './session.js';

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('maya@example.test');
  const [password, setPassword] = useState('demo-password');
  const [error, setError] = useState('');

  return (
    <main className="login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          try {
            const s = await api.login(email, password);

            saveSession(s);
            onLogin(s);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <h1>RelayDesk</h1>
        <p>Support operations workspace</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button>Sign in</button>
      </form>
    </main>
  );
}
