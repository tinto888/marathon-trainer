/**
 * Watch data file parser for GPX, TCX, and FIT files
 * Supports: Garmin, COROS, Galaxy Watch, Apple Watch
 * Now returns trackpoints for detailed charts (HR, elevation, pace, map)
 */
import { XMLParser } from "fast-xml-parser";
// @ts-ignore - fit-file-parser doesn't have types
import FitParser from "fit-file-parser";

export interface TrackPoint {
  timestamp?: string;
  lat?: number;
  lon?: number;
  elevation?: number;
  heartRate?: number;
  pace?: number; // min/km
  cadence?: number;
  distanceCumKm?: number;
}

export interface ParsedWorkout {
  source: string;
  type: string;
  distanceKm: number;
  durationMinutes: number;
  paceMinPerKm: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  startTime?: string;
  elevationGain?: number;
  cadence?: number;
  trackpoints: TrackPoint[];
}

function formatPace(totalMinutes: number, distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0) return "0:00";
  const paceMin = totalMinutes / distanceKm;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function detectSource(data: any, fileType: string): string {
  if (fileType === "fit") {
    const creator = data?.file_id?.manufacturer || "";
    if (typeof creator === "string") {
      const lc = creator.toLowerCase();
      if (lc.includes("garmin")) return "garmin";
      if (lc.includes("coros")) return "coros";
      if (lc.includes("samsung")) return "galaxy_watch";
      if (lc.includes("apple")) return "apple_watch";
    }
    const mfgId = data?.file_id?.manufacturer;
    if (mfgId === 1 || mfgId === "garmin") return "garmin";
    if (mfgId === 294 || mfgId === "coros") return "coros";
    return "garmin";
  }
  return "unknown";
}

function detectActivityType(sportName: string | undefined): string {
  if (!sportName) return "running";
  const s = String(sportName).toLowerCase();
  if (s.includes("run") || s.includes("러닝") || s === "running") return "running";
  if (s.includes("cycl") || s.includes("bik") || s === "cycling") return "cycling";
  if (s.includes("swim") || s === "swimming") return "swimming";
  if (s.includes("walk") || s === "walking") return "walking";
  if (s.includes("hik") || s === "hiking") return "walking";
  if (s.includes("strength") || s.includes("gym")) return "strength";
  if (s.includes("yoga")) return "yoga";
  return "running";
}

// ===== FIT Parser =====
export async function parseFIT(buffer: Buffer): Promise<ParsedWorkout> {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: "km/h",
      lengthUnit: "km",
      elapsedRecordField: true,
    });

    fitParser.parse(buffer as any, (error: any, data: any) => {
      if (error) {
        reject(new Error(`FIT parse error: ${error}`));
        return;
      }

      const session = data?.activity?.sessions?.[0];
      if (!session) {
        reject(new Error("No session data found in FIT file"));
        return;
      }

      const distanceKm = session.total_distance || 0;
      const durationSec = session.total_timer_time || session.total_elapsed_time || 0;
      const durationMinutes = durationSec / 60;
      const sport = session.sport;
      const source = detectSource(data, "fit");
      const type = detectActivityType(sport);

      // Extract trackpoints from records
      const records = data?.activity?.sessions?.[0]?.laps?.flatMap((l: any) => l?.records || []) || data?.records || [];
      const trackpoints: TrackPoint[] = [];
      let cumDist = 0;
      let prevLat: number | undefined;
      let prevLon: number | undefined;
      let prevTime: number | undefined;

      for (const rec of records) {
        const lat = rec.position_lat;
        const lon = rec.position_long;
        const ts = rec.timestamp ? new Date(rec.timestamp).toISOString() : undefined;
        const curTime = rec.timestamp ? new Date(rec.timestamp).getTime() : undefined;

        if (lat && lon && prevLat && prevLon) {
          cumDist += haversine(prevLat, prevLon, lat, lon);
        }

        // Calculate instantaneous pace
        let pace: number | undefined;
        if (rec.enhanced_speed || rec.speed) {
          const speedKmh = rec.enhanced_speed || rec.speed;
          if (speedKmh > 0) pace = 60 / speedKmh;
        }

        trackpoints.push({
          timestamp: ts,
          lat: lat || undefined,
          lon: lon || undefined,
          elevation: rec.enhanced_altitude || rec.altitude || undefined,
          heartRate: rec.heart_rate || undefined,
          pace,
          cadence: rec.cadence || undefined,
          distanceCumKm: Math.round(cumDist * 1000) / 1000,
        });

        if (lat) prevLat = lat;
        if (lon) prevLon = lon;
        if (curTime) prevTime = curTime;
      }

      resolve({
        source,
        type,
        distanceKm: Math.round(distanceKm * 100) / 100,
        durationMinutes: Math.round(durationMinutes * 100) / 100,
        paceMinPerKm: formatPace(durationMinutes, distanceKm),
        avgHeartRate: session.avg_heart_rate || undefined,
        maxHeartRate: session.max_heart_rate || undefined,
        calories: session.total_calories || undefined,
        startTime: session.start_time ? new Date(session.start_time).toISOString() : undefined,
        elevationGain: session.total_ascent || undefined,
        cadence: session.avg_running_cadence || session.avg_cadence || undefined,
        trackpoints,
      });
    });
  });
}

