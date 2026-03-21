"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowser();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "var(--ink)",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <a href="/" style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--white)",
          textDecoration: "none",
          display: "block",
          marginBottom: "2.5rem",
          textAlign: "center",
        }}>
          Estim<span style={{ color: "var(--gold)" }}>DVF</span>
        </a>

        <div className="card">
          <div className="card-header">
            <span className="card-header-title">Connexion</span>
            <span className="card-header-tag">Magic Link</span>
          </div>
          <div className="card-body">
            {sent ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✉️</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "var(--white)", marginBottom: "0.75rem" }}>
                  Vérifiez votre email
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--ash)", lineHeight: 1.6 }}>
                  Nous avons envoyé un lien de connexion à <strong style={{ color: "var(--white)" }}>{email}</strong>.<br />
                  Cliquez dessus pour accéder à votre compte.
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
                  {loading ? "Envoi en cours..." : "Recevoir le lien de connexion"}
                </button>
                <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--ash)", textAlign: "center" }}>
                  Pas de mot de passe. Un lien sécurisé vous est envoyé par email.
                </p>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--ash)" }}>
          <a href="/" style={{ color: "var(--ash)", textDecoration: "none" }}>← Retour à l&apos;accueil</a>
        </p>
      </div>
    </div>
  );
}
