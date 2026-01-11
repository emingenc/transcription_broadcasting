import { AppSession } from "@mentra/sdk";

export interface GlassesSession {
  session: AppSession;
  userId: string; // Mentra email
  transcriptions: Array<{ text: string; isFinal: boolean; timestamp: string }>;
  events: Array<{ type: string; data: any; timestamp: string }>;
}

class SessionManager {
  // Map: sessionId → GlassesSession (sessionId is "userId-packageName")
  private sessions = new Map<string, GlassesSession>();

  addSession(sessionId: string, data: GlassesSession) {
    this.sessions.set(sessionId, data);
  }

  removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): GlassesSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Get session by user email
  getUserSession(userEmail: string): GlassesSession | undefined {
    // Admin sees first available
    if (userEmail === "*") {
      return this.sessions.size > 0 ? [...this.sessions.values()][0] : undefined;
    }
    // Find glasses where userId matches
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userEmail) return session;
    }
    return undefined;
  }

  // Debug: list all connected users
  listConnectedUsers(): string[] {
    return [...this.sessions.values()].map(s => s.userId);
  }

  getConnectedCount(): number {
    return this.sessions.size;
  }
}

export const sessionManager = new SessionManager();
