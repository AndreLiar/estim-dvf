import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { RateLimitResult } from "@/types";

const FREE_DAILY_LIMIT = 5;

/**
 * Checks and enforces rate limiting for anonymous or authenticated users.
 * Pro users bypass the rate limit entirely.
 * Returns a clean result object with no Supabase types.
 */
export async function checkRateLimit(ip: string, userId?: string): Promise<RateLimitResult> {
  // Pro users are unlimited
  if (userId) {
    const { data: pro } = await supabaseAdmin
      .from("pro_users")
      .select("user_id")
      .eq("user_id", userId)
      .eq("active", true)
      .single();

    if (pro) return { allowed: true, remaining: Infinity, isPro: true };
  }

  // Count requests from this IP in the last 24h
  const since = new Date(Date.now() - 86400 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("usage_log")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  const used = count ?? 0;
  const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
  const allowed = used < FREE_DAILY_LIMIT;

  if (allowed) {
    await supabaseAdmin.from("usage_log").insert({ ip });
  }

  return { allowed, remaining, isPro: false };
}
