// Petites icônes SVG (dessin inspiré de Lucide, licence ISC). Décoratives : cachées aux lecteurs d'écran.
import type { SVGProps } from "react";

function Icone({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconeLieu = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icone>
);

export const IconeHorloge = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icone>
);

export const IconeLienExterne = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icone>
);

export const IconeFermer = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icone>
);

export const IconeLoupe = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icone>
);

export const IconeEcole = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </Icone>
);

export const IconeListe = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </Icone>
);

export const IconeCarte = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M14.1 6.1 9.9 3.9a2 2 0 0 0-1.8 0L3.6 6.2A1 1 0 0 0 3 7.1v12.3a1 1 0 0 0 1.4.9l3.7-1.9a2 2 0 0 1 1.8 0l4.2 2.2a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9V5.1a1 1 0 0 0-1.4-.9l-3.7 1.9a2 2 0 0 1-1.8 0Z" />
    <path d="M15 6v15" />
    <path d="M9 3v15" />
  </Icone>
);

export const IconeCrayon = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5Z" />
    <path d="m15 5 4 4" />
  </Icone>
);

export const IconeCadre = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </Icone>
);

export const IconeBus = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M8 6v6" />
    <path d="M15 6v6" />
    <path d="M2 12h19.6" />
    <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
    <circle cx="7" cy="18" r="2" />
    <path d="M9 18h5" />
    <circle cx="16" cy="18" r="2" />
  </Icone>
);

export const IconeTrain = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <rect width="16" height="16" x="4" y="3" rx="2" />
    <path d="M4 11h16" />
    <path d="M12 3v8" />
    <path d="m8 19-2 3" />
    <path d="m18 22-2-3" />
    <path d="M8 15h.01" />
    <path d="M16 15h.01" />
  </Icone>
);
