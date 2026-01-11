# Copilot Instructions

## What this repo is

Mentra Cast - Real-time text broadcasting to smart glasses. One person speaks, everyone sees.

## Architecture

```
Broadcaster Webview → REST API → BroadcastService → Mentra SDK → Listeners' Glasses
```

One server. No database. No WebSockets. In-memory state.

## Key files

- `src/index.ts` — Entry point, HTTP server
- `src/api/broadcast.ts` — REST API endpoints
- `src/services/BroadcastService.ts` — In-memory broadcast logic
- `src/services/MentraService.ts` — Mentra SDK + webviews

## Rules

1. Keep it simple - no unnecessary complexity
2. Use `@mentra/sdk` for glasses communication
3. Broadcasts are in-memory (no database)
4. Email = broadcast ID (no session codes)
5. Validate with zod

## API Endpoints

```
POST /api/broadcast/start   - Go live
POST /api/broadcast/stop    - End broadcast
POST /api/broadcast/send    - Send text to listeners
POST /api/broadcast/join    - Join a broadcast
POST /api/broadcast/leave   - Leave a broadcast
GET  /api/broadcast/status  - Get broadcast status
GET  /api/broadcast/messages - Get message history
```

## Webviews

- `/webview` — Broadcaster control panel (login, go live, send text)
- `/join` — Listener join page (enter email, see chat bubbles)
