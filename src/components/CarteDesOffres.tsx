"use client";
// Carte des offres : MapLibre (libre) + fonds de carte OpenFreeMap (gratuits, sans clé).
// Les offres proches sont regroupées en bulles. On peut dessiner une zone de recherche.
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, LngLat, LngLatBoundsLike, Map as Carte, Popup } from "maplibre-gl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PointCarte } from "@/lib/offres";
import { urlRecherche, ZONE_COINS_MAX, type Criteres, type Point } from "@/lib/recherche";
import { IconeCadre, IconeCrayon, IconeFermer } from "./Icones";

const STYLE_CLAIR = "https://tiles.openfreemap.org/styles/positron";
const STYLE_SOMBRE = "https://tiles.openfreemap.org/styles/dark";
const FRANCE: LngLatBoundsLike = [
  [-5.3, 41.3],
  [9.7, 51.2],
];
const FICHE_MAX = 8; // offres montrées dans une petite fiche
const nombre = new Intl.NumberFormat("fr-FR");

const LOCALE = {
  "NavigationControl.ZoomIn": "Zoomer",
  "NavigationControl.ZoomOut": "Dézoomer",
  "NavigationControl.ResetBearing": "Remettre le nord en haut",
  "FullscreenControl.Enter": "Carte en plein écran",
  "FullscreenControl.Exit": "Quitter le plein écran",
  "Popup.Close": "Fermer la fiche",
  "AttributionControl.ToggleAttribution": "Crédits de la carte",
  "AttributionControl.MapFeedback": "Signaler une erreur sur la carte",
  "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + molette pour zoomer la carte",
  "CooperativeGesturesHandler.MacHelpText": "⌘ + molette pour zoomer la carte",
  "CooperativeGesturesHandler.MobileHelpText": "Deux doigts pour déplacer la carte",
};

type Props = { criteres: Criteres; points: PointCarte[]; total: number; pointsMax: number };

