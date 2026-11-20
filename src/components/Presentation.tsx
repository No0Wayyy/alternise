// « Comment ça marche » : le plan de ligne en 4 arrêts (affiché quand aucune recherche n'est lancée).
const arrets = [
  { titre: "Choisis ton métier", texte: "Par secteur ou par mot-clé, avec le diplôme que tu prépares." },
  { titre: "Choisis tes villes", texte: "Une ou plusieurs villes, avec un rayon en km." },
  { titre: "Bientôt : ton trajet", texte: "À pied, à vélo, près d'un arrêt de bus ou d'une gare." },
  { titre: "Postule sur l'offre d'origine", texte: "Un clic t'amène sur l'annonce. Tu suivras bientôt tes candidatures ici." },
];

export function Presentation() {
  return (
    <section aria-labelledby="comment" className="rounded-2xl border border-filet p-5 sm:p-8">
      <h2 id="comment" className="mb-6 text-lg font-bold text-bleu">
        Comment ça marche
      </h2>
      <ol className="grid gap-0 md:grid-cols-4 md:gap-6">
        {arrets.map((a, i) => (
          <li key={a.titre} className="relative flex gap-5 pb-8 last:pb-0 md:flex-col md:gap-3 md:pb-0">
            {i < arrets.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-4 left-[11px] h-full w-[6px] bg-jaune md:top-[11px] md:left-4 md:h-[6px] md:w-[calc(100%+1.5rem)]"
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 mt-0.5 size-7 shrink-0 rounded-full border-[6px] border-jaune bg-papier"
            />
            <div>
              <h3 className="leading-snug font-bold">{a.titre}</h3>
              <p className="mt-1 leading-relaxed text-gris">{a.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
