import { useEffect, useState } from 'react';
import { api } from './api.js';
import type { Session } from './session.js';

export function TicketDetail({
  session,
  id,
  onBack,
}: {
  session: Session;
  id: string;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<any>();
  const [note, setNote] = useState('');

  const load = () => api.getTicket(session, id).then(setTicket);

  useEffect(() => {
    load();
  }, [id]);

  if (!ticket) {
    return <p>Loading…</p>;
  }

  return (
    <section>
      <button className="link" onClick={onBack}>
        ← Inbox
      </button>
      <h2>{ticket.subject}</h2>
      <div className="meta">
        {ticket.requester_email} · {ticket.priority} · {ticket.status}
      </div>
      <p className="body">{ticket.body}</p>
      <h3>Conversation</h3>
      {ticket.comments.map((c: any) => (
        <article key={c.id}>
          <strong>{c.authorName}</strong>
          <p>{c.body}</p>
        </article>
      ))}
      <form
        className="note"
        onSubmit={async (e) => {
          e.preventDefault();

          await api.addComment(session, id, note);

          setNote('');
          load();
        }}
      >
        <textarea
          placeholder="Add an internal note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button>Add note</button>
      </form>
      {ticket.status !== 'closed' && (
        <button
          onClick={async () => {
            await api.closeTicket(session, id);

            load();
          }}
        >
          Close ticket
        </button>
      )}
    </section>
  );
}
