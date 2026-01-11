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

    // Unified webview - both broadcast and listen
    app.get("/webview", async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.authUserId;
      const mode = (req.query.mode as string) || "broadcast";
      const broadcaster = req.query.broadcaster as string;

      if (!userId) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Mentra Cast</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, sans-serif; padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; background: #f5f5f7; }
                h1 { margin-bottom: 10px; font-size: 2em; }
                p { color: #666; margin-bottom: 40px; }
                .btn { display: inline-block; transition: transform 0.2s; }
                .btn:active { transform: scale(0.95); }
              </style>
            </head>
            <body>
              <h1>🎙️ Mentra Cast</h1>
              <p>Real-time text to smart glasses</p>
              <a href="/mentra-auth" class="btn">
                <img src="https://account.mentra.glass/sign-in-mentra.png" alt="Sign in with Mentra" width="240" />
              </a>
            </body>
          </html>
        `;
        return res.send(html);
      }

      // Check broadcast status for this user
      const myStatus = broadcastService.getStatus(userId);

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mentra Cast</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * { box-sizing: border-box; }
              body { font-family: -apple-system, sans-serif; margin: 0; padding: 0; background: #f5f5f7; min-height: 100vh; }
              .header { background: #fff; padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
              .header h1 { font-size: 1.3em; margin: 0; }
              .user { color: #888; font-size: 0.8em; }
              
              .tabs { display: flex; background: #fff; border-bottom: 1px solid #eee; }
              .tab { flex: 1; padding: 14px; text-align: center; cursor: pointer; font-weight: 500; color: #888; border-bottom: 2px solid transparent; transition: all 0.2s; }
              .tab.active { color: #007aff; border-bottom-color: #007aff; }
              .tab:hover { background: #f9f9f9; }
              
              .content { padding: 20px; max-width: 600px; margin: 0 auto; }
              .card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
              
              .status-bar { padding: 12px 16px; border-radius: 8px; text-align: center; font-weight: 600; }
              .status-idle { background: #e5e5e5; color: #666; }
              .status-live { background: #ff3b30; color: white; }
              
              .btn { padding: 14px 24px; border: none; border-radius: 8px; font-size: 1em; cursor: pointer; transition: all 0.2s; width: 100%; }
              .btn-primary { background: #007aff; color: white; }
              .btn-primary:hover { background: #0051d5; }
              .btn-danger { background: #ff3b30; color: white; }
              .btn-danger:hover { background: #d63029; }
              .btn:disabled { background: #ccc; cursor: not-allowed; }
              
              .input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em; margin-bottom: 12px; }
              textarea.input { resize: vertical; min-height: 100px; }
              
              .listener-count { font-size: 2em; font-weight: bold; color: #007aff; }
              .label { font-size: 0.9em; color: #888; margin-bottom: 8px; }
              
              .chat { max-height: 400px; overflow-y: auto; }
              .bubble { background: #e9e9eb; padding: 12px 16px; border-radius: 16px; margin-bottom: 8px; }
              .bubble .text { font-size: 1em; line-height: 1.4; }
              .bubble .time { font-size: 0.75em; color: #888; margin-top: 4px; }
              .empty { text-align: center; color: #888; padding: 40px; }
              
              .hidden { display: none; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎙️ Mentra Cast</h1>
              <span class="user">${userId}</span>
            </div>
            
            <div class="tabs">
              <div class="tab ${mode === 'broadcast' ? 'active' : ''}" onclick="switchMode('broadcast')">📡 Broadcast</div>
              <div class="tab ${mode === 'listen' ? 'active' : ''}" onclick="switchMode('listen')">👂 Listen</div>
            </div>

            <!-- BROADCAST MODE -->
            <div id="broadcast-mode" class="content ${mode !== 'broadcast' ? 'hidden' : ''}">
              <div class="card">
                <div class="status-bar ${myStatus.live ? 'status-live' : 'status-idle'}" id="my-status">
                  ${myStatus.live ? '● LIVE' : '● OFFLINE'}
                </div>
                <div style="margin-top: 16px;">
                  <button class="btn ${myStatus.live ? 'btn-danger' : 'btn-primary'}" id="toggle-btn" onclick="toggleBroadcast()">
                    ${myStatus.live ? 'STOP BROADCAST' : 'GO LIVE'}
                  </button>
                </div>
              </div>

              <div class="card" id="broadcast-controls" ${!myStatus.live ? 'style="opacity:0.5;pointer-events:none"' : ''}>
                <div class="label">Listeners</div>
                <div class="listener-count" id="listener-count">${myStatus.listenerCount || 0}</div>
                <div style="margin-top: 8px; color: #888; font-size: 0.85em;">
                  Share your email: <strong>${userId}</strong>
                </div>
              </div>

              <div class="card" id="send-card" ${!myStatus.live ? 'style="opacity:0.5;pointer-events:none"' : ''}>
                <div class="label">Send Message</div>
                <textarea class="input" id="text-input" placeholder="Type your message..."></textarea>
                <button class="btn btn-primary" id="send-btn" onclick="sendMessage()">Send to Glasses</button>
              </div>
            </div>

            <!-- LISTEN MODE -->
            <div id="listen-mode" class="content ${mode !== 'listen' ? 'hidden' : ''}">
              ${!broadcaster ? `
              <div class="card">
                <div class="label">Broadcaster Email</div>
                <input type="email" class="input" id="broadcaster-input" placeholder="broadcaster@email.com" />
                <button class="btn btn-primary" onclick="joinBroadcast()">Join Broadcast</button>
              </div>
              ` : `
              <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div class="label">Listening to</div>
                    <strong>${broadcaster}</strong>
                  </div>
                  <div class="status-bar" id="broadcaster-status" style="padding: 6px 12px;">● LIVE</div>
                </div>
                <button class="btn btn-danger" style="margin-top: 16px;" onclick="leaveBroadcast()">Leave</button>
              </div>
              
              <div class="card">
                <div class="label">Messages</div>
                <div class="chat" id="chat">
                  <div class="empty">Waiting for messages...</div>
                </div>
              </div>
              `}
            </div>

            <script>
              const userId = "${userId}";
              const currentMode = "${mode}";
              let broadcaster = "${broadcaster || ''}";
              let isLive = ${myStatus.live};

              // Restore broadcaster from localStorage if not in URL
              if (currentMode === 'listen' && !broadcaster) {
                const saved = localStorage.getItem('mentra_cast_broadcaster');
                if (saved) {
                  broadcaster = saved;
                  // Redirect with broadcaster in URL
                  location.href = '/webview?mode=listen&broadcaster=' + encodeURIComponent(saved);
                }
              }
              // Save broadcaster to localStorage when listening
              if (currentMode === 'listen' && broadcaster) {
                localStorage.setItem('mentra_cast_broadcaster', broadcaster);
              }

              function switchMode(mode) {
                // Preserve broadcaster when switching tabs
                let url = '/webview?mode=' + mode;
                if (mode === 'listen' && broadcaster) {
                  url += '&broadcaster=' + encodeURIComponent(broadcaster);
                }
                window.location.href = url;
              }

              async function toggleBroadcast() {
                const endpoint = isLive ? '/api/broadcast/stop' : '/api/broadcast/start';
                await fetch(endpoint, { method: 'POST' });
                location.reload();
              }

              async function sendMessage() {
                const text = document.getElementById('text-input').value.trim();
                if (!text) return;
                
                await fetch('/api/broadcast/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text })
                });
                
                document.getElementById('text-input').value = '';
              }

              function joinBroadcast() {
                const email = document.getElementById('broadcaster-input').value.trim();
                if (!email) return;
                
                localStorage.setItem('mentra_cast_broadcaster', email);
                
                fetch('/api/broadcast/join', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ broadcasterEmail: email })
                }).then(() => {
                  location.href = '/webview?mode=listen&broadcaster=' + encodeURIComponent(email);
                });
              }

              function leaveBroadcast() {
                localStorage.removeItem('mentra_cast_broadcaster');
                
                fetch('/api/broadcast/leave', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ broadcasterEmail: broadcaster })
                }).then(() => {
                  location.href = '/webview?mode=listen';
                });
              }

              // Polling for listen mode
              if (currentMode === 'listen' && broadcaster) {
                let lastCount = 0;
                async function pollMessages() {
                  try {
                    const res = await fetch('/api/broadcast/messages?broadcaster=' + encodeURIComponent(broadcaster));
                    const data = await res.json();
                    
                    const statusEl = document.getElementById('broadcaster-status');
                    if (data.live) {
                      statusEl.className = 'status-bar status-live';
                      statusEl.textContent = '● LIVE';
                      statusEl.style.background = '#ff3b30';
                      statusEl.style.color = 'white';
                    } else {
                      statusEl.className = 'status-bar status-idle';
                      statusEl.textContent = '● OFFLINE';
                      statusEl.style.background = '#e5e5e5';
                      statusEl.style.color = '#666';
                    }
                    
                    if (data.messages && data.messages.length !== lastCount) {
                      const chat = document.getElementById('chat');
                      if (data.messages.length === 0) {
                        chat.innerHTML = '<div class="empty">Waiting for messages...</div>';
                      } else {
                        chat.innerHTML = data.messages.map(m => 
                          '<div class="bubble"><div class="text">' + m.text + '</div><div class="time">' + new Date(m.time).toLocaleTimeString() + '</div></div>'
                        ).join('');
                        chat.scrollTop = chat.scrollHeight;
                      }
                      lastCount = data.messages.length;
                    }
                  } catch (e) {}
                }
                pollMessages();
                setInterval(pollMessages, 1000);
              }

              // Polling for broadcast mode (listener count)
              if (currentMode === 'broadcast' && isLive) {
                async function pollStatus() {
                  try {
                    const res = await fetch('/api/broadcast/status');
                    const data = await res.json();
                    document.getElementById('listener-count').textContent = data.listenerCount || 0;
                  } catch (e) {}
                }
                setInterval(pollStatus, 2000);
              }
            </script>
          </body>
        </html>
      `;
      res.send(html);
    });

    // Redirect /join to unified webview
    app.get("/join", (req: Request, res: Response) => {
      const broadcaster = req.query.broadcaster;
      if (broadcaster) {
        res.redirect('/webview?mode=listen&broadcaster=' + encodeURIComponent(broadcaster as string));
      } else {
        res.redirect('/webview?mode=listen');
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
