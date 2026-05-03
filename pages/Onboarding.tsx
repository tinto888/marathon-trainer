import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import React, { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";

// 풀코스 페이스 가이드: 서브5(5:00:00) ~ 2:30:00까지 15분 단위
const PACE_GUIDE = [
  { finish: "5:00:00", label: "서브 5", pace: "7:06" },
  { finish: "4:45:00", label: "4시간 45분", pace: "6:45" },
  { finish: "4:30:00", label: "4시간 30분", pace: "6:24" },
  { finish: "4:15:00", label: "4시간 15분", pace: "6:02" },
  { finish: "4:00:00", label: "서브 4", pace: "5:41" },
  { finish: "3:45:00", label: "3시간 45분", pace: "5:20" },
  { finish: "3:30:00", label: "서브 3:30", pace: "4:58" },
  { finish: "3:15:00", label: "3시간 15분", pace: "4:37" },
  { finish: "3:00:00", label: "서브 3", pace: "4:16" },
  { finish: "2:45:00", label: "2시간 45분", pace: "3:54" },
  { finish: "2:30:00", label: "서브 2:30", pace: "3:33" },
];

const LEVELS = [
  { value: "beginner", label: "초급", desc: "주 1-2회, 5km 이하" },
  { value: "intermediate", label: "중급", desc: "주 3-4회, 10-21km" },
  { value: "advanced", label: "고급", desc: "주 5회 이상, 하프/풀 경험" },
] as const;

const DISTANCES = [
  { value: 5, label: "5km" },
  { value: 10, label: "10km" },
  { value: 21.0975, label: "하프 마라톤" },
  { value: 42.195, label: "풀 마라톤" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  // Step 1: Avatar
  const [emoji, setEmoji] = useState("🏃");
  const [color, setColor] = useState("#06b6d4");
  const [avatarImageUrl, setAvatarImageUrl] = useState("");
  const [avatarCharacterId, setAvatarCharacterId] = useState("");
  const [nickname, setNickname] = useState("");

  // Step 2: Body info
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [currentPace, setCurrentPace] = useState("");
  const [maxDistance, setMaxDistance] = useState("");

  // Step 3: Race goal
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [raceDistance, setRaceDistance] = useState(42.195);
  const [targetTime, setTargetTime] = useState("");
  const [trainingLevel, setTrainingLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [weeklyGoalKm, setWeeklyGoalKm] = useState("30");

  const updateProfile = trpc.profile.update.useMutation();
  const createRace = trpc.race.create.useMutation();

  const handleFinish = async () => {
    try {
      // Create race if provided
      let raceId: number | undefined;
      if (raceName && raceDate) {
        await createRace.mutateAsync({
          name: raceName,
          raceDate,
          distance: raceDistance,
          targetTime: targetTime || undefined,
          isParticipating: true,
        });
      }

      await updateProfile.mutateAsync({
        avatarEmoji: emoji,
        avatarColor: color,
        avatarImageUrl: avatarImageUrl || undefined,
        avatarCharacterId: avatarCharacterId || undefined,
        name: nickname || undefined,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        currentPace: currentPace || undefined,
        maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
        trainingLevel,
        targetFinishTime: targetTime || undefined,
        weeklyGoalKm: weeklyGoalKm ? parseFloat(weeklyGoalKm) : undefined,
        onboardingCompleted: true,
      });

      toast.success("설정 완료! 훈련을 시작해봅시다 🏃");
      setLocation("/dashboard");
    } catch (e) {
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center p-4">
      {/* Geometric decorations */}
      <div className="fixed top-10 right-10 w-48 h-48 rounded-full border-2 opacity-10" style={{ borderColor: "var(--cyan)" }} />
      <div className="fixed bottom-20 left-10 w-32 h-32 rounded-full border opacity-10" style={{ borderColor: "var(--pink)" }} />
      <div className="fixed top-1/4 left-8 mono-label opacity-15 text-xs">pace = 60/speed</div>
      <div className="fixed bottom-1/4 right-8 mono-label opacity-15 text-xs">HR_max = 220 - age</div>

      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: i < step ? "var(--cyan)" : "var(--border)" }} />
          ))}
        </div>

        <div className="blueprint-card p-8">
          {/* Step 1: Avatar */}
          {step === 1 && (
            <div>
              <div className="mono-label mb-2">STEP 01 / 03</div>
              <h2 className="text-2xl font-black mb-1">아이디 아이콘 설정</h2>
              <p className="text-muted-foreground text-sm mb-6">
                캐릭터를 고르고 닉네임을 설정하세요.
              </p>

              <AvatarPicker
                currentImageUrl={avatarImageUrl}
                currentCharacterId={avatarCharacterId}
                currentEmoji={emoji}
                currentColor={color}
                currentNickname={nickname}
                onImageChange={setAvatarImageUrl}
                onCharacterChange={setAvatarCharacterId}
                onEmojiChange={setEmoji}
                onColorChange={setColor}
                onNicknameChange={setNickname}
              />

              <Button className="w-full mt-6" onClick={() => setStep(2)}>다음 →</Button>
            </div>
          )}

          {/* Step 2: Body info */}
          {step === 2 && (
            <div>
              <div className="mono-label mb-2">STEP 02 / 03</div>
              <h2 className="text-2xl font-black mb-1">신체 정보 입력</h2>
              <p className="text-muted-foreground text-sm mb-8">AI 코치가 최적의 계획을 세우는 데 활용됩니다.</p>

              {/* 닉네임 / 이름 */}
              <div className="mb-4">
                <Label className="mono-label mb-2 block">닉네임 / 이름</Label>
                <Input
                  placeholder="예: 러닝맨 홍길동"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-1">다른 사용자에게 보여질 이름입니다</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="mono-label mb-2 block">키 (cm)</Label>
                  <Input type="number" placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                <div>
                  <Label className="mono-label mb-2 block">몸무게 (kg)</Label>
                  <Input type="number" placeholder="65" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Label className="mono-label">목표 페이스 (mm:ss/km)</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border border-[var(--cyan)] text-[var(--cyan)] hover:bg-[var(--cyan)]/10 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                        풀코스 페이스 확인하기
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-black">풀코스(42.195km) 페이스 가이드</DialogTitle>
                      </DialogHeader>
                      <div className="mt-2">
                        <div className="grid grid-cols-3 gap-0 text-xs font-mono">
                          <div className="px-3 py-2 bg-[var(--cyan)] text-white font-bold rounded-tl-lg">완주 목표</div>
                          <div className="px-3 py-2 bg-[var(--cyan)] text-white font-bold">페이스/km</div>
                          <div className="px-3 py-2 bg-[var(--cyan)] text-white font-bold rounded-tr-lg">완주 시간</div>
                          {PACE_GUIDE.map((row, i) => (
                            <React.Fragment key={i}>
                              <div key={`l-${i}`} className={`px-3 py-2 font-semibold ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} ${i === PACE_GUIDE.length - 1 ? "rounded-bl-lg" : ""}`}>
                                {row.label}
                              </div>
                              <div key={`p-${i}`} className={`px-3 py-2 text-[var(--cyan)] font-bold ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                                {row.pace}
                              </div>
                              <div key={`f-${i}`} className={`px-3 py-2 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} ${i === PACE_GUIDE.length - 1 ? "rounded-br-lg" : ""}`}>
                                {row.finish}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 text-center">
                          * 풀 마라톤(42.195km) 기준 균일 페이스 계산
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input placeholder="예: 5:30" value={currentPace} onChange={(e) => setCurrentPace(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">1km를 달리는 데 걸리는 시간 (분:초)</p>
              </div>

              <div className="mb-8">
                <Label className="mono-label mb-2 block">최대 뛰어본 거리 (km)</Label>
                <Input type="number" placeholder="10" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← 이전</Button>
                <Button onClick={() => setStep(3)} className="flex-1">다음 →</Button>
              </div>
            </div>
          )}

          {/* Step 3: Race goal */}
          {step === 3 && (
            <div>
              <div className="mono-label mb-2">STEP 03 / 03</div>
              <h2 className="text-2xl font-black mb-1">목표 대회 & 훈련 수준</h2>
              <p className="text-muted-foreground text-sm mb-8">목표를 설정하면 AI가 맞춤 훈련 계획을 생성합니다.</p>

              <div className="mb-4">
                <Label className="mono-label mb-2 block">목표 대회명</Label>
                <Input placeholder="예: 서울 국제 마라톤 2025" value={raceName} onChange={(e) => setRaceName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="mono-label mb-2 block">대회 날짜</Label>
                  <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
                </div>
                <div>
                  <Label className="mono-label mb-2 block">목표 완주 시간</Label>
                  <Input placeholder="예: 4:30:00" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
                </div>
              </div>

              <div className="mb-4">
                <Label className="mono-label mb-3 block">대회 거리</Label>
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

              <div className="mb-4">
                <Label className="mono-label mb-3 block">현재 훈련 수준</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button key={l.value}
                      onClick={() => setTrainingLevel(l.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${trainingLevel === l.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                      <div className="font-semibold text-sm">{l.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <Label className="mono-label mb-2 block">주간 목표 거리 (km)</Label>
                <Input type="number" placeholder="30" value={weeklyGoalKm} onChange={(e) => setWeeklyGoalKm(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← 이전</Button>
                <Button onClick={handleFinish} className="flex-1" disabled={updateProfile.isPending || createRace.isPending}>
                  {updateProfile.isPending ? "저장 중..." : "훈련 시작! 🏃"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
