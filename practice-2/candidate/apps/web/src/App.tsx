import { useState } from 'react';
import { Login } from './Login.js';
import { TicketList } from './TicketList.js';
import { TicketDetail } from './TicketDetail.js';
import {
  activeWorkspace,
  clearSession,
  readSession,
  selectWorkspace,
  type Session,
} from './session.js';

export function App() {
  const [session, setSession] = useState<Session | null>(readSession());
  const [ticket, setTicket] = useState<string>();

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <div className="shell">
      <header>
        <b>RelayDesk</b>
        <select
          value={activeWorkspace(session)}
          onChange={(e) => {
            selectWorkspace(e.target.value);
            location.reload();
          }}
        >
          {session.workspaces.map((w) => (
            <option value={w.id} key={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <span>{session.user.name}</span>
        <button
          className="link"
          onClick={() => {
            clearSession();
            setSession(null);
          }}
        >
          Sign out
        </button>
      </header>
      <main>
        {ticket ? (
          <TicketDetail session={session} id={ticket} onBack={() => setTicket(undefined)} />
        ) : (
          <TicketList session={session} onOpen={setTicket} />
        )}
      </main>
    </div>
  );
}
