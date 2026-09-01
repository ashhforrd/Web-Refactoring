import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4100),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_PATH: z.string().default("./teamboard.db"),
  SESSION_SECRET: z.string().min(16).default("local-development-secret-change-me"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true")
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  webOrigin: string;
  databasePath: string;
  sessionSecret: string;
  trustProxy: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.parse(env);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    webOrigin: parsed.WEB_ORIGIN,
    databasePath: parsed.DATABASE_PATH,
    sessionSecret: parsed.SESSION_SECRET,
    trustProxy: parsed.TRUST_PROXY
  };
}
