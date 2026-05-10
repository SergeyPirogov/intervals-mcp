# intervals-mcp

MCP server for [Intervals.icu](https://intervals.icu) — connects Claude / Claude Code to your training data.

## Tools

| Tool | Description |
|------|-------------|
| `get_activities` | List activities with power, HR, training load, etc. |
| `get_activity_details` | Full metrics for a specific activity |
| `get_activity_intervals` | Per-interval breakdown (power, HR, speed, elevation) |
| `get_wellness_data` | Weight, HRV, sleep, CTL/ATL, subjective scores |
| `get_events` | Calendar events (workouts, races) |
| `get_event_by_id` | Full details for a specific event |

## Setup

### 1. Install & build

```bash
npm install
npm run build
```

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env and fill in your API_KEY and ATHLETE_ID
```

- **API_KEY**: Settings → API → Generate key on intervals.icu
- **ATHLETE_ID**: The `i12345` part of your intervals.icu profile URL

### 3. Add to Claude Code

Add this to your `~/.claude/settings.json` (or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "intervals": {
      "command": "node",
      "args": ["/Users/spirohov/work/intervals/dist/index.js"],
      "env": {
        "API_KEY": "your_key_here",
        "ATHLETE_ID": "i12345"
      }
    }
  }
}
```

Or use a `.env` file — the server loads it automatically from the project root.

### 4. Add to Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "intervals": {
      "command": "node",
      "args": ["/Users/spirohov/work/intervals/dist/index.js"],
      "env": {
        "API_KEY": "your_key_here",
        "ATHLETE_ID": "i12345"
      }
    }
  }
}
```

## Development

```bash
npm run dev          # watch mode
npm run inspector    # MCP inspector UI
```
