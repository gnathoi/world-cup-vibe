import type { ReactNode } from "react";

// Kerned-caps badge. The newspaper voice on every label.

type Tone = "scarlet" | "cobalt" | "ink" | "cream" | "sepia-dark";

type Props = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

const toneClass: Record<Tone, string> = {
  scarlet: "text-scarlet",
  cobalt: "text-cobalt",
  ink: "text-ink",
  cream: "text-cream",
  "sepia-dark": "text-sepia-dark",
};

export default function Stamp({ tone = "ink", className = "", children }: Props) {
  return (
    <span className={`stamp ${toneClass[tone]} ${className}`}>{children}</span>
  );
}
