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
