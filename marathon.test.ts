import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB functions
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  getRacesByUser: vi.fn().mockResolvedValue([]),
  createRace: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateRace: vi.fn().mockResolvedValue(undefined),
  deleteRace: vi.fn().mockResolvedValue(undefined),
  getWorkoutsByUser: vi.fn().mockResolvedValue([]),
  createWorkout: vi.fn().mockResolvedValue({ insertId: 1 }),
  deleteWorkout: vi.fn().mockResolvedValue(undefined),
  getPublicWorkoutsRecent: vi.fn().mockResolvedValue([]),
  getWeeklyStats: vi.fn().mockResolvedValue([{ totalDistance: 0, totalDuration: 0, count: 0 }]),
  getWorkoutsByUserInRange: vi.fn().mockResolvedValue([]),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  getAllUsersPublic: vi.fn().mockResolvedValue([]),
  getActiveTrainingPlan: vi.fn().mockResolvedValue(null),
  getAllTrainingPlans: vi.fn().mockResolvedValue([]),
  createTrainingPlan: vi.fn().mockResolvedValue({ insertId: 1 }),
  getChatHistory: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  clearChatHistory: vi.fn().mockResolvedValue(undefined),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"title":"Test Plan","summary":"Test","weeks":[]}' } }],
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

const mockUser = {
  id: 1,
  openId: "test-user-123",
  name: "테스트 선수",
  email: "test@example.com",
  loginMethod: "manus",
  role: "user" as const,
  avatarEmoji: "🏃",
  avatarColor: "#06b6d4",
  height: 175,
  weight: 70,
  currentPace: "5:30",
  maxDistance: 21,
  onboardingCompleted: true,
  trainingLevel: "intermediate" as const,
  targetRaceId: null,
  targetFinishTime: "4:30:00",
  weeklyGoalKm: 40,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createAuthContext(): TrpcContext {
  return {
    user: mockUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toEqual(mockUser);
  });
});

describe("profile.update", () => {
  it("updates user profile successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.update({
      height: 175,
      weight: 70,
      currentPace: "5:30",
      maxDistance: 21,
      trainingLevel: "intermediate",
    });
    expect(result.success).toBe(true);
  });
});

describe("race router", () => {
  it("lists races for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.race.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a race", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.race.create({
      name: "서울 마라톤 2025",
      raceDate: "2025-03-16T00:00:00.000Z",
      distance: 42.195,
      targetTime: "4:30:00",
    });
    expect(result.success).toBe(true);
  });
});

describe("workout router", () => {
  it("lists workouts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a running workout", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.create({
      workoutType: "running",
      workoutDate: new Date().toISOString(),
      distanceKm: 10,
      durationMin: 55,
      avgPace: "5:30",
      isPublic: true,
    });
    expect(result.success).toBe(true);
  });

  it("gets workout stats in range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const from = new Date("2025-01-01").toISOString();
    const to = new Date("2025-01-31").toISOString();
    const result = await caller.workout.stats({ from, to });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("social router", () => {
  it("returns leaderboard", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.social.leaderboard({
      from: new Date("2025-01-01").toISOString(),
      to: new Date("2025-01-31").toISOString(),
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("coach router", () => {
  it("returns chat history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.coach.history();
    expect(Array.isArray(result)).toBe(true);
  });

  it("clears chat history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.coach.clearHistory();
    expect(result.success).toBe(true);
  });
});

describe("trainingPlan router", () => {
  it("returns null when no active plan", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trainingPlan.active();
    expect(result).toBeNull();
  });
});
