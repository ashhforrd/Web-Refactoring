import { describe, expect, it } from "vitest";
import { openDatabase, seedDatabase, TeamboardRepository } from "./index.js";

describe("TeamboardRepository", () => {
  it("returns seeded boards with creator labels", () => {
    const db = openDatabase(":memory:"); seedDatabase(db);
    const boards = new TeamboardRepository(db).listBoards("usr_alex");
    expect(boards).toHaveLength(1);
    expect(boards[0]?.cards[0]?.creatorName).toBe("Alex Rivera");
    db.close();
  });

  it("adds a member from an active invitation", () => {
    const db = openDatabase(":memory:"); seedDatabase(db);
    const repo = new TeamboardRepository(db);
    expect(repo.redeemInvite("LAUNCH-2026", "usr_sam")).toBe(true);
    expect(repo.membership("usr_sam", "brd_launch")?.role).toBe("member");
    db.close();
  });
});
