// Mentions légales (loi pour la confiance dans l'économie numérique, LCEN, article 6).
// Site personnel non professionnel : l'éditeur reste anonyme et a donné son identité à l'hébergeur.
import type { Metadata } from "next";
import { EnTete } from "@/components/EnTete";

export const metadata: Metadata = {
  title: "Mentions légales : Alternise",
  description: "Éditeur, hébergeur et sources des offres d'Alternise.",
};

const DEPOT = "https://github.com/No0Wayyy/alternise";
const lien = "text-bleu underline underline-offset-4";

function LienExterne({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={lien}>
      {children}
      <span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
    </a>
  );
}

export default function PageMentionsLegales() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
      <EnTete />
      <main className="grid gap-6 leading-relaxed">
        <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-4xl">Mentions légales</h1>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Éditeur</h2>
          <p>
            Alternise est un site personnel, non professionnel et non commercial. Comme le permet l&apos;article 6, III, 2 de la
            loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique, son éditeur a choisi de ne pas
            publier son nom. Ses éléments d&apos;identification ont été communiqués à l&apos;hébergeur.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Contact</h2>
          <p>
            Pour signaler une erreur, une offre douteuse ou un problème d&apos;accessibilité, écris dans les{" "}
            <LienExterne href={`${DEPOT}/issues`}>« Issues » du projet sur GitHub</LienExterne>. Ce que tu y écris est public :
            n&apos;y mets pas d&apos;informations personnelles.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Hébergement</h2>
          <p>
            Site hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (
            <LienExterne href="https://vercel.com/contact">vercel.com/contact</LienExterne>).
          </p>
          <p>
            Base de données hébergée par <strong>Supabase Inc.</strong> (<LienExterne href="https://supabase.com">supabase.com</LienExterne>).
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Les offres</h2>
          <p>
            Alternise rassemble des offres publiées ailleurs, par La Bonne Alternance, France Travail et Adzuna. Chaque offre
            appartient à son auteur et reste sous sa responsabilité. Avant de postuler, vérifie toujours l&apos;offre sur son site
            d&apos;origine. Alternise ne demande jamais d&apos;argent ni de papiers.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Cartes et données</h2>
          <p>
            Cartes : © contributeurs <LienExterne href="https://www.openstreetmap.org/copyright">OpenStreetMap</LienExterne>,
            fonds OpenFreeMap et OpenMapTiles. Temps de trajet : openrouteservice.org (HeiGIT). Arrêts de transport :
            transport.data.gouv.fr (Licence Ouverte). Gares : SNCF (licence ODbL). Adresses : IGN Géoplateforme.
          </p>
          <p>
            Le code du site est public : <LienExterne href={DEPOT}>github.com/No0Wayyy/alternise</LienExterne>.
          </p>
        </section>
      </main>
    </div>
  );
}
