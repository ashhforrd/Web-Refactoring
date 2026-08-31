import { loadConfig } from "@teamboard/config";
import { openDatabase, seedDatabase, TeamboardRepository } from "@teamboard/db";
import { buildApp } from "./app.js";

const config = loadConfig();
const db = openDatabase(config.databasePath);
seedDatabase(db);
const app = buildApp(config, new TeamboardRepository(db));

await app.listen({ port: config.port, host: "127.0.0.1" });

const stop = async () => { await app.close(); db.close(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
