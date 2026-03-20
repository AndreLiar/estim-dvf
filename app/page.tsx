"use client";

import { useState } from "react";

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
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function EstimatorForm() {
  const [postalCode, setPostalCode] = useState("");
  const [type, setType] = useState("Appartement");
  const [surface, setSurface] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/estimate?postalCode=${encodeURIComponent(postalCode)}&type=${encodeURIComponent(type)}&surface=${surface}`
      );
      const data = await res.json();

      if (!res.ok) {
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

  return (
    <div className="card">
      <div className="card-header">
        <span>🏠</span>
        <h2>Estimez votre bien immobilier</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
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

        {error && <div className="error-box">{error}</div>}

        {result && (
          <div className="result">
            <div className="result-city">
              {result.city} · {result.postalCode} · {result.type} · {result.surface} m²
            </div>
            <div className="result-price">{fmt(result.estimatedPrice)}</div>
            <div className="result-range">
              Fourchette : {fmt(result.estimatedMin)} — {fmt(result.estimatedMax)}
            </div>

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

            <div className="result-footer">
              Source : Demandes de Valeurs Foncières (DVF) — data.gouv.fr
              {result.lastSaleDate && ` · Dernière vente : ${result.lastSaleDate}`}
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
      {/* NAVBAR */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <span>🏠</span> EstimDVF
        </a>
        <div className="nav-links">
          <a href="#fonctionnement">Comment ça marche</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#tarifs" className="btn btn-primary">Commencer</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badges">
          <span className="badge">Données officielles gouvernementales</span>
          <span className="badge">20 millions de transactions</span>
          <span className="badge">Mis à jour en continu</span>
        </div>
        <h1>
          Estimez votre bien immobilier<br />
          avec les <span>vraies données</span>
        </h1>
        <p>
          Basé sur les transactions DVF du gouvernement français. Pas d&apos;algorithme opaque — juste les prix réels du marché.
        </p>
      </section>

      {/* ESTIMATOR */}
      <div className="estimator-wrapper">
        <EstimatorForm />
      </div>

      {/* FEATURES */}
      <section className="features" id="fonctionnement">
        <div className="section-label">Pourquoi EstimDVF</div>
        <h2 className="section-title">Des estimations basées sur la réalité</h2>
        <p className="section-subtitle">
          Contrairement aux autres outils, nous utilisons uniquement les transactions notariées officielles — pas des annonces ou des modèles prédictifs opaques.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🏛️</div>
            <h3>Source officielle</h3>
            <p>Les données DVF viennent directement du Ministère des Finances. Ce sont les mêmes données utilisées par les notaires.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Statistiques robustes</h3>
            <p>Médiane, moyenne, fourchette 10-90e percentile. Pas une simple estimation — une analyse complète du marché local.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instantané</h3>
            <p>Résultat en quelques secondes. Pas d&apos;inscription, pas de formulaire de contact, pas d&apos;agent commercial.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Par code postal</h3>
            <p>Précis au code postal — pas une estimation régionale vague. 500+ transactions analysées par recherche.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Données fraîches</h3>
            <p>Le jeu de données DVF est mis à jour régulièrement avec les dernières mutations enregistrées.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💼</div>
            <h3>Usage professionnel</h3>
            <p>Conçu pour les agents immobiliers, notaires, investisseurs et acheteurs exigeants.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="tarifs">
        <div className="section-label">Tarifs</div>
        <h2 className="section-title">Simple et transparent</h2>
        <p className="section-subtitle" style={{ marginBottom: "3rem" }}>
          Commencez gratuitement. Passez au Pro quand vous avez besoin de plus.
        </p>
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
            <a href="#" className="btn btn-outline btn-full">Commencer gratuitement</a>
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
              <li>API access (100 req/jour)</li>
              <li>Support prioritaire</li>
            </ul>
            <a href="#" className="btn btn-primary btn-full">Démarrer l&apos;essai gratuit</a>
          </div>

          <div className="pricing-card">
            <div className="pricing-name">API</div>
            <div className="pricing-price">199€ <span>/ mois</span></div>
            <div className="pricing-desc">Pour intégrer dans vos applications.</div>
            <ul className="pricing-features">
              <li>10 000 requêtes / mois</li>
              <li>API REST documentée</li>
              <li>Webhooks</li>
              <li>SLA 99.9%</li>
              <li>Support dédié</li>
            </ul>
            <a href="#" className="btn btn-outline btn-full">Nous contacter</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>
          EstimDVF — Données issues de{" "}
          <a href="https://www.data.gouv.fr" target="_blank" rel="noreferrer">data.gouv.fr</a>{" "}
          (Demandes de Valeurs Foncières). Licence Ouverte.
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          © {new Date().getFullYear()} EstimDVF · Tous droits réservés
        </p>
      </footer>
    </>
  );
}
