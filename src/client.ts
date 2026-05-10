import { z } from "zod";

const BASE_URL = process.env.INTERVALS_API_BASE_URL ?? "https://intervals.icu/api/v1";

export interface ClientConfig {
  apiKey: string;
  athleteId: string;
}

function getAuth(apiKey: string): string {
  return "Basic " + Buffer.from(`API_KEY:${apiKey}`).toString("base64");
}

async function request<T>(
  path: string,
  config: ClientConfig,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: getAuth(config.apiKey),
      Accept: "application/json",
      "User-Agent": "intervals-mcp/0.1.0",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Intervals.icu API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---- Schemas ---- //

export const ActivitySchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  type: z.string().optional(),
  startTime: z.string().optional(),
  distance: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  moving_time: z.number().nullable().optional(),
  elevationGain: z.number().nullable().optional(),
  avgPower: z.number().nullable().optional(),
  icu_weighted_avg_watts: z.number().nullable().optional(),
  trainingLoad: z.number().nullable().optional(),
  icu_ftp: z.number().nullable().optional(),
  icu_intensity: z.number().nullable().optional(),
  avgHr: z.number().nullable().optional(),
  max_heartrate: z.number().nullable().optional(),
  average_cadence: z.number().nullable().optional(),
  calories: z.number().nullable().optional(),
  average_speed: z.number().nullable().optional(),
  icu_ctl: z.number().nullable().optional(),
  icu_atl: z.number().nullable().optional(),
  trimp: z.number().nullable().optional(),
  average_temp: z.number().nullable().optional(),
  perceived_exertion: z.number().nullable().optional(),
  feel: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  trainer: z.boolean().nullable().optional(),
}).passthrough();

export type Activity = z.infer<typeof ActivitySchema>;

export const WellnessSchema = z.object({
  id: z.string().optional(),
  ctl: z.number().nullable().optional(),
  atl: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  restingHR: z.number().nullable().optional(),
  hrv: z.number().nullable().optional(),
  hrvSDNN: z.number().nullable().optional(),
  sleepSecs: z.number().nullable().optional(),
  sleepScore: z.number().nullable().optional(),
  sleepQuality: z.number().nullable().optional(),
  readiness: z.number().nullable().optional(),
  soreness: z.number().nullable().optional(),
  fatigue: z.number().nullable().optional(),
  stress: z.number().nullable().optional(),
  mood: z.number().nullable().optional(),
  motivation: z.number().nullable().optional(),
  steps: z.number().nullable().optional(),
  kcalConsumed: z.number().nullable().optional(),
  vo2max: z.number().nullable().optional(),
  bodyFat: z.number().nullable().optional(),
  spO2: z.number().nullable().optional(),
  comments: z.string().nullable().optional(),
}).passthrough();

export type Wellness = z.infer<typeof WellnessSchema>;

export const EventSchema = z.object({
  id: z.union([z.string(), z.number()]),
  date: z.string().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  race: z.boolean().nullable().optional(),
  workout: z.unknown().nullable().optional(),
  priority: z.string().nullable().optional(),
}).passthrough();

export type Event = z.infer<typeof EventSchema>;

export const IntervalSchema = z.object({
  icu_intervals: z.array(z.record(z.unknown())).optional(),
  icu_groups: z.array(z.record(z.unknown())).optional(),
}).passthrough();

export interface EventInput {
  name?: string;
  description?: string;
  start_date_local?: string;
  category?: string;
  type?: string;
  race?: boolean;
  distance?: number;
  sub_type?: string;
}

export const AthleteSchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  dob: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  icu_ftp: z.number().nullable().optional(),
  icu_lthr: z.number().nullable().optional(),
  icu_resting_hr: z.number().nullable().optional(),
  icu_weight: z.number().nullable().optional(),
  icu_vo2max: z.number().nullable().optional(),
}).passthrough();

export type Athlete = z.infer<typeof AthleteSchema>;

