import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
  api: process.env.STRIPE_API_PRICE_ID ?? "",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan") ?? "pro";

  const priceId = PRICE_IDS[plan];
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";

  if (!priceId || !stripeKey) {
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  }

  const stripe = new Stripe(stripeKey);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/#tarifs`,
    metadata: { plan },
  });

  return NextResponse.redirect(session.url!);
}
