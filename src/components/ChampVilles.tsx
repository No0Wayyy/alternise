"use client";
// Choix des villes avec autocomplétion (API de géocodage de l'IGN, appelée depuis le navigateur).
// Rien n'est enregistré : les villes choisies vont seulement dans l'adresse de la page.
import { useEffect, useId, useRef, useState } from "react";
import { encoderVille, type Ville } from "@/lib/recherche";
import { IconeFermer, IconeLieu } from "./Icones";

const VILLES_MAX = 5;

type Suggestion = Ville & { detail: string };

async function chercherCommunes(texte: string, signal: AbortSignal): Promise<Suggestion[]> {
  const u = new URLSearchParams({ q: texte, index: "address", type: "municipality", limit: "6", autocomplete: "1" });
  const r = await fetch(`https://data.geopf.fr/geocodage/search?${u}`, { signal });
  if (!r.ok) return [];
  const json = (await r.json()) as {
    features: { geometry: { coordinates: [number, number] }; properties: { name: string; postcode?: string; context?: string } }[];
  };
  return json.features.map((f) => ({
    nom: f.properties.name,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    detail: [f.properties.postcode, f.properties.context?.split(",").slice(1).join(",").trim()].filter(Boolean).join(" · "),
  }));
}

export function ChampVilles({ initiales }: { initiales: Ville[] }) {
  const [villes, setVilles] = useState<Ville[]>(initiales);
  const [saisie, setSaisie] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [actif, setActif] = useState(-1);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const id = useId();
  const idListe = `${id}-liste`;
  const plein = villes.length >= VILLES_MAX;

  useEffect(() => {
    const texte = saisie.trim();
    if (texte.length < 2) return;
    const arret = new AbortController();
    const minuteur = setTimeout(() => {
      chercherCommunes(texte, arret.signal)
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
    if (!villes.some((v) => v.nom === s.nom && Math.abs(v.lat - s.lat) < 0.01)) {
      setVilles([...villes, { nom: s.nom, lat: s.lat, lon: s.lon }].slice(0, VILLES_MAX));
    }
    setSaisie("");
    setSuggestions([]);
    setOuvert(false);
    champ.current?.focus();
  }

  function retirer(i: number) {
    setVilles(villes.filter((_, j) => j !== i));
    champ.current?.focus();
  }

  function clavier(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOuvert(true);
      setActif((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActif((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter" && ouvert && actif >= 0 && suggestions[actif]) {
      e.preventDefault(); // choisit la ville au lieu d'envoyer le formulaire
      choisir(suggestions[actif]);
    } else if (e.key === "Escape") {
      setOuvert(false);
    } else if (e.key === "Backspace" && !saisie && villes.length) {
      retirer(villes.length - 1);
    }
  }

  const afficherListe = ouvert && saisie.trim().length >= 2;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block font-bold">
        Où ?
      </label>
      <p id={`${id}-aide`} className="mb-2 text-sm text-gris">
        Une ou plusieurs villes (jusqu&apos;à {VILLES_MAX}).
      </p>

      {villes.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Villes choisies">
          {villes.map((v, i) => (
            <li key={`${v.nom}-${v.lat}`}>
              <input type="hidden" name="v" value={encoderVille(v)} />
              <span className="inline-flex min-h-11 items-center gap-1 rounded-full bg-bleu py-1 pr-1 pl-3 text-papier">
                {v.nom}
                <button
                  type="button"
                  onClick={() => retirer(i)}
                  className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-papier/20"
                  aria-label={`Retirer ${v.nom}`}
                >
                  <IconeFermer className="text-base" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

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
          disabled={plein}
          placeholder={plein ? "5 villes maximum" : "ex. Lyon, Villeurbanne…"}
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            if (e.target.value.trim().length < 2) setSuggestions([]);
          }}
          onKeyDown={clavier}
          onFocus={() => suggestions.length && setOuvert(true)}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          className="h-12 w-full rounded-xl border border-filet bg-papier pr-3 pl-10 text-base placeholder:text-gris/80 disabled:opacity-60"
        />
      </div>

      {afficherListe && (
        <ul
          id={idListe}
          role="listbox"
          aria-label="Communes trouvées"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-filet bg-papier py-1"
        >
          {suggestions.length === 0 && (
            <li className="px-3 py-2 text-gris" role="option" aria-selected={false} aria-disabled>
              {erreur ? "Recherche de communes indisponible, réessaie." : "Aucune commune trouvée."}
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