// ===== GPX Parser =====
export function parseGPX(xmlString: string): ParsedWorkout {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const gpx = parser.parse(xmlString);
  const root = gpx.gpx;
  if (!root) throw new Error("Invalid GPX file");

  const creator = (root["@_creator"] || "").toLowerCase();
  let source = "unknown";
  if (creator.includes("garmin")) source = "garmin";
  else if (creator.includes("coros")) source = "coros";
  else if (creator.includes("samsung") || creator.includes("galaxy")) source = "galaxy_watch";
  else if (creator.includes("apple") || creator.includes("watch")) source = "apple_watch";
  else if (creator.includes("strava")) source = "strava";

  const trkName = root?.trk?.name || root?.trk?.type || "";
  const type = detectActivityType(String(trkName));

  let trkpts: any[] = [];
  const trk = root?.trk;
  if (trk) {
    const trkseg = trk.trkseg;
    if (trkseg) {
      trkpts = Array.isArray(trkseg.trkpt) ? trkseg.trkpt : (trkseg.trkpt ? [trkseg.trkpt] : []);
    }
  }

  if (trkpts.length < 2) {
    throw new Error("GPX file has insufficient track points");
  }

  let totalDistanceKm = 0;
  let totalHeartRate = 0;
  let hrCount = 0;
  let maxHR = 0;
  let totalElevGain = 0;
  let prevElev: number | null = null;
  const trackpoints: TrackPoint[] = [];

  // First point
  const firstPt = trkpts[0];
  trackpoints.push({
    timestamp: firstPt?.time || undefined,
    lat: parseFloat(firstPt["@_lat"]) || undefined,
    lon: parseFloat(firstPt["@_lon"]) || undefined,
    elevation: !isNaN(parseFloat(firstPt.ele)) ? parseFloat(firstPt.ele) : undefined,
    heartRate: extractHR(firstPt) || undefined,
    distanceCumKm: 0,
  });
  prevElev = !isNaN(parseFloat(firstPt.ele)) ? parseFloat(firstPt.ele) : null;

  for (let i = 1; i < trkpts.length; i++) {
    const p1 = trkpts[i - 1];
    const p2 = trkpts[i];
    const lat1 = parseFloat(p1["@_lat"]);
    const lon1 = parseFloat(p1["@_lon"]);
    const lat2 = parseFloat(p2["@_lat"]);
    const lon2 = parseFloat(p2["@_lon"]);
    const segDist = haversine(lat1, lon1, lat2, lon2);
    totalDistanceKm += segDist;

    const hr = extractHR(p2);
    if (hr) {
      totalHeartRate += hr;
      hrCount++;
      if (hr > maxHR) maxHR = hr;
    }

    const elev = parseFloat(p2.ele);
    if (!isNaN(elev)) {
      if (prevElev !== null && elev > prevElev) {
        totalElevGain += elev - prevElev;
      }
      prevElev = elev;
    }

    // Calculate segment pace
    let pace: number | undefined;
    if (p1.time && p2.time && segDist > 0) {
      const timeDiffMin = (new Date(p2.time).getTime() - new Date(p1.time).getTime()) / 60000;
      if (timeDiffMin > 0) {
        pace = timeDiffMin / segDist;
        if (pace > 30) pace = undefined; // filter outliers
      }
    }

    // Extract cadence from extensions
    let cadence: number | undefined;
    const ext = p2?.extensions;
    if (ext) {
      const tpExt = ext?.["gpxtpx:TrackPointExtension"] || ext?.TrackPointExtension;
      if (tpExt) {
        const cad = tpExt?.["gpxtpx:cad"] || tpExt?.cad;
        if (cad) cadence = parseInt(cad);
      }
    }

    trackpoints.push({
      timestamp: p2?.time || undefined,
      lat: !isNaN(lat2) ? lat2 : undefined,
      lon: !isNaN(lon2) ? lon2 : undefined,
      elevation: !isNaN(elev) ? elev : undefined,
      heartRate: hr || undefined,
      pace,
      cadence,
      distanceCumKm: Math.round(totalDistanceKm * 1000) / 1000,
    });
  }

  const startTime = trkpts[0]?.time;
  const endTime = trkpts[trkpts.length - 1]?.time;
  let durationMinutes = 0;
  if (startTime && endTime) {
    durationMinutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
  }

  return {
    source,
    type,
    distanceKm: Math.round(totalDistanceKm * 100) / 100,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
    paceMinPerKm: formatPace(durationMinutes, totalDistanceKm),
    avgHeartRate: hrCount > 0 ? Math.round(totalHeartRate / hrCount) : undefined,
    maxHeartRate: maxHR > 0 ? maxHR : undefined,
    startTime: startTime || undefined,
    elevationGain: totalElevGain > 0 ? Math.round(totalElevGain) : undefined,
    trackpoints,
  };
}

