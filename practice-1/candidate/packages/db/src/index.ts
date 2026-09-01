import Database from "better-sqlite3";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export type Db = Database.Database;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function openDatabase(filename: string): Db {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, invite_code TEXT UNIQUE,
      invite_uses INTEGER NOT NULL DEFAULT 0, invite_limit INTEGER NOT NULL DEFAULT 10
    );
    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL REFERENCES users(id),
      board_id TEXT NOT NULL REFERENCES boards(id), role TEXT NOT NULL,
      PRIMARY KEY (user_id, board_id)
    );
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id),
      title TEXT NOT NULL, description TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
  `);
}

export function seedDatabase(db: Db) {
  const count = db.prepare("SELECT count(*) AS n FROM users").get() as { n: number };
  if (count.n) return;
  const insertUser = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?)");
  insertUser.run("usr_alex", "alex@example.test", "Alex Rivera", hashPassword("demo-password"));
  insertUser.run("usr_sam", "sam@example.test", "Sam Lee", hashPassword("demo-password"));
  db.exec(`
    INSERT INTO boards VALUES ('brd_launch', 'Launch planning', 'LAUNCH-2026', 0, 10);
    INSERT INTO memberships VALUES ('usr_alex', 'brd_launch', 'owner');
    INSERT INTO cards VALUES
      ('card_brief', 'brd_launch', 'Review launch brief', 'Confirm final scope with stakeholders.', 'usr_alex', '2026-01-10T10:00:00.000Z'),
      ('card_metrics', 'brd_launch', 'Define success metrics', 'Add the metrics to the launch dashboard.', 'usr_alex', '2026-01-11T09:30:00.000Z');
  `);
}

export class TeamboardRepository {
  constructor(private readonly db: Db) {}

  findUserByEmail(email: string) {
    return this.db.prepare("SELECT id, email, display_name AS displayName, password_hash AS passwordHash FROM users WHERE email = ?").get(email) as
      | { id: string; email: string; displayName: string; passwordHash: string }
      | undefined;
  }

  findUser(id: string) {
    return this.db.prepare("SELECT id, email, display_name AS displayName FROM users WHERE id = ?").get(id) as
      | { id: string; email: string; displayName: string }
      | undefined;
  }

  listBoards(userId: string) {
    const boards = this.db.prepare(`SELECT b.id, b.name FROM boards b JOIN memberships m ON m.board_id = b.id WHERE m.user_id = ? ORDER BY b.name`).all(userId) as Array<{ id: string; name: string }>;
    return boards.map((board) => {
      const cards = this.db.prepare("SELECT id, board_id AS boardId, title, description, created_by AS createdBy, created_at AS createdAt FROM cards WHERE board_id = ? ORDER BY created_at DESC").all(board.id) as Array<Record<string, string>>;
      return {
        ...board,
        cards: cards.map((card) => ({ ...card, creatorName: this.findUser(card.createdBy)?.displayName ?? "Former member" }))
      };
    });
  }

  membership(userId: string, boardId: string) {
    return this.db.prepare("SELECT role FROM memberships WHERE user_id = ? AND board_id = ?").get(userId, boardId) as { role: string } | undefined;
  }

  createCard(boardId: string, userId: string, title: string, description: string) {
    const card = { id: randomUUID(), boardId, title, description, createdBy: userId, createdAt: new Date().toISOString() };
    this.db.prepare("INSERT INTO cards (id, board_id, title, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(card.id, card.boardId, card.title, card.description, card.createdBy, card.createdAt);
    return card;
  }

  updateCard(cardId: string, fields: { title?: string; description?: string }) {
    const current = this.db.prepare("SELECT id, board_id AS boardId, title, description, created_by AS createdBy, created_at AS createdAt FROM cards WHERE id = ?").get(cardId) as Record<string, string> | undefined;
    if (!current) return undefined;
    const next = { ...current, ...fields };
    this.db.prepare("UPDATE cards SET title = ?, description = ? WHERE id = ?").run(next.title, next.description, cardId);
    return next;
  }

  redeemInvite(code: string, userId: string) {
    const invite = this.db.prepare("SELECT id, invite_uses AS uses, invite_limit AS maxUses FROM boards WHERE invite_code = ?").get(code) as { id: string; uses: number; maxUses: number } | undefined;
    if (!invite || invite.uses >= invite.maxUses) return false;
    this.db.prepare("INSERT OR IGNORE INTO memberships (user_id, board_id, role) VALUES (?, ?, 'member')").run(userId, invite.id);
    this.db.prepare("UPDATE boards SET invite_uses = invite_uses + 1 WHERE id = ?").run(invite.id);
    return true;
  }
}
