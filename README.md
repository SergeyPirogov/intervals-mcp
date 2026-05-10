# intervals-icu-mcp-server

MCP server for [Intervals.icu](https://intervals.icu) — connects Claude / Claude Code to your training data.

## Installation

```bash
npx -y intervals-icu-mcp-server
```

Or install globally:

```bash
npm install -g intervals-icu-mcp-server
```

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "intervals-icu": {
      "command": "npx",
      "args": ["-y", "intervals-icu-mcp-server"],
      "env": {
        "API_KEY": "your_api_key",
        "ATHLETE_ID": "i12345"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "intervals-icu": {
      "command": "npx",
      "args": ["-y", "intervals-icu-mcp-server"],
      "env": {
        "API_KEY": "your_api_key",
        "ATHLETE_ID": "i12345"
      }
    }
  }
}
```

- **API_KEY**: Settings → API → Generate key on intervals.icu
- **ATHLETE_ID**: The `i12345` part of your intervals.icu profile URL

## Tools

### Activities
| Tool | Description |
|------|-------------|
| `get_activities` | List activities with power, HR, training load, etc. |
| `get_activity_details` | Full metrics for a specific activity |
| `get_activity_intervals` | Per-interval breakdown (power, HR, speed, elevation) |
| `get_activity_streams` | Raw per-second data streams (watts, HR, cadence, speed, altitude) |
| `get_activity_power_curves` | Best power for all durations (5s, 1min, 5min, 20min, etc.) |

### Wellness & Fitness
| Tool | Description |
|------|-------------|
| `get_wellness_data` | Weight, HRV, sleep, CTL/ATL, subjective scores for a date range |
| `get_wellness_day` | Wellness data for a single date |
| `update_wellness` | Log weight, HRV, sleep, mood, soreness, etc. |

### Athlete
| Tool | Description |
|------|-------------|
| `get_athlete_profile` | FTP, LTHR, weight, VO2max, resting HR |
| `get_athlete_zones` | Power, HR and pace training zones |
| `get_athlete_summary` | Current CTL, ATL, TSB and ramp rate snapshot |

### Calendar Events
| Tool | Description |
|------|-------------|
| `get_events` | Calendar events (workouts, races) for a date range |
| `get_event_by_id` | Full details for a specific event |
| `create_event` | Create a new event (workout, note, race) |
| `update_event` | Update event fields or move it to a new date |
| `delete_event` | Delete an event |
| `bulk_create_events` | Create multiple events at once |
| `bulk_delete_events` | Delete multiple events at once |

### Workout Library
| Tool | Description |
|------|-------------|
| `list_workouts` | List all workouts in the library |
| `create_workout` | Save a new structured workout to the library |

## Development

```bash
git clone https://github.com/SergeyPirogov/intervals-mcp.git
cd intervals-mcp
npm install
npm run build
npm run dev          # watch mode
npm run inspector    # MCP inspector UI
```