export const AthleteSummarySchema = z.object({
  ctl: z.number().nullable().optional(),
  atl: z.number().nullable().optional(),
  tsb: z.number().nullable().optional(),
  rampRate: z.number().nullable().optional(),
  ctlLoad: z.number().nullable().optional(),
  atlLoad: z.number().nullable().optional(),
}).passthrough();

export type AthleteSummary = z.infer<typeof AthleteSummarySchema>;

export const ZonesSchema = z.object({
  power: z.array(z.record(z.unknown())).optional(),
  hr: z.array(z.record(z.unknown())).optional(),
  pace: z.array(z.record(z.unknown())).optional(),
}).passthrough();

export type Zones = z.infer<typeof ZonesSchema>;

export const WorkoutSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
}).passthrough();

export type Workout = z.infer<typeof WorkoutSchema>;

export interface WorkoutInput {
  name?: string;
  description?: string;
  type?: string;
  folder_id?: number;
  workout_doc?: unknown;
}

export interface WellnessInput {
  weight?: number;
  restingHR?: number;
  hrv?: number;
  hrvSDNN?: number;
  sleepSecs?: number;
  sleepScore?: number;
  sleepQuality?: number;
  readiness?: number;
  soreness?: number;
  fatigue?: number;
  stress?: number;
  mood?: number;
  motivation?: number;
  steps?: number;
  kcalConsumed?: number;
  spO2?: number;
  comments?: string;
}

// ---- API methods ---- //

export async function getActivities(
  config: ClientConfig,
  params: {
    startDate: string;
    endDate: string;
    limit: number;
  }
): Promise<Activity[]> {
  const data = await request<unknown[]>(
    `/athlete/${config.athleteId}/activities`,
    config,
    { oldest: params.startDate, newest: params.endDate, limit: params.limit }
  );
  return z.array(ActivitySchema).parse(data);
}

export async function getActivityDetails(
  config: ClientConfig,
  activityId: string
): Promise<Activity> {
  const data = await request<unknown>(`/activity/${activityId}`, config);
  return ActivitySchema.parse(data);
}

export async function getActivityIntervals(
  config: ClientConfig,
  activityId: string
): Promise<z.infer<typeof IntervalSchema>> {
  const data = await request<unknown>(`/activity/${activityId}/intervals`, config);
  return IntervalSchema.parse(data);
}

export async function getWellness(
  config: ClientConfig,
  params: { startDate: string; endDate: string }
): Promise<Record<string, Wellness>> {
  const data = await request<unknown>(
    `/athlete/${config.athleteId}/wellness`,
    config,
    { oldest: params.startDate, newest: params.endDate }
  );
  if (Array.isArray(data)) {
    const result: Record<string, Wellness> = {};
    for (const entry of data) {
      const parsed = WellnessSchema.parse(entry);
      const key = (entry as Record<string, unknown>)["date"] as string ?? parsed.id ?? String(Object.keys(result).length);
      result[key] = parsed;
    }
    return result;
  }
  return z.record(WellnessSchema).parse(data);
}

export async function getEvents(
  config: ClientConfig,
  params: { startDate: string; endDate: string }
): Promise<Event[]> {
  const data = await request<unknown[]>(
    `/athlete/${config.athleteId}/events`,
    config,
    { oldest: params.startDate, newest: params.endDate }
  );
  return z.array(EventSchema).parse(data);
}

export async function getEventById(
  config: ClientConfig,
  eventId: string
): Promise<Event> {
  const data = await request<unknown>(
    `/athlete/${config.athleteId}/events/${eventId}`,
    config
  );
  return EventSchema.parse(data);
}

export async function getNotesByDate(
  config: ClientConfig,
  date: string
): Promise<Event[]> {
  const data = await request<unknown[]>(
    `/athlete/${config.athleteId}/events`,
    config,
    { oldest: date, newest: date }
  );
  const events = z.array(EventSchema).parse(data);
  return events.filter((e) => {
    const raw = e as Record<string, unknown>;
    return raw["category"] === "NOTE" || (!e.race && !e.workout);
  });
}

