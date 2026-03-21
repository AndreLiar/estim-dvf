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
        if (data.session?.access_token) {
          headers["Authorization"] = `Bearer ${data.session.access_token}`;
        }
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
            <input
              type="text"
              placeholder="75011"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              maxLength={5}
              pattern="\d{5}"
              required
            />
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
              <input
                type="number"
                placeholder="65"
                min="5"
                max="2000"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                required
              />
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
                  <strong>Pro</strong> — Historique des prix, export PDF, estimations illimitées.
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
const FEATURES = [
  { n: "01", icon: "⚖️", title: "Source notariale", desc: "Actes authentiques transmis par les notaires à la DGFiP. La référence légale — pas une estimation algorithmique." },
  { n: "02", icon: "📍", title: "Précision au code postal", desc: "Analyse des transactions réelles de votre secteur. Pas d'extrapolation régionale ou départementale." },
  { n: "03", icon: "📊", title: "Statistiques robustes", desc: "Médiane, moyenne, percentiles 10–90. Une analyse complète pour chaque décision." },
  { n: "04", icon: "📈", title: "Historique des prix", desc: "Évolution du marché année par année dans votre zone. Visualisez les tendances locales. Plan Pro." },
  { n: "05", icon: "📄", title: "Export PDF professionnel", desc: "Rapport formaté pour vos clients ou dossiers de financement. Plan Pro." },
  { n: "06", icon: "🔌", title: "API documentée", desc: "Intégrez nos estimations dans vos outils métiers. REST, JSON, documentation complète. Plan API." },
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
          <a href="#methode">Méthode</a>
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
              Le prix <em>réel</em><br />
              de l&apos;immobilier<br />
              français
            </h1>
            <p className="hero-sub">
              20 millions de transactions notariées. Analysées en temps réel. Pas d&apos;algorithme opaque — uniquement les données DVF du gouvernement.
            </p>
            <div className="hero-actions">
              <button onClick={() => document.querySelector(".estimator-section")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-primary">
                Estimer un bien →
              </button>
              <a href="#tarifs" className="btn btn-ghost">Voir les tarifs</a>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item">Données officielles</span>
              <span className="hero-trust-item">20M+ transactions</span>
              <span className="hero-trust-item">36 000 communes</span>
              <span className="hero-trust-item">Mise à jour mensuelle</span>
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
                  <span>2012</span>
                  <span>2016</span>
                  <span>2020</span>
                  <span>2024</span>
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
            { value: "100", accent: "%", label: "Données gouvernementales" },
            { value: "< 2", accent: "s", label: "Temps de réponse" },
          ].map((m) => (
            <div className="metric-item" key={m.label}>
              <div className="metric-value">
                {m.value}<span className="metric-value-accent">{m.accent}</span>
              </div>
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
              Renseignez le code postal, le type de bien et la surface. Nous interrogeons directement la base DVF et calculons les statistiques en temps réel.
            </p>
            <div style={{ marginTop: "2rem" }}>
              <div className="trust-list">
                {[
                  "Prix médian et moyen au m² dans votre secteur",
                  "Fourchette d'estimation (percentile 10–90)",
                  "Nombre de ventes comparables analysées",
                  "Historique des prix sur 5 ans (Pro)",
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

      {/* FEATURES */}
      <section style={{ padding: "7rem 2rem" }} id="methode">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="features-header">
            <div>
              <div className="section-eyebrow">Pourquoi EstimDVF</div>
              <h2 className="section-title">La donnée brute,<br /><em>sans filtre</em></h2>
            </div>
            <p className="section-sub" style={{ maxWidth: 380 }}>
              Contrairement aux agrégateurs qui modélisent, nous interrogeons directement les actes notariés enregistrés par l&apos;État.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.n}>
                <div className="feature-num">{f.n}</div>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
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
                <li>Résultats complets</li>
                <li>Données DVF officielles</li>
              </ul>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn btn-ghost btn-full">
                Commencer
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
                <li>Historique des prix</li>
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
                <li>10 000 requêtes / mois</li>
                <li>API REST documentée</li>
                <li>Clé d&apos;accès dédiée</li>
                <li>Support dédié</li>
              </ul>
              <button onClick={() => startCheckout("api")} className="btn btn-ghost btn-full">
                Commencer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-logo">EstimDVF</span>
        <span className="footer-copy">
          Données · <a href="https://www.data.gouv.fr" target="_blank" rel="noreferrer">data.gouv.fr</a> (DVF) · Licence Ouverte
          &nbsp;·&nbsp; <a href="mailto:support@dvfestimator.live">support@dvfestimator.live</a>
          &nbsp;·&nbsp; © {new Date().getFullYear()}
        </span>
      </footer>
    </>
  );
}