// ===== TCX Parser =====
export function parseTCX(xmlString: string): ParsedWorkout {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const tcx = parser.parse(xmlString);
  const db = tcx?.TrainingCenterDatabase;
  if (!db) throw new Error("Invalid TCX file");

  const author = db?.Author?.Name || "";
  let source = "unknown";
  const authorLc = String(author).toLowerCase();
  if (authorLc.includes("garmin")) source = "garmin";
  else if (authorLc.includes("coros")) source = "coros";
  else if (authorLc.includes("samsung") || authorLc.includes("galaxy")) source = "galaxy_watch";
  else if (authorLc.includes("apple")) source = "apple_watch";

  const activities = db?.Activities;
  const activity = Array.isArray(activities?.Activity) ? activities.Activity[0] : activities?.Activity;
  if (!activity) throw new Error("No activity found in TCX file");

  const sport = activity["@_Sport"] || "";
  const type = detectActivityType(sport);

  const laps = Array.isArray(activity.Lap) ? activity.Lap : (activity.Lap ? [activity.Lap] : []);

  let totalDistanceM = 0;
  let totalTimeSec = 0;
  let totalCalories = 0;
  let totalHR = 0;
  let hrCount = 0;
  let maxHR = 0;
  const trackpoints: TrackPoint[] = [];
  let cumDistKm = 0;

  for (const lap of laps) {
    totalDistanceM += parseFloat(lap.DistanceMeters || 0);
    totalTimeSec += parseFloat(lap.TotalTimeSeconds || 0);
    totalCalories += parseInt(lap.Calories || 0);

    const avgHR = lap?.AverageHeartRateBpm?.Value;
    if (avgHR) { totalHR += parseFloat(avgHR); hrCount++; }
    const mxHR = lap?.MaximumHeartRateBpm?.Value;
    if (mxHR && parseFloat(mxHR) > maxHR) maxHR = parseFloat(mxHR);

    // Extract trackpoints from lap
    const track = lap?.Track;
    const tps = track?.Trackpoint;
    if (!tps) continue;
    const tpArr = Array.isArray(tps) ? tps : [tps];

    for (let i = 0; i < tpArr.length; i++) {
      const tp = tpArr[i];
      const lat = tp?.Position?.LatitudeDegrees ? parseFloat(tp.Position.LatitudeDegrees) : undefined;
      const lon = tp?.Position?.LongitudeDegrees ? parseFloat(tp.Position.LongitudeDegrees) : undefined;
      const elev = tp?.AltitudeMeters ? parseFloat(tp.AltitudeMeters) : undefined;
      const hr = tp?.HeartRateBpm?.Value ? parseInt(tp.HeartRateBpm.Value) : undefined;
      const distM = tp?.DistanceMeters ? parseFloat(tp.DistanceMeters) : undefined;
      cumDistKm = distM ? distM / 1000 : cumDistKm;

      // Calculate pace from consecutive points
      let pace: number | undefined;
      if (i > 0 && tpArr[i - 1]?.Time && tp?.Time) {
        const prevDistM = tpArr[i - 1]?.DistanceMeters ? parseFloat(tpArr[i - 1].DistanceMeters) : 0;
        const curDistM = distM || 0;
        const segDistKm = (curDistM - prevDistM) / 1000;
        const timeDiffMin = (new Date(tp.Time).getTime() - new Date(tpArr[i - 1].Time).getTime()) / 60000;
        if (segDistKm > 0 && timeDiffMin > 0) {
          pace = timeDiffMin / segDistKm;
          if (pace > 30) pace = undefined;
        }
      }

      const cad = tp?.Cadence ? parseInt(tp.Cadence) : undefined;

      trackpoints.push({
        timestamp: tp?.Time || undefined,
        lat, lon, elevation: elev,
        heartRate: hr, pace, cadence: cad,
        distanceCumKm: Math.round(cumDistKm * 1000) / 1000,
      });
    }
  }

  const distanceKm = totalDistanceM / 1000;
  const durationMinutes = totalTimeSec / 60;
  const startTime = laps[0]?.["@_StartTime"] || activity?.Id;

  return {
    source,
    type,
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
    paceMinPerKm: formatPace(durationMinutes, distanceKm),
    avgHeartRate: hrCount > 0 ? Math.round(totalHR / hrCount) : undefined,
    maxHeartRate: maxHR > 0 ? Math.round(maxHR) : undefined,
    calories: totalCalories > 0 ? totalCalories : undefined,
    startTime: startTime || undefined,
    trackpoints,
  };
}

// ===== Helpers =====
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function extractHR(point: any): number | null {
  const ext = point?.extensions;
  if (!ext) return null;
  const tpExt = ext?.["gpxtpx:TrackPointExtension"] || ext?.TrackPointExtension;
  if (tpExt) {
    const hr = tpExt?.["gpxtpx:hr"] || tpExt?.hr;
    if (hr) return parseInt(hr);
  }
  if (ext?.hr) return parseInt(ext.hr);
  if (ext?.heartrate) return parseInt(ext.heartrate);
  return null;
}

// ===== Main parse function =====
export async function parseWorkoutFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedWorkout> {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "fit":
      return parseFIT(buffer);
    case "gpx": {
      const xmlStr = buffer.toString("utf-8");
      return parseGPX(xmlStr);
    }
    case "tcx": {
      const xmlStr = buffer.toString("utf-8");
      return parseTCX(xmlStr);
    }
    default:
      throw new Error(`Unsupported file format: .${ext}. Supported: .fit, .gpx, .tcx`);
  }
}
