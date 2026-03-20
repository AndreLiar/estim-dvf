"use client";

import { useState } from "react";

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
      <div className="chart-label">Évolution du prix médian / m²</div>
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

function EstimatorForm() {
  const [postalCode, setPostalCode] = useState("");
  const [type, setType] = useState("Appartement");
  const [surface, setSurface] = useState("");
  const [proToken, setProToken] = useState("");
  const [showToken, setShowToken] = useState(false);
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
      const params = new URLSearchParams({ postalCode, type, surface, ...(proToken ? { token: proToken } : {}) });
      const res = await fetch(`/api/estimate?${params}`);
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
        <button className="pro-toggle" onClick={() => setShowToken(!showToken)}>
          {showToken ? "Fermer" : "Compte Pro"}
        </button>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {showToken && (
            <div className="form-group">
              <label>Token Pro</label>
              <input
                type="text"
                placeholder="Collez votre token d'accès"
                value={proToken}
                onChange={(e) => setProToken(e.target.value)}
              />
            </div>
          )}

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
            {loading ? "Calcul en cours..." : "Estimer le bien"}
          </button>
        </form>

        {loading && (
          <div className="loading-box">
            <span className="spinner" />
            Interrogation des données DVF...
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
              <div className="result-range">
                {fmt(result.estimatedMin)} — {fmt(result.estimatedMax)}
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-value">{fmt(result.medianPricePerM2)}</span>
                <span className="stat-label">Médiane /m²</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{result.comparableSales}</span>
                <span className="stat-label">Ventes analysées</span>
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

export default function Home() {
  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          Estim<span className="nav-logo-accent">DVF</span>
        </a>
        <div className="nav-links">
          <a href="#fonctionnement">Méthode</a>
          <a href="#tarifs">Tarifs</a>
          <button onClick={() => startCheckout("pro")} className="btn btn-primary" style={{ fontSize: "0.75rem" }}>
            Accès Pro
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-glow" />

        <div className="hero-eyebrow">
          Données officielles · Ministère des Finances
        </div>

        <h1>
          Le prix <em>réel</em><br />de l&apos;immobilier<br />français
        </h1>

        <p className="hero-sub">
          Basé sur 20 millions de transactions notariées. Pas d&apos;algorithme opaque — uniquement les données DVF du gouvernement.
        </p>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">20M+</span>
            <span className="hero-stat-label">Transactions</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="hero-stat-value">36 000</span>
            <span className="hero-stat-label">Communes</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="hero-stat-value">100%</span>
            <span className="hero-stat-label">Données officielles</span>
          </div>
        </div>
      </section>

      {/* ESTIMATOR */}
      <div className="estimator-section">
        <EstimatorForm />
      </div>

      {/* FEATURES */}
      <section className="features" id="fonctionnement">
        <div className="section-eyebrow">Pourquoi EstimDVF</div>
        <h2 className="section-title">La donnée brute,<br /><em>sans filtre</em></h2>
        <p className="section-sub">
          Contrairement aux agrégateurs qui modélisent, nous interrogeons directement les actes notariés enregistrés par l&apos;État.
        </p>

        <div className="features-grid">
          {[
            { n: "01", title: "Source notariale", desc: "Les données DVF proviennent des actes authentiques transmis par les notaires à la DGFiP. C'est la référence légale." },
            { n: "02", title: "Précision au code postal", desc: "Chaque estimation analyse les transactions réelles de votre secteur, pas une extrapolation régionale." },
            { n: "03", title: "Statistiques robustes", desc: "Médiane, moyenne, percentiles 10-90. Une analyse complète pour une décision éclairée." },
            { n: "04", title: "Historique des prix", desc: "Visualisez l'évolution du marché année par année dans votre zone. Disponible en version Pro." },
            { n: "05", title: "Export PDF professionnel", desc: "Générez un rapport formaté à partager avec vos clients ou à joindre à un dossier de financement." },
            { n: "06", title: "API documentée", desc: "Intégrez nos estimations dans vos applications métiers via une API REST simple et fiable." },
          ].map((f) => (
            <div className="feature-card" key={f.n}>
              <div className="feature-num">{f.n}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="tarifs">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="section-eyebrow">Tarifs</div>
          <h2 className="section-title" style={{ marginBottom: "0.5rem" }}>Simple.<br /><em>Transparent.</em></h2>
          <p className="section-sub">Commencez gratuitement. Passez au Pro quand vous avez besoin de plus.</p>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-name">Gratuit</div>
              <div className="pricing-price">0€ <span>/ mois</span></div>
              <div className="pricing-desc">Pour découvrir et usage occasionnel.</div>
              <ul className="pricing-features">
                <li>5 estimations / jour</li>
                <li>Résultats complets</li>
                <li>Données DVF officielles</li>
              </ul>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn btn-ghost btn-full">
                Commencer
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-name">Pro</div>
              <div className="pricing-price">49€ <span>/ mois</span></div>
              <div className="pricing-desc">Pour les professionnels de l&apos;immobilier.</div>
              <ul className="pricing-features">
                <li>Estimations illimitées</li>
                <li>Historique des prix</li>
                <li>Export PDF du rapport</li>
                <li>Support prioritaire</li>
              </ul>
              <button onClick={() => startCheckout("pro")} className="btn btn-primary btn-full">
                Démarrer l&apos;essai
              </button>
            </div>

            <div className="pricing-card">
              <div className="pricing-name">API</div>
              <div className="pricing-price">199€ <span>/ mois</span></div>
              <div className="pricing-desc">Pour intégrer dans vos applications.</div>
              <ul className="pricing-features">
                <li>10 000 requêtes / mois</li>
                <li>API REST documentée</li>
                <li>Accès prioritaire</li>
                <li>Support dédié</li>
              </ul>
              <button onClick={() => startCheckout("api")} className="btn btn-outline btn-full">
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
