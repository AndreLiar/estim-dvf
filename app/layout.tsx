import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DVF Estimateur — Prix Immobilier France",
  description: "Estimez la valeur d'un bien immobilier en France grâce aux données officielles DVF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
