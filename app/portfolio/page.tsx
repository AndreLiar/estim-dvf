"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

interface Property {
  id: string;
  label: string | null;
  adresse: string | null;
  code_postal: string;
  type_local: string;
  surface_m2: number;
  purchase_price: number;
  purchase_date: string;
  current_median_per_m2: number | null;
  estimate_updated_at: string | null;
  created_at: string;
}

export default function PortfolioPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    label: "",
    adresse: "",
    code_postal: "",
    type_local: "Appartement",
    surface_m2: "",
    purchase_price: "",
    purchase_date: "",
  });

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = "/login"; return; }
      const { data: session } = await supabase.auth.getSession();
      const tok = session.session?.access_token ?? null;
      setToken(tok);

      const { data: pro } = await supabase.from("pro_users").select("active").eq("user_id", data.user.id).eq("active", true).single();
      setIsPro(!!pro);

      if (pro && tok) {
        const res = await fetch("/api/portfolio", { headers: { Authorization: `Bearer ${tok}` } });
        if (res.ok) setProperties(await res.json());
      }
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!/^\d{5}$/.test(form.code_postal)) { setFormError("Code postal invalide"); return; }
    setAdding(true);
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        surface_m2: Number(form.surface_m2),
        purchase_price: Number(form.purchase_price),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error || "Erreur"); setAdding(false); return; }
    setProperties((prev) => [data, ...prev]);
    setForm({ label: "", adresse: "", code_postal: "", type_local: "Appartement", surface_m2: "", purchase_price: "", purchase_date: "" });
    setShowForm(false);
    setAdding(false);
  }

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    const res = await fetch(`/api/portfolio/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const updated = await res.json();
      setProperties((prev) => prev.map((p) => p.id === id ? updated : p));
    }
    setRefreshingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce bien du portefeuille ?")) return;
    setDeletingId(id);
    await fetch(`/api/portfolio/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  }

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  function calcGain(prop: Property) {
    if (!prop.current_median_per_m2) return null;
    const currentEstimate = prop.current_median_per_m2 * prop.surface_m2;
    const gain = currentEstimate - prop.purchase_price;
    const pct = (gain / prop.purchase_price) * 100;
    return { currentEstimate, gain, pct };
  }

  const totalPurchase = properties.reduce((s, p) => s + p.purchase_price, 0);
  const totalEstimate = properties.reduce((s, p) => {
    if (p.current_median_per_m2) return s + p.current_median_per_m2 * p.surface_m2;
    return s + p.purchase_price;
  }, 0);
  const totalGain = totalEstimate - totalPurchase;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <nav className="nav">
        <a href="/" className="nav-logo">Estim<span className="nav-logo-accent">DVF</span></a>
        <div className="nav-links">
          <a href="/">Estimateur</a>
          <a href="/market">Marchés</a>
          <a href="/alerts">Alertes</a>
          <a href="/portfolio" style={{ color: "var(--blue)", fontWeight: 600 }}>Portefeuille</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "7rem 1.5rem 4rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2.5rem" }}>
          <div>
            <div className="section-eyebrow">Gestion de patrimoine</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.03em" }}>
              Mon portefeuille
            </h1>
          </div>
          {isPro && (
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              {showForm ? "Annuler" : "+ Ajouter un bien"}
            </button>
          )}
        </div>

        {!isPro ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🏠</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "0.75rem" }}>
              Fonctionnalité Pro
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Le suivi de portefeuille est réservé aux abonnés Pro et API. Jusqu&apos;à 20 biens avec estimation automatique.
            </p>
            <a href="/#tarifs" className="btn btn-primary">Voir les offres — à partir de 49€/mois</a>
          </div>
        ) : (
          <>
            {/* Add form */}
            {showForm && (
              <div className="card" style={{ marginBottom: "2rem", animation: "fadeUp 0.3s ease both" }}>
                <div className="card-header">
                  <span className="card-header-title">Ajouter un bien</span>
                </div>
                <div className="card-body">
                  <form onSubmit={handleAdd}>
                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Libellé (optionnel)</label>
                        <input type="text" placeholder="ex : Appartement Paris 11" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Adresse (optionnelle)</label>
                        <input type="text" placeholder="ex : 12 rue de la Paix" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: "0.75rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Code postal *</label>
                        <input type="text" placeholder="75011" maxLength={5} required value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Type de bien</label>
                        <select value={form.type_local} onChange={(e) => setForm({ ...form, type_local: e.target.value })}>
                          <option value="Appartement">Appartement</option>
                          <option value="Maison">Maison</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Surface (m²) *</label>
                        <input type="number" min={1} required placeholder="75" value={form.surface_m2} onChange={(e) => setForm({ ...form, surface_m2: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: "0.75rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Prix d&apos;achat (€) *</label>
                        <input type="number" min={1} required placeholder="350000" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Date d&apos;achat *</label>
                        <input type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                      </div>
                    </div>
                    {formError && <div className="error-box" style={{ marginTop: "0.75rem" }}>{formError}</div>}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                      <button type="submit" disabled={adding} className="btn btn-primary">
                        {adding ? "Ajout en cours..." : "Ajouter au portefeuille"}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Summary */}
            {properties.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "1.5rem", border: "1px solid var(--border)" }}>
                {[
                  { label: "Biens", value: `${properties.length} / 20` },
                  { label: "Coût total", value: `${fmt(totalPurchase)} €` },
                  { label: "Valeur estimée", value: `${fmt(totalEstimate)} €`, sub: totalGain >= 0 ? `+${fmt(totalGain)} €` : `${fmt(totalGain)} €`, subColor: totalGain >= 0 ? "#059669" : "#dc2626" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--white)", padding: "1.5rem" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{s.label}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.03em" }}>{s.value}</div>
                    {(s as { sub?: string; subColor?: string }).sub && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: (s as { subColor?: string }).subColor, marginTop: "0.2rem" }}>{(s as { sub?: string }).sub}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Property list */}
            {properties.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem" }}>
                Aucun bien ajouté. Commencez par ajouter votre premier bien.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {properties.map((prop) => {
                  const gain = calcGain(prop);
                  return (
                    <div key={prop.id} className="card">
                      <div className="card-body" style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "1rem", marginBottom: "0.2rem" }}>
                            {prop.label || `${prop.code_postal} · ${prop.type_local}`}
                          </div>
                          {prop.adresse && (
                            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{prop.adresse}</div>
                          )}
                          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>{prop.surface_m2} m²</span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>{prop.type_local}</span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>{prop.code_postal}</span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>Acheté {new Date(prop.purchase_date).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Prix achat</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "var(--navy)" }}>{fmt(prop.purchase_price)} €</div>
                          </div>
                          {gain ? (
                            <>
                              <div>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Valeur estimée</div>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "var(--navy)" }}>{fmt(gain.currentEstimate)} €</div>
                              </div>
                              <div>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Plus-value</div>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: gain.pct >= 0 ? "#059669" : "#dc2626" }}>
                                  {gain.pct >= 0 ? "+" : ""}{gain.pct.toFixed(1)}%
                                </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              Données DVF insuffisantes
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                          <button
                            onClick={() => handleRefresh(prop.id)}
                            disabled={refreshingId === prop.id}
                            className="btn btn-ghost"
                            style={{ fontSize: "0.75rem" }}
                          >
                            {refreshingId === prop.id ? "..." : "↻ Actualiser"}
                          </button>
                          <a href={`/market/${prop.code_postal}?type=${prop.type_local}`} className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
                            Marché
                          </a>
                          <button
                            onClick={() => handleDelete(prop.id)}
                            disabled={deletingId === prop.id}
                            className="btn"
                            style={{ fontSize: "0.75rem", background: "transparent", color: "var(--red)", border: "1px solid #fed7d7" }}
                          >
                            {deletingId === prop.id ? "..." : "×"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
