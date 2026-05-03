import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  chatMessages,
  InsertChatMessage,
  InsertRace,
  InsertTrainingPlan,
  InsertUser,
  InsertWorkout,
  InsertWorkoutTrackpoint,
  races,
  trainingPlans,
  users,
  workouts,
  workoutTrackpoints,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(
  userId: number,
  data: Partial<InsertUser>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllUsersPublic() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      avatarEmoji: users.avatarEmoji,
      avatarColor: users.avatarColor,
      avatarImageUrl: users.avatarImageUrl,
      trainingLevel: users.trainingLevel,
    })
    .from(users);
}

// ── Races ──────────────────────────────────────────────────────────────────

export async function createRace(data: InsertRace) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(races).values(data);
  return result;
}

export async function getRacesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(races)
    .where(eq(races.userId, userId))
    .orderBy(desc(races.raceDate));
}

export async function updateRace(raceId: number, userId: number, data: Partial<InsertRace>) {
  const db = await getDb();
  if (!db) return;
  await db.update(races).set(data).where(and(eq(races.id, raceId), eq(races.userId, userId)));
}

export async function deleteRace(raceId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(races).where(and(eq(races.id, raceId), eq(races.userId, userId)));
}

// ── Workouts ───────────────────────────────────────────────────────────────

export async function createWorkout(data: InsertWorkout) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(workouts).values(data);
  return result;
}

export async function getWorkoutsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.workoutDate))
    .limit(limit);
}

export async function getWorkoutsByUserInRange(
  userId: number,
  from: Date,
  to: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.workoutDate, from),
        lte(workouts.workoutDate, to)
      )
    )
    .orderBy(desc(workouts.workoutDate));
}

export async function getPublicWorkoutsRecent(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: workouts.id,
      userId: workouts.userId,
      workoutType: workouts.workoutType,
      workoutDate: workouts.workoutDate,
      distanceKm: workouts.distanceKm,
      durationMin: workouts.durationMin,
      avgPace: workouts.avgPace,
      userName: users.name,
      avatarEmoji: users.avatarEmoji,
      avatarColor: users.avatarColor,
      avatarImageUrl: users.avatarImageUrl,
    })
    .from(workouts)
    .innerJoin(users, eq(workouts.userId, users.id))
    .where(eq(workouts.isPublic, true))
    .orderBy(desc(workouts.workoutDate))
    .limit(limit);
}

export async function getWorkoutById(workoutId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteWorkout(workoutId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Also delete trackpoints
  await db.delete(workoutTrackpoints).where(eq(workoutTrackpoints.workoutId, workoutId));
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
}

// ── Workout Trackpoints ───────────────────────────────────────────────────

export async function saveTrackpoints(
  workoutId: number,
  trackpoints: Omit<InsertWorkoutTrackpoint, "workoutId">[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (trackpoints.length === 0) return;

  // Batch insert in chunks of 500 to avoid query size limits
  const BATCH_SIZE = 500;
  for (let i = 0; i < trackpoints.length; i += BATCH_SIZE) {
    const batch = trackpoints.slice(i, i + BATCH_SIZE).map((tp) => ({
      ...tp,
      workoutId,
    }));
    await db.insert(workoutTrackpoints).values(batch);
  }
}

export async function getTrackpointsByWorkout(workoutId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workoutTrackpoints)
    .where(eq(workoutTrackpoints.workoutId, workoutId))
    .orderBy(workoutTrackpoints.id);
}

export async function getUserWorkoutStats(userId: number, otherUserId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return { user: null, other: null };

  const getStats = async (uid: number) => {
    const result = await db
      .select({
        totalDistance: sql<number>`COALESCE(SUM(${workouts.distanceKm}), 0)`,
        totalDuration: sql<number>`COALESCE(SUM(${workouts.durationMin}), 0)`,
        workoutCount: sql<number>`COUNT(*)`,
        avgPace: sql<string>`MIN(${workouts.avgPace})`,
        totalCalories: sql<number>`COALESCE(SUM(${workouts.calories}), 0)`,
        totalElevation: sql<number>`COALESCE(SUM(${workouts.elevationGain}), 0)`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, uid),
          gte(workouts.workoutDate, from),
          lte(workouts.workoutDate, to)
        )
      );
    return result[0] || null;
  };

  const [user, other] = await Promise.all([getStats(userId), getStats(otherUserId)]);
  return { user, other };
}

export async function getWeeklyStats(userId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      totalDistance: sql<number>`COALESCE(SUM(${workouts.distanceKm}), 0)`,
      totalDuration: sql<number>`COALESCE(SUM(${workouts.durationMin}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.workoutDate, from),
        lte(workouts.workoutDate, to)
      )
    );
}

export async function getLeaderboard(from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: workouts.userId,
      userName: users.name,
      avatarEmoji: users.avatarEmoji,
      avatarColor: users.avatarColor,
      avatarImageUrl: users.avatarImageUrl,
      totalDistance: sql<number>`COALESCE(SUM(${workouts.distanceKm}), 0)`,
      totalDuration: sql<number>`COALESCE(SUM(${workouts.durationMin}), 0)`,
      workoutCount: sql<number>`COUNT(*)`,
    })
    .from(workouts)
    .innerJoin(users, eq(workouts.userId, users.id))
    .where(
      and(
        eq(workouts.isPublic, true),
        gte(workouts.workoutDate, from),
        lte(workouts.workoutDate, to)
      )
    )
    .groupBy(workouts.userId, users.name, users.avatarEmoji, users.avatarColor)
    .orderBy(desc(sql<number>`SUM(${workouts.distanceKm})`));
}

// ── Training Plans ─────────────────────────────────────────────────────────

export async function createTrainingPlan(data: InsertTrainingPlan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deactivate previous plans
  await db
    .update(trainingPlans)
    .set({ isActive: false })
    .where(eq(trainingPlans.userId, data.userId));
  const result = await db.insert(trainingPlans).values(data);
  return result;
}

export async function getActiveTrainingPlan(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllTrainingPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, userId))
    .orderBy(desc(trainingPlans.createdAt));
}

// ── Chat Messages ──────────────────────────────────────────────────────────

export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(chatMessages).values(data);
}

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);
}

export async function clearChatHistory(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}
