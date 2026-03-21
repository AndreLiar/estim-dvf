import { fetchDvfStats } from "@/lib/dvf";
import type { Metadata } from "next";

export const revalidate = 86400;

interface Props {
  params: Promise<{ code_postal: string }>;
  searchParams: Promise<{ type?: string; theme?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { robots: "noindex" };
}

export default async function WidgetPage({ params, searchParams }: Props) {
  const { code_postal } = await params;
  const { type = "Appartement", theme = "light" } = await searchParams;

  const stats = await fetchDvfStats(code_postal, type, 2);
  const isDark = theme === "dark";

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  const bg = isDark ? "#0d1b3e" : "#ffffff";
  const fg = isDark ? "#ffffff" : "#0a0e1a";
  const subColor = isDark ? "rgba(255,255,255,0.45)" : "#4a5568";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#e2e6ed";
  const surfaceBg = isDark ? "rgba(255,255,255,0.04)" : "#f2f4f8";

  const momentumColor = stats?.momentum12m !== null && stats?.momentum12m !== undefined
    ? stats.momentum12m > 0 ? "#059669" : "#dc2626"
    : subColor;

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      background: bg,
      color: fg,
      padding: "1.25rem",
      borderRadius: 12,
      minHeight: "100vh",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <a href="https://dvfestimator.live" target="_blank" rel="noopener noreferrer" style={{
          fontFamily: "'Syne', sans-serif", fontSize: "0.85rem", fontWeight: 800, color: fg, textDecoration: "none",
        }}>
          Estim<span style={{ color: "#1a56db" }}>DVF</span>
        </a>
        <div style={{ fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: subColor }}>
          Données DVF officielles
        </div>
      </div>

      {!stats ? (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Données insuffisantes
          </div>
          <div style={{ fontSize: "0.72rem", color: subColor }}>
            Pas de transactions DVF pour {code_postal} ({type})
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem", fontWeight: 800, color: fg, marginBottom: "0.2rem" }}>
            {stats.cityName || code_postal}
          </div>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: subColor, marginBottom: "1.25rem" }}>
            {code_postal} · {type}
          </div>

          <div style={{ background: surfaceBg, borderRadius: 8, padding: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: subColor, marginBottom: "0.4rem" }}>
              Prix médian
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: fg, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {fmt(stats.medianPerM2)}{" "}
              <span style={{ fontSize: "1rem", fontWeight: 400, opacity: 0.5 }}>€/m²</span>
            </div>
          </div>

          <div style={{ height: 1, background: borderColor, margin: "1.25rem 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: subColor, marginBottom: "0.3rem" }}>Tendance 12 mois</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, color: momentumColor }}>
                {stats.momentum12m !== null
                  ? `${stats.momentum12m > 0 ? "+" : ""}${stats.momentum12m.toFixed(1)}%`
                  : "N/D"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: subColor, marginBottom: "0.3rem" }}>Transactions</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmt(stats.volume)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: subColor, marginBottom: "0.3rem" }}>Bas marché (P10)</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmt(stats.p10PerM2)} €/m²</div>
            </div>
            <div>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: subColor, marginBottom: "0.3rem" }}>Haut marché (P90)</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmt(stats.p90PerM2)} €/m²</div>
            </div>
          </div>

          <div style={{ marginTop: "1.25rem", paddingTop: "0.875rem", borderTop: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.08em", color: subColor }}>Source : DVF · Ministère de l&apos;Économie</div>
            <a
              href={`https://dvfestimator.live/market/${code_postal}?type=${type}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.6rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}
            >
              Analyse complète →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
