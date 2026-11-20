// Page d'accueil (étape 2 du MVP) : présente le site en attendant la recherche.

const arrets = [
  {
    titre: "Choisis ton métier",
    texte: "Par secteur ou par métier, avec le niveau de diplôme qui te correspond.",
  },
  {
    titre: "Trace tes zones",
    texte: "Plusieurs villes avec un rayon en km, ou une zone dessinée sur la carte.",
  },
  {
    titre: "Fixe ton temps de trajet",
    texte: "À pied, à vélo, près d'un arrêt de bus ou d'une gare.",
  },
  {
    titre: "Postule sur l'offre d'origine",
    texte: "Un clic t'amène sur l'annonce. Tu suis tes candidatures ici.",
  },
];

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-8 sm:py-16">
      <header className="mb-12 flex items-center gap-3">
        {/* Logo : un arrêt sur la ligne */}
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-jaune"
        >
          <span className="size-3 rounded-full bg-bleu" />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-bleu">
          Alternise
        </span>
      </header>

      <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <section aria-labelledby="titre">
          <h1
            id="titre"
            className="text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl"
          >
            Ton alternance, à portée de trajet.
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-gris">
            Alternise réunit les offres de La Bonne Alternance, France Travail
            et Adzuna au même endroit. Tu filtres selon ton trajet, puis tu
            postules directement.
          </p>
          <p className="mt-8 inline-flex items-center gap-2 rounded-xl border border-filet px-4 py-2 text-sm text-gris">
            <span aria-hidden="true" className="size-2 rounded-full bg-jaune" />
            Site en construction : la recherche arrive bientôt.
          </p>
        </section>

        <section aria-labelledby="comment">
          <h2 id="comment" className="mb-6 text-lg font-bold text-bleu">
            Comment ça marche
          </h2>
          {/* Le plan de ligne : un trait jaune qui relie les étapes. */}
          <ol className="relative">
            {arrets.map((arret, i) => (
              <li key={arret.titre} className="relative flex gap-5 pb-8 last:pb-0">
                {i < arrets.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-4 left-[11px] h-full w-[6px] bg-jaune"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="relative z-10 mt-0.5 size-7 shrink-0 rounded-full border-[6px] border-jaune bg-papier"
                />
                <div>
                  <h3 className="text-lg leading-snug font-bold">{arret.titre}</h3>
                  <p className="mt-1 leading-relaxed text-gris">{arret.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="mt-auto pt-16 text-sm text-gris">
        Gratuit et sans compte.
      </footer>
    </main>
  );
}
