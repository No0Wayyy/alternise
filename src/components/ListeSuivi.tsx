"use client";
// Liste des candidatures, rangée par statut. Lue dans le navigateur de l'étudiant (localStorage).
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { aRelancer, joursDepuis, parStatut, STATUTS, type Entree, type Statut } from "@/lib/suivi";
import { useSuivi } from "@/lib/useSuivi";
import { IconeFermer, IconeLienExterne, IconeLoupe } from "./Icones";

const jourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const ilYa = (jours: number) => (jours === 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} jours`);

const pasAbonne = () => () => {};

export function ListeSuivi() {
  const { suivi, changer, enlever, toutEffacer } = useSuivi();
  // Faux pendant l'affichage serveur : on ne sait pas encore ce que contient le navigateur.
  const pret = useSyncExternalStore(pasAbonne, () => true, () => false);
  const [annonce, setAnnonce] = useState("");
  const [aFocaliser, setAFocaliser] = useState<string | null>(null);

  // Après un changement, l'offre change de groupe : on y remet le curseur clavier.
  useEffect(() => {
    if (aFocaliser) document.getElementById(aFocaliser)?.focus();
  }, [aFocaliser, suivi]);

  if (!pret) {
    return <div aria-busy="true" aria-label="Chargement de tes candidatures" className="h-40 animate-pulse rounded-2xl bg-filet/40" />;
  }

  const entrees = Object.values(suivi);
  const groupes = parStatut(suivi);
  const maintenant = new Date();
  const aRelancerN = entrees.filter((e) => aRelancer(e, maintenant)).length;

  function changerStatut(e: Entree, statut: Statut) {
    changer(e, statut);
    setAnnonce(`« ${e.titre} » est maintenant dans « ${STATUTS[statut].court} ».`);
    setAFocaliser(`statut-${e.id}`);
  }

  function retirerEntree(e: Entree) {
    enlever(e.id);
    setAnnonce(`« ${e.titre} » est retirée de tes candidatures.`);
    setAFocaliser("titre-suivi");
  }

  return (
    <div className="grid gap-8">
      <p aria-live="polite" className="sr-only">
        {annonce}
      </p>

      {entrees.length === 0 ? (
        <div className="grid gap-3 rounded-2xl border border-filet p-5">
          <p className="font-bold">Tu n&apos;as encore gardé aucune offre.</p>
          <p className="text-gris">
            Sur chaque offre, appuie sur « Garder ». Elle arrive ici, et tu pourras noter quand tu as postulé, relancé ou
            décroché un entretien.
          </p>
          <p>
            <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-bleu px-5 font-bold text-papier hover:opacity-90">
              <IconeLoupe />
              Chercher des offres
            </Link>
          </p>
        </div>
      ) : (
        <>
          <ul aria-label="Résumé" className="flex flex-wrap gap-2">
            {(Object.keys(STATUTS) as Statut[]).map((s) => (
              <li key={s} className="rounded-full border border-filet px-3 py-1 text-sm">
                {STATUTS[s].court} : <strong>{groupes[s].length}</strong>
              </li>
            ))}
          </ul>
          {aRelancerN > 0 && (
            <p className="rounded-2xl bg-jaune/15 p-4 leading-relaxed">
              <strong>
                {aRelancerN} candidature{aRelancerN > 1 ? "s" : ""} sans réponse depuis une semaine ou plus.
              </strong>{" "}
              Une relance polie (un court mail ou un appel) montre ta motivation.
            </p>
          )}

          {(Object.keys(STATUTS) as Statut[])
            .filter((s) => groupes[s].length > 0)
            .map((s) => (
              <section key={s} aria-labelledby={`groupe-${s}`} className="grid gap-3">
                <h2 id={`groupe-${s}`} className="text-xl font-bold">
                  {STATUTS[s].nom} <span className="font-normal text-gris">({groupes[s].length})</span>
                </h2>
                <ul className="grid gap-3">
                  {groupes[s].map((e) => (
                    <li key={e.id}>
                      <Candidature
                        entree={e}
                        relance={aRelancer(e, maintenant)}
                        maintenant={maintenant}
                        onStatut={(statut) => changerStatut(e, statut)}
                        onRetirer={() => retirerEntree(e)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </>
      )}

      <aside className="grid gap-3 rounded-2xl border border-filet p-5 text-sm leading-relaxed text-gris">
        <p>
          <strong className="text-encre">Ta liste reste sur cet appareil</strong>, dans ce navigateur. Elle n&apos;est envoyée
          nulle part et personne d&apos;autre ne la voit. Si tu vides les données du navigateur ou changes de téléphone, elle
          disparaît.
        </p>
        {entrees.length > 0 && (
          <p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Effacer toutes tes candidatures de cet appareil ? Ce n'est pas réversible.")) {
                  toutEffacer();
                  setAnnonce("Toutes tes candidatures sont effacées.");
                  setAFocaliser("titre-suivi");
                }
              }}
              className="min-h-11 cursor-pointer text-encre underline underline-offset-4"
            >
              Tout effacer
            </button>
          </p>
        )}
      </aside>
    </div>
  );
}

function Candidature({
  entree: e,
  relance,
  maintenant,
  onStatut,
  onRetirer,
}: {
  entree: Entree;
  relance: boolean;
  maintenant: Date;
  onStatut: (s: Statut) => void;
  onRetirer: () => void;
}) {
  const jours = joursDepuis(e.maj_le, maintenant);
  const quand =
    e.statut === "a_postuler"
      ? `Gardée le ${jourMois.format(new Date(e.gardee_le))}`
      : `${STATUTS[e.statut].court} ${ilYa(jours)}`;
  const idTitre = `cand-${e.id}`;

  return (
    <article aria-labelledby={idTitre} className="grid gap-3 rounded-2xl border border-filet bg-papier p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={idTitre} className="text-lg leading-snug font-bold text-balance">
            {e.titre}
          </h3>
          {(e.entreprise || e.ville) && <p className="mt-0.5 text-gris">{[e.entreprise, e.ville].filter(Boolean).join(" · ")}</p>}
        </div>
        {relance && <span className="rounded-full bg-jaune/30 px-2.5 py-0.5 text-sm font-bold">Pense à relancer</span>}
      </div>
      <p className="text-sm text-gris">{quand}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`statut-${e.id}`} className="sr-only">
          Où en es-tu pour l&apos;offre « {e.titre} » ?
        </label>
        <select
          id={`statut-${e.id}`}
          value={e.statut}
          onChange={(x) => onStatut(x.target.value as Statut)}
          className="h-12 cursor-pointer rounded-xl border border-contour bg-papier px-3 text-base"
        >
          {Object.entries(STATUTS).map(([cle, { nom }]) => (
            <option key={cle} value={cle}>
              {nom}
            </option>
          ))}
        </select>
        <a
          href={e.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-filet px-4 font-bold hover:border-bleu"
        >
          Voir l&apos;offre
          <IconeLienExterne />
          <span className="sr-only">(s&apos;ouvre dans un nouvel onglet)</span>
        </a>
        <button
          type="button"
          onClick={onRetirer}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 text-gris hover:text-encre"
        >
          <IconeFermer />
          Retirer
          <span className="sr-only"> l&apos;offre « {e.titre} »</span>
        </button>
      </div>
    </article>
  );
}
