/**
 * HTTP handlers for payment journey API.
 * GET /payments/:sessionId/journey -> listEvents(sessionId)
 * GET /payments/:sessionId/stream -> SSE stream for that session
 * GET /payments?status=pending&limit=50 -> optional list of pending payments
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { validateSessionId } from "../journey/events";
import type { JourneyStorageAdapter } from "./journeyStorage";
import type { JourneySseManager } from "./journeySse";
import type { PersistenceAdapter } from "./persistence";

const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export interface JourneyApiOptions {
  storage: JourneyStorageAdapter;
  sse: JourneySseManager;
  /** Optional: for GET /payments?status=pending */
  persistence?: PersistenceAdapter;
}

/**
 * Handle GET /payments/:sessionId/journey - returns JSON array of events.
 */
export async function handleGetJourney(
  sessionId: string,
  storage: JourneyStorageAdapter,
  res: ServerResponse
): Promise<void> {
  try {
    validateSessionId(sessionId);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (e as Error).message }));
    return;
  }
  try {
    const events = await storage.listEvents(sessionId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(events));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}

/**
 * Handle GET /payments/:sessionId/stream - SSE stream for session.
 */
export function handleGetStream(
  sessionId: string,
  options: { storage: JourneyStorageAdapter; sse: JourneySseManager },
  req: IncomingMessage,
  res: ServerResponse
): void {
  try {
    validateSessionId(sessionId);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (e as Error).message }));
    return;
  }

  res.writeHead(200, SSE_HEADERS);
  options.sse.register(sessionId, res);

  req.on("close", () => {
    options.sse.unregister(sessionId, res);
  });

  // Send existing events first so client gets full journey then live updates
  options.storage.listEvents(sessionId).then((events) => {
    for (const event of events) {
      try {
        res.write(`event: payment_event\ndata: ${JSON.stringify(event)}\n\n`);
      } catch {
        break;
      }
    }
  }).catch(() => {});
}

/**
 * Handle GET /payments?status=pending&limit=50 - list pending payments (optional).
 */
export async function handleListPayments(
  params: { status?: string; limit?: number },
  persistence: PersistenceAdapter,
  res: ServerResponse
): Promise<void> {
  if (params.status !== "pending") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Only status=pending is supported" }));
    return;
  }
  const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
  try {
    const list = await persistence.getPendingPayments();
    const slice = list.slice(0, limit);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ payments: slice }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}

/**
 * Parse path like /payments/:sessionId/journey or /payments/:sessionId/stream.
 */
export function parseJourneyPath(path: string): { sessionId: string; kind: "journey" | "stream" } | null {
  const match = path.match(/^\/payments\/([^/]+)\/(journey|stream)$/);
  if (!match) return null;
  return { sessionId: decodeURIComponent(match[1]), kind: match[2] as "journey" | "stream" };
}

/**
 * Parse query for GET /payments?status=...&limit=...
 */
export function parseListPaymentsQuery(url: string): { status?: string; limit?: number } {
  const q = url?.split("?")[1];
  if (!q) return {};
  const params = new URLSearchParams(q);
  const limit = params.get("limit");
  return {
    status: params.get("status") ?? undefined,
    limit: limit != null ? parseInt(limit, 10) : undefined,
  };
}
