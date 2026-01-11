# Mentra Cast

Real-time text broadcasting to smart glasses. One person speaks, everyone sees.

## What it does

- Broadcaster goes LIVE and types/speaks text
- Listeners join by broadcaster email
- Text appears on all listeners' glasses in real-time
- Chat bubble history in listener webview

## Architecture

```
Broadcaster Webview → REST API → BroadcastService → Mentra SDK → Listeners' Glasses
```

No database. No WebSockets. Just in-memory broadcasts + Mentra SDK.

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Mentra Developer Account & API Key from https://console.mentra.glass

## Setup

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd mentra-cast
   bun install
   ```

2. **Configure**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   PACKAGE_NAME=com.yourname.mentracast
   MENTRAOS_API_KEY=your-api-key
   ```

3. **Run**
   ```bash
   bun run dev
   ```

Server starts on `http://localhost:3000`

## Usage

### Broadcaster
1. Open `http://localhost:3000/webview`
2. Login with Mentra account
3. Click **GO LIVE**
4. Type text and click **Send** — appears on all listeners' glasses

### Listener
1. Open `http://localhost:3000/join`
2. Enter broadcaster's email
3. Click **Join Broadcast**
4. See messages as chat bubbles + on glasses

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/broadcast/start` | Start broadcasting |
| POST | `/api/broadcast/stop` | Stop broadcasting |
| POST | `/api/broadcast/send` | Send text to listeners |
| POST | `/api/broadcast/join` | Join a broadcast |
| POST | `/api/broadcast/leave` | Leave a broadcast |
| GET | `/api/broadcast/status` | Get broadcast status |
| GET | `/api/broadcast/messages` | Get message history |

## Deployment

### Render (Recommended)

1. Push to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Connect repo, select Docker runtime
4. Set environment variables:
   - `PACKAGE_NAME`: Your Mentra app package name
   - `MENTRAOS_API_KEY`: Your Mentra API key
   - `PORT`: 3000

### Docker

```bash
docker-compose -f docker/docker-compose.yml up --build
```

## Project Structure

```
src/
  index.ts              # Entry point
  api/broadcast.ts      # REST endpoints
  services/
    BroadcastService.ts # In-memory broadcast logic
    MentraService.ts    # Mentra SDK + webviews
    SessionManager.ts   # Glasses session tracking
```

## Future (Phase 2)

- Real-time translation layer
- Voice-to-text integration
- Multiple broadcast rooms

## License
GNU Affero General Public License v3.0
See LICENSE file for details.



