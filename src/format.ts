import type { Activity, Wellness, Event, SportSettings, Message, AthleteFitness } from "./client.js";

// Output is read by an LLM, so every formatter here skips null fields and rounds floats:
// "CTL: 44.65151" or a line of N/As costs tokens without adding information.

function n(v: unknown, unit = ""): string {
  if (v == null) return "N/A";
  return `${v}${unit}`;
}

// Rounds to `digits` decimals, dropping trailing zeros; undefined for null so callers can skip the field.
function r(v: number | null | undefined, digits = 0): string | undefined {
  if (v == null || Number.isNaN(v)) return undefined;
  return String(Number(v.toFixed(digits)));
}

// "label value" pairs, skipping any whose value is missing.
function fields(pairs: [string, string | undefined][], sep = " | "): string {
  return pairs
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => (k ? `${k} ${v}` : v))
    .join(sep);
}

function withUnit(v: string | undefined, unit: string): string | undefined {
  return v != null ? `${v}${unit}` : undefined;
}

function fmtDuration(secs: number | null | undefined): string {
  if (secs == null) return "N/A";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

function dur(secs: number | null | undefined): string | undefined {
  return secs != null && secs > 0 ? fmtDuration(secs) : undefined;
}

// Second-precision variant for short efforts, where rounding 30s to "1m" would mislead.
function durExact(secs: number | null | undefined): string | undefined {
  if (secs == null || secs <= 0) return undefined;
  const s = Math.round(secs);
  const parts = [[Math.floor(s / 3600), "h"], [Math.floor((s % 3600) / 60), "m"], [s % 60, "s"]] as const;
  return parts.filter(([v]) => v > 0).map(([v, u]) => `${v}${u}`).join("");
}

// "2026-10-04T14:17:34" → "2026-10-04 14:17"; date-only midnights lose the time entirely.
function fmtLocalDate(s: string | null | undefined): string {
  if (!s) return "Unknown";
  return s.replace("T00:00:00", "").replace(/T(\d\d:\d\d)(:\d\d)?.*/, " $1");
}

function km(m: number | null | undefined): string | undefined {
  return m != null && m > 0 ? `${r(m / 1000, 1)}km` : undefined;
}

// icu_intensity is stored as a percentage (57.6) — show it as the conventional IF (0.58).
function intensityFactor(v: number | null | undefined): string | undefined {
  return v != null ? r(v / 100, 2) : undefined;
}

export function truncate(text: string, max: number, hint: string): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}… [+${text.length - max} chars, ${hint}]`;
}

// One line per activity for list views; use formatActivity for the full breakdown.
export function formatActivitySummary(a: Activity): string {
  const hr = a.average_heartrate != null ? `${r(a.average_heartrate)}${a.max_heartrate != null ? `/${r(a.max_heartrate)}` : ""}` : undefined;
  const desc = a.description?.split("\n")[0]?.trim();
  const line = fields([
    ["", `${fmtLocalDate(a.start_date_local)} ${a.type ?? ""} **${a.name ?? "Unnamed"}** (${a.id})`],
    ["", dur(a.moving_time ?? a.elapsed_time)],
    ["", km(a.distance)],
    ["", a.total_elevation_gain ? `+${r(a.total_elevation_gain)}m` : undefined],
    ["NP", withUnit(r(a.icu_weighted_avg_watts), "W")],
    ["IF", intensityFactor(a.icu_intensity)],
    ["TSS", r(a.icu_training_load)],
    ["HR", hr],
    ["Dec", withUnit(r(a.decoupling, 1), "%")],
    ["RPE", r(a.icu_rpe ?? a.perceived_exertion)],
    ["Feel", r(a.feel)],
    ["Tick", r(a.coach_tick)],
  ], " · ");
  return desc ? `${line}\n  ${truncate(desc, 100, "see get_activity_details")}` : line;
}

export function formatActivity(a: Activity): string {
  const kj = (j: number | null | undefined) => (j != null ? `${Math.round(j / 1000)}kJ` : undefined);
  const lr = a.avg_lr_balance != null ? `${(100 - a.avg_lr_balance).toFixed(0)}/${a.avg_lr_balance.toFixed(0)}` : undefined;

  const sections: [string, string[]][] = [
    ["", [
      fields([
        ["Moving", dur(a.moving_time)],
        ["Elapsed", dur(a.elapsed_time)],
        ["Dist", km(a.distance)],
        ["Elev", a.total_elevation_gain != null ? `+${r(a.total_elevation_gain)}/-${r(a.total_elevation_loss) ?? "?"}m` : undefined],
      ]),
    ]],
    ["Power", [
      fields([
        ["Avg", withUnit(r(a.icu_average_watts), "W")],
        ["NP", withUnit(r(a.icu_weighted_avg_watts), "W")],
        ["FTP", withUnit(r(a.icu_ftp), "W")],
        ["IF", intensityFactor(a.icu_intensity)],
        ["TSS", r(a.icu_training_load)],
        ["VI", r(a.icu_variability_index, 2)],
      ]),
      fields([
        ["CP", withUnit(r(a.icu_pm_cp), "W")],
        ["eFTP", withUnit(r(a.icu_pm_ftp), "W")],
        ["Rolling FTP", withUnit(r(a.icu_rolling_ftp), "W")],
        ["W'", withUnit(r(a.icu_w_prime), "J")],
        ["Pmax", withUnit(r(a.p_max), "W")],
      ]),
      fields([
        ["Energy", kj(a.icu_joules)],
        ["Above FTP", kj(a.icu_joules_above_ftp)],
        ["W'bal drop", a.icu_max_wbal_depletion != null ? `${r(a.icu_max_wbal_depletion / 1000, 1)}kJ` : undefined],
        ["L/R", lr],
      ]),
    ]],
    ["HR", [
      fields([
        ["Avg", withUnit(r(a.average_heartrate), "bpm")],
        ["Max", withUnit(r(a.max_heartrate), "bpm")],
        ["Decoupling", withUnit(r(a.decoupling, 1), "%")],
        ["EF", r(a.icu_efficiency_factor, 2)],
        ["Pw:HR", r(a.icu_power_hr, 2)],
        ["HRR", a.icu_hrr?.hrr != null ? `-${r(a.icu_hrr.hrr)}bpm (${r(a.icu_hrr.start_bpm)}→${r(a.icu_hrr.end_bpm)})` : undefined],
      ]),
    ]],
    ["Zones", [
      a.icu_zone_times?.length ? `Power: ${a.icu_zone_times.filter((z) => z.secs > 0).map((z) => `${z.id} ${fmtDuration(z.secs)}`).join(" ")}` : "",
      a.icu_hr_zone_times?.length ? `HR: ${a.icu_hr_zone_times.map((secs, i) => (secs > 0 ? `Z${i + 1} ${fmtDuration(secs)}` : "")).filter(Boolean).join(" ")}` : "",
    ]],
    ["Load", [
      fields([
        ["CTL", r(a.icu_ctl, 1)],
        ["ATL", r(a.icu_atl, 1)],
        ["TRIMP", r(a.trimp)],
        ["Power load", r(a.power_load)],
        ["HR load", r(a.hr_load)],
        ["Strain", r(a.strain_score)],
        ["Polarization", r(a.polarization_index, 2)],
      ]),
    ]],
    ["Other", [
      fields([
        ["Cadence", withUnit(r(a.average_cadence), "rpm")],
        ["Speed", a.average_speed != null ? `${r(a.average_speed * 3.6, 1)}km/h${a.max_speed != null ? ` (max ${r(a.max_speed * 3.6, 1)})` : ""}` : undefined],
        ["Temp", withUnit(r(a.average_temp, 1), "°C")],
        ["Coasting", dur(a.coasting_time)],
        ["Trainer", a.trainer ? "yes" : undefined],
      ]),
      fields([
        ["RPE", r(a.icu_rpe ?? a.perceived_exertion)],
        ["Feel", r(a.feel)],
        ["sRPE", r(a.session_rpe)],
        ["Coach tick", r(a.coach_tick)],
        ["Compliance", a.compliance ? `${r(a.compliance)}%` : undefined],
      ]),
      fields([
        ["Weight", withUnit(r(a.icu_weight, 1), "kg")],
        ["Calories", r(a.calories)],
        ["CHO used", withUnit(r(a.carbs_used), "g")],
        ["CHO in", withUnit(r(a.carbs_ingested), "g")],
      ]),
      fields([
        ["Gear", a.gear?.name ?? undefined],
        ["Device", a.device_name ?? undefined],
        ["PM", a.power_meter ?? undefined],
      ]),
    ]],
  ];

  const lines = [`**${a.name ?? "Unnamed"}** (${a.id}) · ${a.type ?? "?"} · ${fmtLocalDate(a.start_date_local)}`];
  for (const [title, rows] of sections) {
    const present = rows.filter(Boolean);
    if (!present.length) continue;
    if (!title) lines.push(...present);
    else if (present.length === 1) lines.push(`${title}: ${present[0]}`);
    else lines.push(`${title}:`, ...present.map((row) => `  ${row}`));
  }
  if (a.description) lines.push(`Description: ${a.description}`);

  return lines.join("\n");
}

const WELLNESS_COLUMNS: [string, (w: Wellness) => string | undefined][] = [
  ["CTL", (w) => r(w.ctl, 1)],
  ["ATL", (w) => r(w.atl, 1)],
  ["Ramp", (w) => r(w.rampRate, 1)],
  ["RHR", (w) => r(w.restingHR)],
  ["SleepHR", (w) => r(w.avgSleepingHR)],
  ["HRV", (w) => r(w.hrv)],
  ["SDNN", (w) => r(w.hrvSDNN)],
  ["Sleep h", (w) => (w.sleepSecs != null ? r(w.sleepSecs / 3600, 1) : undefined)],
  ["SleepScore", (w) => r(w.sleepScore)],
  ["SleepQ", (w) => r(w.sleepQuality)],
  ["Readiness", (w) => r(w.readiness)],
  ["Weight", (w) => r(w.weight, 1)],
  ["BodyFat", (w) => r(w.bodyFat, 1)],
  ["SpO2", (w) => r(w.spO2)],
  ["VO2max", (w) => r(w.vo2max)],
  ["Soreness", (w) => r(w.soreness)],
  ["Fatigue", (w) => r(w.fatigue)],
  ["Stress", (w) => r(w.stress)],
  ["Mood", (w) => r(w.mood)],
  ["Motivation", (w) => r(w.motivation)],
  ["Steps", (w) => r(w.steps)],
  ["Kcal in", (w) => r(w.kcalConsumed)],
];

function fmtSportInfo(s: NonNullable<Wellness["sportInfo"]>[number]): string {
  return `${s.type ?? "Unknown"} eFTP ${r(s.eftp) ?? "?"}W, W' ${r(s.wPrime) ?? "?"}J, Pmax ${r(s.pMax) ?? "?"}W`;
}

