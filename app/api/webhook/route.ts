import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
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
      const plan = (session.metadata?.plan ?? "pro") as "pro" | "api";

      if (email) {
        const token = Buffer.from(`${email}:${Date.now()}:${plan}`).toString("base64url");

        // Save to Supabase
        await supabaseAdmin.from("pro_users").upsert(
          { email: email.toLowerCase(), token, plan, stripe_customer_id: customerId, active: true },
          { onConflict: "email" }
        );

        // Send Pro token email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const resend = new Resend(resendKey);
          const planLabel = plan === "api" ? "API" : "Pro";
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvf-estimator.vercel.app";

          await resend.emails.send({
            from: "EstimDVF <noreply@dvfestimator.live>",
            to: email,
            subject: `Votre accès EstimDVF ${planLabel} — Token d'activation`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 2rem;">
                <h1 style="color: #2563eb; font-size: 1.5rem;">Bienvenue dans EstimDVF ${planLabel} !</h1>
                <p style="color: #374151; margin: 1rem 0;">Merci pour votre abonnement. Voici votre token d'accès Pro :</p>

                <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 1rem 1.5rem; margin: 1.5rem 0;">
                  <p style="font-size: 0.8rem; color: #6b7280; margin: 0 0 0.5rem;">Votre token (gardez-le précieusement)</p>
                  <code style="font-size: 0.9rem; color: #1d4ed8; word-break: break-all;">${token}</code>
                </div>

                <p style="color: #374151; margin: 1rem 0;"><strong>Comment l'utiliser :</strong></p>
                <ol style="color: #374151; padding-left: 1.5rem; line-height: 2;">
                  <li>Allez sur <a href="${baseUrl}" style="color: #2563eb;">${baseUrl}</a></li>
                  <li>Cliquez sur <strong>"Compte Pro?"</strong> en haut du formulaire</li>
                  <li>Collez votre token dans le champ qui apparaît</li>
                  <li>Profitez des estimations illimitées, de l'historique des prix et de l'export PDF !</li>
                </ol>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0;" />
                <p style="color: #9ca3af; font-size: 0.8rem;">
                  EstimDVF · Données officielles DVF — data.gouv.fr<br/>
                  Pour toute question : support@dvfestimator.live
                </p>
              </div>
            `,
          });
        }

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
