import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachWeekOfInterval, eachDayOfInterval, addDays } from "date-fns";
import { ko } from "date-fns/locale";

const WORKOUT_LABELS: Record<string, string> = {
  running: "러닝", cycling: "사이클", swimming: "수영",
  strength: "근력", yoga: "요가", walking: "걷기", other: "기타",
};

export default function Dashboard() {
  const { user } = useAuth();
  const me = user as { avatarEmoji?: string; avatarColor?: string; weeklyGoalKm?: number; currentPace?: string; trainingLevel?: string; onboardingCompleted?: boolean } | null;
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"week" | "month">("week");

  const now = new Date();
  const weekFrom = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), []);
  const weekTo = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), []);
  const monthFrom = useMemo(() => startOfMonth(now), []);
  const monthTo = useMemo(() => endOfMonth(now), []);

  const from = view === "week" ? weekFrom : monthFrom;
  const to = view === "week" ? weekTo : monthTo;

  const { data: workoutsInRange } = trpc.workout.inRange.useQuery({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const { data: recentWorkouts } = trpc.workout.list.useQuery({ limit: 5 });
  const { data: activePlan } = trpc.trainingPlan.active.useQuery();
  const { data: races } = trpc.race.list.useQuery();

  // Stats
  const stats = useMemo(() => {
    if (!workoutsInRange) return { totalKm: 0, totalMin: 0, count: 0, runKm: 0, avgPace: null as string | null };
    const totalKm = workoutsInRange.reduce((s, w) => s + (w.distanceKm || 0), 0);
    const totalMin = workoutsInRange.reduce((s, w) => s + w.durationMin, 0);
    const count = workoutsInRange.length;
    const runs = workoutsInRange.filter(w => w.workoutType === "running" && w.distanceKm && w.durationMin);
    const runKm = runs.reduce((s, w) => s + (w.distanceKm || 0), 0);
    const runMin = runs.reduce((s, w) => s + w.durationMin, 0);
    let avgPace: string | null = null;
    if (runKm > 0 && runMin > 0) {
      const paceMin = runMin / runKm;
      const min = Math.floor(paceMin);
      const sec = Math.round((paceMin - min) * 60);
      avgPace = `${min}:${sec.toString().padStart(2, "0")}`;
    }
    return { totalKm, totalMin, count, runKm, avgPace };
  }, [workoutsInRange]);

  // Chart data
  const chartData = useMemo(() => {
    if (!workoutsInRange) return [];
    if (view === "week") {
      const days = eachDayOfInterval({ start: weekFrom, end: weekTo });
      return days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayWorkouts = workoutsInRange.filter(w =>
          format(new Date(w.workoutDate), "yyyy-MM-dd") === dayStr
        );
        return {
          label: format(day, "EEE", { locale: ko }),
          km: parseFloat(dayWorkouts.reduce((s, w) => s + (w.distanceKm || 0), 0).toFixed(1)),
          min: parseFloat(dayWorkouts.reduce((s, w) => s + w.durationMin, 0).toFixed(0)),
        };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: monthFrom, end: monthTo }, { weekStartsOn: 1 });
      return weeks.map((weekStart, i) => {
        const weekEnd = addDays(weekStart, 6);
        const weekWorkouts = workoutsInRange.filter(w => {
          const d = new Date(w.workoutDate);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          label: `${i + 1}주`,
          km: parseFloat(weekWorkouts.reduce((s, w) => s + (w.distanceKm || 0), 0).toFixed(1)),
          min: parseFloat(weekWorkouts.reduce((s, w) => s + w.durationMin, 0).toFixed(0)),
        };
      });
    }
  }, [workoutsInRange, view, weekFrom, weekTo, monthFrom, monthTo]);

  // Next race
  const nextRace = useMemo(() => {
    if (!races) return null;
    const upcoming = races
      .filter(r => new Date(r.raceDate) > now)
      .sort((a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime());
    return upcoming[0] || null;
  }, [races]);

  const dday = nextRace
    ? Math.ceil((new Date(nextRace.raceDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const weeklyGoal = me?.weeklyGoalKm || 30;
  const weekProgress = Math.min((stats.runKm / weeklyGoal) * 100, 100);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mono-label mb-1">TRAINING DASHBOARD</div>
          <h1 className="text-3xl font-black">
            안녕하세요, {user?.name || "선수"}님 {me?.avatarEmoji || "🏃"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(now, "yyyy년 M월 d일 EEEE", { locale: ko })}
          </p>
        </div>
        <Button onClick={() => setLocation("/workouts")} className="hidden md:flex">
          + 운동 기록
        </Button>
      </div>

      {/* Onboarding nudge */}
      {me && !me.onboardingCompleted && (
        <div className="blueprint-card p-4 mb-6 border-l-4" style={{ borderLeftColor: "var(--cyan)" }}>
          <p className="font-semibold">프로필 설정을 완료해주세요!</p>
          <Button size="sm" className="mt-2" onClick={() => setLocation("/onboarding")}>설정하기 →</Button>
        </div>
      )}

      {/* Top stats */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("week")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${view === "week" ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}>
          이번 주
        </button>
        <button onClick={() => setView("month")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${view === "month" ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}>
          이번 달
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "총 거리", value: `${stats.totalKm.toFixed(1)}`, unit: "km", color: "var(--cyan)" },
          { label: "총 시간", value: `${Math.floor(stats.totalMin / 60)}h ${Math.round(stats.totalMin % 60)}m`, unit: "", color: "var(--pink)" },
          { label: "운동 횟수", value: `${stats.count}`, unit: "회", color: "var(--cyan)" },
          { label: "러닝 거리", value: `${stats.runKm.toFixed(1)}`, unit: "km", color: "var(--pink)" },
          { label: "평균 페이스", value: stats.avgPace || "-", unit: "/km", color: "var(--cyan)" },
        ].map((s) => (
          <div key={s.label} className="blueprint-card p-5">
            <div className="mono-label mb-2">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Weekly goal progress */}
      <div className="blueprint-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="mono-label">주간 러닝 목표</div>
            <div className="font-bold text-lg">{stats.runKm.toFixed(1)} / {weeklyGoal} km</div>
          </div>
          <div className="text-2xl font-black" style={{ color: weekProgress >= 100 ? "var(--cyan)" : "var(--foreground)" }}>
            {weekProgress.toFixed(0)}%
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${weekProgress}%`, background: "linear-gradient(90deg, var(--cyan), var(--pink))" }} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="blueprint-card p-5">
          <div className="mono-label mb-4">거리 (km)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Space Mono" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Space Mono" }} />
              <Tooltip contentStyle={{ fontFamily: "Space Mono", fontSize: 12 }} />
              <Bar dataKey="km" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="blueprint-card p-5">
          <div className="mono-label mb-4">훈련 시간 (분)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--pink)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--pink)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Space Mono" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Space Mono" }} />
              <Tooltip contentStyle={{ fontFamily: "Space Mono", fontSize: 12 }} />
              <Area type="monotone" dataKey="min" stroke="var(--pink)" fill="url(#pinkGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Next race */}
        <div className="blueprint-card p-5">
          <div className="mono-label mb-3">다음 목표 대회</div>
          {nextRace ? (
            <div>
              <div className="font-bold text-lg mb-1">{nextRace.name}</div>
              <div className="text-sm text-muted-foreground mb-3">
                {format(new Date(nextRace.raceDate), "yyyy년 M월 d일", { locale: ko })} · {nextRace.distance}km
              </div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-black" style={{ color: "var(--cyan)" }}>D-{dday}</div>
                {nextRace.targetTime && (
                  <div>
                    <div className="mono-label">목표 시간</div>
                    <div className="font-bold">{nextRace.targetTime}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🏁</div>
              <p className="text-muted-foreground text-sm mb-3">등록된 대회가 없습니다</p>
              <Button size="sm" variant="outline" onClick={() => setLocation("/races")}>대회 등록하기</Button>
            </div>
          )}
        </div>

        {/* Recent workouts */}
        <div className="blueprint-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="mono-label">최근 운동</div>
            <button onClick={() => setLocation("/workouts")} className="text-xs text-primary hover:underline">전체 보기</button>
          </div>
          {recentWorkouts && recentWorkouts.length > 0 ? (
            <div className="space-y-2">
              {recentWorkouts.slice(0, 4).map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{w.workoutType === "running" ? "🏃" : w.workoutType === "cycling" ? "🚴" : w.workoutType === "swimming" ? "🏊" : "💪"}</span>
                    <div>
                      <div className="text-sm font-medium">{WORKOUT_LABELS[w.workoutType]}</div>
                      <div className="mono-label">{format(new Date(w.workoutDate), "M/d")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {w.distanceKm && <div className="font-bold text-sm">{w.distanceKm}km</div>}
                    <div className="mono-label">{w.durationMin}분</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-muted-foreground text-sm mb-3">아직 기록이 없습니다</p>
              <Button size="sm" variant="outline" onClick={() => setLocation("/workouts")}>첫 운동 기록하기</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
