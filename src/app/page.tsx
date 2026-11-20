// Page d'accueil = page de recherche. L'adresse contient les critères : /?q=vendeur&v=Lyon~45.76~4.83&r=20
import { Suspense } from "react";
import { EnTete } from "@/components/EnTete";
import { FormulaireRecherche } from "@/components/FormulaireRecherche";
import { ListeOffres } from "@/components/ListeOffres";
import { Presentation } from "@/components/Presentation";
import { aDesCriteres, lireCriteres, urlRecherche } from "@/lib/recherche";

const CRITERES_VIDES = lireCriteres({});

export default function Accueil(props: PageProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
      {/* Au clavier, ce lien apparaît en premier : il saute le formulaire pour aller droit aux offres. */}
      <a href="#titre-resultats" className={lienEvitement}>
        Aller directement aux offres
      </a>
      <EnTete />

      <main className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl">
            Ton alternance, à portée de trajet.
          </h1>
          <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-gris">
            Les offres de La Bonne Alternance, France Travail et Adzuna au même endroit. Gratuit, sans compte.
          </p>
        </div>

        {/* Le formulaire vide s'affiche tout de suite ; la vraie recherche arrive juste après. */}
        <Suspense
          fallback={
            <>
              <FormulaireRecherche criteres={CRITERES_VIDES} />
              <Squelette />
            </>
          }
        >
          <Recherche searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

const lienEvitement =
  "sr-only rounded-xl bg-bleu px-4 py-3 font-bold text-papier focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50";

async function Recherche({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const criteres = lireCriteres(await searchParams);
  const cle = urlRecherche(criteres);
  return (
    <>
      <FormulaireRecherche key={`formulaire-${cle}`} criteres={criteres} />
      <Suspense key={`resultats-${cle}`} fallback={<Squelette />}>
        <ListeOffres criteres={criteres} />
      </Suspense>
      {!aDesCriteres(criteres) && <Presentation />}
    </>
  );
}

function Squelette() {
  return (
    <div aria-busy="true" aria-label="Chargement des offres" className="grid gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border border-filet bg-filet/40" />
      ))}
    </div>
  );
}
