import type { Activity, Wellness, Event } from "./client.js";

function n(v: unknown, unit = ""): string {
  if (v == null) return "N/A";
  return `${v}${unit}`;
}

export function formatActivity(a: Activity): string {
  const startTime = a.startTime
    ? new Date(a.startTime).toLocaleString()
    : "Unknown";

  const lines = [
    `**${a.name ?? "Unnamed"}** (${a.id})`,
    `Type: ${n(a.type)} | Date: ${startTime}`,
    `Distance: ${n(a.distance, " m")} | Duration: ${n(a.duration, " s")} | Moving: ${n(a.moving_time, " s")}`,
    `Elevation: ${n(a.elevationGain, " m")}`,
    "",
    "Power:",
    `  Avg: ${n(a.avgPower, " W")} | Weighted Avg: ${n(a.icu_weighted_avg_watts, " W")} | FTP: ${n(a.icu_ftp, " W")}`,
    `  Training Load: ${n(a.trainingLoad)} | Intensity: ${n(a.icu_intensity)}`,
    "",
    "Heart Rate:",
    `  Avg: ${n(a.avgHr, " bpm")} | Max: ${n(a.max_heartrate, " bpm")}`,
    "",
    "Other:",
    `  Cadence: ${n(a.average_cadence, " rpm")} | Calories: ${n(a.calories)} | Speed: ${n(a.average_speed, " m/s")}`,
    `  Temp: ${n(a.average_temp, "°C")} | Trainer: ${a.trainer ? "Yes" : "No"}`,
    `  RPE: ${n(a.perceived_exertion)}/10 | Feel: ${n(a.feel)}/10`,
    "",
    "Fitness:",
    `  CTL: ${n(a.icu_ctl)} | ATL: ${n(a.icu_atl)} | TRIMP: ${n(a.trimp)}`,
  ];

  if (a.description) lines.push("", `Description: ${a.description}`);

  return lines.join("\n");
}

export function formatWellness(date: string, w: Wellness): string {
  const sleepHours =
    w.sleepSecs != null ? (w.sleepSecs / 3600).toFixed(1) + " h" : "N/A";

  return [
    `**${date}**`,
    "",
    "Training:",
    `  CTL: ${n(w.ctl)} | ATL: ${n(w.atl)}`,
    "",
    "Vitals:",
    `  Weight: ${n(w.weight, " kg")} | Resting HR: ${n(w.restingHR, " bpm")}`,
    `  HRV: ${n(w.hrv)} | HRV SDNN: ${n(w.hrvSDNN)}`,
    `  SpO2: ${n(w.spO2, "%")} | VO2max: ${n(w.vo2max)} | Body Fat: ${n(w.bodyFat, "%")}`,
    "",
    "Sleep & Recovery:",
    `  Sleep: ${sleepHours} | Score: ${n(w.sleepScore)}/100 | Quality: ${n(w.sleepQuality)}/10`,
    `  Readiness: ${n(w.readiness)}/10`,
    "",
    "Subjective:",
    `  Soreness: ${n(w.soreness)}/10 | Fatigue: ${n(w.fatigue)}/10 | Stress: ${n(w.stress)}/10`,
    `  Mood: ${n(w.mood)}/10 | Motivation: ${n(w.motivation)}/10`,
    "",
    "Nutrition:",
    `  Calories: ${n(w.kcalConsumed, " kcal")} | Steps: ${n(w.steps)}`,
    w.comments ? `\nComments: ${w.comments}` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .trimEnd();
}

export function formatEvent(e: Event): string {
  const type = e.race ? "Race" : e.workout ? "Workout" : "Event";
  return [
    `**${e.name ?? "Unnamed"}** (${e.id})`,
    `Type: ${type} | Date: ${e.date ?? "Unknown"}`,
    e.description ? `Description: ${e.description}` : "",
    e.priority ? `Priority: ${e.priority}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatIntervalRow(interval: Record<string, unknown>, idx: number): string {
  const label = (interval["label"] as string) ?? `Interval ${idx}`;
  const type = (interval["type"] as string) ?? "Unknown";
  const elapsed = interval["elapsed_time"] as number ?? 0;
  const distance = interval["distance"] as number ?? 0;
  const avgW = interval["average_watts"] as number ?? 0;
  const wAvg = interval["weighted_average_watts"] as number ?? 0;
  const maxW = interval["max_watts"] as number ?? 0;
  const avgHr = interval["average_heartrate"] as number ?? 0;
  const maxHr = interval["max_heartrate"] as number ?? 0;
  const tl = interval["training_load"] as number ?? 0;

  return [
    `[${idx}] ${label} (${type})`,
    `  Duration: ${elapsed}s | Distance: ${distance}m`,
    `  Power: avg ${avgW}W, w.avg ${wAvg}W, max ${maxW}W | TL: ${tl}`,
    `  HR: avg ${avgHr}, max ${maxHr} bpm`,
  ].join("\n");
}
