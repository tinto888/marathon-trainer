import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AvatarPicker, AvatarDisplay } from "@/components/AvatarPicker";

const LEVELS = [
  { value: "beginner", label: "초급", desc: "주 1-2회" },
  { value: "intermediate", label: "중급", desc: "주 3-4회" },
  { value: "advanced", label: "고급", desc: "주 5회+" },
] as const;

export default function Profile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("프로필이 저장되었습니다.");
    },
    onError: () => toast.error("저장 중 오류가 발생했습니다."),
  });

  const meTyped = me as {
    avatarEmoji?: string; avatarColor?: string; avatarImageUrl?: string;
    avatarCharacterId?: string; name?: string;
    height?: number; weight?: number; currentPace?: string;
    maxDistance?: number; trainingLevel?: string;
    targetFinishTime?: string; weeklyGoalKm?: number;
  } | null;

  const [emoji, setEmoji] = useState("🏃");
  const [color, setColor] = useState("#06b6d4");
  const [avatarImageUrl, setAvatarImageUrl] = useState("");
  const [avatarCharacterId, setAvatarCharacterId] = useState("");
  const [nickname, setNickname] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [currentPace, setCurrentPace] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [trainingLevel, setTrainingLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [targetFinishTime, setTargetFinishTime] = useState("");
  const [weeklyGoalKm, setWeeklyGoalKm] = useState("");

  useEffect(() => {
    if (meTyped) {
      setEmoji(meTyped.avatarEmoji || "🏃");
      setColor(meTyped.avatarColor || "#06b6d4");
      setAvatarImageUrl(meTyped.avatarImageUrl || "");
      setAvatarCharacterId(meTyped.avatarCharacterId || "");
      setNickname(meTyped.name || "");
      setHeight(meTyped.height?.toString() || "");
      setWeight(meTyped.weight?.toString() || "");
      setCurrentPace(meTyped.currentPace || "");
      setMaxDistance(meTyped.maxDistance?.toString() || "");
      setTrainingLevel((meTyped.trainingLevel as "beginner" | "intermediate" | "advanced") || "beginner");
      setTargetFinishTime(meTyped.targetFinishTime || "");
      setWeeklyGoalKm(meTyped.weeklyGoalKm?.toString() || "");
    }
  }, [me]);

  const handleSave = () => {
    updateProfile.mutate({
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
      targetFinishTime: targetFinishTime || undefined,
      weeklyGoalKm: weeklyGoalKm ? parseFloat(weeklyGoalKm) : undefined,
    });
  };

  // BMI calculation
  const bmi = height && weight
    ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mono-label mb-1">PROFILE SETTINGS</div>
      <h1 className="text-3xl font-black mb-8">내 프로필</h1>

      {/* Avatar preview */}
      <div className="blueprint-card p-6 mb-6">
        <div className="mono-label mb-4">아이디 아이콘</div>
        <div className="flex items-center gap-6 mb-6">
          <AvatarDisplay
            avatarImageUrl={avatarImageUrl}
            avatarEmoji={emoji}
            avatarColor={color}
            size="xl"
          />
          <div>
            <div className="font-bold text-lg">{user?.name || "선수"}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            {bmi && <div className="mono-label mt-1">BMI: {bmi}</div>}
          </div>
        </div>

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
      </div>

      {/* Body info */}
      <div className="blueprint-card p-6 mb-6">
        <div className="mono-label mb-4">신체 정보</div>
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
        {bmi && (
          <div className="p-3 rounded-lg bg-muted/50 mb-4">
            <div className="mono-label">BMI 지수</div>
            <div className="font-bold text-xl mt-1">{bmi}</div>
            <div className="text-xs text-muted-foreground">
              {parseFloat(bmi) < 18.5 ? "저체중" : parseFloat(bmi) < 23 ? "정상" : parseFloat(bmi) < 25 ? "과체중" : "비만"}
            </div>
          </div>
        )}
      </div>

      {/* Running info */}
      <div className="blueprint-card p-6 mb-6">
        <div className="mono-label mb-4">러닝 정보</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="mono-label mb-2 block">목표 페이스 (mm:ss/km)</Label>
            <Input placeholder="5:30" value={currentPace} onChange={(e) => setCurrentPace(e.target.value)} />
          </div>
          <div>
            <Label className="mono-label mb-2 block">최대 러닝 거리 (km)</Label>
            <Input type="number" placeholder="10" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mono-label mb-2 block">목표 완주 시간</Label>
            <Input placeholder="4:30:00" value={targetFinishTime} onChange={(e) => setTargetFinishTime(e.target.value)} />
          </div>
          <div>
            <Label className="mono-label mb-2 block">주간 목표 거리 (km)</Label>
            <Input type="number" placeholder="30" value={weeklyGoalKm} onChange={(e) => setWeeklyGoalKm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Training level */}
      <div className="blueprint-card p-6 mb-6">
        <div className="mono-label mb-4">현재 훈련 수준</div>
        <div className="grid grid-cols-3 gap-3">
          {LEVELS.map((l) => (
            <button key={l.value}
              onClick={() => setTrainingLevel(l.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${trainingLevel === l.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
              <div className="font-bold">{l.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={handleSave} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "저장 중..." : "프로필 저장"}
      </Button>
    </div>
  );
}
