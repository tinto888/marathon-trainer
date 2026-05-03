import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { parseWorkoutFile } from "./watchParser";
import {
  clearChatHistory,
  createRace,
  createTrainingPlan,
  createWorkout,
  deleteRace,
  deleteWorkout,
  getAllTrainingPlans,
  getAllUsersPublic,
  getActiveTrainingPlan,
  getChatHistory,
  getLeaderboard,
  getPublicWorkoutsRecent,
  getRacesByUser,
  getTrackpointsByWorkout,
  getUserWorkoutStats,
  getWeeklyStats,
  getWorkoutById,
  getWorkoutsByUser,
  getWorkoutsByUserInRange,
  saveChatMessage,
  saveTrackpoints,
  updateRace,
  updateUserProfile,
} from "./db";

// ── Profile Router ─────────────────────────────────────────────────────────
const profileRouter = router({
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
        avatarImageUrl: z.string().optional(),
        avatarCharacterId: z.string().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
        currentPace: z.string().optional(),
        maxDistance: z.number().optional(),
        trainingLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        targetRaceId: z.number().optional(),
        targetFinishTime: z.string().optional(),
        weeklyGoalKm: z.number().optional(),
        onboardingCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

// ── Avatar Upload Router ──────────────────────────────────────────────────
const avatarRouter = router({
  upload: protectedProcedure
    .input(z.object({
      dataUrl: z.string().min(1),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const base64Match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) throw new Error("Invalid data URL");
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, "base64");
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const key = `avatars/user_${ctx.user.id}_${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);
      await updateUserProfile(ctx.user.id, { avatarImageUrl: url });
      return { url };
    }),
});

// ── Race Router ────────────────────────────────────────────────────────────
const raceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getRacesByUser(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        raceDate: z.string(),
        distance: z.number(),
        location: z.string().optional(),
        targetTime: z.string().optional(),
        isParticipating: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createRace({
        userId: ctx.user.id,
        name: input.name,
        raceDate: new Date(input.raceDate),
        distance: input.distance,
        location: input.location,
        targetTime: input.targetTime,
        isParticipating: input.isParticipating ?? true,
        notes: input.notes,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        raceDate: z.string().optional(),
        distance: z.number().optional(),
        location: z.string().optional(),
        targetTime: z.string().optional(),
        isParticipating: z.boolean().optional(),
        actualTime: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, raceDate, ...rest } = input;
      await updateRace(id, ctx.user.id, {
        ...rest,
        ...(raceDate ? { raceDate: new Date(raceDate) } : {}),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteRace(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ── Workout Router ─────────────────────────────────────────────────────────
const workoutRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getWorkoutsByUser(ctx.user.id, input.limit ?? 50);
    }),

  listPublic: publicProcedure.query(async () => {
    return getPublicWorkoutsRecent(100);
  }),

  create: protectedProcedure
    .input(
      z.object({
        workoutType: z.enum([
          "running",
          "cycling",
          "swimming",
          "strength",
          "yoga",
          "walking",
          "other",
        ]),
        workoutDate: z.string(),
        distanceKm: z.number().optional(),
        durationMin: z.number(),
        avgPace: z.string().optional(),
        avgHeartRate: z.number().optional(),
        calories: z.number().optional(),
        elevationGain: z.number().optional(),
        notes: z.string().optional(),
        isPublic: z.boolean().optional(),
        trackpoints: z.array(z.object({
          timestamp: z.string().optional(),
          lat: z.number().optional(),
          lon: z.number().optional(),
          elevation: z.number().optional(),
          heartRate: z.number().optional(),
          pace: z.number().optional(),
          cadence: z.number().optional(),
          distanceCumKm: z.number().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { trackpoints: tps, ...workoutData } = input;
      const result = await createWorkout({
        userId: ctx.user.id,
        workoutType: workoutData.workoutType,
        workoutDate: new Date(workoutData.workoutDate),
        distanceKm: workoutData.distanceKm,
        durationMin: workoutData.durationMin,
        avgPace: workoutData.avgPace,
        avgHeartRate: workoutData.avgHeartRate,
        calories: workoutData.calories,
        elevationGain: workoutData.elevationGain,
        notes: workoutData.notes,
        isPublic: workoutData.isPublic ?? true,
      });
      // Save trackpoints if provided
      if (tps && tps.length > 0) {
        const insertId = (result as any)[0]?.insertId || (result as any).insertId;
        if (insertId) {
          await saveTrackpoints(insertId, tps.map(tp => ({
            timestamp: tp.timestamp ? new Date(tp.timestamp) : undefined,
            lat: tp.lat,
            lon: tp.lon,
            elevation: tp.elevation,
            heartRate: tp.heartRate,
            pace: tp.pace,
            cadence: tp.cadence,
            distanceCumKm: tp.distanceCumKm,
          })));
        }
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteWorkout(input.id, ctx.user.id);
      return { success: true };
    }),

  stats: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      return getWeeklyStats(ctx.user.id, new Date(input.from), new Date(input.to));
    }),

  inRange: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      return getWorkoutsByUserInRange(
        ctx.user.id,
        new Date(input.from),
        new Date(input.to)
      );
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const workout = await getWorkoutById(input.id, ctx.user.id);
      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "운동 기록을 찾을 수 없습니다" });
      }
      return workout;
    }),

  getTrackpoints: protectedProcedure
    .input(z.object({ workoutId: z.number() }))
    .query(async ({ input }) => {
      return getTrackpointsByWorkout(input.workoutId);
    }),

  parseFile: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const result = await parseWorkoutFile(buffer, input.filename);
      return result;
    }),
});
// ── Social Router ────────────────────────────────────────────────────────────────────────
const socialRouter = router({
  leaderboard: publicProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      return getLeaderboard(new Date(input.from), new Date(input.to));
    }),

  users: publicProcedure.query(async () => {
    return getAllUsersPublic();
  }),
  compare: protectedProcedure
    .input(z.object({
      otherUserId: z.number(),
      from: z.string(),
      to: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return getUserWorkoutStats(
        ctx.user.id,
        input.otherUserId,
        new Date(input.from),
        new Date(input.to)
      );
    }),
});

// ── Training Plan Router ───────────────────────────────────────────────────
const trainingPlanRouter = router({
  active: protectedProcedure.query(async ({ ctx }) => {
    return getActiveTrainingPlan(ctx.user.id);
  }),

  all: protectedProcedure.query(async ({ ctx }) => {
    return getAllTrainingPlans(ctx.user.id);
  }),

  generate: protectedProcedure
    .input(
      z.object({
        raceId: z.number().optional(),
        raceName: z.string().optional(),
        raceDate: z.string().optional(),
        raceDistance: z.number().optional(),
        targetTime: z.string().optional(),
        trainingLevel: z.enum(["beginner", "intermediate", "advanced"]),
        currentPace: z.string().optional(),
        maxDistance: z.number().optional(),
        weeklyGoalKm: z.number().optional(),
        additionalInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      const prompt = `
당신은 전문 마라톤 코치입니다. 아래 정보를 바탕으로 개인 맞춤형 훈련 계획을 JSON 형식으로 생성해주세요.

## 선수 정보
- 이름: ${user.name || "선수"}
- 훈련 수준: ${input.trainingLevel === "beginner" ? "초급" : input.trainingLevel === "intermediate" ? "중급" : "고급"}
- 목표 페이스: ${input.currentPace || "미입력"}/km
- 최대 러닝 거리: ${input.maxDistance || "미입력"}km
- 주간 목표 거리: ${input.weeklyGoalKm || 30}km

## 목표 대회
- 대회명: ${input.raceName || "마라톤 대회"}
- 대회일: ${input.raceDate || "미정"}
- 거리: ${input.raceDistance || 42.195}km
- 목표 완주 시간: ${input.targetTime || "미입력"}

## 추가 정보
${input.additionalInfo || "없음"}

## 출력 형식 (JSON)
다음 형식으로 정확히 출력해주세요:
{
  "title": "훈련 계획 제목",
  "summary": "전체 훈련 계획 요약 (2-3문장)",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "주차 테마",
      "totalKm": 총거리숫자,
      "days": [
        {
          "day": "월요일",
          "type": "휴식|러닝|크로스트레이닝|장거리|인터벌|템포",
          "description": "세부 훈련 내용",
          "distanceKm": 거리숫자또는null,
          "durationMin": 시간숫자
        }
      ]
    }
  ]
}
총 8-16주 계획을 생성해주세요. 각 주차는 7일(월~일)을 포함해야 합니다.
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert marathon coach. Always respond with valid JSON only, no markdown code blocks.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let planData: unknown;
      try {
        planData = JSON.parse(content);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI 응답 파싱 실패",
        });
      }

      const typedPlan = planData as { title?: string; weeks?: unknown[] };
      const startDate = new Date();
      const endDate = input.raceDate
        ? new Date(input.raceDate)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      await createTrainingPlan({
        userId: ctx.user.id,
        title: typedPlan.title || "맞춤 훈련 계획",
        raceId: input.raceId,
        planData,
        startDate,
        endDate,
        isActive: true,
      });

      return { success: true, plan: planData };
    }),
});

