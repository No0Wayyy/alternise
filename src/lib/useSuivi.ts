"use client";
// Relie le suivi des candidatures au stockage du navigateur (localStorage).
// Si le stockage est bloqué (navigation privée stricte…), le site marche quand même : la liste reste vide.
import { useCallback, useSyncExternalStore } from "react";
import { lireSuivi, mettreStatut, retirer, SUIVI_VIDE, type OffreGardee, type Statut, type Suivi } from "./suivi";

const CLE = "alternise-suivi-v1";
const EVENEMENT = "alternise-suivi"; // prévient les autres boutons de la même page

let cache: { brut: string | null; suivi: Suivi } = { brut: null, suivi: SUIVI_VIDE };

function lire(): Suivi {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut !== cache.brut) cache = { brut, suivi: lireSuivi(brut) };
    return cache.suivi;
  } catch {
    return SUIVI_VIDE;
  }
}

function ecrire(suivi: Suivi): boolean {
  try {
    if (Object.keys(suivi).length) localStorage.setItem(CLE, JSON.stringify(suivi));
    else localStorage.removeItem(CLE);
    window.dispatchEvent(new Event(EVENEMENT));
    return true;
  } catch {
    return false;
  }
}

function abonner(rappel: () => void): () => void {
  window.addEventListener("storage", rappel); // changements faits dans un autre onglet
  window.addEventListener(EVENEMENT, rappel);
  return () => {
    window.removeEventListener("storage", rappel);
    window.removeEventListener(EVENEMENT, rappel);
  };
}

export function useSuivi() {
  // Côté serveur et au premier affichage : liste vide (le serveur ne voit jamais le navigateur).
  const suivi = useSyncExternalStore(abonner, lire, () => SUIVI_VIDE);
  const changer = useCallback((offre: OffreGardee, statut: Statut) => ecrire(mettreStatut(lire(), offre, statut)), []);
  const enlever = useCallback((id: number) => ecrire(retirer(lire(), id)), []);
  const toutEffacer = useCallback(() => ecrire(SUIVI_VIDE), []);
  return { suivi, changer, enlever, toutEffacer };
}
