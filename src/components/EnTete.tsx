// En-tête commun : le logo (retour à l'accueil) et le lien vers « Mes candidatures ».
import Link from "next/link";
import { LienSuivi } from "./LienSuivi";

export function EnTete() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-jaune">
          <span className="size-3 rounded-full bg-bleu" />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-bleu">Alternise</span>
        <span className="sr-only">: accueil</span>
      </Link>
      <LienSuivi />
    </header>
  );
}
