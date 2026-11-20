// Résultats : onglets (entreprises / écoles), tri, liste, pages, et « Chercher aussi sur… ».
import Link from "next/link";
import { connection } from "next/server";
import { POINTS_MAX, pointsOffres, rechercherOffres, type PointCarte, type Resultats } from "@/lib/offres";
import { zoneAtteignable } from "@/lib/isochrone";
import { DUREES, MODES, PAR_PAGE, aDesCriteres, liensExternes, urlRecherche, type Criteres, type Point } from "@/lib/recherche";
import { CarteDesOffres } from "./CarteDesOffres";
import { CarteOffre } from "./CarteOffre";
import { IconeCarte, IconeEcole, IconeLienExterne, IconeListe } from "./Icones";

const nombre = new Intl.NumberFormat("fr-FR");

export async function ListeOffres({ criteres: c }: { criteres: Criteres }) {
  // Calculé à chaque visite : « Publiée il y a 2 heures » dépend de l'heure actuelle.
  await connection();
  // Temps de trajet : on calcule d'abord la zone atteignable (OpenRouteService).
  let zoneTrajet: Point[] | null = null;
  if (c.trajet) {
    try {
      zoneTrajet = await zoneAtteignable(c.trajet);
    } catch {
      return <TrajetIndisponible criteres={c} />;
    }
  }

  let r: Resultats;
  let points: PointCarte[] = [];
  try {
    [r, points] = await Promise.all([
      rechercherOffres(c, zoneTrajet),
      c.vue === "carte" ? pointsOffres(c, zoneTrajet) : [],
    ]);
  } catch {
    return (
      <p role="alert" className="rounded-2xl border border-filet p-5">
        Les offres ne peuvent pas être chargées pour le moment. Réessaie dans quelques minutes.
      </p>
    );
  }

  const totalEntreprises = c.ecoles ? r.totalAutreOnglet : r.total;
  const totalEcoles = c.ecoles ? r.total : r.totalAutreOnglet;
  const pages = Math.max(1, Math.ceil(r.total / PAR_PAGE));

  return (
    <section aria-labelledby="titre-resultats" className="grid gap-5">
      <h2 id="titre-resultats" className="sr-only">
        Résultats
      </h2>

      {/* Onglets : les annonces d'écoles sont à part. */}
      <nav aria-label="Type d'annonces" className="flex gap-1 border-b border-filet">
        <Onglet href={urlRecherche(c, { ecoles: false, page: 1 })} actif={!c.ecoles}>
          <span className="hidden sm:inline">Offres d&apos;entreprises</span>
          <span className="sm:hidden">Entreprises</span>
          <span className="font-normal">({nombre.format(totalEntreprises)})</span>
        </Onglet>
        <Onglet href={urlRecherche(c, { ecoles: true, page: 1 })} actif={c.ecoles}>
          <IconeEcole />
          <span className="hidden sm:inline">Annonces d&apos;écoles</span>
          <span className="sm:hidden">Écoles</span>
          <span className="font-normal">({nombre.format(totalEcoles)})</span>
        </Onglet>
      </nav>

      {c.ecoles && (
        <p className="rounded-2xl bg-jaune/15 p-4 leading-relaxed">
          Ici, ce sont des <strong>écoles et des CFA</strong> qui cherchent des élèves en alternance. L&apos;école t&apos;aide ensuite à
          trouver une entreprise. Vérifie bien le diplôme préparé et les frais éventuels.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="font-bold">
          {r.total === 0
            ? "Aucune offre"
            : `${nombre.format(r.total)} offre${r.total > 1 ? "s" : ""}${aDesCriteres(c) ? "" : " récentes"}`}
        </p>
        <ChoixVue criteres={c} />
        {c.vue === "liste" && (c.villes.length > 0 || c.trajet) && r.total > 1 && (
          <div className="flex items-center gap-1 text-sm" role="group" aria-label="Trier">
            <span className="text-gris">Trier :</span>
            <LienTri href={urlRecherche(c, { tri: "date", page: 1 })} actif={c.tri === "date"}>
              plus récentes
            </LienTri>
            <LienTri href={urlRecherche(c, { tri: "distance", page: 1 })} actif={c.tri === "distance"}>
              plus proches
            </LienTri>
          </div>
        )}
      </div>

      {c.trajet && (
        <p className="text-sm leading-relaxed text-gris">
          Offres à moins de {c.trajet.minutes} min {MODES[c.trajet.mode].nom.toLowerCase()} depuis {c.trajet.depart.nom} (calcul
          approximatif). Calcul :{" "}
          <a href="https://openrouteservice.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            openrouteservice.org
          </a>{" "}
          par HeiGIT, données © OpenStreetMap.
        </p>
      )}

      {r.total === 0 && <AucuneOffre criteres={c} autreOnglet={r.totalAutreOnglet} />}

      {c.vue === "carte" ? (
        <CarteDesOffres criteres={c} zoneTrajet={zoneTrajet} points={points} total={r.total} pointsMax={POINTS_MAX} />
      ) : (
        r.total > 0 && (
        <ul className="grid gap-4">
          {r.offres.map((o) => (
            <li key={o.id}>
              <CarteOffre offre={o} />
            </li>
          ))}
        </ul>
        )
      )}

      {c.vue === "liste" && pages > 1 && (
        <nav aria-label="Pages de résultats" className="flex items-center justify-between gap-3">
          {c.page > 1 ? (
            <Link href={urlRecherche(c, { page: c.page - 1 })} className={bouton}>
              ← Offres précédentes
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-gris">
            Page {c.page} sur {pages}
          </span>
          {c.page < pages ? (
            <Link href={urlRecherche(c, { page: c.page + 1 })} className={bouton}>
              Offres suivantes →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <ChercherAilleurs criteres={c} />
    </section>
  );
}

const bouton =
  "inline-flex min-h-11 items-center rounded-xl border border-filet px-4 font-bold transition-colors duration-150 hover:border-bleu";

function Onglet({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`-mb-px inline-flex min-h-12 items-center gap-1.5 border-b-3 px-3 font-bold transition-colors duration-150 ${
        actif ? "border-bleu text-bleu" : "border-transparent text-gris hover:text-encre"
      }`}
    >
      {children}
    </Link>
  );
}

/** Bouton à deux positions : Liste ou Carte. */
function ChoixVue({ criteres: c }: { criteres: Criteres }) {
  const choix = [
    { vue: "liste" as const, nom: "Liste", icone: <IconeListe /> },
    { vue: "carte" as const, nom: "Carte", icone: <IconeCarte /> },
  ];
  return (
    <nav aria-label="Affichage des offres" className="order-first inline-flex rounded-xl border border-filet p-1 sm:order-none">
      {choix.map((x) => (
        <Link
          key={x.vue}
          href={urlRecherche(c, { vue: x.vue, page: 1 })}
          scroll={false}
          aria-current={c.vue === x.vue ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-bold transition-colors duration-150 ${
            c.vue === x.vue ? "bg-bleu text-papier" : "text-gris hover:text-encre"
          }`}
        >
          {x.icone}
          {x.nom}
        </Link>
      ))}
    </nav>
  );
}

function LienTri({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={actif ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-lg px-2.5 ${actif ? "font-bold text-bleu underline underline-offset-4" : "text-gris hover:text-encre"}`}
    >
      {children}
    </Link>
  );
}

function AucuneOffre({ criteres: c, autreOnglet }: { criteres: Criteres; autreOnglet: number }) {
  const idees: { texte: string; href: string }[] = [];
  if (c.villes.length && c.rayon < 100) {
    const plusGrand = c.rayon < 30 ? 30 : c.rayon < 50 ? 50 : 100;
    idees.push({ texte: `Élargir le rayon à ${plusGrand} km`, href: urlRecherche(c, { rayon: plusGrand, page: 1 }) });
  }
  if (c.trajet) {
    const plusLong = DUREES.find((d) => d > c.trajet!.minutes);
    if (plusLong)
      idees.push({ texte: `Allonger le trajet à ${plusLong} min`, href: urlRecherche(c, { trajet: { ...c.trajet, minutes: plusLong }, page: 1 }) });
  }
  if (c.arret) idees.push({ texte: "Retirer « arrêt à moins de 500 m »", href: urlRecherche(c, { arret: false, page: 1 }) });
  if (c.gare) idees.push({ texte: "Retirer le filtre « gare »", href: urlRecherche(c, { gare: null, page: 1 }) });
  if (c.zone) idees.push({ texte: "Retirer la zone dessinée", href: urlRecherche(c, { zone: null, page: 1 }) });
  if (c.q) idees.push({ texte: `Retirer le mot-clé « ${c.q} »`, href: urlRecherche(c, { q: "", page: 1 }) });
  if (c.depuis) idees.push({ texte: "Voir toutes les dates de publication", href: urlRecherche(c, { depuis: null, page: 1 }) });
  if (c.niveau) idees.push({ texte: "Voir tous les niveaux de diplôme", href: urlRecherche(c, { niveau: null, page: 1 }) });
  if (!c.ecoles && autreOnglet > 0)
    idees.push({ texte: `Voir les ${nombre.format(autreOnglet)} annonces d'écoles`, href: urlRecherche(c, { ecoles: true, page: 1 }) });

  return (
    <div className="rounded-2xl border border-filet p-5">
      <p className="font-bold">Aucune offre ne correspond pour l&apos;instant.</p>
      <p className="mt-1 text-gris">Les offres sont mises à jour chaque heure. En attendant, tu peux :</p>
      {idees.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {idees.map((i) => (
            <li key={i.texte}>
              <Link href={i.href} className={bouton}>
                {i.texte}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChercherAilleurs({ criteres }: { criteres: Criteres }) {
  return (
    <aside aria-labelledby="ailleurs" className="rounded-2xl border border-filet p-5">
      <h2 id="ailleurs" className="font-bold">
        Chercher aussi sur
      </h2>
      <p className="mt-1 text-sm text-gris">Ta recherche s&apos;ouvre sur leur site, déjà remplie.</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {liensExternes(criteres).map((l) => (
          <li key={l.nom}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className={`${bouton} gap-2`}>
              {l.nom}
              <IconeLienExterne className="text-sm text-gris" />
              <span className="sr-only">(s&apos;ouvre dans un nouvel onglet)</span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** OpenRouteService ne répond pas (quota du jour atteint, service en pause…). */
function TrajetIndisponible({ criteres: c }: { criteres: Criteres }) {
  const depart = c.trajet!.depart;
  const ville = depart.nom.split(",").pop()?.trim() || depart.nom;
  const autour = urlRecherche(c, {
    trajet: null,
    villes: [{ nom: ville, lat: depart.lat, lon: depart.lon }],
    rayon: 10,
    page: 1,
  });
  return (
    <div role="alert" className="grid gap-3 rounded-2xl border border-filet p-5">
      <p className="font-bold">Le temps de trajet ne peut pas être calculé pour le moment.</p>
      <p className="text-gris">
        Le service de calcul est peut-être occupé, ou son quota du jour est atteint. Réessaie plus tard, ou cherche par distance :
      </p>
      <p>
        <Link href={autour} className={bouton}>
          Chercher à 10 km autour de {ville}
        </Link>
      </p>
    </div>
  );
}
