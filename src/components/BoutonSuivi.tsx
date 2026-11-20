"use client";
// « Garder » une offre, puis dire où on en est (à postuler, envoyée, relance, entretien…).
// Tout reste dans le navigateur de l'étudiant (voir lib/useSuivi.ts).
import { useEffect, useId, useRef, useState } from "react";
import { STATUTS, type OffreGardee, type Statut } from "@/lib/suivi";
import { useSuivi } from "@/lib/useSuivi";
import { IconeCoche, IconeFermer, IconeMarque } from "./Icones";

export function BoutonSuivi({ offre }: { offre: OffreGardee }) {
  const { suivi, changer, enlever } = useSuivi();
  const entree = suivi[offre.id];
  const id = useId();
  const choix = useRef<HTMLSelectElement>(null);
  const garder = useRef<HTMLButtonElement>(null);
  // Après un clic, le bouton disparaît : on place le curseur clavier sur le nouveau contrôle.
  const [focusApres, setFocusApres] = useState<"choix" | "garder" | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (focusApres === "choix") choix.current?.focus();
    if (focusApres === "garder") garder.current?.focus();
  }, [focusApres, entree]);

  if (!entree) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={garder}
          type="button"
          onClick={() => {
            setErreur(!changer(offre, "a_postuler"));
            setFocusApres("choix");
          }}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-filet px-4 font-bold transition-colors duration-150 hover:border-bleu"
        >
          <IconeMarque />
          Garder
          <span className="sr-only"> l&apos;offre « {offre.titre} » dans mes candidatures</span>
        </button>
        {erreur && (
          <p role="alert" className="text-sm text-gris">
            Ton navigateur bloque l&apos;enregistrement (navigation privée ?).
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-vert-fond p-1.5">
      <span className="inline-flex items-center gap-1.5 pl-1.5 text-sm font-bold text-vert">
        <IconeCoche />
        Gardée
      </span>
      <label htmlFor={id} className="sr-only">
        Où en es-tu pour l&apos;offre « {offre.titre} » ?
      </label>
      <select
        ref={choix}
        id={id}
        value={entree.statut}
        onChange={(e) => changer(offre, e.target.value as Statut)}
        className="h-11 cursor-pointer rounded-lg border border-contour bg-papier px-2 text-base"
      >
        {Object.entries(STATUTS).map(([cle, { nom }]) => (
          <option key={cle} value={cle}>
            {nom}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          enlever(offre.id);
          setFocusApres("garder");
        }}
        className="grid size-11 cursor-pointer place-items-center rounded-lg text-gris hover:bg-papier hover:text-encre"
        aria-label={`Retirer l'offre « ${offre.titre} » de mes candidatures`}
      >
        <IconeFermer />
      </button>
    </div>
  );
}
