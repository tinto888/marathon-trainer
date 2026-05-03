import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default function Social() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month">("week");

  const now = new Date();
  const from = useMemo(() =>
    period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now),
    [period]
  );
  const to = useMemo(() =>
    period === "week" ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now),
    [period]
  );

  const { data: leaderboard, isLoading } = trpc.social.leaderboard.useQuery({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const { data: publicWorkouts } = trpc.workout.listPublic.useQuery();

  const periodLabel = period === "week"
    ? `${format(from, "M월 d일", { locale: ko })} ~ ${format(to, "M월 d일", { locale: ko })}`
    : format(now, "yyyy년 M월", { locale: ko });

  // Top 10 for chart
  const chartData = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.slice(0, 10).map((u) => ({
      name: u.userName || "익명",
      km: parseFloat((u.totalDistance || 0).toFixed(1)),
      count: u.workoutCount,
    }));
  }, [leaderboard]);

  const myRank = useMemo(() => {
    if (!leaderboard || !user) return null;
    const idx = leaderboard.findIndex((u) => u.userId === (user as { id?: number }).id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

  const myStats = useMemo(() => {
    if (!leaderboard || !user) return null;
    return leaderboard.find((u) => u.userId === (user as { id?: number }).id) || null;
  }, [leaderboard, user]);

  const [, navigate] = useLocation();

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mono-label mb-1">SOCIAL COMPARISON</div>
          <h1 className="text-3xl font-black">소셜 비교</h1>
        </div>
        <Button onClick={() => navigate("/compare")} variant="outline">
          <Users className="w-4 h-4 mr-2" />1:1 비교
        </Button>
      </div>

      {/* Period toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setPeriod("week")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${period === "week" ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}>
          이번 주
        </button>
        <button onClick={() => setPeriod("month")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${period === "month" ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}>
          이번 달
        </button>
        <span className="mono-label ml-2">{periodLabel}</span>
      </div>

      {/* My rank card */}
      {myRank && myStats && (
        <div className="blueprint-card p-5 mb-6 border-2" style={{ borderColor: "var(--cyan)" }}>
          <div className="mono-label mb-2">내 순위</div>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-black" style={{ color: "var(--cyan)" }}>#{myRank}</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="mono-label">총 거리</div>
                <div className="font-bold text-lg">{(myStats.totalDistance || 0).toFixed(1)} km</div>
              </div>
              <div>
                <div className="mono-label">운동 횟수</div>
                <div className="font-bold text-lg">{myStats.workoutCount} 회</div>
              </div>
              <div>
                <div className="mono-label">총 시간</div>
                <div className="font-bold text-lg">{Math.floor((myStats.totalDuration || 0) / 60)}h {Math.round((myStats.totalDuration || 0) % 60)}m</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="blueprint-card p-5 mb-6">
          <div className="mono-label mb-4">상위 10명 거리 비교 (km)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
              <Tooltip contentStyle={{ fontFamily: "Space Mono", fontSize: 11 }} />
              <Bar dataKey="km" name="거리(km)" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard */}
      <div className="blueprint-card p-5 mb-6">
        <div className="mono-label mb-4">리더보드</div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => {
              const isMe = entry.userId === (user as { id?: number })?.id;
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
              return (
                <div key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isMe ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}>
                  <div className="w-8 text-center font-black text-sm" style={{ color: idx < 3 ? "var(--cyan)" : "var(--muted-foreground)" }}>
                    {medal || `#${idx + 1}`}
                  </div>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 shrink-0 overflow-hidden"
                    style={{ backgroundColor: (entry.avatarColor || "#06b6d4") + "22", borderColor: entry.avatarColor || "#06b6d4" }}>
                    {(entry as { avatarImageUrl?: string }).avatarImageUrl ? (
                      <img src={(entry as { avatarImageUrl?: string }).avatarImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      entry.avatarEmoji || "🏃"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {entry.userName || "익명"} {isMe && <span className="text-primary text-xs">(나)</span>}
                    </div>
                    <div className="mono-label">{entry.workoutCount}회 운동</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: "var(--cyan)" }}>
                      {(entry.totalDistance || 0).toFixed(1)} km
                    </div>
                    <div className="mono-label">
                      {Math.floor((entry.totalDuration || 0) / 60)}h {Math.round((entry.totalDuration || 0) % 60)}m
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🏃</div>
            <p className="text-muted-foreground text-sm">이 기간에 기록된 운동이 없습니다.</p>
          </div>
        )}
      </div>

      {/* Recent public workouts feed */}
      <div className="blueprint-card p-5">
        <div className="mono-label mb-4">최근 운동 피드</div>
        {publicWorkouts && publicWorkouts.length > 0 ? (
          <div className="space-y-3">
            {publicWorkouts.slice(0, 15).map((w) => (
              <div key={w.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 shrink-0 overflow-hidden"
                  style={{ backgroundColor: (w.avatarColor || "#06b6d4") + "22", borderColor: w.avatarColor || "#06b6d4" }}>
                  {(w as { avatarImageUrl?: string }).avatarImageUrl ? (
                    <img src={(w as { avatarImageUrl?: string }).avatarImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    w.avatarEmoji || "🏃"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{w.userName || "익명"}</div>
                  <div className="mono-label">
                    {w.workoutType === "running" ? "러닝" : w.workoutType === "cycling" ? "사이클" : w.workoutType === "swimming" ? "수영" : "운동"} ·{" "}
                    {format(new Date(w.workoutDate), "M/d HH:mm")}
                  </div>
                </div>
                <div className="text-right">
                  {w.distanceKm && <div className="font-bold text-sm" style={{ color: "var(--cyan)" }}>{w.distanceKm} km</div>}
                  <div className="mono-label">{w.durationMin}분</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            공개된 운동 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
