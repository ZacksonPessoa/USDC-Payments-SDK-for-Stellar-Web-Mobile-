export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export class RateLimiter {
  private count: number = 0;
  private windowStart: number = Date.now();
  private windowMs: number;
  private max: number;

  constructor(config: RateLimitConfig = { windowMs: 60 * 1000, max: 100 }) {
    this.windowMs = config.windowMs;
    this.max = config.max;
  }

  check(): boolean {
    const now = Date.now();
    if (now - this.windowStart > this.windowMs) {
      this.windowStart = now;
      this.count = 0;
    }

    if (this.count < this.max) {
      this.count++;
      return true;
    }

    return false;
  }
}
