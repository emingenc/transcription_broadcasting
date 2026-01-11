import { sessionManager } from "./SessionManager";
import { DisplayService } from "./DisplayService";

interface Message {
  text: string;
  time: Date;
}

interface Broadcast {
  listeners: Set<string>;
  messages: Message[];
}

const MAX_MESSAGES = 50;

/**
 * Manages broadcast state and message routing.
 * Single Responsibility: Only handles broadcast lifecycle and message distribution.
 */
class BroadcastService {
  private broadcasts = new Map<string, Broadcast>();

  /** Start broadcasting (go live). */
  start(email: string): { live: boolean } {
    if (!this.broadcasts.has(email)) {
      this.broadcasts.set(email, { listeners: new Set(), messages: [] });
      console.log(`📡 ${email} is LIVE`);
    }
    return { live: true };
  }

  /** Stop broadcasting. */
  stop(email: string): { stopped: boolean } {
    this.broadcasts.delete(email);
    console.log(`🛑 ${email} stopped`);
    return { stopped: true };
  }

  /** Send text to all listeners' glasses. */
  send(email: string, text: string): { sent: boolean; reached: number } {
    const broadcast = this.broadcasts.get(email);
    if (!broadcast) {
      console.log(`⚠️ Cannot send - ${email} is not live`);
      return { sent: false, reached: 0 };
    }

    // Store for webview
    broadcast.messages.push({ text, time: new Date() });
    if (broadcast.messages.length > MAX_MESSAGES) broadcast.messages.shift();

    // Debug: show listener count and connected glasses
    console.log(`📡 Broadcast has ${broadcast.listeners.size} listeners: [${[...broadcast.listeners].join(', ')}]`);
    console.log(`📡 Connected glasses: [${sessionManager.listConnectedUsers().join(', ')}]`);

    // Send to each listener
    let reached = 0;
    for (const listenerEmail of broadcast.listeners) {
      const glasses = sessionManager.getUserSession(listenerEmail);
      console.log(`📡 Listener ${listenerEmail}: glasses ${glasses ? 'CONNECTED' : 'NOT CONNECTED'}`);
      if (glasses) {
        DisplayService.showText(glasses, text).catch((e) =>
          console.error(`Display error for ${listenerEmail}:`, e)
        );
        reached++;
      }
    }

    console.log(`📤 "${text.slice(0, 30)}..." → ${reached} glasses`);
    return { sent: true, reached };
  }

  /** Listener joins a broadcast. */
  join(listenerEmail: string, broadcasterEmail: string): { joined: boolean; error?: string } {
    const broadcast = this.broadcasts.get(broadcasterEmail);
    if (!broadcast) return { joined: false, error: "Broadcaster not live" };
    broadcast.listeners.add(listenerEmail);
    console.log(`👂 ${listenerEmail} joined ${broadcasterEmail}`);
    return { joined: true };
  }

  /** Listener leaves a broadcast. */
  leave(listenerEmail: string, broadcasterEmail: string): { left: boolean } {
    this.broadcasts.get(broadcasterEmail)?.listeners.delete(listenerEmail);
    return { left: true };
  }

  /** Get broadcaster status. */
  getStatus(email: string): { live: boolean; listenerCount: number } {
    const broadcast = this.broadcasts.get(email);
    return { live: !!broadcast, listenerCount: broadcast?.listeners.size ?? 0 };
  }

  /** Get messages for webview. */
  getMessages(broadcasterEmail: string): Message[] {
    return this.broadcasts.get(broadcasterEmail)?.messages ?? [];
  }

  /** Check if broadcaster is live. */
  isLive(broadcasterEmail: string): boolean {
    return this.broadcasts.has(broadcasterEmail);
  }
}

export const broadcastService = new BroadcastService();
