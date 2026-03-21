"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

type Mode = "login" | "signup";

function LoginForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const next = searchParams.get("next");

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      if (plan) {
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
    setSuccess(null);

    const supabase = createSupabaseBrowser();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Compte créé ! Vérifiez votre email pour confirmer votre adresse, puis connectez-vous.");
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message);
      } else {
        if (plan) {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const json = await res.json();
          if (json.url) { window.location.href = json.url; return; }
        }
        window.location.href = next ?? "/dashboard";
      }
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
              {planLabel ? `Accès ${planLabel}` : (mode === "signup" ? "Créer un compte" : "Connexion")}
            </span>
          </div>
          <div className="card-body">
            {/* Mode toggle */}
            <div style={{
              display: "flex",
              background: "var(--surface)",
              borderRadius: "var(--radius)",
              padding: "3px",
              marginBottom: "1.5rem",
            }}>
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                  style={{
                    flex: 1,
                    padding: "0.45rem",
                    border: "none",
                    borderRadius: "calc(var(--radius) - 2px)",
                    background: mode === m ? "var(--white)" : "transparent",
                    boxShadow: mode === m ? "var(--shadow-sm)" : "none",
                    color: mode === m ? "var(--navy)" : "var(--text-muted)",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: mode === m ? 600 : 400,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {m === "login" ? "Se connecter" : "Créer un compte"}
                </button>
              ))}
            </div>

            {planLabel && (
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
                {mode === "signup"
                  ? `Créez votre compte pour accéder au paiement sécurisé ${planLabel}.`
                  : `Connectez-vous pour accéder au paiement sécurisé ${planLabel}.`}
              </div>
            )}

            {success && (
              <div style={{
                background: "var(--green-light)",
                border: "1px solid rgba(5,150,105,0.2)",
                borderRadius: "var(--radius)",
                padding: "0.875rem 1rem",
                marginBottom: "1.25rem",
                fontSize: "0.85rem",
                color: "var(--green)",
                lineHeight: 1.55,
              }}>
                {success}
              </div>
            )}

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
              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  placeholder={mode === "signup" ? "Minimum 6 caractères" : "Votre mot de passe"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                />
              </div>
              {error && <div className="error-box" style={{ marginBottom: "1rem" }}>{error}</div>}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading
                  ? "Chargement..."
                  : mode === "signup"
                    ? "Créer mon compte"
                    : plan
                      ? "Se connecter et payer →"
                      : "Se connecter"}
              </button>
            </form>
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