// ── AI Coach Router ────────────────────────────────────────────────────────
const coachRouter = router({
  history: protectedProcedure.query(async ({ ctx }) => {
    return getChatHistory(ctx.user.id, 50);
  }),

  chat: protectedProcedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      // Save user message
      await saveChatMessage({
        userId: user.id,
        role: "user",
        content: input.message,
      });

      // Get recent history for context
      const history = await getChatHistory(user.id, 20);

      const systemPrompt = `당신은 전문 마라톤 코치 AI입니다. 선수의 훈련, 부상 예방, 페이스 전략, 영양, 멘탈 관리 등에 대해 친절하고 전문적으로 조언합니다.
선수 정보:
- 이름: ${user.name || "선수"}
- 훈련 수준: ${(user as { trainingLevel?: string }).trainingLevel || "미설정"}
- 목표 페이스: ${(user as { currentPace?: string }).currentPace || "미설정"}
- 최대 러닝 거리: ${(user as { maxDistance?: number }).maxDistance || "미설정"}km
한국어로 답변하세요. 구체적이고 실용적인 조언을 제공하세요.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.slice(-18).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages });
      const rawMsg = response.choices[0]?.message?.content;
      const assistantMessage =
        typeof rawMsg === "string" ? rawMsg : "죄송합니다, 응답을 생성할 수 없습니다.";

      await saveChatMessage({
        userId: user.id,
        role: "assistant",
        content: assistantMessage,
      });

      return { message: assistantMessage };
    }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    await clearChatHistory(ctx.user.id);
    return { success: true };
  }),
});

// ── Notification Router ──────────────────────────────────────────────────
const notificationRouter = router({
  // Notify owner when a new user joins or achieves a milestone
  notifyMilestone: protectedProcedure
    .input(z.object({
      type: z.enum(["weekly_goal", "race_complete", "new_record"]),
      details: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const titles: Record<string, string> = {
        weekly_goal: "🎯 주간 목표 달성!",
        race_complete: "🏁 대회 완주!",
        new_record: "🏆 새 기록 달성!",
      };
      await notifyOwner({
        title: titles[input.type] || "훈련 알림",
        content: `선수 ${ctx.user.name || ctx.user.id}님: ${input.details}`,
      }).catch(() => {});
      return { success: true };
    }),
});

// ── App Router ─────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: profileRouter,
  avatar: avatarRouter,
  race: raceRouter,
  workout: workoutRouter,
  social: socialRouter,
  trainingPlan: trainingPlanRouter,
  coach: coachRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
