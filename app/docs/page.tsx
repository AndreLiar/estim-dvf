"use client";

export default function DocsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <nav className="nav">
        <a href="/" className="nav-logo">Estim<span className="nav-logo-accent">DVF</span></a>
        <div className="nav-links">
          <a href="/">Estimateur</a>
          <a href="/dashboard">Mon compte</a>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Référence technique
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 900, color: "var(--white)", marginBottom: "1rem" }}>
            API EstimDVF
          </h1>
          <p style={{ color: "var(--ash)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Intégrez les estimations immobilières basées sur les données DVF officielles dans vos applications. L&apos;API est disponible avec le plan <strong style={{ color: "var(--white)" }}>API à 199€/mois</strong>.
          </p>
        </div>

        <DocSection title="Authentification">
          <p style={{ color: "var(--ash)", marginBottom: "1rem", lineHeight: 1.7 }}>
            Toutes les requêtes API doivent inclure votre clé d&apos;accès dans le header <code style={codeInline}>X-Api-Key</code>.
            Retrouvez votre clé dans votre <a href="/dashboard" style={{ color: "var(--gold)" }}>tableau de bord</a>.
          </p>
          <CodeBlock code={`curl https://dvfestimator.live/api/estimate \\
  -H "X-Api-Key: dvf_votre_clé_ici" \\
  -G \\
  --data-urlencode "postalCode=75011" \\
  --data-urlencode "type=Appartement" \\
  --data-urlencode "surface=65"`} />
        </DocSection>

        <DocSection title="Endpoint">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span style={{ background: "rgba(100,200,100,0.15)", border: "1px solid rgba(100,200,100,0.3)", color: "#6dc56d", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: 2 }}>GET</span>
            <code style={codeInline}>/api/estimate</code>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Paramètre", "Type", "Requis", "Description"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["postalCode", "string", "Oui", "Code postal français (5 chiffres)"],
                ["type", "string", "Oui", '"Appartement" ou "Maison"'],
                ["surface", "number", "Oui", "Surface en m² (5–2000)"],
              ].map(([p, t, r, d]) => (
                <tr key={p} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.6rem 0.75rem" }}><code style={codeInline}>{p}</code></td>
                  <td style={{ padding: "0.6rem 0.75rem", fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "var(--ash)" }}>{t}</td>
                  <td style={{ padding: "0.6rem 0.75rem", fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: r === "Oui" ? "var(--gold)" : "var(--ash)" }}>{r}</td>
                  <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "var(--ash)" }}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocSection>

        <DocSection title="Réponse">
          <CodeBlock code={`{
  "postalCode": "75011",
  "city": "Paris 11e Arrondissement",
  "type": "Appartement",
  "surface": 65,
  "medianPricePerM2": 11240,
  "avgPricePerM2": 11580,
  "estimatedPrice": 730600,
  "estimatedMin": 598000,
  "estimatedMax": 871000,
  "comparableSales": 187,
  "lastSaleDate": "2024-11-18",
  "isPro": true,
  "priceHistory": [
    { "year": "2019", "medianPricePerM2": 10200 },
    { "year": "2020", "medianPricePerM2": 10650 },
    { "year": "2021", "medianPricePerM2": 11100 },
    { "year": "2022", "medianPricePerM2": 11400 },
    { "year": "2023", "medianPricePerM2": 11240 }
  ],
  "apiUsage": {
    "count": 42,
    "limit": 10000
  }
}`} />
        </DocSection>

        <DocSection title="Codes d'erreur">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Code", "Signification"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["200", "Succès"],
                ["400", "Paramètres invalides ou manquants"],
                ["401", "Clé API invalide ou absente"],
                ["404", "Pas assez de données pour ce secteur"],
                ["429", "Limite mensuelle atteinte (10 000 req/mois)"],
                ["502", "Service DVF temporairement indisponible"],
              ].map(([code, desc]) => (
                <tr key={code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.6rem 0.75rem" }}><code style={codeInline}>{code}</code></td>
                  <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "var(--ash)" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocSection>

        <DocSection title="Exemple Node.js">
          <CodeBlock code={`const res = await fetch(
  "https://dvfestimator.live/api/estimate?" +
  new URLSearchParams({ postalCode: "69001", type: "Appartement", surface: "50" }),
  { headers: { "X-Api-Key": process.env.DVF_API_KEY } }
);

const data = await res.json();
console.log(\`Estimation: \${data.estimatedPrice} €\`);`} />
        </DocSection>

        <DocSection title="Exemple Python">
          <CodeBlock code={`import requests

res = requests.get(
    "https://dvfestimator.live/api/estimate",
    params={"postalCode": "33000", "type": "Maison", "surface": 120},
    headers={"X-Api-Key": "dvf_votre_clé_ici"}
)

data = res.json()
print(f"Estimation: {data['estimatedPrice']} €")`} />
        </DocSection>

        <div style={{ marginTop: "3rem", padding: "1.5rem", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 4 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "var(--white)", marginBottom: "0.5rem" }}>
            Besoin d&apos;aide ?
          </div>
          <p style={{ color: "var(--ash)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Notre équipe est disponible pour vous aider à intégrer l&apos;API dans vos applications.
          </p>
          <a href="mailto:support@dvfestimator.live" className="btn btn-primary" style={{ fontSize: "0.8rem" }}>
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  );
}

const codeInline: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "0.82rem",
  background: "rgba(255,255,255,0.06)",
  padding: "0.1rem 0.4rem",
  borderRadius: 3,
  color: "var(--gold)",
};

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "var(--white)",
        marginBottom: "1rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 4,
      padding: "1.25rem",
      overflowX: "auto",
      fontFamily: "'DM Mono', monospace",
      fontSize: "0.78rem",
      lineHeight: 1.7,
      color: "var(--ash)",
      margin: 0,
    }}>
      <code>{code}</code>
    </pre>
  );
}
