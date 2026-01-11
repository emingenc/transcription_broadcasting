import { sessionManager } from "./SessionManager";
import { ViewType } from "@mentra/sdk";

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
      // Auto-add broadcaster as listener so they can see their own speech (confidence monitor)
      const listeners = new Set<string>();
      listeners.add(email);
      this.broadcasts.set(email, { listeners, messages: [] });
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
          // Logic adapted from smart_glass_mcp/src/tools/display.ts
          const textToSend = text.slice(0, 2000);
          const durationMs = 3000;
          const chunkSize = 120;
          
          // If short text, display directly
          if (textToSend.length <= chunkSize) {
            console.log(`Writing to glasses of ${listenerEmail}: "${textToSend}"`);
            glassesSession.session.layouts.showTextWall(textToSend, { 
              view: ViewType.MAIN, 
              durationMs 
            });
          } else {
            console.log(`Chunking text for ${listenerEmail}: ${textToSend.length} chars`);
            // Split long text into chunks and display sequentially
            const chunks: string[] = [];
            for (let i = 0; i < textToSend.length; i += chunkSize) {
              chunks.push(textToSend.slice(i, i + chunkSize));
            }
            
            // Display chunks with proper delays (fire and forget)
            (async () => {
              for (const chunk of chunks) {
                glassesSession.session.layouts.showTextWall(chunk, { 
                  view: ViewType.MAIN, 
                  durationMs 
                });
                await new Promise(resolve => setTimeout(resolve, durationMs));
              }
            })();
          }

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
