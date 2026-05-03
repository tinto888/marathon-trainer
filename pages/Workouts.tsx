import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Plus, Upload, Watch, FileUp, HelpCircle, X } from "lucide-react";

const WORKOUT_TYPES = [
  { value: "running", label: "러닝", icon: "🏃" },
  { value: "cycling", label: "사이클", icon: "🚴" },
  { value: "swimming", label: "수영", icon: "🏊" },
  { value: "strength", label: "근력 운동", icon: "💪" },
  { value: "yoga", label: "요가", icon: "🧘" },
  { value: "walking", label: "걷기", icon: "🚶" },
  { value: "other", label: "기타", icon: "🏋️" },
] as const;

type WorkoutType = (typeof WORKOUT_TYPES)[number]["value"];

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  garmin: { label: "Garmin", color: "#007CC3" },
  coros: { label: "COROS", color: "#FF6B00" },
  galaxy_watch: { label: "Galaxy Watch", color: "#1428A0" },
  apple_watch: { label: "Apple Watch", color: "#FF2D55" },
  strava: { label: "Strava", color: "#FC4C02" },
  unknown: { label: "워치 데이터", color: "#6B7280" },
};

export default function Workouts() {
  const utils = trpc.useUtils();
  const { data: workouts, isLoading } = trpc.workout.list.useQuery({ limit: 50 });
  const createWorkout = trpc.workout.create.useMutation({
    onSuccess: () => {
      utils.workout.list.invalidate();
      utils.workout.inRange.invalidate();
      setOpen(false);
      toast.success("운동이 기록되었습니다! 💪");
      resetForm();
    },
    onError: () => toast.error("저장 중 오류가 발생했습니다."),
  });
  const deleteWorkout = trpc.workout.delete.useMutation({
    onSuccess: () => {
      utils.workout.list.invalidate();
      toast.success("기록이 삭제되었습니다.");
    },
  });
  const parseFile = trpc.workout.parseFile.useMutation({
    onError: (err) => toast.error(`파일 파싱 실패: ${err.message}`),
  });

  const [open, setOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState<WorkoutType>("running");
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split("T")[0]);
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [avgPace, setAvgPace] = useState("");
  const [avgHeartRate, setAvgHeartRate] = useState("");
  const [calories, setCalories] = useState("");
  const [elevationGain, setElevationGain] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [importSource, setImportSource] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setWorkoutType("running");
    setWorkoutDate(new Date().toISOString().split("T")[0]);
    setDistanceKm(""); setDurationMin(""); setAvgPace("");
    setAvgHeartRate(""); setCalories(""); setElevationGain(""); setNotes("");
    setImportSource(null);
  };

  const handleDurationChange = (val: string) => {
    setDurationMin(val);
    if (distanceKm && val && workoutType === "running") {
      const paceMin = parseFloat(val) / parseFloat(distanceKm);
      const min = Math.floor(paceMin);
      const sec = Math.round((paceMin - min) * 60);
      setAvgPace(`${min}:${sec.toString().padStart(2, "0")}`);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["fit", "gpx", "tcx"].includes(ext || "")) {
      toast.error("지원하지 않는 파일 형식입니다. .fit, .gpx, .tcx 파일만 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기가 10MB를 초과합니다.");
      return;
    }

    toast.info("워치 데이터를 분석 중입니다...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const result = await parseFile.mutateAsync({
        fileBase64: base64,
        filename: file.name,
      });

      const typeMap: Record<string, WorkoutType> = {
        running: "running", cycling: "cycling", swimming: "swimming",
        walking: "walking", strength: "strength", yoga: "yoga",
      };
      setWorkoutType(typeMap[result.type] || "other");
      if (result.startTime) setWorkoutDate(result.startTime.split("T")[0]);
      if (result.distanceKm) setDistanceKm(result.distanceKm.toString());
      if (result.durationMinutes) setDurationMin(Math.round(result.durationMinutes).toString());
      if (result.paceMinPerKm) setAvgPace(result.paceMinPerKm);
      if (result.avgHeartRate) setAvgHeartRate(result.avgHeartRate.toString());
      if (result.calories) setCalories(result.calories.toString());
      if (result.elevationGain) setElevationGain(result.elevationGain.toString());
      setImportSource(result.source);

      const srcLabel = SOURCE_LABELS[result.source]?.label || "워치";
      toast.success(`${srcLabel} 데이터를 성공적으로 불러왔습니다!`);
    } catch {
      // error handled by mutation onError
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!durationMin) { toast.error("운동 시간을 입력해주세요."); return; }
    createWorkout.mutate({
      workoutType,
      workoutDate: new Date(workoutDate).toISOString(),
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      durationMin: parseFloat(durationMin),
      avgPace: avgPace || undefined,
      avgHeartRate: avgHeartRate ? parseInt(avgHeartRate) : undefined,
      calories: calories ? parseInt(calories) : undefined,
      elevationGain: elevationGain ? parseFloat(elevationGain) : undefined,
      notes: notes || undefined,
      isPublic,
    });
  };

  const needsDistance = ["running", "cycling", "swimming", "walking"].includes(workoutType);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mono-label mb-1">WORKOUT LOG</div>
          <h1 className="text-3xl font-black">운동 기록</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />운동 기록 입력</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-black">운동 기록 입력</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">

              {/* ── Watch Data Import ── */}
              <div className="relative rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fit,.gpx,.tcx"
                  onChange={handleFileImport}
                  className="hidden"
                  id="watch-file-input"
                />
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Watch className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-0.5">워치 데이터 불러오기</div>
                    <div className="text-xs text-muted-foreground">
                      Garmin · COROS · Galaxy Watch · Apple Watch
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={parseFile.isPending}
                    >
                      {parseFile.isPending ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          분석 중
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <FileUp className="w-4 h-4" />
                          파일 선택
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHelp(true)}
                      className="px-2 text-muted-foreground hover:text-primary"
                      title="도움말"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {["FIT", "GPX", "TCX"].map((fmt) => (
                    <span key={fmt} className="px-2 py-0.5 rounded-full bg-background text-[10px] font-mono font-bold border">
                      .{fmt.toLowerCase()}
                    </span>
                  ))}
                  <span className="text-[10px] text-muted-foreground self-center ml-1">최대 10MB</span>
                </div>

                {/* ── Watch Help Modal ── */}
                {showHelp && (
                  <div className="mt-3 p-4 rounded-xl bg-background border-2 border-primary/20 space-y-4 relative">
                    <button
                      onClick={() => setShowHelp(false)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h4 className="font-black text-sm">시계별 데이터 내보내기 방법</h4>

                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border bg-[#007CC3]/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full bg-[#007CC3]" />
                          <span className="font-bold text-xs" style={{color:'#007CC3'}}>Garmin</span>
                        </div>
                        <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                          <li>Garmin Connect 앱 또는 웹사이트 접속</li>
                          <li>활동 → 원하는 활동 선택</li>
                          <li>우측 상단 ⚙️ → "원본 내보내기" 클릭</li>
                          <li>.FIT 파일이 다운로드됩니다</li>
                        </ol>
                      </div>

                      <div className="p-3 rounded-lg border bg-[#FF6B00]/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full bg-[#FF6B00]" />
                          <span className="font-bold text-xs" style={{color:'#FF6B00'}}>COROS</span>
                        </div>
                        <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                          <li>COROS 앱 → 운동 기록 탭</li>
                          <li>원하는 활동 선택 → 우측 상단 "..."</li>
                          <li>"FIT 파일 내보내기" 또는 "GPX 내보내기" 선택</li>
                          <li>파일을 저장 후 여기에 업로드</li>
                        </ol>
                      </div>

                      <div className="p-3 rounded-lg border bg-[#1428A0]/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full bg-[#1428A0]" />
                          <span className="font-bold text-xs" style={{color:'#1428A0'}}>Galaxy Watch</span>
                        </div>
                        <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                          <li>Samsung Health 앱 → 운동 기록</li>
                          <li>원하는 활동 선택 → 우측 상단 "⋮"</li>
                          <li>"GPX 파일 내보내기" 선택</li>
                          <li>또는 삼성 헬스 웹(health.samsung.com)에서 다운로드</li>
                        </ol>
                      </div>

                      <div className="p-3 rounded-lg border bg-[#FF2D55]/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full bg-[#FF2D55]" />
                          <span className="font-bold text-xs" style={{color:'#FF2D55'}}>Apple Watch</span>
                        </div>
                        <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                          <li>iPhone 건강 앱 → 프로필 → "건강 데이터 내보내기"</li>
                          <li>또는 RunGap, HealthFit 등 서드파티 앱 사용</li>
                          <li>GPX 또는 TCX 형식으로 내보내기</li>
                          <li>내보낸 파일을 여기에 업로드</li>
                        </ol>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      💡 <strong>팁:</strong> .FIT 파일이 가장 정확한 데이터를 제공합니다. GPX는 GPS 경로 위주, TCX는 심박수 포함 데이터입니다.
                    </div>
                  </div>
                )}

                {importSource && (
                  <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-background border">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SOURCE_LABELS[importSource]?.color || "#6B7280" }}
                    />
                    <span className="text-xs font-bold" style={{ color: SOURCE_LABELS[importSource]?.color }}>
                      {SOURCE_LABELS[importSource]?.label}
                    </span>
                    <span className="text-xs text-muted-foreground">데이터가 자동 입력되었습니다</span>
                  </div>
                )}
              </div>

              {/* Workout type */}
              <div>
                <Label className="mono-label mb-2 block">운동 종류</Label>
                <div className="grid grid-cols-4 gap-2">
                  {WORKOUT_TYPES.map((t) => (
                    <button key={t.value}
                      onClick={() => setWorkoutType(t.value)}
                      className={`p-2 rounded-lg border-2 text-center transition-all ${workoutType === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                      <div className="text-xl">{t.icon}</div>
                      <div className="text-xs mt-1 font-medium">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <Label className="mono-label mb-2 block">날짜</Label>
                <Input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} />
              </div>

              {/* Distance & Duration */}
              <div className="grid grid-cols-2 gap-3">
                {needsDistance && (
                  <div>
                    <Label className="mono-label mb-2 block">거리 (km)</Label>
                    <Input type="number" step="0.01" placeholder="10.0" value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)} />
                  </div>
                )}
                <div className={needsDistance ? "" : "col-span-2"}>
                  <Label className="mono-label mb-2 block">시간 (분)</Label>
                  <Input type="number" placeholder="60" value={durationMin}
                    onChange={(e) => handleDurationChange(e.target.value)} />
                </div>
              </div>

              {/* Pace (running only) */}
              {workoutType === "running" && (
                <div>
                  <Label className="mono-label mb-2 block">페이스 (mm:ss/km)</Label>
                  <Input placeholder="5:30" value={avgPace} onChange={(e) => setAvgPace(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">거리와 시간 입력 시 자동 계산됩니다</p>
                </div>
              )}

              {/* HR & Calories */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mono-label mb-2 block">평균 심박수 (bpm)</Label>
                  <Input type="number" placeholder="150" value={avgHeartRate}
                    onChange={(e) => setAvgHeartRate(e.target.value)} />
                </div>
                <div>
                  <Label className="mono-label mb-2 block">칼로리 (kcal)</Label>
                  <Input type="number" placeholder="500" value={calories}
                    onChange={(e) => setCalories(e.target.value)} />
                </div>
              </div>

              {/* Elevation */}
              {["running", "cycling", "walking"].includes(workoutType) && (
                <div>
                  <Label className="mono-label mb-2 block">고도 상승 (m)</Label>
                  <Input type="number" placeholder="100" value={elevationGain}
                    onChange={(e) => setElevationGain(e.target.value)} />
                </div>
              )}

              {/* Notes */}
              <div>
                <Label className="mono-label mb-2 block">메모</Label>
                <Textarea placeholder="오늘 훈련 메모..." value={notes}
                  onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              {/* Public toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <input type="checkbox" id="isPublic" checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-primary" />
                <label htmlFor="isPublic" className="text-sm cursor-pointer">
                  소셜 피드에 공개 (다른 사용자가 볼 수 있음)
                </label>
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={createWorkout.isPending}>
                {createWorkout.isPending ? "저장 중..." : "기록 저장"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workout list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="blueprint-card p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : workouts && workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((w) => {
            const typeInfo = WORKOUT_TYPES.find(t => t.value === w.workoutType);
            return (
              <div key={w.id} className="blueprint-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{typeInfo?.icon}</div>
                    <div>
                      <div className="font-bold">{typeInfo?.label}</div>
                      <div className="mono-label">
                        {format(new Date(w.workoutDate), "yyyy년 M월 d일 EEEE", { locale: ko })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWorkout.mutate({ id: w.id })}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  {w.distanceKm && (
                    <div>
                      <div className="mono-label">거리</div>
                      <div className="font-bold text-lg" style={{ color: "var(--cyan)" }}>{w.distanceKm} km</div>
                    </div>
                  )}
                  <div>
                    <div className="mono-label">시간</div>
                    <div className="font-bold text-lg">{w.durationMin} 분</div>
                  </div>
                  {w.avgPace && (
                    <div>
                      <div className="mono-label">페이스</div>
                      <div className="font-bold text-lg">{w.avgPace} /km</div>
                    </div>
                  )}
                  {w.avgHeartRate && (
                    <div>
                      <div className="mono-label">심박수</div>
                      <div className="font-bold text-lg">{w.avgHeartRate} bpm</div>
                    </div>
                  )}
                  {w.calories && (
                    <div>
                      <div className="mono-label">칼로리</div>
                      <div className="font-bold text-lg">{w.calories} kcal</div>
                    </div>
                  )}
                </div>

                {w.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    {w.notes}
                  </div>
                )}

                {!w.isPublic && (
                  <div className="mt-2 mono-label text-muted-foreground/50">🔒 비공개</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="blueprint-card p-12 text-center">
          <div className="text-5xl mb-4">🏃</div>
          <h3 className="font-bold text-lg mb-2">아직 운동 기록이 없습니다</h3>
          <p className="text-muted-foreground text-sm mb-4">첫 번째 운동을 기록해보세요!</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setOpen(true)}>운동 기록 입력</Button>
            <Button variant="outline" onClick={() => { setOpen(true); setTimeout(() => fileInputRef.current?.click(), 300); }}>
              <Upload className="w-4 h-4 mr-2" />워치 데이터 불러오기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
