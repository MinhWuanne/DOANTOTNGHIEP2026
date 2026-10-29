import type { SVGProps } from "react";

export type IconName =
  | "search"
  | "user"
  | "bag"
  | "menu"
  | "close"
  | "arrow";

export default function StorefrontIcon({
  name,
}: {
  name: IconName;
}) {
  const commonProps: SVGProps<SVGSVGElement> = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>
      );

    case "user":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      );

    case "bag":
      return (
        <svg {...commonProps}>
          <path d="M5 8h14l1 13H4L5 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );

    case "menu":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...commonProps}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
  }
}