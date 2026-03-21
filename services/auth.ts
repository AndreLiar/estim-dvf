import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthUser, ProUser, Plan } from "@/types";

/**
 * Validates a Bearer JWT token and returns the authenticated user.
 * Returns null if the token is invalid or missing.
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}

/**
 * Returns the authenticated user if they have an active Pro or API subscription.
 * Returns null if not authenticated or not a Pro user.
 */
export async function getProUserFromToken(token: string): Promise<AuthUser | null> {
  const user = await getUserFromToken(token);
  if (!user) return null;

  const { data: pro } = await supabaseAdmin
    .from("pro_users")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  return pro ? user : null;
}

/**
 * Fetches the Pro subscription record for a given user ID.
 */
export async function getProRecord(userId: string): Promise<ProUser | null> {
  const { data } = await supabaseAdmin
    .from("pro_users")
    .select("user_id, email, plan, active, stripe_customer_id, created_at")
    .eq("user_id", userId)
    .single();

  if (!data) return null;
  return {
    userId: data.user_id,
    email: data.email,
    plan: data.plan as Plan,
    active: data.active,
    stripeCustomerId: data.stripe_customer_id ?? null,
    createdAt: data.created_at,
  };
}

/**
 * Gets a user's email by their ID using the admin API.
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/**
 * Creates or updates a Pro user record after a successful Stripe checkout.
 */
export async function upsertProUser(params: {
  userId: string;
  email: string;
  plan: Plan;
  stripeCustomerId: string;
  apiKey?: string;
}): Promise<void> {
  await supabaseAdmin.from("pro_users").upsert(
    {
      user_id: params.userId,
      email: params.email,
      plan: params.plan,
      stripe_customer_id: params.stripeCustomerId,
      active: true,
      ...(params.apiKey ? { api_key: params.apiKey } : {}),
    },
    { onConflict: "email" }
  );
}

/**
 * Deactivates a Pro subscription (called on Stripe cancellation).
 */
export async function deactivateProByEmail(email: string): Promise<void> {
  await supabaseAdmin
    .from("pro_users")
    .update({ active: false })
    .eq("email", email);
}

/**
 * Lists all Supabase auth users (admin only — used in webhook to find existing user).
 */
export async function listAuthUsers() {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  return data?.users ?? [];
}

/**
 * Creates a new Supabase auth user and sends a magic link.
 */
export async function createAuthUserAndSendMagicLink(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  const userId = data.user?.id ?? null;

  if (userId) {
    await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  }
  return userId;
}

/**
 * Sends a magic link to an existing user.
 */
export async function sendMagicLink(email: string): Promise<void> {
  await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
}

/**
 * Looks up a Stripe customer ID for a user by email.
 */
export async function getStripeCustomerId(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("pro_users")
    .select("stripe_customer_id")
    .eq("email", email)
    .single();
  return data?.stripe_customer_id ?? null;
}
