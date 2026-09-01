import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Board, User } from "@teamboard/shared";
import { api } from "./api.js";
import "./styles.css";

function App() {
  const [user, setUser] = useState<User>();
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  const refresh = async () => {
    try { const [me, data] = await Promise.all([api.me(), api.boards()]); setUser(me.user); setBoards(data.boards); }
    catch { setUser(undefined); }
  };
  useEffect(() => { void refresh(); }, []);

  if (!user) return <main className="login"><form onSubmit={async (event) => { event.preventDefault(); setError(""); try { await api.login("alex@example.test", "demo-password"); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Login failed"); } }}><h1>Teamboard</h1><p>Keep launch work visible and moving.</p><button>Sign in with demo account</button>{error && <p className="error">{error}</p>}</form></main>;

  return <div className="shell"><header><div><strong>Teamboard</strong><span>{user.displayName}</span></div><button className="quiet" onClick={async () => { await api.logout(); setUser(undefined); }}>Sign out</button></header><main><div className="heading"><div><p className="eyebrow">Workspace</p><h1>Your boards</h1></div></div>{boards.map((board) => <section key={board.id}><h2>{board.name}</h2><form className="add" onSubmit={async (event) => { event.preventDefault(); if (!title.trim()) return; await api.createCard(board.id, title); setTitle(""); await refresh(); }}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a card"/><button>Add</button></form><div className="cards">{board.cards.map((card) => <article key={card.id}><h3>{card.title}</h3><p>{card.description || "No description"}</p><small>{card.creatorName} · {new Date(card.createdAt).toLocaleDateString()}</small></article>)}</div></section>)}</main></div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
