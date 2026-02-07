/**
 * Optional global emitter for payment journey events.
 * Set by the server (e.g. setJourneyEmitter(store.appendEvent.bind(store)))
 * so that createPaymentSession / signAndSubmit can emit without API changes.
 */

import type { PaymentEvent } from "./events";
import { isPaymentJourneyEnabled } from "./events";

let currentEmitter: ((event: PaymentEvent) => void) | null = null;

export function setJourneyEmitter(emit: (event: PaymentEvent) => void): void {
  currentEmitter = emit;
}

export function clearJourneyEmitter(): void {
  currentEmitter = null;
}

export function emitJourneyEvent(event: PaymentEvent): void {
  if (!isPaymentJourneyEnabled()) return;
  if (currentEmitter) {
    try {
      currentEmitter(event);
    } catch (error) {
      // Swallowing error to prevent breaking payment flow.
      // Observability failures should never impact the core transaction.
      console.warn("Failed to emit payment journey event", error);
    }
  }
}
