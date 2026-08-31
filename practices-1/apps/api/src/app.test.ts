import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, seedDatabase, TeamboardRepository, type Db } from "@teamboard/db";
import { buildApp } from "./app.js";
import type { AppConfig } from "@teamboard/config";

const config: AppConfig = { nodeEnv: "test", port: 4100, webOrigin: "http://localhost:5173", databasePath: ":memory:", sessionSecret: "test-secret-long-enough", trustProxy: false };

describe("API workflow", () => {
  let db: Db;
  let app: ReturnType<typeof buildApp>;
  beforeEach(() => { db = openDatabase(":memory:"); seedDatabase(db); app = buildApp(config, new TeamboardRepository(db)); });
  afterEach(async () => { await app.close(); db.close(); });

  it("supports login and board retrieval", async () => {
    const login = await app.inject({ method: "POST", url: "/api/login", payload: { email: "alex@example.test", password: "demo-password" } });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];
    const boards = await app.inject({ method: "GET", url: "/api/boards", headers: { cookie: cookie! } });
    expect(boards.statusCode).toBe(200);
    expect(boards.json().boards[0].cards).toHaveLength(2);
  });

  it("supports the service-client identity header", async () => {
    const response = await app.inject({ method: "GET", url: "/api/me", headers: { "x-teamboard-user": "usr_alex" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe("alex@example.test");
  });

  it("creates and edits a card", async () => {
    const headers = { "x-teamboard-user": "usr_alex" };
    const created = await app.inject({ method: "POST", url: "/api/boards/brd_launch/cards", headers, payload: { title: "Publish status page" } });
    expect(created.statusCode).toBe(201);
    const edited = await app.inject({ method: "PATCH", url: `/api/cards/${created.json().card.id}`, headers, payload: { title: "Publish launch status page" } });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().card.title).toBe("Publish launch status page");
  });
});
