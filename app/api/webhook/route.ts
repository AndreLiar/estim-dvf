import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  listAuthUsers,
  createAuthUserAndSendMagicLink,
  sendMagicLink,
  upsertProUser,
  deactivateProByEmail,
} from "@/services/auth";
import { provisionApiKey } from "@/services/apiKeys";
import type { Plan } from "@/types";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email?.toLowerCase();
      const customerId = session.customer as string;
      const plan = (session.metadata?.plan ?? "pro") as Plan;

      if (!email) break;

      // Find or create auth user
      const existingUsers = await listAuthUsers();
      const found = existingUsers.find((u) => u.email === email);

      let userId: string;
      if (found) {
        userId = found.id;
        await sendMagicLink(email);
      } else {
        const newId = await createAuthUserAndSendMagicLink(email);
        if (!newId) break;
        userId = newId;
      }

      // Provision API key if needed
      let apiKey: string | undefined;
      if (plan === "api") {
        apiKey = await provisionApiKey(email);
      }

      await upsertProUser({ userId, email, plan, stripeCustomerId: customerId, apiKey });
      console.log(`Pro activated: ${email} plan=${plan} user=${userId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string);
      if (!customer.deleted && customer.email) {
        await deactivateProByEmail(customer.email.toLowerCase());
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
