import Fastify, { type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { AppConfig } from "@teamboard/config";
import { createCardInput, loginInput, updateCardInput } from "@teamboard/shared";
import { verifyPassword, type TeamboardRepository } from "@teamboard/db";
import { beginRequest, requestLogger } from "./request-context.js";
import { createSession, readSession } from "./session.js";

declare module "fastify" {
  interface FastifyRequest { currentUserId?: string }
}

export function buildApp(config: AppConfig, repo: TeamboardRepository) {
  const app = Fastify({ logger: config.nodeEnv !== "test", trustProxy: config.trustProxy });

  app.register(cookie);
  app.register(cors, { origin: config.webOrigin, credentials: true });

  app.addHook("onRequest", async (request) => {
    beginRequest(request.id);
    const session = await readSession(request.cookies.session, config.sessionSecret);
    const legacyUserId = request.headers["x-teamboard-user"];
    request.currentUserId = session?.userId ?? (typeof legacyUserId === "string" ? legacyUserId : undefined);
  });

  const requireUser = async (request: FastifyRequest) => {
    if (!request.currentUserId || !repo.findUser(request.currentUserId)) {
      const error = new Error("Authentication required") as Error & { statusCode: number };
      error.statusCode = 401;
      throw error;
    }
    return request.currentUserId;
  };

  app.get("/health", async () => ({ ok: true }));

  app.post("/api/login", async (request, reply) => {
    const input = loginInput.parse(request.body);
    const user = repo.findUserByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.passwordHash)) return reply.code(401).send({ error: "Invalid credentials" });
    const token = await createSession(user.id, config.sessionSecret);
    reply.setCookie("session", token, { httpOnly: true, sameSite: "lax", path: "/", secure: config.nodeEnv === "production" });
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  });

  app.post("/api/logout", async (_request, reply) => {
    reply.clearCookie("session", { path: "/" });
    return reply.code(204).send();
  });

  app.get("/api/me", async (request) => {
    const userId = await requireUser(request);
    return { user: repo.findUser(userId) };
  });

  app.get("/api/boards", async (request) => {
    const userId = await requireUser(request);
    return { boards: repo.listBoards(userId) };
  });

  app.post<{ Params: { boardId: string } }>("/api/boards/:boardId/cards", async (request, reply) => {
    const userId = await requireUser(request);
    if (!repo.membership(userId, request.params.boardId)) return reply.code(404).send({ error: "Board not found" });
    const input = createCardInput.parse(request.body);
    return reply.code(201).send({ card: repo.createCard(request.params.boardId, userId, input.title, input.description) });
  });

  app.patch<{ Params: { cardId: string } }>("/api/cards/:cardId", async (request, reply) => {
    await requireUser(request);
    const input = updateCardInput.parse(request.body);
    const card = repo.updateCard(request.params.cardId, input);
    if (!card) return reply.code(404).send({ error: "Card not found" });
    return { card };
  });

  app.post<{ Params: { code: string } }>("/api/invitations/:code/redeem", async (request, reply) => {
    const userId = await requireUser(request);
    if (!repo.redeemInvite(request.params.code, userId)) return reply.code(409).send({ error: "Invitation unavailable" });
    requestLogger(request.log).info({ code: request.params.code }, "invitation redeemed");
    return reply.code(204).send();
  });

  app.setErrorHandler((error, request, reply) => {
    const normalized = error instanceof Error ? error : new Error("Unknown error");
    requestLogger(request.log).error({ err: normalized }, "request failed");
    const status = "statusCode" in normalized && typeof normalized.statusCode === "number" ? normalized.statusCode : 500;
    reply.code(status).send({ error: normalized.message });
  });

  return app;
}
