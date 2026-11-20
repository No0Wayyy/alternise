// Page « Mes candidatures » : les offres gardées et où l'étudiant en est. Tout reste dans son navigateur.
import type { Metadata } from "next";
import { EnTete } from "@/components/EnTete";
import { ListeSuivi } from "@/components/ListeSuivi";

export const metadata: Metadata = {
  title: "Mes candidatures : Alternise",
  description: "Les offres d'alternance que tu as gardées, et où tu en es pour chacune.",
  robots: { index: false }, // page personnelle, rien à trouver pour un moteur de recherche
};

export default function PageSuivi() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
      <EnTete />
      <main className="flex flex-col gap-8">
        <div>
          <h1 id="titre-suivi" tabIndex={-1} className="text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-4xl">
            Mes candidatures
          </h1>
          <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-gris">
            Les offres que tu as gardées, rangées selon où tu en es. Change le statut quand tu avances.
          </p>
        </div>
        <ListeSuivi />
      </main>
    </div>
  );
}
