import type { Activity, Wellness, Event, SportSettings, Message } from "./client.js";

function n(v: unknown, unit = ""): string {
  if (v == null) return "N/A";
  return `${v}${unit}`;
}

function fmtDuration(secs: number | null | undefined): string {
  if (secs == null) return "N/A";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

export function formatActivity(a: Activity): string {
  const startTime = a.start_date_local
    ? new Date(a.start_date_local).toLocaleString()
    : "Unknown";

  const lines = [
    `**${a.name ?? "Unnamed"}** (${a.id})`,
    `Type: ${n(a.type)} | Date: ${startTime}`,
    `Distance: ${n(a.distance, " m")} | Duration: ${n(a.elapsed_time, " s")} | Moving: ${n(a.moving_time, " s")}`,
    `Elevation: +${n(a.total_elevation_gain, " m")} / -${n(a.total_elevation_loss, " m")} | Altitude: ${n(a.min_altitude, " m")}-${n(a.max_altitude, " m")}`,
    "",
    "Power:",
    `  Avg: ${n(a.icu_average_watts, " W")} | Weighted Avg: ${n(a.icu_weighted_avg_watts, " W")} | FTP: ${n(a.icu_ftp, " W")}`,
    `  Training Load: ${n(a.icu_training_load)} | Intensity: ${n(a.icu_intensity)} | VI: ${n(a.icu_variability_index)}`,
    `  Critical Power: ${n(a.icu_pm_cp, " W")} | Rolling FTP: ${n(a.icu_rolling_ftp, " W")} | Energy: ${a.icu_joules != null ? `${Math.round(a.icu_joules / 1000)} kJ` : "N/A"}`,
    "",
    "Heart Rate:",
    `  Avg: ${n(a.average_heartrate, " bpm")} | Max: ${n(a.max_heartrate, " bpm")}`,
    `  Decoupling: ${n(a.decoupling, "%")} | Efficiency Factor: ${n(a.icu_efficiency_factor)} | Pw:Hr: ${n(a.icu_power_hr)}`,
  ];

  if (a.icu_hrr?.hrr != null) {
    lines.push(`  HR Recovery: -${n(a.icu_hrr.hrr, " bpm")} (${n(a.icu_hrr.start_bpm)} → ${n(a.icu_hrr.end_bpm)} bpm)`);
  }

  if (a.icu_zone_times?.length || a.icu_hr_zone_times?.length) {
    lines.push("", "Zones:");
    if (a.icu_zone_times?.length) {
      lines.push(`  Power: ${a.icu_zone_times.map((z) => `${z.id} ${fmtDuration(z.secs)}`).join(" | ")}`);
    }
    if (a.icu_hr_zone_times?.length) {
      lines.push(`  HR: ${a.icu_hr_zone_times.map((secs, i) => `Z${i + 1} ${fmtDuration(secs)}`).join(" | ")}`);
    }
  }

  lines.push(
    "",
    "Other:",
    `  Cadence: ${n(a.average_cadence, " rpm")} | Calories: ${n(a.calories)} | Speed: ${n(a.average_speed, " m/s")} (max ${n(a.max_speed, " m/s")})`,
    `  Temp: ${n(a.average_temp, "°C")} | Trainer: ${a.trainer ? "Yes" : "No"}`,
    `  RPE: ${n(a.icu_rpe ?? a.perceived_exertion)}/10 | Feel: ${n(a.feel)}/5`,
    "",
    "Fitness:",
    `  CTL: ${n(a.icu_ctl)} | ATL: ${n(a.icu_atl)} | TRIMP: ${n(a.trimp)} | Polarization Index: ${n(a.polarization_index)}`,
    `  Power Load: ${n(a.power_load)} | HR Load: ${n(a.hr_load)} | Strain: ${n(a.strain_score)}`,
    "",
    "Equipment:",
    `  Gear: ${n(a.gear?.name)} | Device: ${n(a.device_name)} | Power Meter: ${n(a.power_meter)}`,
    `  Source: ${n(a.source)} | Compliance: ${a.compliance != null ? `${a.compliance}%` : "N/A"}`,
  );

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
  const category = e.category ?? "";
  const type = category.startsWith("RACE")
    ? "Race"
    : category === "WORKOUT"
    ? "Workout"
    : category === "NOTE" || e.show_as_note
    ? "Note"
    : "Event";
  const start = e.start_date_local ?? e.date ?? "Unknown";
  const dateLabel =
    e.end_date_local && e.end_date_local !== e.start_date_local
      ? `${start} to ${e.end_date_local}`
      : start;
  return [
    `**${e.name ?? "Unnamed"}** (${e.id})`,
    `Type: ${type} | Date: ${dateLabel}`,
    e.category ? `Category: ${e.category}` : "",
    e.description ? `Description: ${e.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatMessage(m: Message): string {
  const when = m.created ? new Date(m.created).toLocaleString() : "Unknown time";
  return `**${m.name ?? "Unknown"}** (${when}): ${m.content ?? ""}`;
}

function zoneRanges(
  breakpoints: number[] | null | undefined,
  names: string[] | null | undefined
): { name: string; from: number; to: number | null }[] {
  const count = names?.length ?? (breakpoints?.length ?? 0) + 1;
  const ranges: { name: string; from: number; to: number | null }[] = [];
  let from = 0;
  for (let i = 0; i < count; i++) {
    const raw = breakpoints && i < breakpoints.length ? breakpoints[i] : null;
    // Intervals.icu caps the top zone with a 999 sentinel meaning "no upper bound".
    const to = raw != null && raw < 900 ? raw : null;
    ranges.push({ name: names?.[i] ?? `Z${i + 1}`, from, to });
    if (to != null) from = to;
  }
  return ranges;
}

export function formatSportZones(s: SportSettings): string {
  const title = s.types?.length ? s.types.join(", ") : "Default";
  const lines = [`## ${title}`, ""];

  if (s.power_zones?.length) {
    lines.push(`Power Zones${s.ftp != null ? ` (FTP: ${s.ftp}W)` : ""}:`);
    for (const z of zoneRanges(s.power_zones, s.power_zone_names)) {
      const abs = s.ftp != null ? ` (${Math.round((s.ftp * z.from) / 100)}-${z.to != null ? Math.round((s.ftp * z.to) / 100) + "W" : "W+"})` : "";
      const pct = z.to != null ? `${z.from}-${z.to}%` : `${z.from}%+`;
      lines.push(`  ${z.name}: ${pct}${abs}`);
    }
    lines.push("");
  }

  if (s.hr_zones?.length) {
    // Unlike power_zones (%FTP), hr_zones stores absolute bpm thresholds directly.
    lines.push(`HR Zones${s.lthr != null ? ` (LTHR: ${s.lthr}bpm)` : ""}:`);
    for (const z of zoneRanges(s.hr_zones, s.hr_zone_names)) {
      const pctFrom = s.lthr != null ? Math.round((z.from / s.lthr) * 100) : null;
      const pctTo = s.lthr != null && z.to != null ? Math.round((z.to / s.lthr) * 100) : null;
      const pct = pctFrom != null ? ` (${pctFrom}${pctTo != null ? "-" + pctTo : ""}% LTHR)` : "";
      const bpm = z.to != null ? `${z.from}-${z.to} bpm` : `${z.from}+ bpm`;
      lines.push(`  ${z.name}: ${bpm}${pct}`);
    }
    lines.push("");
  }

  if (s.pace_zones?.length) {
    // Same as hr_zones — absolute thresholds, not percentages of threshold_pace.
    lines.push(`Pace Zones${s.threshold_pace != null ? ` (Threshold: ${s.threshold_pace} m/s)` : ""}:`);
    for (const z of zoneRanges(s.pace_zones, s.pace_zone_names)) {
      const range = z.to != null ? `${z.from}-${z.to} m/s` : `${z.from}+ m/s`;
      lines.push(`  ${z.name}: ${range}`);
    }
  }

  return lines.join("\n").trimEnd();
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