// Multi-day wellness as one markdown table; columns with no data in the range are dropped.
export function formatWellnessTable(entries: [string, Wellness][]): string {
  const cols = WELLNESS_COLUMNS.filter(([, get]) => entries.some(([, w]) => get(w) != null));
  const lines = [
    `| Date | ${cols.map(([h]) => h).join(" | ")} |`,
    `|---|${cols.map(() => "---").join("|")}|`,
    ...entries.map(([date, w]) => `| ${date} | ${cols.map(([, get]) => get(w) ?? "").join(" | ")} |`),
  ];

  // eFTP drifts slowly day to day, so the latest value is enough.
  const latest = [...entries].reverse().find(([, w]) => w.sportInfo?.length);
  if (latest) lines.push("", `Sport fitness (${latest[0]}): ${latest[1].sportInfo!.map(fmtSportInfo).join("; ")}`);

  const comments = entries.filter(([, w]) => w.comments);
  if (comments.length) lines.push("", "Comments:", ...comments.map(([date, w]) => `  ${date}: ${w.comments}`));

  return lines.join("\n");
}

export function formatWellness(date: string, w: Wellness): string {
  const present = WELLNESS_COLUMNS.map(([h, get]) => [h, get(w)] as [string, string | undefined]);
  const lines = [`**${date}**`, fields(present) || "No data"];
  if (w.sportInfo?.length) lines.push(`Sport fitness: ${w.sportInfo.map(fmtSportInfo).join("; ")}`);
  if (w.comments) lines.push(`Comments: ${w.comments}`);
  return lines.join("\n");
}

