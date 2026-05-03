import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const LEVELS = [
  { value: "beginner", label: "초급", desc: "주 1-2회" },
  { value: "intermediate", label: "중급", desc: "주 3-4회" },
  { value: "advanced", label: "고급", desc: "주 5회+" },
] as const;

const DISTANCES = [
  { value: 5, label: "5km" },
  { value: 10, label: "10km" },
  { value: 21.0975, label: "하프 마라톤" },
  { value: 42.195, label: "풀 마라톤" },
];

const DAY_TYPE_COLORS: Record<string, string> = {
  "휴식": "#94a3b8",
  "러닝": "var(--cyan)",
  "크로스트레이닝": "var(--pink)",
  "장거리": "#8b5cf6",
  "인터벌": "#f59e0b",
  "템포": "#10b981",
};

type PlanDay = {
  day: string;
  type: string;
  description: string;
  distanceKm: number | null;
  durationMin: number;
};

type PlanWeek = {
  weekNumber: number;
  theme: string;
  totalKm: number;
  days: PlanDay[];
};

type PlanData = {
  title?: string;
  summary?: string;
  weeks?: PlanWeek[];
};

export default function TrainingPlan() {
  const { user } = useAuth();
  const me = user as { trainingLevel?: string; currentPace?: string; maxDistance?: number; weeklyGoalKm?: number; targetFinishTime?: string } | null;
  const utils = trpc.useUtils();

  const { data: activePlan, isLoading: planLoading } = trpc.trainingPlan.active.useQuery();
  const { data: races } = trpc.race.list.useQuery();

  const generatePlan = trpc.trainingPlan.generate.useMutation({
    onSuccess: () => {
      utils.trainingPlan.active.invalidate();
      toast.success("AI 훈련 계획이 생성되었습니다! 🤖");
      setShowForm(false);
    },
    onError: (e) => toast.error(`생성 실패: ${e.message}`),
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedRaceId, setSelectedRaceId] = useState<number | undefined>();
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [raceDistance, setRaceDistance] = useState(42.195);
  const [targetTime, setTargetTime] = useState(me?.targetFinishTime || "");
  const [trainingLevel, setTrainingLevel] = useState<"beginner" | "intermediate" | "advanced">(
    (me?.trainingLevel as "beginner" | "intermediate" | "advanced") || "beginner"
  );
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const upcomingRaces = races?.filter(r => new Date(r.raceDate) > new Date()) || [];

  const handleRaceSelect = (raceId: number) => {
    const race = races?.find(r => r.id === raceId);
    if (race) {
      setSelectedRaceId(raceId);
      setRaceName(race.name);
      setRaceDate(new Date(race.raceDate).toISOString().split("T")[0]);
      setRaceDistance(race.distance);
      setTargetTime(race.targetTime || "");
    }
  };

  const handleGenerate = () => {
    generatePlan.mutate({
      raceId: selectedRaceId,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      raceDistance,
      targetTime: targetTime || undefined,
      trainingLevel,
      currentPace: me?.currentPace || undefined,
      maxDistance: me?.maxDistance || undefined,
      weeklyGoalKm: me?.weeklyGoalKm || undefined,
      additionalInfo: additionalInfo || undefined,
    });
  };

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const planData = activePlan?.planData as PlanData | null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mono-label mb-1">AI TRAINING PLAN</div>
          <h1 className="text-3xl font-black">AI 기반 훈련 계획</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          <Sparkles className="w-4 h-4 mr-2" />
          {showForm ? "취소" : "새 계획 생성"}
        </Button>
      </div>

      {/* Generation form */}
      {showForm && (
        <div className="blueprint-card p-6 mb-8">
          <div className="mono-label mb-4">훈련 계획 생성 설정</div>

          {/* Race selection */}
          {upcomingRaces.length > 0 && (
            <div className="mb-4">
              <Label className="mono-label mb-2 block">등록된 대회에서 선택</Label>
              <div className="grid grid-cols-1 gap-2">
                {upcomingRaces.map((r) => (
                  <button key={r.id}
                    onClick={() => handleRaceSelect(r.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${selectedRaceId === r.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <div className="font-medium">{r.name}</div>
                    <div className="mono-label">{format(new Date(r.raceDate), "yyyy.MM.dd")} · {r.distance}km</div>
                  </button>
                ))}
              </div>
              <div className="text-center my-3 mono-label">또는 직접 입력</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="mono-label mb-2 block">목표 대회명</Label>
              <Input placeholder="서울 마라톤" value={raceName} onChange={(e) => setRaceName(e.target.value)} />
            </div>
            <div>
              <Label className="mono-label mb-2 block">대회 날짜</Label>
              <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <Label className="mono-label mb-2 block">대회 거리</Label>
            <div className="grid grid-cols-4 gap-2">
              {DISTANCES.map((d) => (
                <button key={d.value}
                  onClick={() => setRaceDistance(d.value)}
                  className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${raceDistance === d.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="mono-label mb-2 block">목표 완주 시간</Label>
              <Input placeholder="4:30:00" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
            </div>
            <div>
              <Label className="mono-label mb-2 block">현재 훈련 수준</Label>
              <div className="grid grid-cols-3 gap-1">
                {LEVELS.map((l) => (
                  <button key={l.value}
                    onClick={() => setTrainingLevel(l.value)}
                    className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${trainingLevel === l.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <Label className="mono-label mb-2 block">추가 요청사항 (선택)</Label>
            <Textarea placeholder="예: 주 4일 훈련 원함, 부상 이력 있음, 언덕 훈련 포함 원함..."
              value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows={3} />
          </div>

          <Button className="w-full" size="lg" onClick={handleGenerate}
            disabled={generatePlan.isPending}>
            {generatePlan.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚙️</span> AI가 계획을 생성 중입니다... (30-60초 소요)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI 훈련 계획 생성
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Active plan display */}
      {planLoading ? (
        <div className="blueprint-card p-8 text-center">
          <div className="animate-spin text-3xl mb-2">⚙️</div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      ) : activePlan && planData ? (
        <div>
          <div className="blueprint-card p-6 mb-6">
            <div className="mono-label mb-2">현재 활성 계획</div>
            <h2 className="text-2xl font-black mb-2">{planData.title}</h2>
            {planData.summary && (
              <p className="text-muted-foreground text-sm leading-relaxed">{planData.summary}</p>
            )}
            <div className="flex gap-4 mt-4">
              <div>
                <div className="mono-label">시작일</div>
                <div className="font-medium text-sm">{format(new Date(activePlan.startDate), "yyyy.MM.dd")}</div>
              </div>
              <div>
                <div className="mono-label">종료일</div>
                <div className="font-medium text-sm">{format(new Date(activePlan.endDate), "yyyy.MM.dd")}</div>
              </div>
              <div>
                <div className="mono-label">총 주수</div>
                <div className="font-medium text-sm">{planData.weeks?.length || 0}주</div>
              </div>
            </div>
          </div>

          {/* Weekly plan */}
          <div className="space-y-3">
            {planData.weeks?.map((week) => (
              <div key={week.weekNumber} className="blueprint-card overflow-hidden">
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  onClick={() => toggleWeek(week.weekNumber)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm border-2"
                      style={{ borderColor: "var(--cyan)", color: "var(--cyan)" }}>
                      W{week.weekNumber}
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{week.theme}</div>
                      <div className="mono-label">{week.totalKm} km / 주</div>
                    </div>
                  </div>
                  {expandedWeeks.has(week.weekNumber) ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {expandedWeeks.has(week.weekNumber) && (
                  <div className="border-t border-border">
                    {week.days?.map((day, di) => (
                      <div key={di}
                        className="flex items-start gap-3 p-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <div className="w-16 shrink-0">
                          <div className="font-medium text-sm">{day.day}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: (DAY_TYPE_COLORS[day.type] || "var(--muted)") + "22",
                                color: DAY_TYPE_COLORS[day.type] || "var(--muted-foreground)",
                                border: `1px solid ${DAY_TYPE_COLORS[day.type] || "var(--border)"}`,
                              }}>
                              {day.type}
                            </span>
                            {day.distanceKm && (
                              <span className="mono-label">{day.distanceKm}km</span>
                            )}
                            <span className="mono-label">{day.durationMin}분</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{day.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="blueprint-card p-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="font-bold text-lg mb-2">아직 훈련 계획이 없습니다</h3>
          <p className="text-muted-foreground text-sm mb-4">
            AI가 목표 대회, 현재 체력, 일정을 분석해 맞춤 훈련 계획을 생성합니다.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Sparkles className="w-4 h-4 mr-2" />AI 훈련 계획 생성
          </Button>
        </div>
      )}
    </div>
  );
}
