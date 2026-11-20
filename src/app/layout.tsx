import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Police très lisible, pensée pour les petits écrans et les lecteurs malvoyants.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  // Next.js n'a pas les mesures de cette police pour créer un remplaçant.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Alternise : les offres d'alternance près de chez toi",
  description:
    "Toutes les offres d'alternance au même endroit. Filtre par métier, par zone et par temps de trajet, puis postule sur l'offre d'origine.",
};

export const viewport: Viewport = {
  themeColor: "#1d3b8f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
