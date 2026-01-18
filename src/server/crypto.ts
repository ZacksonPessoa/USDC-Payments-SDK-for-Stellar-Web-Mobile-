import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Generates an HMAC-SHA256 signature for the given payload and secret.
 * @param payload The JSON stringified payload.
 * @param secret The webhook secret key.
 * @returns The hex encoded signature.
 */
export function generateSignature(payload: string, secret: string): string {
  if (!secret) throw new Error("Secret is required for signature generation");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifies the signature using constant-time comparison to prevent timing attacks.
 * @param payload The JSON stringified payload.
 * @param signature The signature received in the header (hex).
 * @param secret The webhook secret key.
 * @returns True if valid, false otherwise.
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;

  const expectedSignature = generateSignature(payload, secret);

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  // Ensure lengths match before comparing to avoid leaking length info (though timingSafeEqual handles it somewhat)
  if (sigBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