export function formatEvent(e: Event, maxDescription?: number): string {
  const start = fmtLocalDate(e.start_date_local ?? e.date);
  const end = e.end_date_local ? fmtLocalDate(e.end_date_local) : undefined;
  const dateLabel = end && end !== start ? `${start} → ${end}` : start;
  const category = e.category ?? (e.show_as_note ? "NOTE" : "EVENT");

  const lines = [
    `**${e.name ?? "Unnamed"}** (${e.id}) · ${category} · ${dateLabel}`,
    fields([
      ["", e.type ?? undefined],
      ["Planned", dur(e.moving_time)],
      ["Load", r(e.icu_training_load)],
      ["IF", intensityFactor(e.icu_intensity)],
      ["Completed as", e.paired_activity_id ?? undefined],
    ]),
  ];
  if (e.description) {
    const desc = maxDescription != null ? truncate(e.description, maxDescription, "get_event_by_id for full") : e.description;
    lines.push(`Description: ${desc}`);
  }

  return lines.filter(Boolean).join("\n");
}

export function formatFitnessTable(entries: AthleteFitness[]): string {
  return [
    "| Date | CTL | ATL | TSB | Ramp | eFTP | W/kg | TL |",
    "|---|---|---|---|---|---|---|---|",
    ...[...entries].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")).map((e) =>
      `| ${e.date ?? ""} | ${r(e.fitness, 1) ?? ""} | ${r(e.fatigue, 1) ?? ""} | ${r(e.form, 1) ?? ""} | ${r(e.rampRate, 1) ?? ""} | ${r(e.eftp) ?? ""} | ${r(e.eftpPerKg, 2) ?? ""} | ${r(e.training_load) ?? ""} |`
    ),
  ].join("\n");
}

