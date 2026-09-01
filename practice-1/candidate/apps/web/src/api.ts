import type { Board, User } from "@teamboard/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "include", headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error((await response.json()).error ?? "Request failed");
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  login: (email: string, password: string) => request<{ user: User }>("/api/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: User }>("/api/me"),
  boards: () => request<{ boards: Board[] }>("/api/boards"),
  createCard: (boardId: string, title: string) => request(`/api/boards/${boardId}/cards`, { method: "POST", body: JSON.stringify({ title }) }),
  logout: () => request<void>("/api/logout", { method: "POST" })
};
