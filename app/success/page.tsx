export default function SuccessPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#f0fdf4",
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: "3rem",
        textAlign: "center",
        maxWidth: 480,
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem", color: "#111827" }}>
          Bienvenue dans EstimDVF Pro !
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
          Votre abonnement est actif. Vous avez maintenant un accès illimité aux estimations immobilières.
        </p>
        <a href="/" style={{
          display: "inline-block",
          background: "#2563eb",
          color: "white",
          padding: "0.75rem 2rem",
          borderRadius: 10,
          fontWeight: 700,
          textDecoration: "none",
        }}>
          Commencer à estimer
        </a>
      </div>
    </div>
  );
}
