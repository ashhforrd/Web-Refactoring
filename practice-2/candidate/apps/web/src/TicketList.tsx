import { useEffect, useState } from 'react';
import type { TicketListItem } from '@relaydesk/shared';
import { api } from './api.js';
import type { Session } from './session.js';

export function TicketList({
  session,
  onOpen,
}: {
  session: Session;
  onOpen: (id: string) => void;
}) {
  const [items, setItems] = useState<TicketListItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => api.listTickets(session, query).then((r) => setItems(r.items)),
      200,
    );

    return () => clearTimeout(timer);
  }, [session, query]);

  return (
    <section>
      <div className="toolbar">
        <h2>Inbox</h2>
        <input
          placeholder="Search tickets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="tickets">
        {items.map((t) => (
          <button className="ticket" key={t.id} onClick={() => onOpen(t.id)}>
            <span className={`priority ${t.priority}`} />
            <strong>{t.subject}</strong>
            <small>{t.requesterEmail}</small>
            <span>
              {t.status} · {t.commentCount} notes
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
