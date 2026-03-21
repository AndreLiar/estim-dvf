"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan"); // "pro" | "api" | null
  const next = searchParams.get("next"); // arbitrary redirect after login

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, send straight to checkout or dashboard
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      if (plan) {
        // Already authenticated → go straight to checkout
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const json = await res.json();
        if (json.url) { window.location.href = json.url; return; }
      }
      window.location.href = next ?? "/dashboard";
    });
  }, [plan, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowser();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";

    // Build the redirect URL — after magic link click, go to checkout or dashboard
    const callbackNext = plan
      ? `/api/checkout-redirect?plan=${plan}`
      : (next ?? "/dashboard");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(callbackNext)}` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  const planLabel = plan === "api" ? "API (199€/mois)" : plan === "pro" ? "Pro (49€/mois)" : null;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "var(--off-white)",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <a href="/" style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "1.25rem",
          fontWeight: 800,
          color: "var(--navy)",
          textDecoration: "none",
          display: "block",
          marginBottom: "2.5rem",
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}>
          Estim<span style={{ color: "var(--blue)" }}>DVF</span>
        </a>

        <div className="card">
          <div className="card-header">
            <span className="card-header-title">
              {planLabel ? `Accès ${planLabel}` : "Connexion"}
            </span>
            <span className="card-header-tag">Magic Link</span>
          </div>
          <div className="card-body">
            {planLabel && !sent && (
              <div style={{
                background: "var(--blue-glow)",
                border: "1px solid rgba(26,86,219,0.15)",
                borderRadius: "var(--radius)",
                padding: "0.875rem 1rem",
                marginBottom: "1.25rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
              }}>
                Entrez votre email pour créer votre compte et accéder au paiement sécurisé&nbsp;{planLabel}.
              </div>
            )}

            {sent ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✉️</div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.75rem" }}>
                  Vérifiez votre email
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Lien envoyé à <strong style={{ color: "var(--navy)" }}>{email}</strong>.<br />
                  {plan
                    ? "Cliquez dessus pour finaliser votre abonnement."
                    : "Cliquez dessus pour accéder à votre compte."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Adresse email</label>
                  <input
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && <div className="error-box" style={{ marginBottom: "1rem" }}>{error}</div>}
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading
                    ? "Envoi en cours..."
                    : plan
                      ? "Continuer vers le paiement →"
                      : "Recevoir le lien de connexion"}
                </button>
                <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Pas de mot de passe. Un lien sécurisé est envoyé par email.
                </p>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <a href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>← Retour à l&apos;accueil</a>
          {!plan && (
            <> · <a href="#tarifs" onClick={() => window.location.href = "/#tarifs"} style={{ color: "var(--text-muted)", textDecoration: "none" }}>Voir les offres</a></>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