async function mutate<T>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  config: ClientConfig,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: getAuth(config.apiKey),
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "intervals-mcp/0.1.0",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Intervals.icu API error ${res.status}: ${text}`);
  }

  if (method === "DELETE") return undefined as T;
  return res.json() as Promise<T>;
}

export async function createEvent(
  config: ClientConfig,
  input: EventInput
): Promise<Event> {
  const data = await mutate<unknown>(
    "POST",
    `/athlete/${config.athleteId}/events`,
    config,
    input
  );
  return EventSchema.parse(data);
}

export async function updateEvent(
  config: ClientConfig,
  eventId: string,
  input: EventInput
): Promise<Event> {
  const data = await mutate<unknown>(
    "PUT",
    `/athlete/${config.athleteId}/events/${eventId}`,
    config,
    input
  );
  return EventSchema.parse(data);
}

export async function deleteEvent(
  config: ClientConfig,
  eventId: string
): Promise<void> {
  await mutate<undefined>(
    "DELETE",
    `/athlete/${config.athleteId}/events/${eventId}`,
    config
  );
}

export async function getAthleteProfile(config: ClientConfig): Promise<Athlete> {
  const data = await request<unknown>(`/athlete/${config.athleteId}`, config);
  return AthleteSchema.parse(data);
}

export async function getAthleteZones(config: ClientConfig): Promise<Zones> {
  const data = await request<unknown>(`/athlete/${config.athleteId}/zones`, config);
  return ZonesSchema.parse(data);
}

export async function getAthleteSummary(config: ClientConfig): Promise<AthleteSummary> {
  const data = await request<unknown>(`/athlete/${config.athleteId}/summary`, config);
  return AthleteSummarySchema.parse(data);
}

export async function getWellnessDay(
  config: ClientConfig,
  date: string
): Promise<Wellness> {
  const data = await request<unknown>(
    `/athlete/${config.athleteId}/wellness/${date}`,
    config
  );
  return WellnessSchema.parse(data);
}

export async function updateWellness(
  config: ClientConfig,
  date: string,
  input: WellnessInput
): Promise<Wellness> {
  const data = await mutate<unknown>(
    "PUT",
    `/athlete/${config.athleteId}/wellness/${date}`,
    config,
    { ...input, id: date }
  );
  return WellnessSchema.parse(data);
}

export async function getActivityStreams(
  config: ClientConfig,
  activityId: string,
  types?: string[]
): Promise<Record<string, unknown[]>> {
  const params: Record<string, string | number | boolean> = {};
  if (types?.length) params["types"] = types.join(",");
  const data = await request<unknown>(
    `/activity/${activityId}/streams.json`,
    config,
    params
  );
  return data as Record<string, unknown[]>;
}

export async function getActivityPowerCurves(
  config: ClientConfig,
  activityId: string
): Promise<unknown> {
  return request<unknown>(`/activity/${activityId}/power-curves`, config);
}

export async function listWorkouts(config: ClientConfig): Promise<Workout[]> {
  const data = await request<unknown[]>(`/athlete/${config.athleteId}/workouts`, config);
  return z.array(WorkoutSchema).parse(data);
}

export async function createWorkout(
  config: ClientConfig,
  input: WorkoutInput
): Promise<Workout> {
  const data = await mutate<unknown>(
    "POST",
    `/athlete/${config.athleteId}/workouts`,
    config,
    input
  );
  return WorkoutSchema.parse(data);
}

export async function bulkCreateEvents(
  config: ClientConfig,
  events: EventInput[]
): Promise<Event[]> {
  const data = await mutate<unknown[]>(
    "POST",
    `/athlete/${config.athleteId}/events/bulk`,
    config,
    events
  );
  return z.array(EventSchema).parse(data);
}

export async function bulkDeleteEvents(
  config: ClientConfig,
  eventIds: (string | number)[]
): Promise<void> {
  await mutate<undefined>(
    "POST",
    `/athlete/${config.athleteId}/events/bulk-delete`,
    config,
    eventIds
  );
}
