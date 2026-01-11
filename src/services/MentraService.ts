import { AppServer, AppSession } from "@mentra/sdk";
import { config, debugLog } from "../config/env";
import { sessionManager, GlassesSession } from "./SessionManager";
import { broadcastService } from "./BroadcastService";
import { createBroadcastRoutes } from "../api/broadcast";
import type { Request, Response } from "express";

interface AuthenticatedRequest extends Request {
  authUserId?: string;
}

export class MentraService extends AppServer {
  constructor() {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.internalPort,
    });

    this.setupRoutes();
    this.setupWebview();
  }

  private setupRoutes() {
    const app = this.getExpressApp();
    app.use("/api/broadcast", createBroadcastRoutes());
  }

  private setupWebview() {
    const app = this.getExpressApp();

    // Broadcaster webview
    app.get("/webview", async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.authUserId;

      if (userId) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Mentra Cast - Broadcast</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #fff; color: #000; }
                .card { border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .code-box { background: #f5f5f7; padding: 16px; font-family: monospace; font-size: 2em; border-radius: 8px; word-break: break-all; margin: 10px 0; text-align: center; font-weight: bold; color: #007aff; letter-spacing: 4px; }
                h1 { font-size: 1.8em; margin-bottom: 8px; }
                .user { color: #888; font-size: 0.9em; margin-bottom: 30px; }
                h3 { margin-top: 0; font-size: 1.1em; }
                p { color: #555; line-height: 1.5; }
                .status-bar { padding: 12px 16px; border-radius: 8px; text-align: center; font-weight: 600; margin: 20px 0; }
                .status-idle { background: #f0f0f0; color: #555; }
                .status-live { background: #34c759; color: white; }
                .btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 1em; cursor: pointer; transition: all 0.2s; }
                .btn-primary { background: #007aff; color: white; }
                .btn-primary:hover { background: #0051d5; }
                .btn-danger { background: #ff3b30; color: white; }
                .input-textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em; }
                .listener-count { font-size: 1.4em; font-weight: bold; color: #007aff; }
              </style>
            </head>
            <body>
              <h1>🎙️ Mentra Cast</h1>
              <div class="user">Broadcaster: ${userId}</div>
              
              <div class="card">
                <div class="status-bar status-idle" id="status">● IDLE</div>
                <button class="btn btn-primary" id="go-live-btn" style="width: 100%; padding: 16px; font-size: 1.2em;">GO LIVE</button>
              </div>

              <div class="card">
                <h3>Listeners: <span class="listener-count" id="listener-count">0</span></h3>
                <p id="session-code" style="text-align: center; font-family: monospace; font-size: 1.5em; color: #007aff; margin: 10px 0;">Share code: ------</p>
              </div>

              <div class="card">
                <h3>Message</h3>
                <textarea class="input-textarea" id="text-input" placeholder="Type your message..." rows="4" disabled></textarea>
                <button class="btn btn-primary" id="send-btn" style="width: 100%; margin-top: 10px;" disabled>Send</button>
              </div>

              <div class="card">
                <h3>Settings</h3>
                <label>
                  <input type="checkbox" id="translation-toggle" checked disabled />
                  Enable translation for listeners
                </label>
              </div>

              <script>
                // Placeholder for broadcast logic
                document.getElementById('go-live-btn').addEventListener('click', async () => {
                  const isLive = document.getElementById('status').classList.contains('status-live');
                  if (isLive) {
                    await fetch('/api/broadcast/stop', { method: 'POST' });
                  } else {
                    await fetch('/api/broadcast/start', { method: 'POST' });
                  }
                  location.reload();
                });
              </script>
            </body>
          </html>
        `;
        res.send(html);
      } else {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Login Required</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, sans-serif; padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
                h1 { margin-bottom: 20px; }
                p { color: #666; margin-bottom: 40px; }
                .btn { display: inline-block; transition: transform 0.2s; }
                .btn:active { transform: scale(0.95); }
              </style>
            </head>
            <body>
              <h1>🎙️ Mentra Cast</h1>
              <p>Sign in to start broadcasting</p>
              <a href="/mentra-auth" class="btn">
                <img src="https://account.mentra.glass/sign-in-mentra.png" alt="Sign in with Mentra" width="240" />
              </a>
            </body>
          </html>
        `;
        res.send(html);
      }
    });

    // Listener join webview
    app.get("/join", async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.authUserId;
      const broadcaster = req.query.broadcaster as string;

      if (userId) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Mentra Cast - Listen</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                * { box-sizing: border-box; }
                body { font-family: -apple-system, sans-serif; padding: 0; margin: 0; background: #f5f5f7; color: #000; height: 100vh; display: flex; flex-direction: column; }
                .header { background: #fff; padding: 16px 20px; border-bottom: 1px solid #eee; }
                h1 { font-size: 1.4em; margin: 0; }
                .subtitle { color: #888; font-size: 0.85em; margin-top: 4px; }
                .status { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8em; font-weight: 600; }
                .status.live { background: #ff3b30; color: white; }
                .status.offline { background: #8e8e93; color: white; }
                
                .join-form { padding: 20px; background: #fff; }
                .input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em; margin-bottom: 10px; }
                .btn { padding: 12px 24px; background: #007aff; color: white; border: none; border-radius: 8px; font-size: 1em; cursor: pointer; width: 100%; }
                .btn:hover { background: #0051d5; }
                .btn.leave { background: #ff3b30; }
                
                .chat { flex: 1; overflow-y: auto; padding: 20px; }
                .bubble { background: #fff; padding: 12px 16px; border-radius: 16px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); max-width: 85%; }
                .bubble .text { font-size: 1.1em; line-height: 1.4; }
                .bubble .time { font-size: 0.75em; color: #888; margin-top: 4px; }
                .empty { text-align: center; color: #888; padding: 40px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🎙️ Mentra Cast</h1>
                <div class="subtitle" id="broadcaster-info">
                  ${broadcaster ? `Listening to: ${broadcaster}` : 'Enter broadcaster email to join'}
                </div>
              </div>

              ${!broadcaster ? `
              <div class="join-form">
                <input type="email" class="input" id="broadcaster-input" placeholder="broadcaster@email.com" />
                <button class="btn" onclick="joinBroadcast()">Join Broadcast</button>
              </div>
              ` : `
              <div class="join-form" style="display: flex; gap: 10px;">
                <span class="status live" id="status">● LIVE</span>
                <button class="btn leave" style="flex:1" onclick="leaveBroadcast()">Leave</button>
              </div>
              <div class="chat" id="chat">
                <div class="empty">Waiting for messages...</div>
              </div>
              `}

              <script>
                const broadcaster = "${broadcaster || ''}";
                const userId = "${userId}";

                function joinBroadcast() {
                  const email = document.getElementById('broadcaster-input').value;
                  if (email) {
                    fetch('/api/broadcast/join', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ broadcasterEmail: email })
                    }).then(() => {
                      location.href = '/join?broadcaster=' + encodeURIComponent(email);
                    });
                  }
                }

                function leaveBroadcast() {
                  fetch('/api/broadcast/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ broadcasterEmail: broadcaster })
                  }).then(() => {
                    location.href = '/join';
                  });
                }

                ${broadcaster ? `
                let lastCount = 0;
                async function pollMessages() {
                  try {
                    const res = await fetch('/api/broadcast/messages?broadcaster=' + encodeURIComponent(broadcaster));
                    const data = await res.json();
                    
                    if (!data.live) {
                      document.getElementById('status').className = 'status offline';
                      document.getElementById('status').textContent = '● OFFLINE';
                    }
                    
                    if (data.messages && data.messages.length > lastCount) {
                      const chat = document.getElementById('chat');
                      chat.innerHTML = data.messages.map(m => \`
                        <div class="bubble">
                          <div class="text">\${m.text}</div>
                          <div class="time">\${new Date(m.time).toLocaleTimeString()}</div>
                        </div>
                      \`).join('');
                      chat.scrollTop = chat.scrollHeight;
                      lastCount = data.messages.length;
                    }
                  } catch (e) {}
                }
                pollMessages();
                setInterval(pollMessages, 1000);
                ` : ''}
              </script>
            </body>
          </html>
        `;
        res.send(html);
      } else {
        res.redirect('/mentra-auth');
      }
    });
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    debugLog(`Glasses connected: ${userId}`);

    const data: GlassesSession = { session, userId, transcriptions: [], events: [] };
    sessionManager.addSession(sessionId, data);

    // Voice transcription listener
    session.events.onTranscription((t) => {
      if (t.isFinal) debugLog(`Transcription [${userId}]:`, t.text);
      data.transcriptions.push({ text: t.text, isFinal: t.isFinal, timestamp: new Date().toISOString() });
      if (data.transcriptions.length > 100) data.transcriptions.shift();
    });

    // Button events
    session.events.onButtonPress?.((d: any) => {
      debugLog(`Button [${userId}]:`, d);
      data.events.push({ type: "button", data: d, timestamp: new Date().toISOString() });
      if (data.events.length > 50) data.events.shift();
    });

    // Handle disconnect
    session.events.onDisconnect?.(() => {
      debugLog(`Glasses disconnected: ${userId}`);
      sessionManager.removeSession(sessionId);
    });
  }
}
