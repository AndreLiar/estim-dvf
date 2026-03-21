import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  // Get user from auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data } = await supabaseAdmin.auth.getUser(token);
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get Stripe customer ID from pro_users
  const { data: pro } = await supabaseAdmin
    .from("pro_users")
    .select("stripe_customer_id")
    .eq("email", user.email!)
    .single();

  if (!pro?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const stripe = new Stripe(stripeKey);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";

  const session = await stripe.billingPortal.sessions.create({
    customer: pro.stripe_customer_id,
    return_url: `${baseUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
