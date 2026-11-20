// Page « Confidentialité » : ce que le site garde (presque rien) et où partent les données (RGPD).
import type { Metadata } from "next";
import { EnTete } from "@/components/EnTete";

export const metadata: Metadata = {
  title: "Confidentialité : Alternise",
  description: "Alternise ne demande pas de compte et ne garde presque rien sur ses visiteurs. Voici ce qui se passe avec tes données.",
};

const lien = "text-bleu underline underline-offset-4";

export default function PageConfidentialite() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
      <EnTete />
      <main className="grid gap-6 leading-relaxed">
        <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-4xl">Confidentialité</h1>
        <p className="text-lg text-gris">
          Alternise ne demande pas de compte, n&apos;utilise pas de cookies et ne mesure pas ton audience. Voici, simplement,
          ce qui se passe quand tu l&apos;utilises.
        </p>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Ce qui reste sur ton appareil</h2>
          <p>
            <strong>Tes candidatures</strong> (offres gardées et leur statut) sont enregistrées seulement dans ton navigateur.
            Elles ne sont envoyées nulle part. Tu peux les effacer à tout moment depuis « Mes candidatures », ou en vidant les
            données de ton navigateur.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Ce qui part vers d&apos;autres services</h2>
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <strong>Ville ou adresse tapée</strong> : envoyée par ton navigateur au service de recherche d&apos;adresses de
              l&apos;IGN (Géoplateforme, service public français) pour te proposer des suggestions.
            </li>
            <li>
              <strong>Temps de trajet</strong> : le site garde la rue et la ville, sans le numéro, et une position arrondie à
              environ 100 m. Cette position est envoyée par notre serveur à{" "}
              <a href="https://openrouteservice.org" target="_blank" rel="noopener noreferrer" className={lien}>
                OpenRouteService
              </a>{" "}
              (HeiGIT, Allemagne) pour calculer la zone atteignable. Le résultat est gardé en mémoire au plus un jour, sans lien
              avec ta personne.
            </li>
            <li>
              <strong>Critères de recherche</strong> : ils sont écrits dans l&apos;adresse de la page, pour que tu puisses la
              partager. Ne partage pas un lien de trajet si tu ne veux pas montrer ta rue.
            </li>
            <li>
              <strong>Carte</strong> : les fonds de carte viennent d&apos;OpenFreeMap, et le détail d&apos;une offre de notre base
              de données (Supabase). Comme pour tout site, ces services voient l&apos;adresse IP de ton appareil.
            </li>
            <li>
              <strong>Hébergement</strong> : le site est hébergé par Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723,
              États-Unis), qui garde des journaux techniques (adresse IP, page demandée) pendant une durée limitée.
            </li>
            <li>
              <strong>Postuler</strong> : le bouton t&apos;emmène sur le site d&apos;origine de l&apos;offre. Ce que tu y fais
              dépend de ses propres règles.
            </li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Les offres</h2>
          <p>
            Les offres viennent de La Bonne Alternance, France Travail et Adzuna (sources officielles). Les arrêts de transport
            viennent de transport.data.gouv.fr, les gares de la SNCF (licence ODbL), les cartes d&apos;OpenStreetMap.
          </p>
        </section>
      </main>
    </div>
  );
}
