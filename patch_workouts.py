import sys

with open('/home/ubuntu/marathon-trainer/client/src/pages/Workouts.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
old_imports = '''import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Plus, Upload, Watch, FileUp, HelpCircle, X } from "lucide-react";'''

new_imports = '''import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import React, { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Plus, Upload, Watch, FileUp, HelpCircle, X, List, CalendarDays, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useLocation } from "wouter";'''

if old_imports not in content:
    print("ERROR: old_imports not found")
    sys.exit(1)
content = content.replace(old_imports, new_imports)

# 2. Add parsedTrackpoints state and view mode
old_import_source = '''  const [importSource, setImportSource] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);'''

new_import_source = '''  const [importSource, setImportSource] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [parsedTrackpoints, setParsedTrackpoints] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();'''

if old_import_source not in content:
    print("ERROR: old_import_source not found")
    sys.exit(1)
content = content.replace(old_import_source, new_import_source)

# 3. Update resetForm
old_reset = '''    setImportSource(null);
  };'''

new_reset = '''    setImportSource(null);
    setParsedTrackpoints([]);
  };'''

content = content.replace(old_reset, new_reset)

# 4. Store trackpoints from parseFile result
old_setsource = '''      setImportSource(result.source);

      const srcLabel'''

new_setsource = '''      setImportSource(result.source);
      if (result.trackpoints && result.trackpoints.length > 0) {
        setParsedTrackpoints(result.trackpoints);
      }

      const srcLabel'''

content = content.replace(old_setsource, new_setsource)

# 5. Update handleSubmit to include trackpoints
old_submit = '''      isPublic,
    });
  };

  const needsDistance'''

new_submit = '''      isPublic,
      trackpoints: parsedTrackpoints.length > 0 ? parsedTrackpoints : undefined,
    });
  };

  // Calendar helpers
  const calStart = startOfMonth(calMonth);
  const calEnd = endOfMonth(calMonth);
  const calWeekStart = startOfWeek(calStart, { weekStartsOn: 1 });
  const calWeekEnd = endOfWeek(calEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calWeekStart, end: calWeekEnd });

  const workoutsByDate = useMemo(() => {
    if (!workouts) return new Map<string, typeof workouts>();
    const map = new Map<string, typeof workouts>();
    for (const w of workouts) {
      const key = format(new Date(w.workoutDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return map;
  }, [workouts]);

  const needsDistance'''

content = content.replace(old_submit, new_submit)

# 6. Add view mode toggle in header
old_header = '''      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mono-label mb-1">WORKOUT LOG</div>
          <h1 className="text-3xl font-black">운동 기록</h1>
        </div>
        <Dialog open={open}'''

new_header = '''      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono-label mb-1">WORKOUT LOG</div>
          <h1 className="text-3xl font-black">운동 기록</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <List className="w-3.5 h-3.5" />목록
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <CalendarDays className="w-3.5 h-3.5" />달력
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end mb-6">
        <Dialog open={open}'''

if old_header not in content:
    print("ERROR: old_header not found")
    sys.exit(1)
content = content.replace(old_header, new_header)

# 7. Add calendar view before workout list
old_workout_list = '''      {/* Workout list */}
      {isLoading ? ('''

new_workout_list = '''      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="blueprint-card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1 hover:bg-muted rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg">{format(calMonth, "yyyy년 M월", { locale: ko })}</h3>
            <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1 hover:bg-muted rounded">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <div key={d} className="text-center mono-label py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayWorkouts = workoutsByDate.get(key);
              const isCurrentMonth = isSameMonth(day, calMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={key}
                  className={`relative min-h-[56px] p-1 rounded-md border transition-colors ${
                    !isCurrentMonth ? "opacity-30" : ""
                  } ${isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"} ${
                    dayWorkouts ? "bg-cyan-50/50" : ""
                  }`}
                >
                  <div className={`text-xs font-bold ${isToday ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </div>
                  {dayWorkouts && dayWorkouts.map((dw) => {
                    const ti = WORKOUT_TYPES.find(t => t.value === dw.workoutType);
                    return (
                      <div
                        key={dw.id}
                        className="text-[10px] leading-tight mt-0.5 truncate cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/workouts/${dw.id}`)}
                      >
                        <span>{ti?.icon}</span>
                        {dw.distanceKm ? <span className="ml-0.5 font-bold" style={{ color: "var(--cyan)" }}>{dw.distanceKm}km</span> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Workout list */}
      {viewMode === "list" && isLoading ? ('''

content = content.replace(old_workout_list, new_workout_list)

# 8. Wrap workout list with viewMode check
old_list_start = '''      ) : workouts && workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((w) => {
            const typeInfo = WORKOUT_TYPES.find(t => t.value === w.workoutType);
            return (
              <div key={w.id} className="blueprint-card p-5">'''

new_list_start = '''      ) : viewMode === "list" && workouts && workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((w) => {
            const typeInfo = WORKOUT_TYPES.find(t => t.value === w.workoutType);
            return (
              <div key={w.id} className="blueprint-card p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/workouts/${w.id}`)}>'''

content = content.replace(old_list_start, new_list_start)

# 9. Add view detail button and update delete button
old_delete_btn = '''                  <button
                    onClick={() => deleteWorkout.mutate({ id: w.id })}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>'''

new_delete_btn = '''                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/workouts/${w.id}`); }}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      title="상세 보기"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteWorkout.mutate({ id: w.id }); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>'''

content = content.replace(old_delete_btn, new_delete_btn)

# 10. Wrap empty state with viewMode check
old_empty = '''      ) : (
        <div className="blueprint-card p-12 text-center">'''

new_empty = '''      ) : viewMode === "list" ? (
        <div className="blueprint-card p-12 text-center">'''

content = content.replace(old_empty, new_empty)

# 11. Close ternary properly
old_end = '''        </div>
      )}
    </div>
  );
}'''

new_end = '''        </div>
      ) : null}
    </div>
  );
}'''

content = content.replace(old_end, new_end)

with open('/home/ubuntu/marathon-trainer/client/src/pages/Workouts.tsx', 'w') as f:
    f.write(content)

print("Done!")
