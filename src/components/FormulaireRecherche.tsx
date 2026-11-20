"use client";
// Formulaire de recherche : il met à jour l'adresse de la page (/?q=…&s=…&v=…).
// Grâce à <Form> de Next.js, il marche même sans JavaScript.
import Form from "next/form";
import Link from "next/link";
import { SECTEURS } from "@/lib/secteurs";
import { DEPUIS, NIVEAUX, RAYONS, encoderZone, urlRecherche, type Criteres } from "@/lib/recherche";
import { ChampVilles } from "./ChampVilles";
import { IconeLoupe } from "./Icones";

const champ = "h-12 w-full rounded-xl border border-filet bg-papier px-3 text-base";

export function FormulaireRecherche({ criteres }: { criteres: Criteres }) {
  return (
    <Form action="/" className="grid gap-6" aria-label="Rechercher une alternance">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="q" className="mb-1.5 block font-bold">
            Quel métier ?
          </label>
          <p id="q-aide" className="mb-2 text-sm text-gris">
            Un métier, un mot-clé ou une entreprise.
          </p>
          <div className="relative">
            <IconeLoupe className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-gris" />
            <input
              id="q"
              name="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={100}
              defaultValue={criteres.q}
              aria-describedby="q-aide"
              placeholder="ex. vendeur, commis de cuisine, community manager"
              className={`${champ} pl-10 placeholder:text-gris/80`}
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <ChampVilles initiales={criteres.villes} />
          <div>
            <label htmlFor="r" className="mb-1.5 block font-bold">
              Rayon
            </label>
            <select id="r" name="r" defaultValue={criteres.rayon} className={`${champ} w-28 cursor-pointer`}>
              {RAYONS.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {criteres.zone && (
        <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-jaune/15 px-4 py-2">
          <span>
            <strong>Zone dessinée</strong> sur la carte : seules les offres à l&apos;intérieur sont gardées.
          </span>
          <Link
            href={urlRecherche(criteres, { zone: null, page: 1 })}
            className="inline-flex min-h-11 items-center text-bleu underline underline-offset-4"
          >
            Retirer la zone
          </Link>
          <input type="hidden" name="z" value={encoderZone(criteres.zone)} />
        </p>
      )}

      <fieldset>
        <legend className="mb-2 font-bold">Secteurs</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SECTEURS).map(([cle, { nom }]) => (
            <label key={cle} className="cursor-pointer">
              <input
                type="checkbox"
                name="s"
                value={cle}
                defaultChecked={criteres.secteurs.includes(cle as keyof typeof SECTEURS)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center rounded-full border border-filet px-4 transition-colors duration-150 peer-checked:border-bleu peer-checked:bg-bleu peer-checked:text-papier peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jaune hover:border-bleu">
                {nom}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="n" className="mb-1.5 block font-bold">
            Diplôme préparé
          </label>
          <select id="n" name="n" defaultValue={criteres.niveau ?? ""} className={`${champ} cursor-pointer`}>
            <option value="">Tous les niveaux</option>
            {Object.entries(NIVEAUX).map(([cle, { nom }]) => (
              <option key={cle} value={cle}>
                {nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="d" className="mb-1.5 block font-bold">
            Publiée
          </label>
          <select id="d" name="d" defaultValue={criteres.depuis ?? ""} className={`${champ} cursor-pointer`}>
            <option value="">Peu importe</option>
            {DEPUIS.map((d) => (
              <option key={d.jours} value={d.jours}>
                {d.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* On garde l'onglet (entreprises / écoles), le tri et la vue (liste / carte) choisis. */}
      {criteres.ecoles && <input type="hidden" name="e" value="1" />}
      {criteres.tri === "distance" && <input type="hidden" name="t" value="distance" />}
      {criteres.vue === "carte" && <input type="hidden" name="a" value="carte" />}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-bleu px-6 text-lg font-bold text-papier transition-opacity duration-150 hover:opacity-90"
        >
          <IconeLoupe />
          Rechercher
        </button>
        <Link href="/" className="min-h-11 content-center text-gris underline underline-offset-4 hover:text-encre">
          Tout effacer
        </Link>
      </div>
    </Form>
  );
}
