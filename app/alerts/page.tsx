"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

interface Alert {
  id: string;
  code_postal: string;
  type_local: string;
  threshold_pct: number;
  last_median: number | null;
  last_checked: string;
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code_postal: "", type_local: "Appartement", threshold_pct: 5 });
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        const res = await fetch("/api/alerts", { headers: { Authorization: `Bearer ${tok}` } });
        if (res.ok) setAlerts(await res.json());
      }
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!/^\d{5}$/.test(form.code_postal)) { setFormError("Code postal invalide (5 chiffres)"); return; }
    setCreating(true);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error || "Erreur"); setCreating(false); return; }
    setAlerts((prev) => [data, ...prev]);
    setForm({ code_postal: "", type_local: "Appartement", threshold_pct: 5 });
    setCreating(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/alerts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

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
          <a href="/alerts" style={{ color: "var(--blue)", fontWeight: 600 }}>Alertes</a>
          <a href="/portfolio">Portefeuille</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "7rem 1.5rem 4rem" }}>
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="section-eyebrow">Surveillance de marché</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.03em" }}>
            Alertes de prix
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Recevez un email automatique quand les prix bougent de votre seuil.
          </p>
        </div>

        {!isPro ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔔</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "0.75rem" }}>
              Fonctionnalité Pro
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Les alertes de prix sont réservées aux abonnés Pro et API.
            </p>
            <a href="/#tarifs" className="btn btn-primary">Voir les offres — à partir de 49€/mois</a>
          </div>
        ) : (
          <>
            {/* Create form */}
            <div className="card" style={{ marginBottom: "2rem" }}>
              <div className="card-header">
                <span className="card-header-title">Nouvelle alerte</span>
                <span className="card-header-tag">Pro</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreate}>
                  <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Code postal</label>
                      <input
                        type="text"
                        placeholder="75011"
                        value={form.code_postal}
                        onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Type de bien</label>
                      <select value={form.type_local} onChange={(e) => setForm({ ...form, type_local: e.target.value })}>
                        <option value="Appartement">Appartement</option>
                        <option value="Maison">Maison</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Seuil d&apos;alerte (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={form.threshold_pct}
                        onChange={(e) => setForm({ ...form, threshold_pct: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  {formError && <div className="error-box" style={{ marginTop: "0.75rem" }}>{formError}</div>}
                  <button type="submit" disabled={creating} className="btn btn-primary" style={{ marginTop: "1rem" }}>
                    {creating ? "Création..." : "Créer l'alerte"}
                  </button>
                </form>
              </div>
            </div>

            {/* Alert list */}
            {alerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem" }}>
                Aucune alerte active. Créez votre première alerte ci-dessus.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {alerts.map((alert) => (
                  <div key={alert.id} className="card">
                    <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Zone</div>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "1rem" }}>
                            {alert.code_postal} · {alert.type_local}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Seuil</div>
                          <div style={{ fontWeight: 600, color: "var(--blue)" }}>±{alert.threshold_pct}%</div>
                        </div>
                        {alert.last_median && (
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Référence actuelle</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "var(--navy)" }}>{fmt(alert.last_median)} €/m²</div>
                          </div>
                        )}
                        <div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Dernier contrôle</div>
                          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                            {new Date(alert.last_checked).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <a href={`/market/${alert.code_postal}?type=${alert.type_local}`} className="btn btn-ghost" style={{ fontSize: "0.78rem" }}>
                          Voir le marché
                        </a>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          disabled={deletingId === alert.id}
                          className="btn"
                          style={{ fontSize: "0.78rem", background: "transparent", color: "var(--red)", border: "1px solid #fed7d7" }}
                        >
                          {deletingId === alert.id ? "..." : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
