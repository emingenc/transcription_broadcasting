import { AppServer, AppSession, ViewType } from "@mentra/sdk";
import { config } from "../config/env";
import { sessionManager, GlassesSession } from "./SessionManager";
import { broadcastService } from "./BroadcastService";
import { DisplayService } from "./DisplayService";
import { createBroadcastRoutes } from "../api/broadcast";
import { loginPage, mainWebview } from "../views/templates";
import type { Request, Response } from "express";

interface AuthenticatedRequest extends Request {
  authUserId?: string;
}

/**
 * Mentra SDK integration service.
 * Handles glasses connections and webview routing.
 */
export class MentraService extends AppServer {
  constructor() {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.internalPort,
    });

    this.setupRoutes();
  }

  private setupRoutes() {
    const app = this.getExpressApp();

    // API routes
    app.use("/api/broadcast", createBroadcastRoutes());

    // Main webview
    app.get("/webview", (req: AuthenticatedRequest, res: Response) => {
      const userId = req.authUserId;

      if (!userId) {
        return res.send(loginPage());
      }

      const mode = (req.query.mode as "broadcast" | "listen") || "broadcast";
      const broadcaster = req.query.broadcaster as string | undefined;
      const status = broadcastService.getStatus(userId);

      res.send(
        mainWebview({
          userId,
          mode,
          broadcaster,
          isLive: status.live,
          listenerCount: status.listenerCount,
        })
      );
    });

    // Redirect /join to webview
    app.get("/join", (req: Request, res: Response) => {
      const broadcaster = req.query.broadcaster;
      const url = broadcaster
        ? `/webview?mode=listen&broadcaster=${encodeURIComponent(broadcaster as string)}`
        : "/webview?mode=listen";
      res.redirect(url);
    });
  }

  /**
   * Called when glasses connect to this app.
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    console.log(`🔗 Glasses connected: ${userId}`);

    // Create session data
    const data: GlassesSession = {
      session,
      userId,
      transcriptions: [],
      events: [],
    };
    sessionManager.addSession(sessionId, data);

    // Voice transcription → auto-broadcast
    session.events.onTranscription((t) => {
      data.transcriptions.push({
        text: t.text,
        isFinal: t.isFinal,
        timestamp: new Date().toISOString(),
      });
      if (data.transcriptions.length > 100) data.transcriptions.shift();

      if (t.isFinal && broadcastService.isLive(userId)) {
        console.log(`📤 [${userId}] "${t.text}"`);
        broadcastService.send(userId, t.text);
      }
    });

    // Button events
    session.events.onButtonPress?.((d: any) => {
      data.events.push({ type: "button", data: d, timestamp: new Date().toISOString() });
      if (data.events.length > 50) data.events.shift();
    });

    // Disconnect
    session.events.onDisconnected?.(() => {
      console.log(`🔌 Glasses disconnected: ${userId}`);
      sessionManager.removeSession(sessionId);
    });
  }
}
