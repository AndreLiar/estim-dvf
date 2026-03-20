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
  upgrade?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
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
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.medianPricePerM2));
  const min = Math.min(...data.map((d) => d.medianPricePerM2));
  const range = max - min || 1;

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
        Historique des prix / m²
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {data.map((d) => {
          const heightPct = 20 + ((d.medianPricePerM2 - min) / range) * 80;
          return (
            <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--gray-500)" }}>{fmt(d.medianPricePerM2).replace("€", "").trim()}</div>
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: "var(--blue)",
                  borderRadius: "4px 4px 0 0",
                  opacity: 0.8,
                }}
              />
              <div style={{ fontSize: "0.65rem", color: "var(--gray-400)" }}>{d.year}</div>
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
  const [showTokenInput, setShowTokenInput] = useState(false);
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
      const params = new URLSearchParams({
        postalCode,
        type,
        surface,
        ...(proToken ? { token: proToken } : {}),
      });
      const res = await fetch(`/api/estimate?${params.toString()}`);
      const data = await res.json();

      if (res.status === 429) {
        setLimitReached(true);
        setError(data.error);
      } else if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="card">
      <div className="card-header">
        <span>🏠</span>
        <h2>Estimez votre bien immobilier</h2>
        <button
          onClick={() => setShowTokenInput(!showTokenInput)}
          style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          {showTokenInput ? "Masquer" : "Compte Pro?"}
        </button>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {showTokenInput && (
            <div className="form-group">
              <label htmlFor="proToken">Token Pro</label>
              <input
                id="proToken"
                type="text"
                placeholder="Collez votre token Pro ici"
                value={proToken}
                onChange={(e) => setProToken(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="postalCode">Code postal</label>
            <input
              id="postalCode"
              type="text"
              placeholder="Ex: 75011, 69001, 13001"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              maxLength={5}
              pattern="\d{5}"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Type de bien</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Appartement">Appartement</option>
                <option value="Maison">Maison</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="surface">Surface (m²)</label>
              <input
                id="surface"
                type="number"
                placeholder="Ex: 65"
                min="5"
                max="2000"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Calcul en cours..." : "Estimer maintenant — Gratuit"}
          </button>
        </form>

        {loading && (
          <div className="loading-box">
            <span className="spinner" />
            Interrogation des données officielles DVF...
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
            {limitReached && (
              <div style={{ marginTop: "0.75rem" }}>
                <button onClick={() => startCheckout("pro")} className="btn btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
                  Passer en Pro — 49€/mois
                </button>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="result" id="print-result">
            {result.isPro && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span className="badge-green" style={{ background: "var(--green-light)", color: "var(--green)", padding: "0.2rem 0.6rem", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>
                  Pro
                </span>
                <button onClick={handlePrint} className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}>
                  Exporter PDF
                </button>
              </div>
            )}

            <div className="result-city">{result.city} · {result.postalCode} · {result.type} · {result.surface} m²</div>
            <div className="result-price">{fmt(result.estimatedPrice)}</div>
            <div className="result-range">Fourchette : {fmt(result.estimatedMin)} — {fmt(result.estimatedMax)}</div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-value">{fmt(result.medianPricePerM2)}</div>
                <div className="stat-label">Médiane / m²</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{result.comparableSales}</div>
                <div className="stat-label">Ventes analysées</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{fmt(result.avgPricePerM2)}</div>
                <div className="stat-label">Moyenne / m²</div>
              </div>
            </div>

            {result.priceHistory && result.priceHistory.length > 1 && (
              <PriceHistoryChart data={result.priceHistory} />
            )}

            {!result.isPro && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--blue-light)", borderRadius: 8, fontSize: "0.8rem", color: "var(--blue)", textAlign: "center" }}>
                Passez en <strong>Pro</strong> pour l&apos;historique des prix, l&apos;export PDF et les estimations illimitées.{" "}
                <span style={{ cursor: "pointer", textDecoration: "underline", fontWeight: 700 }} onClick={() => startCheckout("pro")}>
                  49€/mois
                </span>
              </div>
            )}

            <div className="result-footer">
              Source : DVF — data.gouv.fr
              {result.lastSaleDate && ` · Dernière vente : ${result.lastSaleDate}`}
              {result.remainingToday !== null && (
                <span> · {result.remainingToday} estimation{result.remainingToday !== 1 ? "s" : ""} gratuite{result.remainingToday !== 1 ? "s" : ""} restante{result.remainingToday !== 1 ? "s" : ""} aujourd&apos;hui</span>
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
      <nav className="nav">
        <a href="/" className="nav-logo"><span>🏠</span> EstimDVF</a>
        <div className="nav-links">
          <a href="#fonctionnement">Comment ça marche</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#tarifs" className="btn btn-primary">Commencer</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badges">
          <span className="badge">Données officielles gouvernementales</span>
          <span className="badge">20 millions de transactions</span>
          <span className="badge">Mis à jour en continu</span>
        </div>
        <h1>Estimez votre bien immobilier<br />avec les <span>vraies données</span></h1>
        <p>Basé sur les transactions DVF du gouvernement français. Pas d&apos;algorithme opaque — juste les prix réels du marché.</p>
      </section>

      <div className="estimator-wrapper">
        <EstimatorForm />
      </div>

      <section className="features" id="fonctionnement">
        <div className="section-label">Pourquoi EstimDVF</div>
        <h2 className="section-title">Des estimations basées sur la réalité</h2>
        <p className="section-subtitle">
          Contrairement aux autres outils, nous utilisons uniquement les transactions notariées officielles — pas des annonces ou des modèles prédictifs opaques.
        </p>
        <div className="features-grid">
          <div className="feature-card"><div className="feature-icon">🏛️</div><h3>Source officielle</h3><p>Les données DVF viennent directement du Ministère des Finances — les mêmes que les notaires.</p></div>
          <div className="feature-card"><div className="feature-icon">📊</div><h3>Statistiques robustes</h3><p>Médiane, moyenne, fourchette 10-90e percentile. Une analyse complète du marché local.</p></div>
          <div className="feature-card"><div className="feature-icon">⚡</div><h3>Instantané</h3><p>Résultat en secondes. Pas d&apos;inscription, pas de formulaire, pas d&apos;agent commercial.</p></div>
          <div className="feature-card"><div className="feature-icon">📈</div><h3>Historique des prix</h3><p>Visualisez l&apos;évolution des prix par année dans votre code postal (Pro).</p></div>
          <div className="feature-card"><div className="feature-icon">📄</div><h3>Export PDF</h3><p>Générez un rapport PDF de l&apos;estimation à partager avec vos clients (Pro).</p></div>
          <div className="feature-card"><div className="feature-icon">💼</div><h3>Usage professionnel</h3><p>Conçu pour les agents immobiliers, notaires, investisseurs et acheteurs exigeants.</p></div>
        </div>
      </section>

      <section className="pricing" id="tarifs">
        <div className="section-label">Tarifs</div>
        <h2 className="section-title">Simple et transparent</h2>
        <p className="section-subtitle" style={{ marginBottom: "3rem" }}>Commencez gratuitement. Passez au Pro quand vous avez besoin de plus.</p>
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
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn btn-outline btn-full">Commencer gratuitement</button>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-badge">Le plus populaire</div>
            <div className="pricing-name">Pro</div>
            <div className="pricing-price">49€ <span>/ mois</span></div>
            <div className="pricing-desc">Pour les professionnels de l&apos;immobilier.</div>
            <ul className="pricing-features">
              <li>Estimations illimitées</li>
              <li>Export PDF du rapport</li>
              <li>Historique des prix</li>
              <li>Support prioritaire</li>
            </ul>
            <button onClick={() => startCheckout("pro")} className="btn btn-primary btn-full">Démarrer l&apos;essai gratuit</button>
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
            <button onClick={() => startCheckout("api")} className="btn btn-outline btn-full">Commencer</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>EstimDVF — Données issues de <a href="https://www.data.gouv.fr" target="_blank" rel="noreferrer">data.gouv.fr</a> (DVF). Licence Ouverte.</p>
        <p style={{ marginTop: "0.5rem" }}>© {new Date().getFullYear()} EstimDVF · <a href="mailto:support@dvfestimator.live">support@dvfestimator.live</a> · Tous droits réservés</p>
      </footer>
    </>
  );
}
