"use client";
// Lien « Mes candidatures », avec le nombre d'offres gardées (lu dans le navigateur).
import Link from "next/link";
import { useSuivi } from "@/lib/useSuivi";
import { IconeMarque } from "./Icones";

export function LienSuivi() {
  const { suivi } = useSuivi();
  const n = Object.keys(suivi).length;
  return (
    <Link
      href="/suivi"
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-filet px-3 font-bold transition-colors duration-150 hover:border-bleu"
    >
      <IconeMarque />
      Mes candidatures
      {n > 0 && (
        <span className="rounded-full bg-bleu px-2 text-sm text-papier">
          {n}
          <span className="sr-only"> offre{n > 1 ? "s" : ""} gardée{n > 1 ? "s" : ""}</span>
        </span>
      )}
    </Link>
  );
}
