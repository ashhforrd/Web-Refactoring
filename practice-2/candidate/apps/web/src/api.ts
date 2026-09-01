import type { TicketListItem } from '@relaydesk/shared';
import type { Session } from './session.js';
import { activeWorkspace } from './session.js';

async function request<T>(session: Session, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.token}`,
      'x-workspace-id': activeWorkspace(session),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error((await res.json()).message ?? 'Request failed');
  }

  return res.json();
}

export const api = {
  login: async (email: string, password: string) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!r.ok) {
      throw new Error('Invalid email or password');
    }

    return r.json() as Promise<Session>;
  },
  listTickets: (s: Session, q = '') =>
    request<{ items: TicketListItem[] }>(s, `/tickets?q=${encodeURIComponent(q)}`),
  getTicket: (s: Session, id: string) => request<any>(s, `/tickets/${id}`),
  closeTicket: (s: Session, id: string) =>
    request(s, `/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'closed' }) }),
  addComment: (s: Session, id: string, body: string) =>
    request(s, `/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, public: false }),
    }),
};
