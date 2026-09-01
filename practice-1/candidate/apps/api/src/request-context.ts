import type { FastifyBaseLogger } from "fastify";

let activeRequestId: string | undefined;

export function beginRequest(requestId: string) {
  activeRequestId = requestId;
}

export function requestLogger(logger: FastifyBaseLogger) {
  return logger.child({ requestId: activeRequestId });
}
