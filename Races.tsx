import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Plus, Trophy, Calendar, Clock, MapPin } from "lucide-react";

const DISTANCES = [
  { value: 5, label: "5km" },
  { value: 10, label: "10km" },
  { value: 21.0975, label: "하프" },
  { value: 42.195, label: "풀" },
];

export default function Races() {
  const utils = trpc.useUtils();
  const { data: races, isLoading } = trpc.race.list.useQuery();
  const createRace = trpc.race.create.useMutation({
    onSuccess: () => {
      utils.race.list.invalidate();
      setOpen(false);
      toast.success("대회가 등록되었습니다! 🏁");
      resetForm();
    },
    onError: () => toast.error("저장 중 오류가 발생했습니다."),
  });
  const updateRace = trpc.race.update.useMutation({
    onSuccess: () => {
      utils.race.list.invalidate();
      toast.success("대회 정보가 수정되었습니다.");
    },
  });
  const deleteRace = trpc.race.delete.useMutation({
    onSuccess: () => {
      utils.race.list.invalidate();
      toast.success("대회가 삭제되었습니다.");
    },
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distance, setDistance] = useState(42.195);
  const [location, setLocation] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [isParticipating, setIsParticipating] = useState(true);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setName(""); setRaceDate(""); setDistance(42.195);
    setLocation(""); setTargetTime(""); setNotes("");
    setIsParticipating(true);
  };

  const handleSubmit = () => {
    if (!name) { toast.error("대회명을 입력해주세요."); return; }
    if (!raceDate) { toast.error("대회 날짜를 입력해주세요."); return; }
    createRace.mutate({ name, raceDate, distance, location: location || undefined, targetTime: targetTime || undefined, isParticipating, notes: notes || undefined });
  };

  const now = new Date();
  const upcoming = races?.filter(r => new Date(r.raceDate) >= now).sort((a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime()) || [];
  const past = races?.filter(r => new Date(r.raceDate) < now).sort((a, b) => new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime()) || [];

  const getDdayLabel = (date: Date) => {
    const diff = differenceInDays(date, now);
    if (diff === 0) return "D-DAY";
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  const getDdayColor = (date: Date) => {
    const diff = differenceInDays(date, now);
    if (diff <= 7) return "var(--pink)";
    if (diff <= 30) return "var(--cyan)";
    return "var(--foreground)";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mono-label mb-1">RACE CALENDAR</div>
          <h1 className="text-3xl font-black">대회 일정 관리</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />대회 등록</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-black">대회 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mono-label mb-2 block">대회명 *</Label>
                <Input placeholder="서울 국제 마라톤 2025" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mono-label mb-2 block">대회 날짜 *</Label>
                  <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
                </div>
                <div>
                  <Label className="mono-label mb-2 block">목표 기록</Label>
                  <Input placeholder="4:30:00" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mono-label mb-3 block">대회 거리</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DISTANCES.map((d) => (
                    <button key={d.value}
                      onClick={() => setDistance(d.value)}
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${distance === d.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mono-label mb-2 block">장소</Label>
                <Input placeholder="서울올림픽공원" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <input type="checkbox" id="participating" checked={isParticipating}
                  onChange={(e) => setIsParticipating(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="participating" className="text-sm cursor-pointer">참가 예정</label>
              </div>
              <div>
                <Label className="mono-label mb-2 block">메모</Label>
                <Textarea placeholder="대회 관련 메모..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createRace.isPending}>
                {createRace.isPending ? "등록 중..." : "대회 등록"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming races */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <div className="mono-label mb-4">예정된 대회</div>
          <div className="space-y-4">
            {upcoming.map((race) => {
              const raceDate = new Date(race.raceDate);
              const dday = getDdayLabel(raceDate);
              const ddayColor = getDdayColor(raceDate);
              const distLabel = race.distance === 42.195 ? "풀 마라톤" : race.distance === 21.0975 ? "하프 마라톤" : `${race.distance}km`;

              return (
                <div key={race.id} className="blueprint-card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🏁</span>
                        <div>
                          <div className="font-black text-lg">{race.name}</div>
                          <div className="mono-label">{distLabel}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="mono-label">날짜</div>
                            <div className="text-sm font-medium">
                              {format(raceDate, "yyyy.MM.dd", { locale: ko })}
                            </div>
                          </div>
                        </div>
                        {race.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="mono-label">장소</div>
                              <div className="text-sm font-medium">{race.location}</div>
                            </div>
                          </div>
                        )}
                        {race.targetTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="mono-label">목표 기록</div>
                              <div className="text-sm font-medium">{race.targetTime}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {race.notes && (
                        <div className="mt-3 p-2 rounded bg-muted/50 text-sm text-muted-foreground">{race.notes}</div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-3xl font-black" style={{ color: ddayColor }}>{dday}</div>
                      <button
                        onClick={() => deleteRace.mutate({ id: race.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past races */}
      {past.length > 0 && (
        <div>
          <div className="mono-label mb-4">지난 대회</div>
          <div className="space-y-3">
            {past.map((race) => {
              const raceDate = new Date(race.raceDate);
              const distLabel = race.distance === 42.195 ? "풀 마라톤" : race.distance === 21.0975 ? "하프 마라톤" : `${race.distance}km`;
              return (
                <div key={race.id} className="blueprint-card p-4 opacity-70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="font-bold">{race.name}</div>
                        <div className="mono-label">{format(raceDate, "yyyy.MM.dd")} · {distLabel}</div>
                        {race.actualTime && <div className="text-sm text-primary font-medium mt-0.5">완주: {race.actualTime}</div>}
                      </div>
                    </div>
                    <button onClick={() => deleteRace.mutate({ id: race.id })} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && (!races || races.length === 0) && (
        <div className="blueprint-card p-12 text-center">
          <div className="text-5xl mb-4">🏁</div>
          <h3 className="font-bold text-lg mb-2">등록된 대회가 없습니다</h3>
          <p className="text-muted-foreground text-sm mb-4">목표 대회를 등록하고 D-day를 확인하세요!</p>
          <Button onClick={() => setOpen(true)}>대회 등록하기</Button>
        </div>
      )}
    </div>
  );
}
