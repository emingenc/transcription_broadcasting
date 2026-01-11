import { sessionManager } from "./SessionManager";

interface Message {
  text: string;
  time: Date;
}

interface Broadcast {
  listeners: Set<string>; // listenerEmails
  messages: Message[]; // Recent messages for webview
}

class BroadcastService {
  // broadcasterEmail -> Broadcast
  private broadcasts = new Map<string, Broadcast>();

  // Go live
  start(email: string): { live: boolean } {
    if (!this.broadcasts.has(email)) {
      this.broadcasts.set(email, { listeners: new Set(), messages: [] });
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

  // Send text to all listeners' glasses
  send(email: string, text: string): { sent: boolean; reached: number; debug?: any } {
    const broadcast = this.broadcasts.get(email);
    if (!broadcast) return { sent: false, reached: 0 };

    // Store message for webview
    broadcast.messages.push({ text, time: new Date() });
    if (broadcast.messages.length > 50) broadcast.messages.shift(); // Keep last 50

    // Debug: log listeners and connected glasses
    const listeners = Array.from(broadcast.listeners);
    const connectedCount = sessionManager.getConnectedCount();
    console.log(`📡 Listeners: ${JSON.stringify(listeners)}`);
    console.log(`📡 Connected glasses sessions: ${connectedCount}`);

    // Send to each listener's glasses (looked up by their email)
    let reached = 0;
    for (const listenerEmail of broadcast.listeners) {
      const glassesSession = sessionManager.getUserSession(listenerEmail);
      console.log(`📡 Looking up glasses for ${listenerEmail}: ${glassesSession ? 'FOUND (' + glassesSession.userId + ')' : 'NOT FOUND'}`);
      if (glassesSession) {
        try {
          glassesSession.session.layouts.showTextWall(text);
          reached++;
          console.log(`✅ Sent to ${listenerEmail}`);
        } catch (e) {
          console.error(`Failed to send to ${listenerEmail}:`, e);
        }
      }
    }

    console.log(`📤 "${text.slice(0, 30)}..." → ${reached} glasses`);
    return { sent: true, reached, debug: { listeners, connectedCount } };
  }

  // Join broadcaster by email
  join(
    listenerEmail: string,
    broadcasterEmail: string
  ): { joined: boolean; error?: string } {
    const broadcast = this.broadcasts.get(broadcasterEmail);
    if (!broadcast) return { joined: false, error: "Not live" };

    broadcast.listeners.add(listenerEmail);
    console.log(`👂 ${listenerEmail} joined ${broadcasterEmail}`);
    return { joined: true };
  }

  // Leave
  leave(listenerEmail: string, broadcasterEmail: string): { left: boolean } {
    const broadcast = this.broadcasts.get(broadcasterEmail);
    if (broadcast) broadcast.listeners.delete(listenerEmail);
    return { left: true };
  }

  // Status
  getStatus(email: string): { live: boolean; listenerCount: number } {
    const broadcast = this.broadcasts.get(email);
    return {
      live: !!broadcast,
      listenerCount: broadcast?.listeners.size || 0,
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
