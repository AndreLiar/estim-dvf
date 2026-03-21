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

// ─── Quick-action card data ────────────────────────────────────────────────
const FREE_ACTIONS = [
  {
    href: "/",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label: "Estimer un bien",
    desc: "Obtenez une estimation basée sur les données DVF",
    primary: true,
  },
  {
    href: "/market",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: "Explorer les marchés",
    desc: "Tendances de prix par code postal",
    primary: false,
  },
];

const PRO_ACTIONS = [
  {
    href: "/",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label: "Estimer un bien",
    desc: "Estimations illimitées",
    primary: true,
  },
  {
    href: "/alerts",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    label: "Mes alertes",
    desc: "Surveillez les prix de votre zone",
    primary: false,
  },
  {
    href: "/portfolio",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    label: "Portefeuille",
    desc: "Suivez vos biens immobiliers",
    primary: false,
  },
  {
    href: "/market",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: "Analyse de marché",
    desc: "Tendances et prix par code postal",
    primary: false,
  },
];

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
      if (!data.user) { window.location.href = "/login"; return; }
      setUser(data.user);

      const { data: pro } = await supabase
        .from("pro_users")
        .select("active, plan, created_at")
        .eq("email", data.user.email!)
        .single();

      setProStatus(pro);

      if (pro?.active) {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (token) {
          const res = await fetch("/api/api-key", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) setApiKeyInfo(await res.json());
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
    if (!confirm("Rotation de la clé API ? Votre ancienne clé sera immédiatement désactivée.")) return;
    setRotating(true);
    const supabase = createSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/api-key", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--off-white)" }}>
        <div className="spinner" />
      </div>
    );
  }

  const isPro = proStatus?.active ?? false;
  const isApi = isPro && proStatus?.plan === "api";
  const actions = isPro ? PRO_ACTIONS : FREE_ACTIONS;

  const usagePct = apiKeyInfo?.usageLimit
    ? Math.round((apiKeyInfo.usageCount / apiKeyInfo.usageLimit) * 100)
    : 0;

  const maskedKey = apiKeyInfo?.apiKey
    ? apiKeyInfo.apiKey.slice(0, 10) + "••••••••••••••••••••••••"
    : null;

  const firstName = user?.email?.split("@")[0] ?? "vous";

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      {/* Nav */}
      <nav className="nav">
        <a href="/" className="nav-logo">Estim<span className="nav-logo-accent">DVF</span></a>
        <div className="nav-links">
          <a href="/">Estimateur</a>
          <a href="/market">Marchés</a>
          {isPro && <a href="/alerts">Alertes</a>}
          {isPro && <a href="/portfolio">Portefeuille</a>}
          <a href="/dashboard" style={{ color: "var(--blue)", fontWeight: 600 }}>Dashboard</a>
          <button onClick={handleSignOut} className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "calc(64px + 2.5rem) 1.5rem 3rem" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Bonjour, {firstName}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.02em", margin: 0 }}>
              Mon espace
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {isPro ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  background: "rgba(26,86,219,0.08)", border: "1px solid rgba(26,86,219,0.2)",
                  color: "var(--blue)", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.68rem", fontWeight: 600, padding: "0.3rem 0.75rem",
                  borderRadius: 100, letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }} />
                  {proStatus!.plan.toUpperCase()} actif
                </span>
              ) : (
                <span style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.68rem", padding: "0.3rem 0.75rem",
                  borderRadius: 100, letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  Gratuit
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick actions grid ── */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
            Actions rapides
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.875rem" }}>
            {actions.map((action) => (
              <a
                key={action.href + action.label}
                href={action.href}
                style={{
                  display: "flex", flexDirection: "column", gap: "0.75rem",
                  padding: "1.25rem", borderRadius: "var(--radius-lg)",
                  background: action.primary ? "var(--blue)" : "var(--white)",
                  border: action.primary ? "none" : "1px solid var(--border)",
                  boxShadow: action.primary ? "var(--shadow-blue)" : "var(--shadow-sm)",
                  textDecoration: "none",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = action.primary ? "0 12px 40px rgba(26,86,219,0.35)" : "var(--shadow-md)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = action.primary ? "var(--shadow-blue)" : "var(--shadow-sm)"; }}
              >
                <span style={{ color: action.primary ? "rgba(255,255,255,0.85)" : "var(--blue)" }}>
                  {action.icon}
                </span>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: action.primary ? "var(--white)" : "var(--navy)", marginBottom: "0.2rem" }}>
                    {action.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: action.primary ? "rgba(255,255,255,0.65)" : "var(--text-muted)", lineHeight: 1.4 }}>
                    {action.desc}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Two-column lower section ── */}
        <div style={{ display: "grid", gridTemplateColumns: isPro ? "1fr 1fr" : "1fr", gap: "1rem" }}>

          {/* Account info */}
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", boxShadow: "var(--shadow-sm)" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
              Compte
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Email</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500, wordBreak: "break-all" }}>{user?.email}</div>
              </div>
              {isPro && (
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Membre depuis</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
                    {new Date(proStatus!.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {isPro && (
                <button onClick={handleManageBilling} className="btn btn-ghost" style={{ fontSize: "0.78rem" }}>
                  Gérer l&apos;abonnement
                </button>
              )}
              <button onClick={handleSignOut} className="btn btn-ghost" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Déconnexion
              </button>
            </div>
          </div>

          {/* API key panel — api plan only */}
          {isApi && apiKeyInfo && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Clé API
                </p>
                <a href="/docs" style={{ fontSize: "0.75rem", color: "var(--blue)", textDecoration: "none", fontWeight: 500 }}>
                  Documentation →
                </a>
              </div>

              {/* Key display */}
              <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "0.625rem 0.875rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <code style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "var(--navy)", wordBreak: "break-all" }}>
                  {apiKeyInfo.apiKey ? (keyVisible ? apiKeyInfo.apiKey : maskedKey) : "Aucune clé"}
                </code>
                <button onClick={() => setKeyVisible(!keyVisible)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.72rem", fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: "nowrap", padding: "0 0.25rem" }}>
                  {keyVisible ? "Masquer" : "Voir"}
                </button>
                {apiKeyInfo.apiKey && (
                  <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "var(--green)" : "var(--text-muted)", fontSize: "0.72rem", fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: "nowrap", padding: "0 0.25rem", transition: "color 0.15s" }}>
                    {copied ? "Copié !" : "Copier"}
                  </button>
                )}
              </div>

              {/* Usage bar */}
              {apiKeyInfo.usageLimit && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Utilisation ce mois</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: usagePct > 80 ? "var(--red)" : "var(--text-primary)", fontWeight: 600 }}>
                      {apiKeyInfo.usageCount.toLocaleString("fr-FR")} / {apiKeyInfo.usageLimit.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div style={{ height: 5, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(usagePct, 100)}%`, background: usagePct > 80 ? "var(--red)" : "var(--blue)", borderRadius: 3, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              )}

              <button onClick={handleRotateKey} disabled={rotating} className="btn btn-ghost" style={{ fontSize: "0.78rem", width: "100%" }}>
                {rotating ? "Rotation en cours..." : "Effectuer une rotation de clé"}
              </button>
            </div>
          )}

          {/* Pro subscription detail — pro plan (not api) */}
          {isPro && !isApi && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", boxShadow: "var(--shadow-sm)" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                Votre abonnement Pro
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
                {["Estimations illimitées", "Alertes de prix automatiques", "Suivi portefeuille (20 biens)", "Analyse de marché par code postal", "Support prioritaire"].map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleManageBilling} className="btn btn-ghost" style={{ fontSize: "0.78rem", width: "100%" }}>
                Gérer l&apos;abonnement
              </button>
            </div>
          )}

          {/* Upsell — free users */}
          {!isPro && (
            <div style={{ background: "var(--navy)", borderRadius: "var(--radius-lg)", padding: "1.75rem", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span style={{
                  display: "inline-block", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)",
                  color: "#c9a84c", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem",
                  padding: "0.25rem 0.6rem", borderRadius: 100, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem",
                }}>
                  Passez Pro
                </span>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "var(--white)", lineHeight: 1.3, marginBottom: "0.75rem" }}>
                  Accédez à toutes les fonctionnalités
                </h2>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {["Alertes de prix personnalisées", "Suivi de portefeuille", "Analyse de marché avancée"].map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.83rem", color: "rgba(255,255,255,0.65)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="/#tarifs" className="btn btn-primary" style={{ textAlign: "center", justifyContent: "center" }}>
                Voir les offres — à partir de 49€/mois
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
