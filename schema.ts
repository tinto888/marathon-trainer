import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Profile fields
  avatarEmoji: varchar("avatarEmoji", { length: 16 }).default("🏃"),
  avatarColor: varchar("avatarColor", { length: 16 }).default("#06b6d4"),
  avatarImageUrl: text("avatarImageUrl"),
  avatarCharacterId: varchar("avatarCharacterId", { length: 32 }), // zodiac character id
  height: float("height"), // cm
  weight: float("weight"), // kg
  currentPace: varchar("currentPace", { length: 16 }), // mm:ss/km
  maxDistance: float("maxDistance"), // km
  // Onboarding
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  trainingLevel: mysqlEnum("trainingLevel", ["beginner", "intermediate", "advanced"]),
  targetRaceId: int("targetRaceId"),
  targetFinishTime: varchar("targetFinishTime", { length: 16 }), // hh:mm:ss
  weeklyGoalKm: float("weeklyGoalKm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Races / Marathons
export const races = mysqlTable("races", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  raceDate: timestamp("raceDate").notNull(),
  distance: float("distance").notNull(), // km (5, 10, 21.0975, 42.195, etc.)
  location: varchar("location", { length: 256 }),
  targetTime: varchar("targetTime", { length: 16 }), // hh:mm:ss
  isParticipating: boolean("isParticipating").default(true),
  actualTime: varchar("actualTime", { length: 16 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Race = typeof races.$inferSelect;
export type InsertRace = typeof races.$inferInsert;

// Workouts
export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutType: mysqlEnum("workoutType", [
    "running",
    "cycling",
    "swimming",
    "strength",
    "yoga",
    "walking",
    "other",
  ]).notNull(),
  workoutDate: timestamp("workoutDate").notNull(),
  distanceKm: float("distanceKm"),
  durationMin: float("durationMin").notNull(),
  avgPace: varchar("avgPace", { length: 16 }), // mm:ss/km
  avgHeartRate: int("avgHeartRate"),
  calories: int("calories"),
  elevationGain: float("elevationGain"), // meters
  notes: text("notes"),
  isPublic: boolean("isPublic").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

// Workout Trackpoints - GPX/FIT/TCX 상세 데이터
export const workoutTrackpoints = mysqlTable("workoutTrackpoints", {
  id: int("id").autoincrement().primaryKey(),
  workoutId: int("workoutId").notNull(),
  timestamp: timestamp("timestamp"),
  lat: float("lat"),
  lon: float("lon"),
  elevation: float("elevation"),
  heartRate: int("heartRate"),
  pace: float("pace"), // min/km
  cadence: int("cadence"),
  distanceCumKm: float("distanceCumKm"),
});
export type WorkoutTrackpoint = typeof workoutTrackpoints.$inferSelect;
export type InsertWorkoutTrackpoint = typeof workoutTrackpoints.$inferInsert;

// Training Plans
export const trainingPlans = mysqlTable("trainingPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  raceId: int("raceId"),
  planData: json("planData").notNull(), // Array of weekly plan objects
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = typeof trainingPlans.$inferInsert;

// AI Coach Chat Messages
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
