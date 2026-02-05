/**
 * SSE (Server-Sent Events) manager for payment journey.
 * Keeps clients per session in memory and broadcasts new events.
 * Heartbeat every ~15s to keep connections alive.
 */

import type { PaymentEvent } from "../journey/events";

export type ServerResponse = {
  write: (chunk: string) => void;
  writeHead: (status: number, headers?: Record<string, string>) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
  on?: (event: string, fn: () => void) => void;
};

const HEARTBEAT_INTERVAL_MS = 15000;
const SSE_EVENT_NAME = "payment_event";

export class JourneySseManager {
  /** sessionId -> Set of response objects */
  private clients = new Map<string, Set<ServerResponse>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Register a client for a session. Call unregister when connection closes.
   */
  register(sessionId: string, res: ServerResponse): void {
    let set = this.clients.get(sessionId);
    if (!set) {
      set = new Set();
      this.clients.set(sessionId, set);
    }
    set.add(res);
    if (!this.heartbeatTimer) this.startHeartbeat();
  }

  /**
   * Unregister a client (e.g. on close).
   */
  unregister(sessionId: string, res: ServerResponse): void {
    const set = this.clients.get(sessionId);
    if (set) {
      set.delete(res);
      if (set.size === 0) this.clients.delete(sessionId);
    }
    if (this.clients.size === 0 && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Broadcast an event to all clients subscribed to that session.
   */
  broadcast(sessionId: string, event: PaymentEvent): void {
    const set = this.clients.get(sessionId);
    if (!set) return;
    const line = `event: ${SSE_EVENT_NAME}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const res of set) {
      try {
        res.write(line);
      } catch {
        set.delete(res);
      }
    }
  }

  /**
   * Send heartbeat comment to all clients.
   */
  private sendHeartbeat(): void {
    const ping = ": ping\n\n";
    for (const set of this.clients.values()) {
      for (const res of set) {
        try {
          res.write(ping);
        } catch {
          set.delete(res);
        }
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
  }
}

/**
 * Format a single SSE event line for payment_event.
 */
export function formatSseEvent(event: PaymentEvent): string {
  return `event: payment_event\ndata: ${JSON.stringify(event)}\n\n`;
}
