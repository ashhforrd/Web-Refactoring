export type Workspace = { id: string; name: string; slug: string; role: string };
export type Session = {
  token: string;
  user: { id: string; name: string; email: string };
  workspaces: Workspace[];
};

const key = 'relaydesk.session';

export const readSession = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};

export const saveSession = (s: Session) => localStorage.setItem(key, JSON.stringify(s));

export const clearSession = () => localStorage.removeItem(key);

export const activeWorkspace = (s: Session) =>
  localStorage.getItem('relaydesk.workspace') ?? s.workspaces[0]?.id;

export const selectWorkspace = (id: string) => localStorage.setItem('relaydesk.workspace', id);
