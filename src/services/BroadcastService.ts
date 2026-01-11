import { sessionManager } from "./SessionManager";

interface Message {
  text: string;
  time: Date;
}

interface Broadcast {
  listeners: Map<string, string>; // listenerEmail -> glassesSessionId
  messages: Message[]; // Recent messages for webview
}

class BroadcastService {
  // broadcasterEmail -> Broadcast
  private broadcasts = new Map<string, Broadcast>();

  // Go live
  start(email: string): { live: boolean } {
    if (!this.broadcasts.has(email)) {
      this.broadcasts.set(email, { listeners: new Map(), messages: [] });
      console.log(`📡 ${email} is LIVE`);
    }
    return { live: true };
  }

  // Stop
  stop(email: string): { stopped: boolean } {
    this.broadcasts.delete(email);
    console.log(`🛑 ${email} stopped`);
    return { stopped: true };
  }

  // Send text to all listeners
  send(email: string, text: string): { sent: boolean; reached: number } {
    const broadcast = this.broadcasts.get(email);
    if (!broadcast) return { sent: false, reached: 0 };

    // Store message for webview
    broadcast.messages.push({ text, time: new Date() });
    if (broadcast.messages.length > 50) broadcast.messages.shift(); // Keep last 50

    let reached = 0;
    for (const [, glassesSessionId] of broadcast.listeners) {
      const session = sessionManager.getSession(glassesSessionId);
      if (session) {
        try {
          session.session.layouts.showTextWall(text);
          reached++;
        } catch (e) {
          console.error(e);
        }
      }
    }

    console.log(`📤 "${text.slice(0, 30)}..." → ${reached}`);
    return { sent: true, reached };
  }

  // Join broadcaster by email
  join(
    listenerEmail: string,
    broadcasterEmail: string,
    glassesSessionId: string
  ): { joined: boolean; error?: string } {
    const broadcast = this.broadcasts.get(broadcasterEmail);
    if (!broadcast) return { joined: false, error: "Not live" };

    broadcast.listeners.set(listenerEmail, glassesSessionId);
    console.log(`👂 ${listenerEmail} → ${broadcasterEmail}`);
    return { joined: true };
  }

  // Leave
  leave(listenerEmail: string, broadcasterEmail: string): { left: boolean } {
    const broadcast = this.broadcasts.get(broadcasterEmail);
    if (broadcast) broadcast.listeners.delete(listenerEmail);
    return { left: true };
  }

  // Status
  getStatus(email: string): { live: boolean; listeners: number } {
    const broadcast = this.broadcasts.get(email);
    return {
      live: !!broadcast,
      listeners: broadcast?.listeners.size || 0,
    };
  }

  // Get messages (for listener webview)
  getMessages(broadcasterEmail: string): Message[] {
    const broadcast = this.broadcasts.get(broadcasterEmail);
    return broadcast?.messages || [];
  }

  // Check if broadcaster is live
  isLive(broadcasterEmail: string): boolean {
    return this.broadcasts.has(broadcasterEmail);
  }
}

export const broadcastService = new BroadcastService();
