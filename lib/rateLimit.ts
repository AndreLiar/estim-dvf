// Simple in-memory rate limiter — works for MVP, replace with Redis for scale
const store = new Map<string, { count: number; resetAt: number }>();

const FREE_LIMIT = 5; // requests per day for free users
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export function checkRateLimit(ip: string, isPro: boolean): { allowed: boolean; remaining: number } {
  if (isPro) return { allowed: true, remaining: 999 };

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: FREE_LIMIT - 1 };
  }

  if (entry.count >= FREE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: FREE_LIMIT - entry.count };
}