export function CarteDesOffres({ criteres: c, points, total, pointsMax }: Props) {
  const router = useRouter();
  const cadre = useRef<HTMLDivElement>(null);
  const conteneur = useRef<HTMLDivElement>(null);
  const carteRef = useRef<Carte | null>(null);
  const ficheRef = useRef<Popup | null>(null);
  const dessinRef = useRef<Point[] | null>(null);
  const [etat, setEtat] = useState<"chargement" | "prete" | "erreur">("chargement");
  // null : on ne dessine pas. Tableau : les coins posés jusqu'ici.
  const [dessin, setDessin] = useState<Point[] | null>(null);

  // Création de la carte (une fois par recherche).
  useEffect(() => {
    let annule = false;
    let carte: Carte | undefined;

    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (annule || !conteneur.current) return;
        // Le worker est copié dans public/ par scripts/copier-worker-carte.ts.
        ml.setWorkerUrl(`/maplibre/maplibre-gl-worker.mjs?v=${ml.getVersion()}`);
        const css = getComputedStyle(document.documentElement);
        const couleur = (nom: string) => css.getPropertyValue(nom).trim();
        const [bleu, papier, jaune] = [couleur("--bleu"), couleur("--papier"), couleur("--jaune")];
        const sombre = matchMedia("(prefers-color-scheme: dark)").matches;

        carte = new ml.Map({
          container: conteneur.current,
          style: sombre ? STYLE_SOMBRE : STYLE_CLAIR,
          bounds: cadrage(c) ?? FRANCE,
          fitBoundsOptions: { padding: 32 },
          maxZoom: 17,
          // Sur téléphone, un doigt fait défiler la page, deux doigts déplacent la carte.
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          attributionControl: { compact: true },
          locale: LOCALE,
        });
        const m = carte;
        m.touchZoomRotate.disableRotation();
        m.keyboard.disableRotation();
        m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        if (cadre.current) m.addControl(new ml.FullscreenControl({ container: cadre.current }), "top-right");
        carteRef.current = m;

        // On ajoute nos couches dès que le style est prêt, sans attendre tout le fond de carte.
        m.once("style.load", () => {
          // Noms des lieux en français (sinon le nom local), au lieu de l'anglais.
          for (const couche of m.getStyle().layers) {
            const texte = couche.type === "symbol" ? m.getLayoutProperty(couche.id, "text-field") : null;
            if (texte && JSON.stringify(texte).includes("name_en")) {
              m.setLayoutProperty(couche.id, "text-field", ["coalesce", ["get", "name:fr"], ["get", "name"]]);
            }
          }

          // Zone déjà choisie (bleu léger), sous les offres.
          m.addSource("zone", { type: "geojson", data: geoZone(c.zone ?? [], true) });
          m.addLayer({ id: "zone-fond", type: "fill", source: "zone", paint: { "fill-color": bleu, "fill-opacity": 0.1 } });
          m.addLayer({ id: "zone-trait", type: "line", source: "zone", paint: { "line-color": bleu, "line-width": 2.5 } });

          m.addSource("offres", {
            type: "geojson",
            data: geoPoints(points),
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 48,
          });
          const groupe = ["has", "point_count"] as const;
          const seule = ["!", ["has", "point_count"]] as const;
          m.addLayer({
            id: "bulles",
            type: "circle",
            source: "offres",
            filter: groupe as never,
            paint: {
              "circle-color": bleu,
              "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 100, 26, 1000, 32],
              "circle-stroke-width": 3,
              "circle-stroke-color": papier,
            },
          });
          m.addLayer({
            id: "bulles-nombre",
            type: "symbol",
            source: "offres",
            filter: groupe as never,
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 14,
              "text-allow-overlap": true,
            },
            paint: { "text-color": papier },
          });
          m.addLayer({
            id: "offre",
            type: "circle",
            source: "offres",
            filter: seule as never,
            paint: { "circle-color": bleu, "circle-radius": 7, "circle-stroke-width": 2.5, "circle-stroke-color": papier },
          });
          // Cercle invisible plus grand : plus facile à toucher avec le doigt (44 px).
          m.addLayer({
            id: "offre-toucher",
            type: "circle",
            source: "offres",
            filter: seule as never,
            paint: { "circle-radius": 22, "circle-opacity": 0 },
          });

          // Zone en cours de dessin (jaune), au-dessus de tout.
          m.addSource("dessin", { type: "geojson", data: geoZone([], false) });
          m.addLayer({ id: "dessin-fond", type: "fill", source: "dessin", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": jaune, "fill-opacity": 0.25 } });
          m.addLayer({
            id: "dessin-trait",
            type: "line",
            source: "dessin",
            filter: ["!=", ["geometry-type"], "Point"],
            paint: { "line-color": bleu, "line-width": 2.5, "line-dasharray": [2, 1.5] },
          });
          m.addLayer({
            id: "dessin-coins",
            type: "circle",
            source: "dessin",
            filter: ["==", ["geometry-type"], "Point"],
            paint: { "circle-color": jaune, "circle-radius": 7, "circle-stroke-width": 2.5, "circle-stroke-color": bleu },
          });
          setEtat("prete");
        });

        m.on("click", async (e) => {
          // En mode dessin, chaque toucher pose un coin.
          if (dessinRef.current) {
            const coin = { lat: e.lngLat.lat, lon: e.lngLat.lng };
            setDessin((d) => (d && d.length < ZONE_COINS_MAX ? [...d, coin] : d));
            return;
          }
          const bulle = m.queryRenderedFeatures(e.point, { layers: ["bulles"] })[0];
          if (bulle) {
            const zoom = await (m.getSource("offres") as GeoJSONSource).getClusterExpansionZoom(bulle.properties.cluster_id);
            const [lon, lat] = (bulle.geometry as GeoJSON.Point).coordinates;
            m.easeTo({ center: [lon, lat], zoom });
            return;
          }
          const ids = [
            ...new Set(m.queryRenderedFeatures(e.point, { layers: ["offre-toucher"] }).map((f) => Number(f.properties.id))),
          ].filter(Number.isInteger);
          if (ids.length) {
            ficheRef.current?.remove();
            ficheRef.current = ouvrirFiche(ml.Popup, m, e.lngLat, ids);
          }
        });
        for (const couche of ["bulles", "offre-toucher"]) {
          m.on("mouseenter", couche, () => {
            if (!dessinRef.current) m.getCanvas().style.cursor = "pointer";
          });
          m.on("mouseleave", couche, () => {
            if (!dessinRef.current) m.getCanvas().style.cursor = "";
          });
        }
      } catch {
        // Par exemple : appareil sans WebGL.
        if (!annule) setEtat("erreur");
      }
    })();

    return () => {
      annule = true;
      carte?.remove();
      carteRef.current = null;
    };
  }, [c, points]);

  // Le dessin en cours s'affiche sur la carte.
  useEffect(() => {
    dessinRef.current = dessin;
    const m = carteRef.current;
    if (!m || etat !== "prete") return;
    (m.getSource("dessin") as GeoJSONSource | undefined)?.setData(geoZone(dessin ?? [], false));
    m.getCanvas().style.cursor = dessin ? "crosshair" : "";
    if (dessin) m.doubleClickZoom.disable();
    else m.doubleClickZoom.enable();
  }, [dessin, etat]);

  const chercherDans = (zone: Point[]) => {
    // La zone remplace les villes : le tri par distance n'a plus de sens.
    router.push(urlRecherche(c, { zone, villes: [], tri: "date", page: 1 }), { scroll: false });
  };

  const zoneVisible = () => {
    const b = carteRef.current?.getBounds();
    if (!b) return;
    chercherDans([
      { lat: b.getNorth(), lon: b.getWest() },
      { lat: b.getNorth(), lon: b.getEast() },
      { lat: b.getSouth(), lon: b.getEast() },
      { lat: b.getSouth(), lon: b.getWest() },
    ]);
  };

  const commencerDessin = () => {
    ficheRef.current?.remove();
    setDessin([]);
  };

  const n = points.length;
  const coins = dessin?.length ?? 0;

  return (
    <section aria-labelledby="titre-carte" className="grid gap-3">
      <h3 id="titre-carte" className="sr-only">
        Carte des offres
      </h3>

      <p className="text-gris">
        {n === 0
          ? "Aucune de ces offres n'a d'adresse précise à placer sur la carte."
          : `${nombre.format(n)} offre${n > 1 ? "s" : ""} sur la carte`}
        {n > 0 && n >= pointsMax && ` (les ${nombre.format(pointsMax)} plus récentes)`}
        {n > 0 && n < pointsMax && total > n && ` · ${nombre.format(total - n)} sans adresse précise, à voir dans la liste`}
      </p>

      <div ref={cadre} className="cadre-carte grid gap-3">
        {/* Barre d'outils : dessiner une zone, ou prendre la zone visible. */}
        {dessin === null ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={commencerDessin} disabled={etat !== "prete"} className={boutonPrincipal}>
              <IconeCrayon />
              Dessiner une zone
            </button>
            <button type="button" onClick={zoneVisible} disabled={etat !== "prete"} className={boutonSecondaire}>
              <IconeCadre />
              Chercher dans la zone visible
            </button>
            {c.zone && (
              <Link href={urlRecherche(c, { zone: null })} scroll={false} className={boutonSecondaire}>
                <IconeFermer />
                Retirer la zone
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 rounded-2xl bg-jaune/15 p-4">
            <p aria-live="polite" className="leading-relaxed">
              {coins === 0
                ? "Touche la carte pour poser le premier coin de ta zone."
                : `${coins} coin${coins > 1 ? "s" : ""} posé${coins > 1 ? "s" : ""}. ${
                    coins < 3 ? `Encore ${3 - coins} au minimum.` : coins >= ZONE_COINS_MAX ? "C'est le maximum." : "Valide quand ta zone est prête."
                  }`}
              {c.villes.length > 0 && " La zone remplacera les villes choisies."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => dessin && chercherDans(dessin)} disabled={coins < 3} className={boutonPrincipal}>
                Valider la zone
              </button>
              <button type="button" onClick={() => setDessin((d) => d?.slice(0, -1) ?? d)} disabled={coins === 0} className={boutonSecondaire}>
                Retirer le dernier coin
              </button>
              <button type="button" onClick={() => setDessin(null)} className={boutonSecondaire}>
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="zone-carte relative h-[65svh] max-h-[720px] min-h-80 overflow-hidden rounded-2xl border border-filet">
          <div ref={conteneur} role="region" aria-label="Carte des offres d'alternance" className="h-full w-full" />
          {etat === "chargement" && (
            <p className="absolute inset-0 grid animate-pulse place-items-center bg-filet/40 text-gris">Chargement de la carte…</p>
          )}
          {etat === "erreur" && (
            <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center">
              Ton appareil ne peut pas afficher la carte. La vue Liste montre les mêmes offres.
            </p>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-gris">
        Une bulle regroupe plusieurs offres : touche-la pour zoomer. Touche un point pour voir l&apos;offre. La vue Liste
        montre les mêmes offres, une par une.
      </p>
    </section>
  );
}

const boutonBase =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
const boutonPrincipal = `${boutonBase} bg-bleu text-papier hover:opacity-90`;
const boutonSecondaire = `${boutonBase} border border-filet bg-papier hover:border-bleu`;

/** Cadre de départ : la zone dessinée, sinon les villes et leur rayon, sinon la France. */
function cadrage(c: Criteres): LngLatBoundsLike | null {
  const pts: Point[] =
    c.zone ??
    c.villes.flatMap((v) => {
      const dLat = c.rayon / 111;
      const dLon = c.rayon / (111 * Math.cos((v.lat * Math.PI) / 180));
      return [
        { lat: v.lat - dLat, lon: v.lon - dLon },
        { lat: v.lat + dLat, lon: v.lon + dLon },
      ];
    });
  if (!pts.length) return null;
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

function geoPoints(points: PointCarte[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map(([id, lon, lat]) => ({
      type: "Feature",
      properties: { id },
      geometry: { type: "Point", coordinates: [lon, lat] },
    })),
  };
}

/** Une zone en GeoJSON : ses coins, son tracé et, à partir de 3 coins, sa surface. */
function geoZone(zone: Point[], fermee: boolean): GeoJSON.FeatureCollection {
  const coords = zone.map((p) => [p.lon, p.lat]);
  const features: GeoJSON.Feature[] = [];
  if (coords.length >= 3) {
    features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] } });
  } else if (coords.length === 2) {
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }
  if (!fermee) {
    for (const c of coords) features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } });
  }
  return { type: "FeatureCollection", features };
}

