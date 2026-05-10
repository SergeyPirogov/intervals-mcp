import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  getActivities,
  getActivityDetails,
  getActivityIntervals,
  getWellness,
  getEvents,
  getEventById,
  getNotesByDate,
  createEvent,
  updateEvent,
  deleteEvent,
  getAthleteProfile,
  getAthleteZones,
  getAthleteSummary,
  getWellnessDay,
  updateWellness,
  getActivityStreams,
  getActivityPowerCurves,
  listWorkouts,
  createWorkout,
  bulkCreateEvents,
  bulkDeleteEvents,
  getAthleteFitness,
  type ClientConfig,
} from "./client.js";
import {
  formatActivity,
  formatWellness,
  formatEvent,
  formatIntervalRow,
} from "./format.js";

function getConfig(args: Record<string, unknown>): ClientConfig {
  const apiKey =
    (args["api_key"] as string | undefined) ?? process.env.API_KEY ?? "";
  const athleteId =
    (args["athlete_id"] as string | undefined) ??
    process.env.ATHLETE_ID ??
    "";

  if (!apiKey) throw new Error("No API key provided. Set API_KEY in .env or pass api_key.");
  if (!athleteId) throw new Error("No athlete ID provided. Set ATHLETE_ID in .env or pass athlete_id.");

  return { apiKey, athleteId };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const TOOLS = [
  {
    name: "get_activities",
    description:
      "Get a list of activities for an athlete from Intervals.icu. Returns activity summaries including power, HR, distance, and training metrics.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: 30 days ago)" },
        end_date: { type: "string", description: "End date YYYY-MM-DD (default: today)" },
        limit: { type: "number", description: "Max activities to return (default: 10)" },
        include_unnamed: { type: "boolean", description: "Include unnamed activities (default: false)" },
      },
    },
  },
  {
    name: "get_activity_details",
    description:
      "Get detailed metrics for a specific activity by ID, including power zones, HR zones, and full metrics.",
    inputSchema: {
      type: "object",
      required: ["activity_id"],
      properties: {
        activity_id: { type: "string", description: "The activity ID" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
      },
    },
  },
  {
    name: "get_activity_intervals",
    description:
      "Get interval breakdown for a specific activity: power, HR, cadence, speed, elevation per interval and group.",
    inputSchema: {
      type: "object",
      required: ["activity_id"],
      properties: {
        activity_id: { type: "string", description: "The activity ID" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
      },
    },
  },
  {
    name: "get_wellness_data",
    description:
      "Get wellness data (weight, HRV, sleep, readiness, CTL/ATL, subjective metrics) for a date range.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: 30 days ago)" },
        end_date: { type: "string", description: "End date YYYY-MM-DD (default: today)" },
      },
    },
  },
  {
    name: "get_events",
    description:
      "Get calendar events (workouts, races) for an athlete in a date range.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: today)" },
        end_date: { type: "string", description: "End date YYYY-MM-DD (default: 30 days from now)" },
      },
    },
  },
  {
    name: "get_event_by_id",
    description:
      "Get full details for a specific calendar event by ID.",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id: { type: "string", description: "The event ID" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "create_event",
    description:
      "Create a new calendar event (workout, note, race) on a specific date in Intervals.icu.",
    inputSchema: {
      type: "object",
      required: ["start_date_local"],
      properties: {
        start_date_local: { type: "string", description: "Date/time in ISO 8601 format, e.g. 2024-06-01T08:00:00" },
        name: { type: "string", description: "Event name" },
        description: { type: "string", description: "Event description / workout notes" },
        category: { type: "string", description: "Event category: WORKOUT, NOTE, RACE_A, RACE_B, RACE_C (race priority A/B/C)" },
        type: { type: "string", description: "Activity type: Ride, Run, Swim, WeightTraining, etc." },
        race: { type: "boolean", description: "Mark as a race event (default: false)" },
        distance: { type: "number", description: "Distance in meters (e.g. 100000 for 100km)" },
        sub_type: { type: "string", description: "Race category/sub-type (e.g. A, B, C)" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "update_event",
    description:
      "Update an existing calendar event. Pass only the fields you want to change.",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id: { type: "string", description: "The event ID to update" },
        start_date_local: { type: "string", description: "New date/time (moves the event), e.g. 2024-06-05T08:00:00" },
        name: { type: "string", description: "New event name" },
        description: { type: "string", description: "New description" },
        category: { type: "string", description: "New category" },
        type: { type: "string", description: "New activity type" },
        race: { type: "boolean", description: "Toggle race flag" },
        distance: { type: "number", description: "Distance in meters (e.g. 100000 for 100km)" },
        sub_type: { type: "string", description: "Race category/sub-type (e.g. A, B, C)" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "delete_event",
    description:
      "Delete a calendar event from Intervals.icu by ID. This action cannot be undone.",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id: { type: "string", description: "The event ID to delete" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_athlete_profile",
    description: "Get athlete profile including FTP, LTHR, weight, VO2max and other settings.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_athlete_zones",
    description: "Get power, heart rate, and pace training zones for the athlete.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_athlete_summary",
    description: "Get current fitness snapshot: CTL (fitness), ATL (fatigue), TSB (form), and ramp rate.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_wellness_day",
    description: "Get wellness data for a specific single date.",
    inputSchema: {
      type: "object",
      required: ["date"],
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "update_wellness",
    description: "Log or update wellness data for a specific date (weight, HRV, sleep, subjective metrics, etc.).",
    inputSchema: {
      type: "object",
      required: ["date"],
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        weight: { type: "number", description: "Body weight in kg" },
        restingHR: { type: "number", description: "Resting heart rate in bpm" },
        hrv: { type: "number", description: "HRV score" },
        hrvSDNN: { type: "number", description: "HRV SDNN value" },
        sleepSecs: { type: "number", description: "Sleep duration in seconds" },
        sleepScore: { type: "number", description: "Sleep score 0-100" },
        sleepQuality: { type: "number", description: "Sleep quality 1-10" },
        readiness: { type: "number", description: "Readiness score 1-10" },
        soreness: { type: "number", description: "Muscle soreness 1-10" },
        fatigue: { type: "number", description: "Fatigue level 1-10" },
        stress: { type: "number", description: "Stress level 1-10" },
        mood: { type: "number", description: "Mood 1-10" },
        motivation: { type: "number", description: "Motivation 1-10" },
        steps: { type: "number", description: "Step count" },
        kcalConsumed: { type: "number", description: "Calories consumed" },
        spO2: { type: "number", description: "Blood oxygen %" },
        comments: { type: "string", description: "Free-text notes" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_activity_streams",
    description: "Get raw time-series data streams for an activity (watts, HR, cadence, speed, altitude, etc.) — one value per second.",
    inputSchema: {
      type: "object",
      required: ["activity_id"],
      properties: {
        activity_id: { type: "string", description: "The activity ID" },
        types: {
          type: "array",
          items: { type: "string" },
          description: "Stream types to fetch, e.g. [\"watts\",\"heartrate\",\"cadence\",\"velocity_smooth\",\"altitude\"]. Omit for all.",
        },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_activity_power_curves",
    description: "Get best power output for standard durations (5s, 1min, 5min, 20min, 60min, etc.) for an activity — the power curve / critical power profile.",
    inputSchema: {
      type: "object",
      required: ["activity_id"],
      properties: {
        activity_id: { type: "string", description: "The activity ID" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "list_workouts",
    description: "List all workouts in the athlete's workout library.",
    inputSchema: {
      type: "object",
      properties: {
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "create_workout",
    description: "Create a new structured workout in the athlete's workout library.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Workout name" },
        description: { type: "string", description: "Workout description" },
        type: { type: "string", description: "Activity type: Ride, Run, Swim, etc." },
        folder_id: { type: "number", description: "Folder ID to save workout into (required by API)" },
        workout_doc: { type: "object", description: "Structured workout definition (Intervals.icu workout_doc format)" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_athlete_fitness",
    description: "Get Fitness (CTL), Fatigue (ATL), Form (TSB), ramp rate and eFTP from the Fitness chart for a date range. Matches what you see on the Intervals.icu Fitness page.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: 30 days ago)" },
        end_date: { type: "string", description: "End date YYYY-MM-DD (default: today)" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "get_note",
    description: "Get a specific note/event by ID, or list all notes for a given date.",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "Event/note ID to fetch by ID" },
        date: { type: "string", description: "Date YYYY-MM-DD to list all notes for that day" },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "bulk_create_events",
    description: "Create multiple calendar events at once.",
    inputSchema: {
      type: "object",
      required: ["events"],
      properties: {
        events: {
          type: "array",
          description: "Array of event objects to create",
          items: {
            type: "object",
            properties: {
              start_date_local: { type: "string", description: "ISO 8601 date/time" },
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              type: { type: "string" },
              race: { type: "boolean" },
            },
          },
        },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
  {
    name: "bulk_delete_events",
    description: "Delete multiple calendar events at once by their IDs.",
    inputSchema: {
      type: "object",
      required: ["event_ids"],
      properties: {
        event_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of event IDs to delete",
        },
        athlete_id: { type: "string", description: "Athlete ID (defaults to ATHLETE_ID env var)" },
        api_key: { type: "string", description: "API key (defaults to API_KEY env var)" },
      },
    },
  },
] as const;

const server = new Server(
  { name: "intervals-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({ ...t, inputSchema: t.inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "get_activities": {
        const config = getConfig(args);
        const startDate = (args["start_date"] as string | undefined) ?? daysAgo(30);
        const endDate = (args["end_date"] as string | undefined) ?? today();
        const limit = (args["limit"] as number | undefined) ?? 10;
        const includeUnnamed = (args["include_unnamed"] as boolean | undefined) ?? false;

        let activities = await getActivities(config, { startDate, endDate, limit: limit * 3 });

        if (!includeUnnamed) {
          activities = activities.filter(
            (a) => a.name && a.name !== "Unnamed"
          );
        }
        activities = activities.slice(0, limit);

        if (activities.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: includeUnnamed
                  ? "No activities found in the specified date range."
                  : "No named activities found. Try with include_unnamed: true.",
              },
            ],
          };
        }

        const text = activities.map(formatActivity).join("\n\n---\n\n");
        return { content: [{ type: "text", text }] };
      }

      case "get_activity_details": {
        const activityId = z.string().parse(args["activity_id"]);
        const config = getConfig(args);
        const activity = await getActivityDetails(config, activityId);
        return { content: [{ type: "text", text: formatActivity(activity) }] };
      }

      case "get_activity_intervals": {
        const activityId = z.string().parse(args["activity_id"]);
        const config = getConfig(args);
        const data = await getActivityIntervals(config, activityId);

        const lines: string[] = [`Intervals for activity ${activityId}`, ""];

        const intervals = data["icu_intervals"] as Array<Record<string, unknown>> | undefined;
        const groups = data["icu_groups"] as Array<Record<string, unknown>> | undefined;

        if (intervals?.length) {
          lines.push("## Individual Intervals", "");
          intervals.forEach((iv, i) => lines.push(formatIntervalRow(iv, i + 1), ""));
        }

        if (groups?.length) {
          lines.push("## Groups", "");
          groups.forEach((g, i) => lines.push(formatIntervalRow(g, i + 1), ""));
        }

        if (!intervals?.length && !groups?.length) {
          lines.push("No interval data found for this activity.");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      case "get_wellness_data": {
        const config = getConfig(args);
        const startDate = (args["start_date"] as string | undefined) ?? daysAgo(30);
        const endDate = (args["end_date"] as string | undefined) ?? today();

        const wellnessMap = await getWellness(config, { startDate, endDate });
        const entries = Object.entries(wellnessMap).sort(([a], [b]) => a.localeCompare(b));

        if (entries.length === 0) {
          return { content: [{ type: "text", text: "No wellness data found for the specified date range." }] };
        }

        const text = entries.map(([date, w]) => formatWellness(date, w)).join("\n\n---\n\n");
        return { content: [{ type: "text", text }] };
      }

      case "get_events": {
        const config = getConfig(args);
        const startDate = (args["start_date"] as string | undefined) ?? today();
        const endDate = (args["end_date"] as string | undefined) ?? daysFromNow(30);

        const events = await getEvents(config, { startDate, endDate });

        if (events.length === 0) {
          return { content: [{ type: "text", text: "No events found in the specified date range." }] };
        }

        const text = events.map(formatEvent).join("\n\n---\n\n");
        return { content: [{ type: "text", text }] };
      }

      case "get_event_by_id": {
        const eventId = z.string().parse(args["event_id"]);
        const config = getConfig(args);
        const event = await getEventById(config, eventId);
        return { content: [{ type: "text", text: formatEvent(event) }] };
      }

      case "get_athlete_fitness": {
        const config = getConfig(args);
        const startDate = (args["start_date"] as string | undefined) ?? daysAgo(30);
        const endDate = (args["end_date"] as string | undefined) ?? today();
        const entries = await getAthleteFitness(config, { startDate, endDate });

        if (!entries.length) {
          return { content: [{ type: "text", text: "No fitness data found for the specified date range." }] };
        }

        const lines = entries.map((e) => {
          const ctl = e.fitness != null ? e.fitness.toFixed(1) : "N/A";
          const atl = e.fatigue != null ? e.fatigue.toFixed(1) : "N/A";
          const tsb = e.form != null ? e.form.toFixed(1) : "N/A";
          const ramp = e.rampRate != null ? e.rampRate.toFixed(1) : "N/A";
          const eftp = e.eftp != null ? `${e.eftp.toFixed(0)}W` : "N/A";
          const eftpKg = e.eftpPerKg != null ? `${e.eftpPerKg.toFixed(2)} W/kg` : "N/A";
          const tl = e.training_load != null ? e.training_load.toFixed(0) : "N/A";
          return [
            `**${e.date ?? "N/A"}**`,
            `  CTL (Fitness): ${ctl} | ATL (Fatigue): ${atl} | TSB (Form): ${tsb}`,
            `  Ramp Rate: ${ramp} | eFTP: ${eftp} (${eftpKg}) | TL: ${tl}`,
          ].join("\n");
        });

        return { content: [{ type: "text", text: lines.join("\n\n") }] };
      }

      case "get_note": {
        const config = getConfig(args);
        const eventId = args["event_id"] as string | undefined;
        const date = args["date"] as string | undefined;

        if (eventId) {
          const event = await getEventById(config, eventId);
          return { content: [{ type: "text", text: formatEvent(event) }] };
        } else if (date) {
          const notes = await getNotesByDate(config, date);
          if (!notes.length) return { content: [{ type: "text", text: `No notes found for ${date}.` }] };
          const text = notes.map(formatEvent).join("\n\n---\n\n");
          return { content: [{ type: "text", text }] };
        } else {
          return { content: [{ type: "text", text: "Provide either event_id or date." }], isError: true };
        }
      }

      case "create_event": {
        const config = getConfig(args);
        const event = await createEvent(config, {
          name: args["name"] as string | undefined,
          description: args["description"] as string | undefined,
          start_date_local: z.string().parse(args["start_date_local"]),
          category: args["category"] as string | undefined,
          type: args["type"] as string | undefined,
          race: args["race"] as boolean | undefined,
          distance: args["distance"] as number | undefined,
          sub_type: args["sub_type"] as string | undefined,
        });
        return { content: [{ type: "text", text: `Created event:\n\n${formatEvent(event)}` }] };
      }

      case "update_event": {
        const eventId = z.string().parse(args["event_id"]);
        const config = getConfig(args);
        const input: Record<string, unknown> = {};
        for (const key of ["name", "description", "start_date_local", "category", "type", "race", "distance", "sub_type"]) {
          if (args[key] !== undefined) input[key] = args[key];
        }
        const event = await updateEvent(config, eventId, input);
        return { content: [{ type: "text", text: `Updated event:\n\n${formatEvent(event)}` }] };
      }

      case "delete_event": {
        const eventId = z.string().parse(args["event_id"]);
        const config = getConfig(args);
        await deleteEvent(config, eventId);
        return { content: [{ type: "text", text: `Event ${eventId} deleted.` }] };
      }

      case "get_athlete_profile": {
        const config = getConfig(args);
        const athlete = await getAthleteProfile(config);
        const lines = [
          `**${athlete.name ?? "Athlete"}** (${athlete.id ?? config.athleteId})`,
          athlete.email ? `Email: ${athlete.email}` : "",
          `Sex: ${athlete.sex ?? "N/A"} | DOB: ${athlete.dob ?? "N/A"} | City: ${athlete.city ?? "N/A"}, ${athlete.country ?? "N/A"}`,
          "",
          "Performance:",
          `  FTP: ${athlete.icu_ftp ?? "N/A"} W | LTHR: ${athlete.icu_lthr ?? "N/A"} bpm`,
          `  Weight: ${athlete.icu_weight ?? athlete.weight ?? "N/A"} kg | VO2max: ${athlete.icu_vo2max ?? "N/A"}`,
          `  Resting HR: ${athlete.icu_resting_hr ?? "N/A"} bpm`,
        ].filter(Boolean).join("\n");
        return { content: [{ type: "text", text: lines }] };
      }

      case "get_athlete_zones": {
        const config = getConfig(args);
        const zones = await getAthleteZones(config);
        const lines: string[] = [];
        const formatZones = (label: string, zoneList: Array<Record<string, unknown>> | undefined) => {
          if (!zoneList?.length) return;
          lines.push(`## ${label} Zones`, "");
          zoneList.forEach((z, i) => {
            const name = z["name"] ?? `Zone ${i + 1}`;
            const min = z["min"] ?? z["from"] ?? "";
            const max = z["max"] ?? z["to"] ?? "";
            lines.push(`  Z${i + 1} ${name}: ${min}–${max}`);
          });
          lines.push("");
        };
        formatZones("Power", zones.power as Array<Record<string, unknown>> | undefined);
        formatZones("Heart Rate", zones.hr as Array<Record<string, unknown>> | undefined);
        formatZones("Pace", zones.pace as Array<Record<string, unknown>> | undefined);
        if (!lines.length) lines.push("No zone data available.");
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      case "get_athlete_summary": {
        const config = getConfig(args);
        const summary = await getAthleteSummary(config);
        const text = [
          "## Current Fitness Snapshot",
          "",
          `CTL (Fitness):  ${summary.ctl ?? "N/A"}`,
          `ATL (Fatigue):  ${summary.atl ?? "N/A"}`,
          `TSB (Form):     ${summary.tsb ?? "N/A"}`,
          `Ramp Rate:      ${summary.rampRate ?? "N/A"}`,
        ].join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "get_wellness_day": {
        const date = z.string().parse(args["date"]);
        const config = getConfig(args);
        const w = await getWellnessDay(config, date);
        return { content: [{ type: "text", text: formatWellness(date, w) }] };
      }

      case "update_wellness": {
        const date = z.string().parse(args["date"]);
        const config = getConfig(args);
        const fields = ["weight","restingHR","hrv","hrvSDNN","sleepSecs","sleepScore","sleepQuality",
          "readiness","soreness","fatigue","stress","mood","motivation","steps","kcalConsumed","spO2","comments"];
        const input: Record<string, unknown> = {};
        for (const f of fields) {
          if (args[f] !== undefined) input[f] = args[f];
        }
        const w = await updateWellness(config, date, input);
        return { content: [{ type: "text", text: `Updated wellness for ${date}:\n\n${formatWellness(date, w)}` }] };
      }

      case "get_activity_streams": {
        const activityId = z.string().parse(args["activity_id"]);
        const config = getConfig(args);
        const types = args["types"] as string[] | undefined;
        const streams = await getActivityStreams(config, activityId, types);
        const keys = Object.keys(streams);
        if (!keys.length) return { content: [{ type: "text", text: "No stream data returned." }] };
        const lines = [`Streams for activity ${activityId}`, `Available: ${keys.join(", ")}`, ""];
        for (const key of keys) {
          const arr = streams[key] as unknown[];
          lines.push(`**${key}** (${arr.length} points): first 5 = [${arr.slice(0, 5).join(", ")}]`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      case "get_activity_power_curves": {
        const activityId = z.string().parse(args["activity_id"]);
        const config = getConfig(args);
        const curves = await getActivityPowerCurves(config, activityId);
        return { content: [{ type: "text", text: `Power curves for activity ${activityId}:\n\n${JSON.stringify(curves, null, 2)}` }] };
      }

      case "list_workouts": {
        const config = getConfig(args);
        const workouts = await listWorkouts(config);
        if (!workouts.length) return { content: [{ type: "text", text: "No workouts in library." }] };
        const text = workouts.map(w =>
          [`**${w.name ?? "Unnamed"}** (${w.id})`, w.type ? `Type: ${w.type}` : "", w.description ? `${w.description}` : ""].filter(Boolean).join("\n")
        ).join("\n\n---\n\n");
        return { content: [{ type: "text", text }] };
      }

      case "create_workout": {
        const config = getConfig(args);
        const workout = await createWorkout(config, {
          name: args["name"] as string | undefined,
          description: args["description"] as string | undefined,
          type: args["type"] as string | undefined,
          folder_id: args["folder_id"] as number | undefined,
          workout_doc: args["workout_doc"],
        });
        const text = [`Created workout **${workout.name ?? "Unnamed"}** (${workout.id})`, workout.type ? `Type: ${workout.type}` : ""].filter(Boolean).join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "bulk_create_events": {
        const config = getConfig(args);
        const events = args["events"] as Array<Record<string, unknown>>;
        const created = await bulkCreateEvents(config, events);
        const text = [`Created ${created.length} events:`, "", ...created.map(e => formatEvent(e))].join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "bulk_delete_events": {
        const config = getConfig(args);
        const ids = z.array(z.string()).parse(args["event_ids"]);
        await bulkDeleteEvents(config, ids);
        return { content: [{ type: "text", text: `Deleted ${ids.length} events: ${ids.join(", ")}` }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Intervals MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
