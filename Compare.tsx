import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Users, Trophy, TrendingUp, Flame, Mountain, Timer, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Period = "week" | "month";

export default function Compare() {
  const [, navigate] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  const { data: allUsers } = trpc.social.users.useQuery();
  const { data: me } = trpc.auth.me.useQuery();

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
    }
    return {
      from: startOfMonth(now).toISOString(),
      to: endOfMonth(now).toISOString(),
    };
  }, [period]);

  const { data: compareData, isLoading: comparing } = trpc.social.compare.useQuery(
    {
      otherUserId: selectedUserId!,
      from: dateRange.from,
      to: dateRange.to,
    },
    { enabled: !!selectedUserId }
  );

  const otherUsers = useMemo(() => {
    if (!allUsers || !me) return [];
    return allUsers.filter((u) => u.id !== me.id);
  }, [allUsers, me]);

  const selectedUser = otherUsers.find((u) => u.id === selectedUserId);

  // Chart data
  const chartData = useMemo(() => {
    if (!compareData?.user || !compareData?.other) return [];
    const u = compareData.user;
    const o = compareData.other;
    return [
      { name: "거리 (km)", 나: Number(u.totalDistance) || 0, 상대: Number(o.totalDistance) || 0 },
      { name: "시간 (분)", 나: Number(u.totalDuration) || 0, 상대: Number(o.totalDuration) || 0 },
      { name: "운동 횟수", 나: Number(u.workoutCount) || 0, 상대: Number(o.workoutCount) || 0 },
      { name: "칼로리 (kcal)", 나: Number(u.totalCalories) || 0, 상대: Number(o.totalCalories) || 0 },
    ];
  }, [compareData]);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/social")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="mono-label mb-1">COMPARE RECORDS</div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: "var(--cyan)" }} />
            기록 비교
          </h1>
        </div>
      </div>

      {/* Period Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setPeriod("week")}
            className={`px-4 py-2 text-xs font-bold transition-colors ${
              period === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            이번 주
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-2 text-xs font-bold transition-colors ${
              period === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            이번 달
          </button>
        </div>
        <span className="mono-label">
          {period === "week"
            ? format(new Date(dateRange.from), "M/d", { locale: ko }) +
              " ~ " +
              format(new Date(dateRange.to), "M/d", { locale: ko })
            : format(new Date(), "yyyy년 M월", { locale: ko })}
        </span>
      </div>

      {/* User Selection */}
      <div className="blueprint-card p-4 mb-6">
        <div className="mono-label mb-3">비교할 상대 선택</div>
        {otherUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 다른 사용자가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {otherUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                  selectedUserId === u.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Avatar className="h-7 w-7">
                  {u.avatarImageUrl ? (
                    <AvatarImage src={u.avatarImageUrl} alt="avatar" />
                  ) : null}
                  <AvatarFallback
                    style={{
                      backgroundColor: (u.avatarColor || "#06b6d4") + "22",
                      fontSize: "0.8rem",
                    }}
                  >
                    {u.avatarEmoji || "🏃"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{u.name || `선수 ${u.id}`}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {selectedUserId && compareData && (
        <>
          {/* VS Header */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <Avatar className="h-14 w-14 mx-auto mb-1 border-2" style={{ borderColor: "var(--cyan)" }}>
                <AvatarFallback style={{ backgroundColor: "var(--cyan)" + "22" }}>나</AvatarFallback>
              </Avatar>
              <div className="font-bold text-sm">{me?.name || "나"}</div>
            </div>
            <div className="text-3xl font-black" style={{ color: "var(--pink)" }}>VS</div>
            <div className="text-center">
              <Avatar className="h-14 w-14 mx-auto mb-1 border-2" style={{ borderColor: "var(--pink)" }}>
                {selectedUser?.avatarImageUrl ? (
                  <AvatarImage src={selectedUser.avatarImageUrl} alt="avatar" />
                ) : null}
                <AvatarFallback
                  style={{
                    backgroundColor: (selectedUser?.avatarColor || "var(--pink)") + "22",
                    fontSize: "1.2rem",
                  }}
                >
                  {selectedUser?.avatarEmoji || "🏃"}
                </AvatarFallback>
              </Avatar>
              <div className="font-bold text-sm">{selectedUser?.name || `선수`}</div>
            </div>
          </div>

          {/* Stats Comparison Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <CompareStatCard
              icon={<MapPin className="w-4 h-4" />}
              label="총 거리"
              myVal={`${Number(compareData.user?.totalDistance || 0).toFixed(1)} km`}
              otherVal={`${Number(compareData.other?.totalDistance || 0).toFixed(1)} km`}
              myWins={Number(compareData.user?.totalDistance || 0) > Number(compareData.other?.totalDistance || 0)}
            />
            <CompareStatCard
              icon={<Timer className="w-4 h-4" />}
              label="총 시간"
              myVal={`${Math.round(Number(compareData.user?.totalDuration || 0))} 분`}
              otherVal={`${Math.round(Number(compareData.other?.totalDuration || 0))} 분`}
              myWins={Number(compareData.user?.totalDuration || 0) > Number(compareData.other?.totalDuration || 0)}
            />
            <CompareStatCard
              icon={<Trophy className="w-4 h-4" />}
              label="운동 횟수"
              myVal={`${Number(compareData.user?.workoutCount || 0)} 회`}
              otherVal={`${Number(compareData.other?.workoutCount || 0)} 회`}
              myWins={Number(compareData.user?.workoutCount || 0) > Number(compareData.other?.workoutCount || 0)}
            />
            <CompareStatCard
              icon={<Flame className="w-4 h-4" />}
              label="칼로리"
              myVal={`${Number(compareData.user?.totalCalories || 0)} kcal`}
              otherVal={`${Number(compareData.other?.totalCalories || 0)} kcal`}
              myWins={Number(compareData.user?.totalCalories || 0) > Number(compareData.other?.totalCalories || 0)}
            />
            <CompareStatCard
              icon={<Mountain className="w-4 h-4" />}
              label="고도 상승"
              myVal={`${Math.round(Number(compareData.user?.totalElevation || 0))} m`}
              otherVal={`${Math.round(Number(compareData.other?.totalElevation || 0))} m`}
              myWins={Number(compareData.user?.totalElevation || 0) > Number(compareData.other?.totalElevation || 0)}
            />
            <CompareStatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="베스트 페이스"
              myVal={compareData.user?.avgPace || "-"}
              otherVal={compareData.other?.avgPace || "-"}
              myWins={false}
              noBold
            />
          </div>

          {/* Bar Chart */}
          <div className="blueprint-card p-4">
            <div className="mono-label mb-1">COMPARISON CHART</div>
            <h3 className="font-bold mb-4">비교 차트</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Space Mono" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Bar dataKey="나" fill="oklch(0.55 0.18 210)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="상대" fill="oklch(0.72 0.14 350)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Loading */}
      {selectedUserId && comparing && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">기록을 비교하는 중...</p>
        </div>
      )}

      {/* No selection */}
      {!selectedUserId && (
        <div className="blueprint-card p-12 text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h3 className="font-bold text-lg mb-2">비교할 상대를 선택하세요</h3>
          <p className="text-muted-foreground text-sm">
            위에서 비교하고 싶은 러너를 선택하면 기록을 나란히 비교할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

function CompareStatCard({
  icon,
  label,
  myVal,
  otherVal,
  myWins,
  noBold,
}: {
  icon: React.ReactNode;
  label: string;
  myVal: string;
  otherVal: string;
  myWins: boolean;
  noBold?: boolean;
}) {
  return (
    <div className="blueprint-card p-3">
      <div className="flex items-center gap-1 mb-2 justify-center">
        {icon}
        <span className="mono-label" style={{ color: "inherit" }}>{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-center flex-1">
          <div
            className={`text-sm ${!noBold && myWins ? "font-black" : "font-medium"}`}
            style={{ color: !noBold && myWins ? "var(--cyan)" : "inherit" }}
          >
            {myVal}
          </div>
          <div className="text-[10px] text-muted-foreground">나</div>
        </div>
        <div className="text-xs text-muted-foreground font-bold">vs</div>
        <div className="text-center flex-1">
          <div
            className={`text-sm ${!noBold && !myWins ? "font-black" : "font-medium"}`}
            style={{ color: !noBold && !myWins ? "var(--pink)" : "inherit" }}
          >
            {otherVal}
          </div>
          <div className="text-[10px] text-muted-foreground">상대</div>
        </div>
      </div>
    </div>
  );
}
