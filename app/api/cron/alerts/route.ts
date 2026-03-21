import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchDvfStats } from "@/lib/dvf";
import { listAllActiveAlerts, updateAlertBaseline, recordAlertFired } from "@/services/alerts";
import { getUserEmailById } from "@/services/auth";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dvfestimator.live";

  const alerts = await listAllActiveAlerts();
  if (!alerts.length) return NextResponse.json({ processed: 0 });

  let fired = 0;
  for (const alert of alerts) {
    try {
      const stats = await fetchDvfStats(alert.codePostal, alert.typeLocal);
      if (!stats) continue;

      const newMedian = stats.medianPerM2;
      const oldMedian = alert.lastMedian;

      // Always update baseline timestamp
      await updateAlertBaseline(alert.id, newMedian);

      if (!oldMedian) continue;

      const changePct = ((newMedian - oldMedian) / oldMedian) * 100;
      if (Math.abs(changePct) < alert.thresholdPct) continue;

      // Get user email
      const email = await getUserEmailById(alert.userId);
      if (!email) continue;

      const direction = changePct > 0 ? "hausse" : "baisse";
      const fmt = (n: number) =>
        new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

      await resend.emails.send({
        from: "EstimDVF <alerts@dvfestimator.live>",
        to: email,
        subject: `Alerte prix · ${alert.codePostal} · ${direction} de ${Math.abs(changePct).toFixed(1)}%`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:2rem">
            <div style="font-size:1.1rem;font-weight:700;color:#0d1b3e;margin-bottom:1rem">
              📈 Alerte marché EstimDVF
            </div>
            <p style="color:#4a5568">Le marché immobilier de <strong>${alert.codePostal}</strong>
            (${alert.typeLocal}) a évolué significativement.</p>
            <div style="background:#f2f4f8;border-radius:8px;padding:1.5rem;margin:1.5rem 0">
              <div style="font-size:0.75rem;color:#8896aa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.5rem">
                Variation annuelle
              </div>
              <div style="font-size:2rem;font-weight:800;color:${changePct > 0 ? "#059669" : "#dc2626"}">
                ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%
              </div>
              <div style="margin-top:1rem;display:flex;gap:2rem">
                <div>
                  <div style="font-size:0.7rem;color:#8896aa">Médiane précédente</div>
                  <div style="font-weight:600;color:#0d1b3e">${fmt(oldMedian)} €/m²</div>
                </div>
                <div>
                  <div style="font-size:0.7rem;color:#8896aa">Médiane actuelle</div>
                  <div style="font-weight:600;color:#0d1b3e">${fmt(newMedian)} €/m²</div>
                </div>
              </div>
            </div>
            <a href="${baseUrl}/market/${alert.codePostal}"
               style="display:inline-block;background:#1a56db;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.875rem">
              Voir le marché →
            </a>
            <p style="margin-top:2rem;font-size:0.75rem;color:#8896aa">
              EstimDVF · <a href="${baseUrl}/alerts" style="color:#8896aa">Gérer mes alertes</a>
            </p>
          </div>
        `,
      });

      await recordAlertFired({
        alertId: alert.id,
        oldMedian,
        newMedian,
        changePct,
      });

      fired++;
    } catch (e) {
      console.error("Alert error:", alert.id, e);
    }
  }

  return NextResponse.json({ processed: alerts.length, fired });
}
