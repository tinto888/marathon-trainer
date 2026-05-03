/**
 * AvatarPicker — 두 가지 아이콘 선택 방식
 * 1. 십이지신 동물 캐릭터 선택 (AI 생성 이미지)
 * 2. 본인 사진 업로드
 */
import React, { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, User, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── 동물 캐릭터 데이터 (십이지신 12 + 귀여운 동물 6 = 총 18마리) ─────────────
export const ZODIAC_CHARACTERS = [
  // 십이지신
  { id: "rat",     name: "쥐",    emoji: "🐭", description: "윙크하는 쥐",      url: "/manus-storage/rat_e8df0264.png",     color: "#a78bfa" },
  { id: "ox",      name: "소",    emoji: "🐮", description: "졸고 있는 소",     url: "/manus-storage/ox_c169347b.png",      color: "#60a5fa" },
  { id: "tiger",   name: "호랑이", emoji: "🐯", description: "포효하는 호랑이",  url: "/manus-storage/tiger_60ceb5fb.png",   color: "#fb923c" },
  { id: "rabbit",  name: "토끼",  emoji: "🐰", description: "손 흔드는 토끼",   url: "/manus-storage/rabbit_df357727.png",  color: "#34d399" },
  { id: "dragon",  name: "용",    emoji: "🐲", description: "불 뿜는 용",       url: "/manus-storage/dragon_481cf86c.png",  color: "#4ade80" },
  { id: "snake",   name: "뱀",    emoji: "🐍", description: "혀 내미는 뱀",     url: "/manus-storage/snake_a84fb897.png",   color: "#22d3ee" },
  { id: "horse",   name: "말",    emoji: "🐴", description: "달리는 말",        url: "/manus-storage/horse_effaa172.png",   color: "#c084fc" },
  { id: "goat",    name: "양",    emoji: "🐑", description: "꽃 든 양",         url: "/manus-storage/goat_741f76eb.png",    color: "#facc15" },
  { id: "monkey",  name: "원숭이", emoji: "🐵", description: "바나나 든 원숭이", url: "/manus-storage/monkey_ab24b54e.png",  color: "#f87171" },
  { id: "rooster", name: "닭",    emoji: "🐓", description: "날개 짓하는 닭",   url: "/manus-storage/rooster_28303777.png", color: "#fbbf24" },
  { id: "dog",     name: "개",    emoji: "🐶", description: "꼬리 흔드는 개",   url: "/manus-storage/dog_1672f0c4.png",     color: "#38bdf8" },
  { id: "pig",     name: "돼지",  emoji: "🐷", description: "먹고 있는 돼지",   url: "/manus-storage/pig_67767441.png",     color: "#f472b6" },
  // 추가 귀여운 동물
  { id: "koala",   name: "코알라", emoji: "🐨", description: "유칼립투스 코알라", url: "/manus-storage/koala_f11caa15.png",   color: "#94a3b8" },
  { id: "panda",   name: "팬더",  emoji: "🐼", description: "대나무 먹는 팬더",  url: "/manus-storage/panda_9d2e47b4.png",   color: "#6b7280" },
  { id: "penguin", name: "펭귄",  emoji: "🐧", description: "스카프 두른 펭귄",  url: "/manus-storage/penguin_df976fdd.png", color: "#3b82f6" },
  { id: "fox",     name: "여우",  emoji: "🦊", description: "윙크하는 여우",    url: "/manus-storage/fox_4b9a6bf6.png",     color: "#f97316" },
  { id: "cat",     name: "고양이", emoji: "🐱", description: "도도한 고양이",    url: "/manus-storage/cat_a4f401ec.png",     color: "#a855f7" },
  { id: "bear",    name: "곰",    emoji: "🐻", description: "꿀단지 든 곰",     url: "/manus-storage/bear_b368d9d6.png",    color: "#d97706" },
];

// ── AvatarDisplay 컴포넌트 (공통 아바타 렌더링) ──────────────────────────────
interface AvatarDisplayProps {
  avatarImageUrl?: string | null;
  avatarCharacterId?: string | null;
  avatarEmoji?: string;
  avatarColor?: string;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarDisplay({
  avatarImageUrl,
  avatarCharacterId,
  avatarEmoji = "🏃",
  avatarColor = "#06b6d4",
  name,
  size = "md",
  className,
}: AvatarDisplayProps) {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-base",
    md: "w-10 h-10 text-lg",
    lg: "w-16 h-16 text-3xl",
    xl: "w-24 h-24 text-5xl",
  };

  // 사진 업로드 우선
  if (avatarImageUrl) {
    return (
      <Avatar className={cn(sizeClasses[size], "ring-2 ring-offset-1", className)} style={{ borderColor: avatarColor } as React.CSSProperties}>
        <AvatarImage src={avatarImageUrl} alt={name || "avatar"} className="object-cover" />
        <AvatarFallback style={{ backgroundColor: `${avatarColor}22` }}>
          <span>{avatarEmoji}</span>
        </AvatarFallback>
      </Avatar>
    );
  }

  // 십이지신 캐릭터 선택
  if (avatarCharacterId) {
    const zodiac = ZODIAC_CHARACTERS.find((z) => z.id === avatarCharacterId);
    if (zodiac) {
      return (
        <Avatar
          className={cn(sizeClasses[size], "ring-2 ring-offset-1", className)}
          style={{ borderColor: zodiac.color } as React.CSSProperties}
        >
          <AvatarImage src={zodiac.url} alt={zodiac.name} className="object-cover" />
          <AvatarFallback style={{ backgroundColor: `${zodiac.color}22` }}>
            <span>{zodiac.emoji}</span>
          </AvatarFallback>
        </Avatar>
      );
    }
  }

  // 기본 이니셜/이모지 아바타
  const initials = name ? name.slice(0, 2).toUpperCase() : avatarEmoji;
  return (
    <Avatar className={cn(sizeClasses[size], "ring-2 ring-offset-1", className)} style={{ borderColor: avatarColor } as React.CSSProperties}>
      <AvatarFallback
        className="text-center flex items-center justify-center"
        style={{ backgroundColor: `${avatarColor}22`, borderColor: avatarColor }}
      >
        <span>{initials}</span>
      </AvatarFallback>
    </Avatar>
  );
}

// ── AvatarPicker 컴포넌트 ────────────────────────────────────────────────────
interface AvatarPickerProps {
  currentImageUrl?: string | null;
  currentCharacterId?: string | null;
  currentEmoji?: string;
  currentColor?: string;
  userName?: string | null;
  onImageChange?: (url: string) => void;
  onCharacterChange?: (id: string) => void;
  onEmojiChange?: (emoji: string) => void;
  onColorChange?: (color: string) => void;
  onNicknameChange?: (nickname: string) => void;
  currentNickname?: string;
}

export function AvatarPicker({
  currentImageUrl,
  currentCharacterId,
  currentEmoji = "🏃",
  currentColor = "#06b6d4",
  userName,
  onImageChange,
  onCharacterChange,
  onEmojiChange,
  onNicknameChange,
  currentNickname = "",
}: AvatarPickerProps) {
  const [tab, setTab] = useState<"character" | "upload">("character");
  const [selectedCharId, setSelectedCharId] = useState<string | null>(currentCharacterId || null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [nickname, setNickname] = useState(currentNickname);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.avatar.upload.useMutation({
    onSuccess: (data) => {
      setPreviewUrl(data.url);
      onImageChange?.(data.url);
      toast.success("프로필 사진이 업로드되었습니다!");
    },
    onError: () => {
      toast.error("업로드에 실패했습니다. 다시 시도해주세요.");
    },
    onSettled: () => setUploading(false),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewUrl(dataUrl);
      uploadMutation.mutate({ dataUrl, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleCharacterSelect = (char: typeof ZODIAC_CHARACTERS[0]) => {
    setSelectedCharId(char.id);
    setPreviewUrl(null); // 사진 초기화
    onCharacterChange?.(char.id);
    onEmojiChange?.(char.emoji);
  };

  // 현재 표시할 아바타 결정
  const displayImageUrl = tab === "upload" ? previewUrl : null;
  const displayCharId = tab === "character" ? selectedCharId : null;

  return (
    <div className="space-y-4">
      {/* Current Avatar Preview */}
      <div className="flex justify-center">
        <div className="relative">
          <AvatarDisplay
            avatarImageUrl={displayImageUrl ?? (tab === "upload" ? previewUrl : null)}
            avatarCharacterId={displayCharId}
            avatarEmoji={currentEmoji}
            avatarColor={
              selectedCharId
                ? ZODIAC_CHARACTERS.find((z) => z.id === selectedCharId)?.color ?? currentColor
                : currentColor
            }
            name={userName}
            size="xl"
          />
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => setTab("character")}
          className={cn(
            "flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
            tab === "character"
              ? "bg-[var(--cyan)] text-white"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          캐릭터 고르기
        </button>
        <button
          onClick={() => setTab("upload")}
          className={cn(
            "flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
            tab === "upload"
              ? "bg-[var(--cyan)] text-white"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          내 사진 업로드
        </button>
      </div>

      {/* Character Selection Tab */}
      {tab === "character" && (
        <div className="space-y-3">
          <div className="grid grid-cols-6 gap-1.5">
            {ZODIAC_CHARACTERS.map((char) => (
              <button
                key={char.id}
                type="button"
                onClick={() => handleCharacterSelect(char)}
                className={cn(
                  "relative flex items-center justify-center p-1.5 rounded-xl border-2 transition-all hover:scale-105",
                  selectedCharId === char.id
                    ? "ring-2 ring-offset-1 shadow-md scale-105"
                    : "border-transparent bg-gray-50 hover:border-gray-200"
                )}
                style={
                  selectedCharId === char.id
                    ? { borderColor: char.color, backgroundColor: `${char.color}18` }
                    : {}
                }
                title={`${char.name} — ${char.description}`}
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden"
                  style={{ backgroundColor: `${char.color}20` }}
                >
                  <img src={char.url} alt={char.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                {selectedCharId === char.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: char.color }}>✓</div>
                )}
              </button>
            ))}
          </div>
          {/* 닉네임 입력 */}
          {selectedCharId && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  onNicknameChange?.(e.target.value);
                }}
                placeholder="사용할 닉네임을 입력하세요"
                maxLength={20}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[var(--cyan)] focus:border-transparent placeholder:text-muted-foreground/50"
              />
              <p className="text-[10px] text-muted-foreground">다른 사용자에게 보여질 이름입니다 (1~20자)</p>
            </div>
          )}
        </div>
      )}

      {/* Photo Upload Tab */}
      {tab === "upload" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground mono-label">
            본인 사진을 업로드하세요 (최대 5MB, JPG/PNG)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed border-[var(--cyan)] text-[var(--cyan)] hover:bg-[var(--cyan)]/10"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin mr-2" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                사진 선택하기
              </>
            )}
          </Button>
          {previewUrl && (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="preview"
                className="w-24 h-24 rounded-full object-cover ring-2 ring-[var(--cyan)]"
              />
            </div>
          )}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              얼굴이 잘 보이는 정면 사진을 사용하면 다른 선수들이 쉽게 알아볼 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
