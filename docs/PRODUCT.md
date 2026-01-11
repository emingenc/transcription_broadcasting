# Mentra Cast

Real-time text broadcasting to smart glasses.

## What it does

- One person broadcasts text to multiple listeners
- Text appears on listeners' smart glasses via MentraOS
- Works with any MentraOS-compatible glasses (Even Realities G1, Vuzix, etc.)

## Architecture

```
Broadcaster → REST API → BroadcastService → Mentra SDK → Glasses
   (Web)       (Bun)       (In-memory)      (@mentra/sdk)   (G1)
```

One server. No database. No WebSockets. Mentra SDK handles real-time delivery.

## How it works

1. **Broadcaster** opens `/webview`, logs in, clicks GO LIVE
2. **Listeners** open `/join`, enter broadcaster email, join
3. **Broadcaster** types text, clicks Send
4. **Listeners** see text on glasses + chat bubbles in webview

## Setup

1. **Register your app** at https://console.mentra.glass
   - Get your `PACKAGE_NAME` and `MENTRAOS_API_KEY`

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   PACKAGE_NAME=com.yourname.mentracast
   MENTRAOS_API_KEY=your-api-key
   ```

3. **Run**:
   ```bash
   bun install
   bun run dev
   ```

4. **Expose publicly** (for testing with real glasses):
   ```bash
   ngrok http 3000
   ```

## Endpoints

- `/webview` - Broadcaster login & control panel
- `/join` - Listener join page
- `/api/broadcast/*` - REST API
- `/health` - Health check
- `/mentra-auth` - OAuth callback (handled by SDK)

## Tech Stack

- **Bun** - Runtime
- **Express** - HTTP server
- **@mentra/sdk** - Glasses SDK
- **Zod** - Validation
