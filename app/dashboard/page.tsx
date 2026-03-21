"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface ProStatus {
  active: boolean;
  plan: string;
  created_at: string;
}

interface ApiKeyInfo {
  apiKey: string | null;
  plan: string;
  usageCount: number;
  usageLimit: number | null;
  resetAt: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyVisible, setKeyVisible] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);

      const { data: pro } = await supabase
        .from("pro_users")
        .select("active, plan, created_at")
        .eq("email", data.user.email!)
        .single();

      setProStatus(pro);

      // Fetch API key info if pro
      if (pro?.active) {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (token) {
          const res = await fetch("/api/api-key", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const info = await res.json();
            setApiKeyInfo(info);
          }
        }
      }

      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleManageBilling() {
    const supabase = createSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/billing-portal", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function handleRotateKey() {
    if (!confirm("Rotate your API key? Your old key will stop working immediately.")) return;
    setRotating(true);
    const supabase = createSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/api-key", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.apiKey) {
      setApiKeyInfo((prev) => prev ? { ...prev, apiKey: data.apiKey, usageCount: 0 } : null);
      setKeyVisible(true);
    }
    setRotating(false);
  }

  async function handleCopy() {
    if (!apiKeyInfo?.apiKey) return;
    await navigator.clipboard.writeText(apiKeyInfo.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink)" }}>
        <div className="spinner" />
      </div>
    );
  }

  const maskedKey = apiKeyInfo?.apiKey
    ? apiKeyInfo.apiKey.slice(0, 8) + "••••••••••••••••••••••••••••••••"
    : null;

  const usagePct = apiKeyInfo?.usageLimit
    ? Math.round((apiKeyInfo.usageCount / apiKeyInfo.usageLimit) * 100)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", padding: "0" }}>
      <nav className="nav">
        <a href="/" className="nav-logo">Estim<span className="nav-logo-accent">DVF</span></a>
        <div className="nav-links">
          <a href="/">Estimateur</a>
          <a href="/market">Marchés</a>
          {proStatus?.active && <a href="/alerts">Alertes</a>}
          {proStatus?.active && <a href="/portfolio">Portefeuille</a>}
          <a href="/dashboard" style={{ color: "var(--blue)", fontWeight: 600 }}>Dashboard</a>
          <button onClick={handleSignOut} className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Mon compte
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 900, color: "var(--white)" }}>
            Tableau de bord
          </h1>
        </div>

        {/* Account card */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <span className="card-header-title">Informations du compte</span>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--ash)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Email</div>
                <div style={{ color: "var(--white)", fontSize: "0.95rem" }}>{user?.email}</div>
              </div>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--ash)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Statut</div>
                <div>
                  {proStatus?.active ? (
                    <span style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "var(--gold)", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: 2, letterSpacing: "0.1em" }}>
                      {proStatus.plan.toUpperCase()} ACTIF
                    </span>
                  ) : (
                    <span style={{ background: "var(--ash-dim)", color: "var(--ash)", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: 2 }}>
                      GRATUIT
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key card — shown for api plan */}
        {proStatus?.active && apiKeyInfo && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
              <span className="card-header-title">Clé API</span>
              <span className="card-header-tag">{apiKeyInfo.plan.toUpperCase()}</span>
            </div>
            <div className="card-body">
              {/* Key display */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--ash)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Votre clé d&apos;accès
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <code style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    padding: "0.6rem 0.75rem",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.78rem",
                    color: "var(--gold)",
                    wordBreak: "break-all",
                  }}>
                    {apiKeyInfo.apiKey
                      ? (keyVisible ? apiKeyInfo.apiKey : maskedKey)
                      : "Aucune clé générée"}
                  </code>
                  <button onClick={() => setKeyVisible(!keyVisible)} className="btn btn-ghost" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    {keyVisible ? "Masquer" : "Afficher"}
                  </button>
                  {apiKeyInfo.apiKey && (
                    <button onClick={handleCopy} className="btn btn-ghost" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                      {copied ? "Copié !" : "Copier"}
                    </button>
                  )}
                </div>
              </div>

              {/* Usage bar */}
              {apiKeyInfo.usageLimit && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Utilisation ce mois
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "var(--white)" }}>
                      {apiKeyInfo.usageCount.toLocaleString("fr-FR")} / {apiKeyInfo.usageLimit.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(usagePct, 100)}%`,
                      background: usagePct > 80 ? "#e05a5a" : "var(--gold)",
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a href="/docs" className="btn btn-primary" style={{ fontSize: "0.8rem" }}>
                  Documentation API
                </a>
                <button onClick={handleRotateKey} disabled={rotating} className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                  {rotating ? "Rotation..." : "Rotation de clé"}
                </button>
                <button onClick={handleManageBilling} className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                  Gérer l&apos;abonnement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pro subscription card */}
        {proStatus?.active && proStatus.plan !== "api" ? (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
              <span className="card-header-title">Abonnement Pro</span>
              <span className="card-header-tag">{proStatus.plan.toUpperCase()}</span>
            </div>
            <div className="card-body">
              <ul className="pricing-features" style={{ marginBottom: "1.5rem" }}>
                <li>Estimations illimitées</li>
                <li>Alertes de prix automatiques</li>
                <li>Suivi de portefeuille (20 biens)</li>
                <li>Analyse de marché par code postal</li>
                <li>Support prioritaire</li>
              </ul>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a href="/" className="btn btn-primary" style={{ fontSize: "0.8rem" }}>
                  Estimateur
                </a>
                <a href="/alerts" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                  Mes alertes
                </a>
                <a href="/portfolio" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                  Portefeuille
                </a>
                <button onClick={handleManageBilling} className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                  Gérer l&apos;abonnement
                </button>
              </div>
            </div>
          </div>
        ) : !proStatus?.active ? (
          <div className="card" style={{ marginBottom: "1.5rem", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="card-body" style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "var(--white)", marginBottom: "0.5rem" }}>
                Passez en <em style={{ color: "var(--gold)" }}>Pro</em>
              </div>
              <p style={{ color: "var(--ash)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Estimations illimitées, historique des prix, export PDF.
              </p>
              <button onClick={() => window.location.href = "/#tarifs"} className="btn btn-primary">
                Voir les tarifs — 49€/mois
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
