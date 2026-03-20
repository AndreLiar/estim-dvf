import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

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
      const email = session.customer_details?.email;
      const customerId = session.customer as string;
      const plan = session.metadata?.plan ?? "pro";

      if (email) {
        // Generate unique token
        const token = Buffer.from(`${email}:${Date.now()}:${plan}`).toString("base64url");

        // Save to Supabase
        await supabaseAdmin.from("pro_users").upsert({
          email: email.toLowerCase(),
          token,
          plan,
          stripe_customer_id: customerId,
          active: true,
        }, { onConflict: "email" });

        // Send token via Supabase Auth magic link style email
        // We use Supabase's built-in email by triggering a custom email
        await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          email_confirm: true,
          user_metadata: {
            pro_token: token,
            plan,
          },
        });

        // Send the token email via Supabase
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-pro-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ email, token, plan }),
        }).catch(() => null); // non-blocking

        console.log(`Pro activated: ${email}, token: ${token}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string);
      if (!customer.deleted && customer.email) {
        await supabaseAdmin
          .from("pro_users")
          .update({ active: false })
          .eq("email", customer.email.toLowerCase());
        console.log(`Pro deactivated: ${customer.email}`);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
