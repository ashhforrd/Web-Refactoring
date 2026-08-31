import { SignJWT, jwtVerify } from "jose";

export type Session = { userId: string };

function key(secret: string) { return new TextEncoder().encode(secret); }

export async function createSession(userId: string, secret: string) {
  return new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key(secret));
}

export async function readSession(token: string | undefined, secret: string): Promise<Session | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, key(secret));
    return typeof payload.userId === "string" ? { userId: payload.userId } : undefined;
  } catch {
    return undefined;
  }
}