const CURVE_SECS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 5400, 7200];

function fmtSecs(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${s / 60}m`;
  return `${r(s / 3600, 1)}h`;
}

// The raw curve has ~160 points per stream plus start/end indexes; keep the standard durations only.
export function formatPowerCurves(curves: unknown): string {
  const list = (Array.isArray(curves) ? curves : [curves]) as Record<string, unknown>[];
  const out: string[] = [];
  for (const c of list) {
    const secs = c["secs"] as number[] | undefined;
    const values = (c["values"] ?? c["watts"]) as number[] | undefined;
    if (!secs?.length || !values?.length) continue;
    const wkg = c["watts_per_kg"] as number[] | undefined;
    const unit = c["stream_type"] && c["stream_type"] !== "watts" ? "" : "W";
    const points = CURVE_SECS.map((s) => [s, secs.indexOf(s)] as const)
      .filter(([, i]) => i >= 0 && values[i] != null)
      .map(([s, i]) => `${fmtSecs(s)} ${r(values[i])}${unit}${wkg?.[i] != null ? ` (${r(wkg[i], 2)}W/kg)` : ""}`);
    // Always include the longest effort so short activities still show their full-duration best.
    const last = secs.length - 1;
    if (!CURVE_SECS.includes(secs[last])) points.push(`${fmtSecs(secs[last])} ${r(values[last])}${unit}`);
    const label = (c["label"] as string) || (c["stream_type"] as string) || "curve";
    const extras = fields([
      ["VO2max(5m)", r(c["vo2max_5m"] as number | undefined, 1)],
      ["Weight", withUnit(r(c["weight"] as number | undefined, 1), "kg")],
    ]);
    out.push(`${label}: ${points.join(" · ")}${extras ? `\n  ${extras}` : ""}`);
  }
  return out.length ? out.join("\n") : "No power curve data.";
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
    lines.push("");
  }

  if (s.w_prime != null || s.sweet_spot_min != null) {
    lines.push(`Power Model: W' ${n(s.w_prime, " J")} | Sweet Spot ${n(s.sweet_spot_min, "%")}-${n(s.sweet_spot_max, "%")}`);
  }

  if (s.best_effort_distances?.length) {
    lines.push(`Best Effort Distances: ${s.best_effort_distances.join(", ")} m`);
  }

  return lines.join("\n").trimEnd();
}

export function formatIntervalRow(interval: Record<string, unknown>, idx: number): string {
  const num = (k: string) => interval[k] as number | null | undefined;
  const label = (interval["label"] as string) ?? `Interval ${idx}`;
  const type = (interval["type"] as string) ?? "Unknown";
  const hr = num("average_heartrate") != null ? `${r(num("average_heartrate"))}/${r(num("max_heartrate")) ?? "?"}` : undefined;

  return `[${idx}] ${label} (${type}) · ` + fields([
    ["", durExact(num("elapsed_time"))],
    ["", km(num("distance"))],
    ["Avg", withUnit(r(num("average_watts")), "W")],
    ["NP", withUnit(r(num("weighted_average_watts")), "W")],
    ["Max", withUnit(r(num("max_watts")), "W")],
    ["IF", intensityFactor(num("intensity"))],
    ["TSS", r(num("training_load"))],
    ["VI", r(num("w5s_variability"), 2)],
    ["HR", hr],
    ["Cad", r(num("average_cadence"))],
    ["Dec", withUnit(r(num("decoupling"), 1), "%")],
  ], " · ");
}
