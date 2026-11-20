"use client";
// Adresse de départ, avec autocomplétion (API de géocodage de l'IGN, appelée depuis le navigateur).
// Vie privée : on garde la rue et la commune, sans le numéro, et une position arrondie à ~100 m.
// Rien n'est enregistré : l'adresse va seulement dans l'adresse de la page.
import { useEffect, useId, useRef, useState } from "react";
import { arrondiDepart, encoderVille, type Ville } from "@/lib/recherche";
import { IconeFermer, IconeLieu } from "./Icones";

type Suggestion = Ville & { detail: string };
type Proprietes = { type: string; name: string; street?: string; city?: string; postcode?: string };

/** « 12 Rue de la République » → « Rue de la République, Lyon » : le numéro n'est pas gardé. */
export function nomSansNumero(p: Proprietes): string {
  if (p.type === "municipality") return p.name;
  const rue = p.type === "housenumber" ? (p.street ?? p.name.replace(/^\d+\s*\w?\s+/, "")) : p.name;
  return [rue, p.city].filter(Boolean).join(", ");
}

async function chercherAdresses(texte: string, signal: AbortSignal): Promise<Suggestion[]> {
  const u = new URLSearchParams({ q: texte, index: "address", limit: "6", autocomplete: "1" });
  const r = await fetch(`https://data.geopf.fr/geocodage/search?${u}`, { signal });
  if (!r.ok) return [];
  const json = (await r.json()) as { features: { geometry: { coordinates: [number, number] }; properties: Proprietes }[] };
  const vues = new Set<string>();
  const resultats: Suggestion[] = [];
  for (const f of json.features) {
    const nom = nomSansNumero(f.properties);
    if (vues.has(nom)) continue; // deux numéros de la même rue : une seule suggestion
    vues.add(nom);
    resultats.push({
      nom,
      lat: arrondiDepart(f.geometry.coordinates[1]),
      lon: arrondiDepart(f.geometry.coordinates[0]),
      detail: [f.properties.postcode, f.properties.city].filter(Boolean).join(" "),
    });
  }
  return resultats;
}

export function ChampAdresse({ initiale }: { initiale: Ville | null }) {
  const [choisie, setChoisie] = useState<Ville | null>(initiale);
  const [saisie, setSaisie] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [actif, setActif] = useState(-1);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const id = useId();
  const idListe = `${id}-liste`;

  useEffect(() => {
    const texte = saisie.trim();
    if (texte.length < 3) return;
    const arret = new AbortController();
    const minuteur = setTimeout(() => {
      chercherAdresses(texte, arret.signal)
        .then((s) => {
          setSuggestions(s);
          setErreur(false);
          setActif(s.length ? 0 : -1);
          setOuvert(true);
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setErreur(true);
        });
    }, 250);
    return () => {
      clearTimeout(minuteur);
      arret.abort();
    };
  }, [saisie]);

  function choisir(s: Suggestion) {
    setChoisie({ nom: s.nom, lat: s.lat, lon: s.lon });
    setSaisie("");
    setSuggestions([]);
    setOuvert(false);
  }

  function clavier(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOuvert(true);
      setActif((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActif((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      // Entrée choisit l'adresse en surbrillance. Sans adresse choisie, on n'envoie pas le formulaire
      // (sinon le trajet serait perdu).
      e.preventDefault();
      const s = suggestions[actif >= 0 ? actif : 0];
      if (s) choisir(s);
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  }

  const afficherListe = ouvert && saisie.trim().length >= 3;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block font-bold">
        D&apos;où pars-tu ?
      </label>
      <p id={`${id}-aide`} className="mb-2 text-sm text-gris">
        Ton adresse ou ton école. On garde seulement la rue et la ville, pas le numéro.
      </p>

      {choisie ? (
        <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-bleu bg-papier py-1 pr-1 pl-3">
          <input type="hidden" name="dep" value={encoderVille(choisie)} />
          <span className="inline-flex items-center gap-2">
            <IconeLieu className="text-lg text-bleu" />
            <span className="font-bold">{choisie.nom}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setChoisie(null);
              setTimeout(() => champ.current?.focus(), 0);
            }}
            className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-filet"
            aria-label={`Changer d'adresse (${choisie.nom})`}
          >
            <IconeFermer className="text-base" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <IconeLieu className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-gris" />
          <input
            ref={champ}
            id={id}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={afficherListe}
            aria-controls={idListe}
            aria-activedescendant={afficherListe && actif >= 0 ? `${idListe}-${actif}` : undefined}
            aria-describedby={`${id}-aide`}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="ex. 12 rue de la République, Lyon"
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              if (e.target.value.trim().length < 3) setSuggestions([]);
            }}
            onKeyDown={clavier}
            onFocus={() => suggestions.length && setOuvert(true)}
            onBlur={() => setTimeout(() => setOuvert(false), 150)}
            className="h-12 w-full rounded-xl border border-contour bg-papier pr-3 pl-10 text-base placeholder:text-gris/80"
          />
        </div>
      )}

      {!choisie && afficherListe && (
        <ul
          id={idListe}
          role="listbox"
          aria-label="Adresses trouvées"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-filet bg-papier py-1"
        >
          {suggestions.length === 0 && (
            <li className="px-3 py-2 text-gris" role="option" aria-selected={false} aria-disabled>
              {erreur ? "Recherche d'adresses indisponible, réessaie." : "Aucune adresse trouvée."}
            </li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={`${s.nom}-${s.lat}-${s.lon}`}
              id={`${idListe}-${i}`}
              role="option"
              aria-selected={i === actif}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choisir(s)}
              onMouseEnter={() => setActif(i)}
              className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5 ${i === actif ? "bg-bleu text-papier" : ""}`}
            >
              <span className="font-bold">{s.nom}</span>
              {s.detail && <span className={`text-sm ${i === actif ? "text-papier/85" : "text-gris"}`}>{s.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
