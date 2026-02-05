# Payment Journey Observability

The Payment Journey feature records and streams events for each payment session so you can visualize the full path: session created → wallet actions → tx submitted → seen on network → confirmed → webhook ack.

## Enable / Disable

Set the environment variable:

- `PAYMENT_JOURNEY_ENABLED=true` (default) — events are emitted when a journey emitter is set.
- `PAYMENT_JOURNEY_ENABLED=false` — no journey events are emitted.

## Setup (Server)

1. Create a `Database` (or reuse your existing one), initialize it, and create journey storage + SSE:

```ts
import { Database, JourneyStorage, JourneySseManager, setJourneyEmitter } from "@zacksonpessoa/usdc-payments-sdk/server";

const db = new Database("usdc_payments.db");
await db.init();

const sse = new JourneySseManager();
const journeyStorage = new JourneyStorage(db, sse);

// So that createPaymentSession / signAndSubmit / WebhookSender emit to the store
setJourneyEmitter(journeyStorage.appendEvent.bind(journeyStorage));
```

2. Pass `journeyStore` into `PaymentMonitor` so it records TX_SEEN_ON_NETWORK, TX_CONFIRMED, TX_FAILED:

```ts
const monitor = new PaymentMonitor("TESTNET", storeWallet, webhookConfig, {
  adapter: db,
  journeyStore,
});
```

3. Mount the journey API handlers (e.g. on your HTTP server):

```ts
import {
  handleGetJourney,
  handleGetStream,
  handleListPayments,
  parseJourneyPath,
  parseListPaymentsQuery,
} from "@zacksonpessoa/usdc-payments-sdk/server";

// Example: Node http server
http.createServer(async (req, res) => {
  const url = req.url ?? "";
  const path = url.split("?")[0];
  const method = req.method;

  // GET /payments/:sessionId/journey or GET /payments/:sessionId/stream
  const journeyMatch = parseJourneyPath(path);
  if (method === "GET" && journeyMatch) {
    if (journeyMatch.kind === "journey") {
      await handleGetJourney(journeyMatch.sessionId, journeyStorage, res);
      return;
    }
    if (journeyMatch.kind === "stream") {
      handleGetStream(journeyMatch.sessionId, { storage: journeyStorage, sse }, req, res);
      return;
    }
  }

  // GET /payments?status=pending&limit=50 (path must be exactly /payments)
  if (method === "GET" && path === "/payments") {
    const query = parseListPaymentsQuery(url);
    if (query.status === "pending") {
      await handleListPayments(query, db, res);
      return;
    }
  }

  res.writeHead(404);
  res.end();
}).listen(3000);
```

## Query journey (JSON)

Get all events for a session, ordered by time ascending:

```bash
curl -s "http://localhost:3000/payments/session-1234567890/journey"
```

Example response:

```json
[
  {
    "id": "evt_...",
    "sessionId": "session-1234567890",
    "type": "SESSION_CREATED",
    "ts": 1738740000000,
    "data": { "amount": 10, "asset": "USDC", "to": "G...", "network": "TESTNET" },
    "level": "info"
  },
  {
    "id": "evt_...",
    "sessionId": "session-1234567890",
    "type": "TX_SUBMITTED",
    "ts": 1738740001000,
    "data": { "txHash": "abc...", "amount": 10, "asset": "USDC", "to": "G...", "network": "TESTNET" },
    "level": "info"
  }
]
```

## Stream (SSE)

Subscribe to live events for a session:

```bash
curl -N "http://localhost:3000/payments/session-1234567890/stream"
```

SSE format:

- Event name: `payment_event`
- Data: one JSON object per event
- Heartbeat: `: ping` every ~15 seconds

Example output:

```
event: payment_event
data: {"id":"evt_...","sessionId":"session-1234567890","type":"TX_CONFIRMED","ts":1738740002000,"data":{"txHash":"abc..."},"level":"info"}

: ping

event: payment_event
data: {"id":"evt_...","sessionId":"session-1234567890","type":"WEBHOOK_ACKED","ts":1738740003000,...}
```

## Event types

| Type | When |
|------|------|
| `SESSION_CREATED` | After `createPaymentSession` |
| `WALLET_CONNECTED` | When your app reports wallet connected (e.g. via your own endpoint) |
| `TX_SIGN_REQUESTED` | Before signing in `signAndSubmit` |
| `TX_SUBMITTED` | After successful Horizon submit in `signAndSubmit` |
| `TX_FAILED` | On submit failure or validation failure |
| `TX_SEEN_ON_NETWORK` | When PaymentMonitor sees the tx on Horizon |
| `TX_CONFIRMED` | When PaymentMonitor confirms payment |
| `WEBHOOK_SENT` | When webhook HTTP request is sent |
| `WEBHOOK_ACKED` | When webhook response is OK |

Events are stored with idempotency: same `sessionId + type + txHash + ts_bucket` does not duplicate.
