"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REGIONS = [
  { label: "Paris", code: "75001" },
  { label: "Lyon", code: "69001" },
  { label: "Marseille", code: "13001" },
  { label: "Bordeaux", code: "33000" },
  { label: "Nantes", code: "44000" },
  { label: "Toulouse", code: "31000" },
  { label: "Strasbourg", code: "67000" },
  { label: "Montpellier", code: "34000" },
];

export default function MarketSearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Appartement");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const cp = query.trim();
    if (!/^\d{5}$/.test(cp)) return;
    router.push(`/market/${cp}?type=${type}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <nav className="nav">
        <a href="/" className="nav-logo">Estim<span className="nav-logo-accent">DVF</span></a>
        <div className="nav-links">
          <a href="/">Estimateur</a>
          <a href="/market" style={{ color: "var(--blue)", fontWeight: 600 }}>Marchés</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "8rem 1.5rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div className="section-eyebrow">Intelligence de marché</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            Analyse de marché <em style={{ color: "var(--blue)", fontStyle: "normal" }}>DVF</em>
          </h1>
          <p style={{ color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto", fontSize: "1.05rem", lineHeight: 1.65 }}>
            Consultez les statistiques de prix par code postal — médiane, tendance, volume de transactions, données officielles notariales.
          </p>
        </div>

        <div className="card" style={{ marginBottom: "3rem" }}>
          <div className="card-body" style={{ padding: "2rem" }}>
            <form onSubmit={handleSearch}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: "1 1 200px", marginBottom: 0 }}>
                  <label>Code postal</label>
                  <input
                    type="text"
                    placeholder="ex : 75011"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={5}
                    pattern="\d{5}"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: "1 1 180px", marginBottom: 0 }}>
                  <label>Type de bien</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Appartement">Appartement</option>
                    <option value="Maison">Maison</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.7rem 1.75rem", fontSize: "0.9rem" }}>
                  Analyser →
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            Marchés populaires
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.75rem" }}>
            {REGIONS.map((r) => (
              <a
                key={r.code}
                href={`/market/${r.code}?type=${type}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1.1rem",
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  textDecoration: "none",
                  color: "var(--navy)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--blue)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 3px var(--blue-glow)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                }}
              >
                <span>{r.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.code}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