type Detail = { id: number; titre: string; entreprise: string | null; ville: string | null; url_postuler: string; source: string };

/** Lit le titre, l'entreprise et le lien des offres touchées (clé publique, lecture seule). */
async function lireDetails(ids: number[]): Promise<Detail[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) throw new Error("Configuration Supabase manquante");
  const r = await fetch(`${url}/rest/v1/offres?select=id,titre,entreprise,ville,url_postuler,source&id=in.(${ids.join(",")})`, {
    headers: { apikey: cle },
  });
  if (!r.ok) throw new Error(`Lecture refusée (code ${r.status})`);
  const details = (await r.json()) as Detail[];
  return details.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

/** Petite fiche sur la carte. Construite avec textContent : aucun HTML venu des offres n'est interprété. */
function ouvrirFiche(PopupMapLibre: typeof Popup, m: Carte, ou: LngLat, ids: number[]): Popup {
  const boite = document.createElement("div");
  boite.className = "grid gap-3";
  const entete = element("p", "font-bold", "Chargement…");
  entete.setAttribute("aria-live", "polite");
  boite.append(entete);
  const fiche = new PopupMapLibre({ maxWidth: "320px" }).setLngLat(ou).setDOMContent(boite).addTo(m);

  lireDetails(ids.slice(0, FICHE_MAX))
    .then((offres) => {
      entete.textContent = ids.length > 1 ? `${ids.length} offres à cet endroit` : "";
      if (ids.length === 1) entete.remove();
      const liste = element("ul", "grid max-h-72 gap-4 overflow-y-auto");
      for (const o of offres) {
        const li = element("li", "grid gap-1");
        li.append(element("p", "font-bold leading-snug", o.titre));
        const qui = [o.entreprise, o.ville].filter(Boolean).join(" · ");
        if (qui) li.append(element("p", "text-sm text-gris", qui));
        if (/^https?:\/\//i.test(o.url_postuler)) {
          const lien = element("a", "inline-flex min-h-11 items-center font-bold text-bleu underline underline-offset-4", "Postuler sur l'offre ↗");
          lien.setAttribute("href", o.url_postuler);
          lien.setAttribute("target", "_blank");
          lien.setAttribute("rel", "noopener noreferrer nofollow");
          lien.append(element("span", "sr-only", " (s'ouvre dans un nouvel onglet)"));
          li.append(lien);
        }
        if (o.source === "adzuna") {
          const adzuna = element("a", "text-sm text-gris underline underline-offset-4", "Offre trouvée via Adzuna");
          adzuna.setAttribute("href", "https://www.adzuna.fr");
          adzuna.setAttribute("target", "_blank");
          adzuna.setAttribute("rel", "noopener noreferrer");
          li.append(adzuna);
        }
        liste.append(li);
      }
      boite.append(liste);
      if (ids.length > FICHE_MAX) boite.append(element("p", "text-sm text-gris", "Les autres offres sont dans la vue Liste."));
    })
    .catch(() => {
      entete.textContent = "L'offre ne peut pas être chargée. Réessaie dans un instant.";
    });

  return fiche;
}

function element<K extends keyof HTMLElementTagNameMap>(balise: K, classes: string, texte?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(balise);
  el.className = classes;
  if (texte) el.textContent = texte;
  return el;
}
