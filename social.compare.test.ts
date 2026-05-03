import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

describe("social.compare", () => {
  it("returns user and other stats for a date range", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.social.compare({
      otherUserId: 2,
      from: new Date("2025-01-01").toISOString(),
      to: new Date("2025-12-31").toISOString(),
    });

    // Should return the expected shape
    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("other");
  });

  it("handles same user comparison gracefully", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.social.compare({
      otherUserId: 1,
      from: new Date("2025-01-01").toISOString(),
      to: new Date("2025-12-31").toISOString(),
    });

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("other");
  });
});

describe("social.users", () => {
  it("returns a list of users", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.social.users();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("workout.getById", () => {
  it("throws NOT_FOUND for non-existent workout", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.workout.getById({ id: 999999 })).rejects.toThrow(
      "운동 기록을 찾을 수 없습니다"
    );
  });
});

describe("workout.getTrackpoints", () => {
  it("returns empty array for non-existent workout", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.workout.getTrackpoints({ workoutId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
