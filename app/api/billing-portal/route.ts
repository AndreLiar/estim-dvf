import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromToken, getStripeCustomerId } from "@/services/auth";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserFromToken(authHeader.slice(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = await getStripeCustomerId(user.email);
  if (!customerId) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

  const stripe = new Stripe(stripeKey);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
