import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateApiKey } from "@/lib/apiKey";

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
        // Create or get Supabase auth user
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const found = existingUser.users.find((u) => u.email === email.toLowerCase());

        let userId: string;

        if (found) {
          userId = found.id;
        } else {
          // Create user and send magic link to log in
          const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            email_confirm: true,
          });
          if (error || !newUser.user) {
            console.error("Failed to create user:", error);
            break;
          }
          userId = newUser.user.id;
        }

        // Generate API key for api plan (or if they don't have one yet)
        const { data: existing } = await supabaseAdmin
          .from("pro_users")
          .select("api_key")
          .eq("email", email.toLowerCase())
          .single();

        const apiKey = existing?.api_key ?? (plan === "api" ? generateApiKey() : null);

        // Save Pro subscription linked to user_id
        await supabaseAdmin.from("pro_users").upsert({
          user_id: userId,
          email: email.toLowerCase(),
          plan,
          stripe_customer_id: customerId,
          active: true,
          ...(apiKey ? { api_key: apiKey } : {}),
        }, { onConflict: "email" });

        // Send magic link so user can log in immediately
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email.toLowerCase(),
          options: { redirectTo: `${baseUrl}/dashboard` },
        });

        console.log(`Pro activated for ${email} (user: ${userId})`);
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
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
