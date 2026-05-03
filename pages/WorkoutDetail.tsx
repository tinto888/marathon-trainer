import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Heart, Mountain, Timer, Flame, TrendingUp, MapPin } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { MapView } from "@/components/Map";
import { useRef, useCallback, useMemo } from "react";

const WORKOUT_TYPES: Record<string, { label: string; icon: string }> = {
  running: { label: "러닝", icon: "🏃" },
  cycling: { label: "사이클", icon: "🚴" },
  swimming: { label: "수영", icon: "🏊" },
  strength: { label: "근력 운동", icon: "💪" },
  yoga: { label: "요가", icon: "🧘" },
  walking: { label: "걷기", icon: "🚶" },
  other: { label: "기타", icon: "🏋️" },
};

function formatPaceValue(pace: number): string {
  const min = Math.floor(pace);
  const sec = Math.round((pace - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function WorkoutDetail() {
  const [, params] = useRoute("/workouts/:id");
  const [, navigate] = useLocation();
  const workoutId = params?.id ? parseInt(params.id) : 0;
  const mapRef = useRef<google.maps.Map | null>(null);

  const { data: workout, isLoading: workoutLoading } = trpc.workout.getById.useQuery(
    { id: workoutId },
    { enabled: workoutId > 0 }
  );

  const { data: trackpoints, isLoading: tpLoading } = trpc.workout.getTrackpoints.useQuery(
    { workoutId },
    { enabled: workoutId > 0 }
  );

  // Prepare chart data - sample every N points for performance
  const chartData = useMemo(() => {
    if (!trackpoints || trackpoints.length === 0) return [];
    const step = Math.max(1, Math.floor(trackpoints.length / 300));
    return trackpoints
      .filter((_, i) => i % step === 0)
      .map((tp, idx) => ({
        idx,
        distKm: tp.distanceCumKm ? Math.round(tp.distanceCumKm * 100) / 100 : idx,
        heartRate: tp.heartRate || null,
        elevation: tp.elevation || null,
        pace: tp.pace && tp.pace < 20 ? Math.round(tp.pace * 100) / 100 : null,
      }));
  }, [trackpoints]);

  const hasHR = chartData.some((d) => d.heartRate !== null);
  const hasElev = chartData.some((d) => d.elevation !== null);
  const hasPace = chartData.some((d) => d.pace !== null);
  const hasGPS = trackpoints?.some((tp) => tp.lat && tp.lon) ?? false;

  // Detailed stats from trackpoints
  const detailedStats = useMemo(() => {
    if (!trackpoints || trackpoints.length === 0) return null;
    const hrs = trackpoints.filter((tp) => tp.heartRate && tp.heartRate > 0).map((tp) => tp.heartRate!);
    const elevs = trackpoints.filter((tp) => tp.elevation != null).map((tp) => tp.elevation!);
    const paces = trackpoints.filter((tp) => tp.pace && tp.pace > 0 && tp.pace < 20).map((tp) => tp.pace!);

    const maxHR = hrs.length > 0 ? Math.max(...hrs) : null;
    const minHR = hrs.length > 0 ? Math.min(...hrs) : null;
    const avgHR = hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;

    const maxElev = elevs.length > 0 ? Math.round(Math.max(...elevs)) : null;
    const minElev = elevs.length > 0 ? Math.round(Math.min(...elevs)) : null;
    const elevChange = maxElev != null && minElev != null ? maxElev - minElev : null;

    const fastestPace = paces.length > 0 ? Math.min(...paces) : null;
    const slowestPace = paces.length > 0 ? Math.max(...paces) : null;
    const avgPace = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;

    // Split pace per km
    const splits: { km: number; pace: number }[] = [];
    let currentKm = 1;
    let segPaces: number[] = [];
    for (const tp of trackpoints) {
      if (tp.distanceCumKm && tp.pace && tp.pace > 0 && tp.pace < 20) {
        if (tp.distanceCumKm >= currentKm) {
          if (segPaces.length > 0) {
            splits.push({ km: currentKm, pace: segPaces.reduce((a, b) => a + b, 0) / segPaces.length });
          }
          currentKm++;
          segPaces = [];
        }
        segPaces.push(tp.pace);
      }
    }
    if (segPaces.length > 0) {
      splits.push({ km: currentKm, pace: segPaces.reduce((a, b) => a + b, 0) / segPaces.length });
    }

    return { maxHR, minHR, avgHR, maxElev, minElev, elevChange, fastestPace, slowestPace, avgPace, splits };
  }, [trackpoints]);

  // Map initialization
  const onMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!trackpoints || trackpoints.length === 0) return;

      const gpsPoints = trackpoints.filter((tp) => tp.lat && tp.lon);
      if (gpsPoints.length < 2) return;

      const path = gpsPoints.map((tp) => ({
        lat: tp.lat!,
        lng: tp.lon!,
      }));

      // Draw polyline
      new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#06b6d4",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });

      // Start marker
      new google.maps.marker.AdvancedMarkerElement({
        map,
        position: path[0],
        title: "시작",
      });

      // End marker
      new google.maps.marker.AdvancedMarkerElement({
        map,
        position: path[path.length - 1],
        title: "종료",
      });

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    },
    [trackpoints]
  );

  // Calculate map center from trackpoints
  const mapCenter = useMemo(() => {
    if (!trackpoints || trackpoints.length === 0) return { lat: 37.5665, lng: 126.978 };
    const gps = trackpoints.filter((tp) => tp.lat && tp.lon);
    if (gps.length === 0) return { lat: 37.5665, lng: 126.978 };
    const avgLat = gps.reduce((s, tp) => s + tp.lat!, 0) / gps.length;
    const avgLon = gps.reduce((s, tp) => s + tp.lon!, 0) / gps.length;
    return { lat: avgLat, lng: avgLon };
  }, [trackpoints]);

  if (workoutLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold mb-2">운동 기록을 찾을 수 없습니다</h2>
        <Button variant="outline" onClick={() => navigate("/workouts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const typeInfo = WORKOUT_TYPES[workout.workoutType] || WORKOUT_TYPES.other;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="mono-label mb-1">WORKOUT DETAIL</div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <span className="text-3xl">{typeInfo.icon}</span>
            {typeInfo.label}
          </h1>
        </div>
      </div>

      {/* Date */}
      <div className="mono-label mb-6 text-base">
        {format(new Date(workout.workoutDate), "yyyy년 M월 d일 EEEE", { locale: ko })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {workout.distanceKm && (
          <StatCard icon={<MapPin className="w-4 h-4" />} label="거리" value={`${workout.distanceKm}`} unit="km" color="var(--cyan)" />
        )}
        <StatCard icon={<Timer className="w-4 h-4" />} label="시간" value={`${workout.durationMin}`} unit="분" color="var(--foreground)" />
        {workout.avgPace && (
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="페이스" value={workout.avgPace} unit="/km" color="var(--cyan)" />
        )}
        {workout.avgHeartRate && (
          <StatCard icon={<Heart className="w-4 h-4" />} label="평균 심박" value={`${workout.avgHeartRate}`} unit="bpm" color="var(--pink)" />
        )}
        {workout.calories && (
          <StatCard icon={<Flame className="w-4 h-4" />} label="칼로리" value={`${workout.calories}`} unit="kcal" color="#f97316" />
        )}
        {workout.elevationGain && (
          <StatCard icon={<Mountain className="w-4 h-4" />} label="고도 상승" value={`${Math.round(workout.elevationGain)}`} unit="m" color="#22c55e" />
        )}
      </div>

      {/* GPS Map */}
      {hasGPS && (
        <div className="blueprint-card mb-6 overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="mono-label mb-1">GPS ROUTE MAP</div>
            <h3 className="font-bold">경로 지도</h3>
          </div>
          <div className="h-[350px]">
            <MapView
              initialCenter={mapCenter}
              initialZoom={14}
              onMapReady={onMapReady}
            />
          </div>
        </div>
      )}

      {/* Heart Rate Chart */}
      {hasHR && (
        <div className="blueprint-card mb-6 p-4">
          <div className="mono-label mb-1">HEART RATE</div>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4" style={{ color: "var(--pink)" }} />
            심박수 (bpm)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.72 0.14 350)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.72 0.14 350)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="distKm"
                tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                tickFormatter={(v) => `${v}km`}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v} bpm`, "심박수"]}
                labelFormatter={(l) => `${l} km`}
              />
              {workout.avgHeartRate && (
                <ReferenceLine y={workout.avgHeartRate} stroke="var(--pink)" strokeDasharray="5 5" label={{ value: `평균 ${workout.avgHeartRate}`, position: "right", fontSize: 10 }} />
              )}
              <Area type="monotone" dataKey="heartRate" stroke="oklch(0.72 0.14 350)" fill="url(#hrGrad)" strokeWidth={2} dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Elevation Chart */}
      {hasElev && (
        <div className="blueprint-card mb-6 p-4">
          <div className="mono-label mb-1">ELEVATION</div>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Mountain className="w-4 h-4" style={{ color: "#22c55e" }} />
            고도 (m)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="distKm"
                tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                tickFormatter={(v) => `${v}km`}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${Math.round(v)} m`, "고도"]}
                labelFormatter={(l) => `${l} km`}
              />
              <Area type="monotone" dataKey="elevation" stroke="#22c55e" fill="url(#elevGrad)" strokeWidth={2} dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pace Chart */}
      {hasPace && (
        <div className="blueprint-card mb-6 p-4">
          <div className="mono-label mb-1">PACE</div>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            페이스 (min/km)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="distKm"
                tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                tickFormatter={(v) => `${v}km`}
              />
              <YAxis
                reversed
                tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                tickFormatter={(v) => formatPaceValue(v)}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatPaceValue(v) + " /km", "페이스"]}
                labelFormatter={(l) => `${l} km`}
              />
              <Line type="monotone" dataKey="pace" stroke="var(--cyan)" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Stats */}
      {detailedStats && (
        <div className="blueprint-card mb-6 p-4">
          <div className="mono-label mb-1">DETAILED STATS</div>
          <h3 className="font-bold mb-4">상세 통계</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Heart Rate Details */}
            {detailedStats.maxHR && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--pink)" }}>
                  <Heart className="w-3.5 h-3.5" />심박수
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div><div className="mono-label">최소</div><div className="font-bold text-sm">{detailedStats.minHR}</div></div>
                  <div><div className="mono-label">평균</div><div className="font-bold text-sm">{detailedStats.avgHR}</div></div>
                  <div><div className="mono-label">최대</div><div className="font-bold text-sm" style={{ color: "var(--pink)" }}>{detailedStats.maxHR}</div></div>
                </div>
              </div>
            )}
            {/* Elevation Details */}
            {detailedStats.maxElev != null && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#22c55e" }}>
                  <Mountain className="w-3.5 h-3.5" />고도
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div><div className="mono-label">최저</div><div className="font-bold text-sm">{detailedStats.minElev}m</div></div>
                  <div><div className="mono-label">최고</div><div className="font-bold text-sm">{detailedStats.maxElev}m</div></div>
                  <div><div className="mono-label">변화</div><div className="font-bold text-sm" style={{ color: "#22c55e" }}>{detailedStats.elevChange}m</div></div>
                </div>
              </div>
            )}
            {/* Pace Details */}
            {detailedStats.fastestPace && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--cyan)" }}>
                  <TrendingUp className="w-3.5 h-3.5" />페이스
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div><div className="mono-label">최속</div><div className="font-bold text-sm" style={{ color: "var(--cyan)" }}>{formatPaceValue(detailedStats.fastestPace)}</div></div>
                  <div><div className="mono-label">평균</div><div className="font-bold text-sm">{detailedStats.avgPace ? formatPaceValue(detailedStats.avgPace) : "-"}</div></div>
                  <div><div className="mono-label">최느</div><div className="font-bold text-sm">{formatPaceValue(detailedStats.slowestPace!)}</div></div>
                </div>
              </div>
            )}
          </div>
          {/* Split Pace Table */}
          {detailedStats.splits.length > 1 && (
            <div className="mt-4">
              <div className="mono-label mb-2">구간 페이스 (km별)</div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                {detailedStats.splits.map((s) => (
                  <div key={s.km} className="text-center p-1.5 rounded bg-muted/50">
                    <div className="mono-label text-[10px]">{s.km}km</div>
                    <div className="font-bold text-xs" style={{ color: "var(--cyan)" }}>{formatPaceValue(s.pace)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {workout.notes && (
        <div className="blueprint-card p-4 mb-6">
          <div className="mono-label mb-2">NOTES</div>
          <p className="text-sm text-muted-foreground">{workout.notes}</p>
        </div>
      )}

      {/* No trackpoint data message */}
      {!tpLoading && (!trackpoints || trackpoints.length === 0) && (
        <div className="blueprint-card p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-bold mb-1">상세 데이터 없음</h3>
          <p className="text-sm text-muted-foreground">
            워치 파일(GPX/TCX/FIT)을 업로드하면 심박수, 고도, 페이스 차트와 GPS 경로 지도를 볼 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="blueprint-card p-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color }}>
        {icon}
        <span className="mono-label" style={{ color: "inherit" }}>{label}</span>
      </div>
      <div className="font-black text-xl" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  );
}
