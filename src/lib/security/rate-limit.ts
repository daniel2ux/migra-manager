type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

function nowMs(): number {
  return Date.now();
}

function cleanupExpired(currentTime: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= currentTime) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const currentTime = nowMs();
  cleanupExpired(currentTime);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= currentTime) {
    store.set(key, { count: 1, resetAt: currentTime + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000));
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown-ip';
}

