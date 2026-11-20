import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import Link from "next/link";
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
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-sm text-gris sm:px-8">
          <p className="border-t border-filet pt-4">
            Alternise : gratuit, sans compte, sans cookies.{" "}
            {/* Liens obligatoires (RGPD, LCEN). */}
            <Link href="/confidentialite" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-encre">
              Confidentialité
            </Link>
            {" · "}
            <Link href="/mentions-legales" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-encre">
              Mentions légales
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
