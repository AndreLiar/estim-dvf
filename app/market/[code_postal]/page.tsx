import { fetchDvfStats } from "@/lib/dvf";
import type { Metadata } from "next";

export const revalidate = 86400;

interface Props {
  params: Promise<{ code_postal: string }>;
  searchParams: Promise<{ type?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { code_postal } = await params;
  const { type = "Appartement" } = await searchParams;
  return {
    title: `Marché immobilier ${code_postal} · ${type} · EstimDVF`,
    description: `Prix au m², tendance et volume de transactions pour les ${type.toLowerCase()}s du code postal ${code_postal}. Données DVF officielles.`,
  };
}

export default async function MarketPage({ params, searchParams }: Props) {
  const { code_postal } = await params;
  const { type = "Appartement" } = await searchParams;

  const stats = await fetchDvfStats(code_postal, type, 5);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  const momentumColor = stats && stats.momentum12m !== null
    ? stats.momentum12m > 0 ? "#059669" : "#dc2626"
    : "var(--text-muted)";

  const momentumSign = stats?.momentum12m !== null && stats?.momentum12m !== undefined
    ? stats.momentum12m > 0 ? "+" : ""
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <nav className="nav">
        <a href="/" className="nav-logo">Estim<span className="nav-logo-accent">DVF</span></a>
        <div className="nav-links">
          <a href="/">Estimateur</a>
          <a href="/market">Marchés</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "7rem 1.5rem 4rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <a href="/market" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.08em" }}>
            ← Tous les marchés
          </a>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginTop: "1.25rem" }}>
            <div>
              <div className="section-eyebrow">Analyse de marché · DVF officiel</div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>
                {stats?.cityName || code_postal}
                <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "1.2rem" }}> · {code_postal}</span>
              </h1>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a href={`/market/${code_postal}?type=Appartement`} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", padding: "0.25rem 0.75rem",
                  borderRadius: 100, border: "1px solid var(--border)", textDecoration: "none",
                  background: type === "Appartement" ? "var(--blue)" : "transparent",
                  color: type === "Appartement" ? "var(--white)" : "var(--text-muted)",
                }}>Appartement</a>
                <a href={`/market/${code_postal}?type=Maison`} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", padding: "0.25rem 0.75rem",
                  borderRadius: 100, border: "1px solid var(--border)", textDecoration: "none",
                  background: type === "Maison" ? "var(--blue)" : "transparent",
                  color: type === "Maison" ? "var(--white)" : "var(--text-muted)",
                }}>Maison</a>
              </div>
            </div>
            {stats?.lastSaleDate && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                Dernière vente : {new Date(stats.lastSaleDate).toLocaleDateString("fr-FR")}
              </div>
            )}
          </div>
        </div>

        {!stats ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "0.75rem" }}>
                Données insuffisantes
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Pas assez de transactions DVF pour ce code postal ({type.toLowerCase()}).
              </p>
              <a href="/market" className="btn btn-outline" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                Autre marché
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Key stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "1.5rem", border: "1px solid var(--border)" }}>
              {[
                { label: "Médiane", value: `${fmt(stats.medianPerM2)} €/m²`, sub: "Prix médian" },
                { label: "Moyenne", value: `${fmt(stats.avgPerM2)} €/m²`, sub: "Prix moyen" },
                { label: "Tendance 12m", value: stats.momentum12m !== null ? `${momentumSign}${stats.momentum12m.toFixed(1)}%` : "N/A", sub: "Var. annuelle", valueColor: momentumColor },
                { label: "Volume", value: fmt(stats.volume), sub: "Transactions" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--white)", padding: "1.5rem 1.25rem" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{s.label}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.6rem", fontWeight: 800, color: (s as { valueColor?: string }).valueColor || "var(--navy)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "0.25rem" }}>{s.value}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Price range */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div className="card-header">
                <span className="card-header-title">Fourchette de prix</span>
                <span className="card-header-tag">Déciles P10–P90</span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>P10 · Bas marché</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--navy)" }}>{fmt(stats.p10PerM2)} €/m²</div>
                  </div>
                  <div style={{ flex: 1, position: "relative", height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      position: "absolute",
                      left: `${((stats.p10PerM2 - stats.p10PerM2) / (stats.p90PerM2 - stats.p10PerM2)) * 100}%`,
                      right: `${100 - ((stats.medianPerM2 - stats.p10PerM2) / (stats.p90PerM2 - stats.p10PerM2)) * 100}%`,
                      top: 0, bottom: 0,
                      background: "linear-gradient(90deg, var(--blue-light), var(--blue))",
                      borderRadius: 4,
                    }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>P90 · Haut marché</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--navy)" }}>{fmt(stats.p90PerM2)} €/m²</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price history chart */}
            {stats.priceHistory.length > 0 && (
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="card-header">
                  <span className="card-header-title">Évolution des prix</span>
                  <span className="card-header-tag">Annuel DVF</span>
                </div>
                <div className="card-body">
                  <div className="chart-label">Médiane €/m² par année</div>
                  <div className="chart-bars">
                    {(() => {
                      const maxVal = Math.max(...stats.priceHistory.map((y) => y.medianPerM2));
                      return stats.priceHistory.map((y, i) => (
                        <div key={y.year} className="chart-bar-col">
                          <div className="chart-bar-val">{fmt(y.medianPerM2)}</div>
                          <div
                            className="chart-bar"
                            style={{
                              height: `${(y.medianPerM2 / maxVal) * 100}%`,
                              opacity: i === stats.priceHistory.length - 1 ? 1 : 0.65,
                            }}
                          />
                          <div className="chart-bar-year">{y.year}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ background: "var(--navy)", borderRadius: "var(--radius-xl)", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Alertes de marché · Pro</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--white)" }}>
                  Recevoir une alerte si les prix bougent
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginTop: "0.35rem" }}>
                  Notification email dès que la médiane dépasse votre seuil
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
                <a href="/alerts" className="btn" style={{ background: "var(--blue)", color: "var(--white)", fontSize: "0.875rem" }}>
                  Créer une alerte
                </a>
                <a href="/" className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)", fontSize: "0.875rem" }}>
                  Estimer un bien →
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="footer">
        <span className="footer-logo">Estim<span style={{ color: "var(--blue)" }}>DVF</span></span>
        <span className="footer-copy">
          Données DVF · Ministère de l&apos;Économie ·{" "}
          <a href="/docs">API</a> · <a href="/">Estimateur</a>
        </span>
      </footer>
    </div>
  );
}
