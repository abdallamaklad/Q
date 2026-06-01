/**
 * Token-bucket rate limiter for outbound platform API calls. Each platform has
 * its own bucket so we respect per-API quotas (YouTube, TikTok, etc.).
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillPerSecond: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }

  /** Acquire a token, waiting (up to maxWaitMs) if the bucket is empty. */
  async acquire(maxWaitMs = 5000): Promise<boolean> {
    const deadline = Date.now() + maxWaitMs;
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      if (Date.now() >= deadline) return false;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

export const platformBuckets: Record<string, TokenBucket> = {
  // Conservative defaults; tune to each provider's documented quota.
  youtube: new TokenBucket(100, 1), // ~100 burst, 1/s sustained
  tiktok: new TokenBucket(50, 0.5),
  instagram: new TokenBucket(50, 0.5),
  x: new TokenBucket(50, 0.5),
  twitch: new TokenBucket(80, 1),
};
