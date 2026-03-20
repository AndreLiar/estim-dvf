import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EstimDVF — Le prix réel de l'immobilier français",
  description: "Estimez la valeur de votre bien immobilier avec les données officielles DVF du gouvernement français. 20 millions de transactions notariées.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
