"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface PriceHistory { year: string; medianPricePerM2: number; }

interface EstimateResult {
  postalCode: string;
  city: string;
  type: string;
  surface: number;
  medianPricePerM2: number;
  avgPricePerM2: number;
  estimatedPrice: number;
  estimatedMin: number;
  estimatedMax: number;
  comparableSales: number;
  lastSaleDate: string | null;
  remainingToday: number | null;
  isPro: boolean;
  priceHistory: PriceHistory[] | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function fmtShort(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
}

async function startCheckout(plan: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

function PriceHistoryChart({ data }: { data: PriceHistory[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.medianPricePerM2));
  const min = Math.min(...data.map((d) => d.medianPricePerM2));
  const range = max - min || 1;
  return (
    <div className="chart-section">
      <div className="chart-label">Évolution prix médian / m²</div>
      <div className="chart-bars">
        {data.map((d) => {
          const heightPct = 15 + ((d.medianPricePerM2 - min) / range) * 85;
          return (
            <div key={d.year} className="chart-bar-col">
              <div className="chart-bar-val">{fmtShort(d.medianPricePerM2)}</div>
              <div className="chart-bar" style={{ height: `${heightPct}%` }} title={`${d.year}: ${fmt(d.medianPricePerM2)}/m²`} />
              <div className="chart-bar-year">{d.year}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EstimatorForm({ user }: { user: User | null }) {
  const [postalCode, setPostalCode] = useState("");
  const [type, setType] = useState("Appartement");
  const [surface, setSurface] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    setLimitReached(false);
    try {
      const params = new URLSearchParams({ postalCode, type, surface });
      const headers: Record<string, string> = {};
      if (user) {
        const supabase = createSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
      const res = await fetch(`/api/estimate?${params}`, { headers });
      const data = await res.json();
      if (res.status === 429) { setLimitReached(true); setError(data.error); }
      else if (!res.ok) { setError(data.error || "Une erreur est survenue."); }
      else { setResult(data); }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-header-title">Estimation immobilière</span>
        <span className="card-header-tag">DVF Officiel</span>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Code postal</label>
            <input type="text" placeholder="75011" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={5} pattern="\d{5}" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type de bien</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Appartement">Appartement</option>
                <option value="Maison">Maison</option>
              </select>
            </div>
            <div className="form-group">
              <label>Surface (m²)</label>
              <input type="number" placeholder="65" min="5" max="2000" value={surface} onChange={(e) => setSurface(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Calcul en cours..." : "Lancer l'estimation"}
          </button>
        </form>

        {loading && (
          <div className="loading-box">
            <span className="spinner" />
            Interrogation des données DVF officielles...
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
            {limitReached && (
              <div style={{ marginTop: "0.75rem" }}>
                <button onClick={() => startCheckout("pro")} className="btn btn-primary" style={{ fontSize: "0.78rem" }}>
                  Passer en Pro — 49€/mois
                </button>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="result" id="print-result">
            <div className="result-header">
              <div className="result-meta">
                <strong>{result.city}</strong><br />
                {result.postalCode} · {result.type} · {result.surface} m²
                {result.lastSaleDate && <><br />Dernière vente : {result.lastSaleDate}</>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                {result.isPro && <span className="result-pro-badge">PRO</span>}
                {result.isPro && (
                  <button onClick={() => window.print()} className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem" }}>
                    Export PDF
                  </button>
                )}
              </div>
            </div>
            <div className="result-price-block">
              <div className="result-price-label">Estimation de valeur</div>
              <div className="result-price">{fmt(result.estimatedPrice)}</div>
              <div className="result-range">{fmt(result.estimatedMin)} — {fmt(result.estimatedMax)}</div>
            </div>
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-value">{fmt(result.medianPricePerM2)}</span>
                <span className="stat-label">Médiane /m²</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{result.comparableSales}</span>
                <span className="stat-label">Ventes</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{fmt(result.avgPricePerM2)}</span>
                <span className="stat-label">Moyenne /m²</span>
              </div>
            </div>
            {result.priceHistory && result.priceHistory.length > 1 && (
              <PriceHistoryChart data={result.priceHistory} />
            )}
            {!result.isPro && (
              <div className="upsell-strip">
                <div className="upsell-text">
                  <strong>Pro</strong> — Alertes de prix, suivi de portefeuille, historique complet, widget intégrable.
                </div>
                <button onClick={() => startCheckout("pro")} className="btn btn-outline" style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                  49€ / mois
                </button>
              </div>
            )}
            <div className="result-footer">
              Source · Demandes de Valeurs Foncières (DVF) — data.gouv.fr · Licence Ouverte
              {result.remainingToday !== null && (
                <> · {result.remainingToday} estimation{result.remainingToday !== 1 ? "s" : ""} gratuite{result.remainingToday !== 1 ? "s" : ""} restante{result.remainingToday !== 1 ? "s" : ""}</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const MINI_BARS = [40, 52, 48, 61, 55, 68, 72, 65, 78, 82, 88, 95];

const PLATFORM_FEATURES = [
  {
    n: "01",
    icon: "⚖️",
    title: "Estimation DVF officielle",
    desc: "Actes notariés transmis à la DGFiP. Prix médian, moyen, P10–P90. La référence légale — pas un algorithme opaque.",
    link: null,
    tag: "Gratuit",
  },
  {
    n: "02",
    icon: "📊",
    title: "Analyse de marché",
    desc: "Consultez les statistiques complètes par code postal : tendance annuelle, fourchette de prix, volume de transactions.",
    link: "/market",
    tag: "Gratuit",
  },
  {
    n: "03",
    icon: "🔔",
    title: "Alertes de prix",
    desc: "Définissez un seuil de variation. Recevez un email automatique dès que le marché dépasse votre seuil — mensuel.",
    link: "/alerts",
    tag: "Pro",
  },
  {
    n: "04",
    icon: "🏠",
    title: "Suivi de portefeuille",
    desc: "Ajoutez vos biens, suivez leur valorisation en temps réel. Plus-value calculée automatiquement sur la base DVF.",
    link: "/portfolio",
    tag: "Pro",
  },
  {
    n: "05",
    icon: "🔌",
    title: "Widget intégrable",
    desc: "Intégrez un widget marché en iframe sur votre site d'agence. Thème clair/sombre. Mise à jour automatique quotidienne.",
    link: null,
    tag: "Pro",
  },
  {
    n: "06",
    icon: "🛠️",
    title: "API REST documentée",
    desc: "Intégrez les estimations dans vos logiciels métiers. 10 000 requêtes/mois, clé dédiée, documentation complète.",
    link: "/docs",
    tag: "API",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Estimez en 10 secondes",
    desc: "Code postal + type + surface. Résultat immédiat basé sur les transactions réelles de votre secteur.",
    icon: "⚡",
  },
  {
    step: "02",
    title: "Analysez le marché",
    desc: "Tendance annuelle, fourchette P10–P90, évolution historique. Tout le contexte pour décider.",
    icon: "📈",
  },
  {
    step: "03",
    title: "Surveillez & alertez",
    desc: "Paramétrez vos alertes. Soyez notifié automatiquement dès qu'un marché bouge significativement.",
    icon: "🔔",
  },
  {
    step: "04",
    title: "Gérez votre patrimoine",
    desc: "Centralisez vos biens, suivez leur plus-value en temps réel. Le tout mis à jour automatiquement.",
    icon: "🏠",
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          Estim<span className="nav-logo-accent">DVF</span>
        </a>
        <div className="nav-links">
          <a href="/market">Marchés</a>
          <a href="#plateforme">Fonctionnalités</a>
          <a href="#tarifs">Tarifs</a>
          <a href="/docs">API</a>
          {user ? (
            <>
              <a href="/dashboard" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>Mon compte</a>
              <button onClick={handleSignOut} className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>Déconnexion</button>
            </>
          ) : (
            <>
              <a href="/login" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>Connexion</a>
              <button onClick={() => startCheckout("pro")} className="btn btn-primary" style={{ fontSize: "0.8rem" }}>Accès Pro</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>
        <div className="hero" style={{ padding: "120px 0 6rem" }}>
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Données officielles · DGFiP · Ministère des Finances
            </div>
            <h1>
              La plateforme <em>d&apos;intelligence</em><br />
              immobilière<br />
              des professionnels
            </h1>
            <p className="hero-sub">
              Estimation, analyse de marché, alertes de prix, suivi de portefeuille — tout sur une seule plateforme. Alimentée par les 20 millions de transactions DVF du gouvernement.
            </p>
            <div className="hero-actions">
              <button onClick={() => document.querySelector(".estimator-section")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-primary">
                Estimer un bien →
              </button>
              <a href="/market" className="btn btn-ghost">Explorer les marchés</a>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item">Données officielles</span>
              <span className="hero-trust-item">20M+ transactions</span>
              <span className="hero-trust-item">36 000 communes</span>
              <span className="hero-trust-item">Alertes automatiques</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="stats-panel">
              <div className="stats-panel-header">
                <span className="stats-panel-title">Marché immobilier · France</span>
                <span className="stats-panel-live">Données live</span>
              </div>
              <div className="stats-panel-grid">
                <div className="stat-cell">
                  <div className="stat-cell-value">20M<span style={{ fontSize: "0.9rem", color: "rgba(59,130,246,0.8)" }}>+</span></div>
                  <div className="stat-cell-label">Transactions</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value">36k</div>
                  <div className="stat-cell-label">Communes</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value">100<span style={{ fontSize: "0.9rem", color: "rgba(59,130,246,0.8)" }}>%</span></div>
                  <div className="stat-cell-label">Officiel</div>
                </div>
              </div>
              <div className="mini-chart-wrap">
                <div className="mini-chart-label">Volume transactions · 2012–2024</div>
                <div className="mini-bars">
                  {MINI_BARS.map((h, i) => (
                    <div key={i} className="mini-bar" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mini-chart-years">
                  <span>2012</span><span>2016</span><span>2020</span><span>2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS BAND */}
      <div className="metrics-band">
        <div className="metrics-band-inner">
          {[
            { value: "20", accent: "M+", label: "Transactions analysées" },
            { value: "36 000", accent: "", label: "Communes couvertes" },
            { value: "24h", accent: "", label: "Fraîcheur des données" },
            { value: "< 2", accent: "s", label: "Temps de réponse" },
          ].map((m) => (
            <div className="metric-item" key={m.label}>
              <div className="metric-value">{m.value}<span className="metric-value-accent">{m.accent}</span></div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ESTIMATOR */}
      <div className="estimator-section">
        <div className="estimator-inner">
          <div className="estimator-intro">
            <div className="section-eyebrow">Outil d&apos;estimation</div>
            <h2 className="section-title">Obtenez une estimation<br /><em>en 10 secondes</em></h2>
            <p className="section-sub">
              Code postal, type de bien, surface. Nous interrogeons directement la base DVF et calculons les statistiques en temps réel.
            </p>
            <div style={{ marginTop: "2rem" }}>
              <div className="trust-list">
                {[
                  "Prix médian et moyen au m² dans votre secteur",
                  "Fourchette d'estimation (percentile 10–90)",
                  "Nombre de ventes comparables analysées",
                  "Historique des prix sur 5 ans (Pro)",
                  "Alertes automatiques si le marché bouge (Pro)",
                  "Export PDF du rapport (Pro)",
                ].map((item) => (
                  <div className="trust-item" key={item}>
                    <span className="trust-check">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <EstimatorForm user={user} />
        </div>
      </div>

      {/* PLATFORM FEATURES */}
      <section style={{ padding: "7rem 2rem", background: "var(--white)" }} id="plateforme">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="features-header">
            <div>
              <div className="section-eyebrow">La plateforme complète</div>
              <h2 className="section-title">Tout ce dont un professionnel<br /><em>a besoin</em></h2>
            </div>
            <p className="section-sub" style={{ maxWidth: 380 }}>
              De l&apos;estimation ponctuelle à la surveillance continue du marché — une seule plateforme pour prendre de meilleures décisions.
            </p>
          </div>
          <div className="features-grid">
            {PLATFORM_FEATURES.map((f) => (
              <div className="feature-card" key={f.n} style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
                  <div className="feature-num">{f.n}</div>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.55rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "0.18rem 0.55rem",
                    borderRadius: 100,
                    background: f.tag === "Gratuit" ? "var(--green-light)" : f.tag === "API" ? "rgba(26,86,219,0.08)" : "var(--blue-glow)",
                    color: f.tag === "Gratuit" ? "var(--green)" : "var(--blue)",
                    border: `1px solid ${f.tag === "Gratuit" ? "rgba(5,150,105,0.2)" : "rgba(26,86,219,0.15)"}`,
                  }}>
                    {f.tag}
                  </span>
                </div>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.link && (
                  <a href={f.link} style={{
                    display: "inline-block",
                    marginTop: "1rem",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.65rem",
                    color: "var(--blue)",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                  }}>
                    Accéder →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "7rem 2rem", background: "var(--off-white)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="section-eyebrow">Workflow professionnel</div>
            <h2 className="section-title">De l&apos;estimation à la surveillance<br /><em>en 4 étapes</em></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0", position: "relative" }}>
            {/* connector line */}
            <div style={{ position: "absolute", top: "2.25rem", left: "12.5%", right: "12.5%", height: "1px", background: "var(--border)", zIndex: 0 }} />
            {WORKFLOW_STEPS.map((s, i) => (
              <div key={s.step} style={{ textAlign: "center", padding: "0 1.5rem", position: "relative", zIndex: 1, animation: `fadeUp 0.5s ${i * 0.1}s ease both` }}>
                <div style={{
                  width: 48, height: 48,
                  background: i === 0 ? "var(--blue)" : "var(--white)",
                  border: `2px solid ${i === 0 ? "var(--blue)" : "var(--border)"}`,
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  fontSize: "1.2rem",
                  boxShadow: i === 0 ? "var(--shadow-blue)" : "var(--shadow-sm)",
                }}>
                  {s.icon}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Étape {s.step}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "0.95rem", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
                  {s.title}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKET PREVIEW CTA */}
      <section style={{ padding: "5rem 2rem", background: "var(--white)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
            {/* Left: text */}
            <div>
              <div className="section-eyebrow">Intelligence de marché</div>
              <h2 className="section-title">Analysez n&apos;importe quel marché<br /><em>en un clic</em></h2>
              <p className="section-sub" style={{ marginBottom: "2rem" }}>
                Chaque code postal français dispose de sa fiche marché : médiane, tendance annuelle, fourchette P10–P90, évolution historique. Mis à jour automatiquement chaque 24h.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a href="/market" className="btn btn-primary">Explorer les marchés →</a>
                <a href="/market/75011" className="btn btn-ghost">Ex : Paris 11e</a>
              </div>
            </div>
            {/* Right: market card mock */}
            <div style={{ background: "var(--navy)", borderRadius: "var(--radius-xl)", padding: "2rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(26,86,219,0.3) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Paris 11e · 75011 · Appartement
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "Médiane", val: "9 200 €/m²" },
                  { label: "Tendance 12m", val: "+3.2%", color: "#059669" },
                  { label: "Volume", val: "1 840 ventes" },
                  { label: "Fourchette", val: "7 100 – 12 400" },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>{s.label}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, color: (s as { color?: string }).color || "var(--white)" }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {/* Mini chart mock */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
                {[35, 42, 50, 45, 58, 62, 55, 68, 74, 80, 85, 88].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 11 ? "#3b82f6" : "rgba(59,130,246,0.3)", borderRadius: "2px 2px 0 0", minHeight: 3 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALERTS + PORTFOLIO FEATURE SPLIT */}
      <section style={{ padding: "5rem 2rem", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          {/* Alerts */}
          <div className="card">
            <div className="card-header">
              <span className="card-header-title">🔔 Alertes de prix</span>
              <span className="card-header-tag">Pro</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Paramétrez un seuil de variation (ex : ±5%). Chaque mois, EstimDVF compare la médiane actuelle à votre référence. Si le marché dépasse votre seuil — vous recevez un email.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
                {["Email automatique mensuel", "Seuil personnalisable par code postal", "Historique des alertes déclenchées", "Plusieurs marchés surveillés simultanément"].map((f) => (
                  <div key={f} className="trust-item">
                    <span className="trust-check">✓</span>
                    <span style={{ fontSize: "0.85rem" }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="/alerts" className="btn btn-primary" style={{ fontSize: "0.85rem" }}>Configurer mes alertes →</a>
            </div>
          </div>

          {/* Portfolio */}
          <div className="card">
            <div className="card-header">
              <span className="card-header-title">🏠 Suivi de portefeuille</span>
              <span className="card-header-tag">Pro</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Centralisez jusqu&apos;à 20 biens. Pour chacun, EstimDVF calcule automatiquement la valeur marchande actuelle et la plus-value latente basée sur les données DVF en temps réel.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
                {["Jusqu'à 20 biens par compte", "Plus-value calculée en temps réel", "Valeur totale du portefeuille", "Actualisation DVF en un clic"].map((f) => (
                  <div key={f} className="trust-item">
                    <span className="trust-check">✓</span>
                    <span style={{ fontSize: "0.85rem" }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="/portfolio" className="btn btn-primary" style={{ fontSize: "0.85rem" }}>Gérer mon portefeuille →</a>
            </div>
          </div>
        </div>
      </section>

      {/* WIDGET CTA */}
      <section style={{ padding: "5rem 2rem", background: "var(--white)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <div className="section-eyebrow">Pour les agences immobilières</div>
            <h2 className="section-title">Intégrez les données marché<br /><em>sur votre site</em></h2>
            <p className="section-sub" style={{ marginBottom: "2rem" }}>
              Un widget iframe responsive, thème clair ou sombre, mis à jour automatiquement. Copiez une ligne de code — vos visiteurs voient les prix du marché en temps réel.
            </p>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "var(--text-secondary)", overflowX: "auto" }}>
              {"<iframe src=\"https://dvfestimator.live/widget/75011"}
              <br />{"  ?type=Appartement&theme=light\""}
              <br />{"  width=\"360\" height=\"340\" frameborder=\"0\" />"}
            </div>
            <a href="#tarifs" className="btn btn-primary">Obtenir l&apos;accès widget →</a>
          </div>
          {/* Widget preview */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0.6rem 1rem", display: "flex", gap: "0.4rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fc6560" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fcbc40" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#33c748" }} />
              <div style={{ flex: 1, background: "var(--white)", borderRadius: 4, height: 10, marginLeft: "0.5rem" }} />
            </div>
            <div style={{ padding: "1.5rem", background: "#0d1b3e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "var(--white)", fontSize: "0.9rem" }}>Estim<span style={{ color: "#1a56db" }}>DVF</span></span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>DVF officiel</span>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "var(--white)", fontSize: "1rem", marginBottom: "0.2rem" }}>Paris 11e</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: "1rem" }}>75011 · Appartement</div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "0.875rem", marginBottom: "1rem" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Prix médian</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "var(--white)", letterSpacing: "-0.04em", lineHeight: 1 }}>9 200 <span style={{ fontSize: "0.9rem", fontWeight: 400, opacity: 0.45 }}>€/m²</span></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[{ l: "Tendance 12m", v: "+3.2%", c: "#059669" }, { l: "Transactions", v: "1 840", c: "var(--white)" }].map((s) => (
                  <div key={s.l}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>{s.l}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.875rem", fontWeight: 700, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="tarifs">
        <div className="pricing-inner">
          <div className="section-eyebrow">Tarifs</div>
          <h2 className="section-title">Simple.<br /><em>Transparent.</em></h2>
          <p className="section-sub">Commencez gratuitement. Passez au Pro quand vous avez besoin de plus.</p>

          <div className="pricing-grid">
            {/* Free */}
            <div className="pricing-card">
              <div className="pricing-name">Gratuit</div>
              <div className="pricing-price">0€ <span>/ mois</span></div>
              <div className="pricing-desc">Pour découvrir et usage occasionnel.</div>
              <div className="pricing-divider" />
              <ul className="pricing-features">
                <li>5 estimations / jour</li>
                <li>Données DVF officielles</li>
                <li>Analyse de marché (lecture)</li>
              </ul>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn btn-ghost btn-full">
                Commencer gratuitement
              </button>
            </div>

            {/* Pro */}
            <div className="pricing-card featured">
              <div className="pricing-name">Pro</div>
              <div className="pricing-price">49€ <span>/ mois</span></div>
              <div className="pricing-desc">Pour les professionnels de l&apos;immobilier.</div>
              <div className="pricing-divider" />
              <ul className="pricing-features">
                <li>Estimations illimitées</li>
                <li>Historique des prix & tendances</li>
                <li>Alertes de prix automatiques</li>
                <li>Suivi de portefeuille (20 biens)</li>
                <li>Widget intégrable sur votre site</li>
                <li>Export PDF du rapport</li>
                <li>Support prioritaire</li>
              </ul>
              <button onClick={() => startCheckout("pro")} className="btn btn-full">
                Démarrer l&apos;essai
              </button>
            </div>

            {/* API */}
            <div className="pricing-card">
              <div className="pricing-name">API</div>
              <div className="pricing-price">199€ <span>/ mois</span></div>
              <div className="pricing-desc">Pour intégrer dans vos applications métiers.</div>
              <div className="pricing-divider" />
              <ul className="pricing-features">
                <li>Tout le plan Pro inclus</li>
                <li>10 000 requêtes API / mois</li>
                <li>API REST documentée</li>
                <li>Clé d&apos;accès dédiée</li>
                <li>Rotation de clé self-service</li>
                <li>Support dédié</li>
              </ul>
              <button onClick={() => startCheckout("api")} className="btn btn-ghost btn-full">
                Commencer
              </button>
            </div>
          </div>

          {/* Comparison note */}
          <div style={{ marginTop: "3rem", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
            Tous les plans incluent les données DVF officielles · Paiement sécurisé par Stripe · Résiliation à tout moment
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-logo">Estim<span style={{ color: "var(--blue)" }}>DVF</span></span>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a href="/market" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Marchés</a>
          <a href="/alerts" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Alertes</a>
          <a href="/portfolio" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Portefeuille</a>
          <a href="/docs" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>API</a>
        </div>
        <span className="footer-copy">
          Données · <a href="https://www.data.gouv.fr" target="_blank" rel="noreferrer">data.gouv.fr</a> (DVF) · Licence Ouverte
          &nbsp;·&nbsp; <a href="mailto:support@dvfestimator.live">support@dvfestimator.live</a>
          &nbsp;·&nbsp; © {new Date().getFullYear()}
        </span>
      </footer>
    </>
  );
}
