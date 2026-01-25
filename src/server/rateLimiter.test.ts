import { describe, it, expect, vi } from 'vitest';
import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
  it('should allow requests within the limit', () => {
    const limiter = new RateLimiter({ windowMs: 1000, max: 2 });
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
  });

  it('should block requests exceeding the limit', () => {
    const limiter = new RateLimiter({ windowMs: 1000, max: 2 });
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);
  });

  it('should reset after windowMs', async () => {
    const limiter = new RateLimiter({ windowMs: 100, max: 1 });
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);

    // Wait for window to pass
    await new Promise(r => setTimeout(r, 150));

    // Should be allowed again
    expect(limiter.check()).toBe(true);
  });
});
