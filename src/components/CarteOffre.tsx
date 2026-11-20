// Une offre dans la liste des résultats.
import type { Offre } from "@/lib/offres";
import { depuisQuand } from "@/lib/recherche";
import { BoutonSuivi } from "./BoutonSuivi";
import { IconeBus, IconeHorloge, IconeLienExterne, IconeLieu, IconeTrain } from "./Icones";

const CONTRATS: Record<string, string> = {
  apprentissage: "Apprentissage",
  professionnalisation: "Contrat pro",
  alternance: "Alternance",
};

const km = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
/** 230 m, 1,2 km… (distances arrondies : la position des offres est parfois approximative). */
export function distanceLisible(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  return `${km.format(Math.round(metres / 100) / 10)} km`;
}

const moisAnnee = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export function CarteOffre({ offre }: { offre: Offre }) {
  const quand = depuisQuand(offre.publiee_le);
  const idTitre = `offre-${offre.id}`;

  return (
    <article aria-labelledby={idTitre} className="flex flex-col gap-3 rounded-2xl border border-filet bg-papier p-4 sm:p-5">
      <div className="flex flex-wrap gap-2 text-sm">
        {offre.est_nouvelle && (
          <span className="rounded-full bg-vert-fond px-2.5 py-0.5 font-bold text-vert">Nouveau</span>
        )}
        {offre.types_contrat.map((t) => (
          <span key={t} className="rounded-full border border-filet px-2.5 py-0.5 text-gris">
            {CONTRATS[t] ?? t}
          </span>
        ))}
      </div>

      <div>
        <h3 id={idTitre} className="text-lg leading-snug font-bold text-balance">
          {offre.titre}
        </h3>
        {offre.entreprise && <p className="mt-0.5 text-gris">{offre.entreprise}</p>}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gris">
        {offre.ville && (
          <li className="inline-flex items-center gap-1.5">
            <IconeLieu />
            {offre.ville}
            {offre.distance_km !== null && <span> · à {km.format(offre.distance_km)} km</span>}
          </li>
        )}
        {quand && (
          <li className="inline-flex items-center gap-1.5">
            <IconeHorloge />
            Publiée {quand}
          </li>
        )}
        <li>{offre.niveau_diplome ?? "Niveau non précisé"}</li>
        {offre.debut_contrat && <li>Début : {moisAnnee.format(new Date(offre.debut_contrat))}</li>}
        {offre.arret_m !== null && offre.arret_m <= 2000 && (
          <li className="inline-flex items-center gap-1.5">
            <IconeBus />
            Arrêt à {distanceLisible(offre.arret_m)}
          </li>
        )}
        {offre.gare_m !== null && offre.gare_m <= 20000 && (
          <li className="inline-flex items-center gap-1.5">
            <IconeTrain />
            Gare à {distanceLisible(offre.gare_m)}
          </li>
        )}
      </ul>

      {offre.description && <p className="line-clamp-3 leading-relaxed">{offre.description}</p>}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={offre.url_postuler}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-bleu px-5 font-bold text-papier transition-opacity duration-150 hover:opacity-90"
          >
            Postuler sur l&apos;offre
            <IconeLienExterne />
            <span className="sr-only">(s&apos;ouvre dans un nouvel onglet)</span>
          </a>
          <BoutonSuivi
            offre={{ id: offre.id, titre: offre.titre, entreprise: offre.entreprise, ville: offre.ville, url: offre.url_postuler }}
          />
        </div>
        <Source offre={offre} />
      </div>
    </article>
  );
}

function Source({ offre }: { offre: Offre }) {
  if (offre.source === "adzuna") {
    // Conditions d'Adzuna : le mot « Adzuna », au moins 116 × 23 px, avec un lien vers leur site.
    return (
      <p className="text-sm text-gris">
        Offre trouvée via{" "}
        <a
          href="https://www.adzuna.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 min-w-[116px] items-center justify-center rounded-md border border-filet px-2 font-bold text-encre underline-offset-4 hover:underline"
        >
          Adzuna
        </a>
      </p>
    );
  }
  const origine = offre.origine && offre.origine !== "La Bonne Alternance" ? `${offre.origine}, via ` : "";
  return <p className="text-sm text-gris">Source : {origine}La Bonne Alternance</p>;
}
