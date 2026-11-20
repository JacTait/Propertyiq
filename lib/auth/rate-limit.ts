export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface Bucket {
  timestamps: number[];
}

/**
 * In-memory limiter for the licence-verification endpoint.
 * Serverless instances do not share memory; this still slows automated guessing
 * on each instance. Failed after-limit responses stay generic.
 */
export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((stamp) => stamp > cutoff);

    if (bucket.timestamps.length >= this.maxAttempts) {
      this.buckets.set(key, bucket);
      const oldest = bucket.timestamps[0] ?? now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, oldest + this.windowMs - now),
      };
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxAttempts - bucket.timestamps.length),
      retryAfterMs: 0,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
      return;
    }
    this.buckets.clear();
  }
}

export const licenceVerifyLimiter = new MemoryRateLimiter(8, 15 * 60 * 1000);

export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstHop = forwarded?.split(",")[0]?.trim();
  if (firstHop) return firstHop;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
