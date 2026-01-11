import { ViewType } from "@mentra/sdk";
import type { GlassesSession } from "./SessionManager";

const CHUNK_SIZE = 120;
const DEFAULT_DURATION_MS = 3000;

/**
 * Handles displaying text on glasses.
 * Single Responsibility: Only deals with text rendering on glasses.
 */
export class DisplayService {
  /**
   * Display text on a user's glasses with auto-chunking for long text.
   */
  static async showText(
    glassesSession: GlassesSession,
    text: string,
    durationMs = DEFAULT_DURATION_MS
  ): Promise<void> {
    const textToSend = text.slice(0, 2000);

    if (textToSend.length <= CHUNK_SIZE) {
      await glassesSession.session.layouts.showTextWall(textToSend, {
        view: ViewType.MAIN,
        durationMs,
      });
    } else {
      // Split into chunks and display sequentially
      const chunks = this.splitIntoChunks(textToSend, CHUNK_SIZE);
      for (const chunk of chunks) {
        await glassesSession.session.layouts.showTextWall(chunk, {
          view: ViewType.MAIN,
          durationMs,
        });
        await this.sleep(durationMs);
      }
    }
  }

  private static splitIntoChunks(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
