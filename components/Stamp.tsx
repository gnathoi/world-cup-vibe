import type { ReactNode } from "react";

type Tone = "scarlet" | "cobalt" | "ink" | "cream" | "sepia-dark";

type Props = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

const toneStyle: Record<Tone, React.CSSProperties> = {
  scarlet:      { background: "#FF0000", color: "#ffffff" },
  cobalt:       { background: "#0000FF", color: "#ffffff" },
  ink:          { background: "#ffffff", color: "#000000" },
  cream:        { background: "#FFFF00", color: "#000000" },
  "sepia-dark": { background: "#FFFF00", color: "#000000" },
};

export default function Stamp({ tone = "ink", className = "", children }: Props) {
  return (
    <span
      className={`tt-badge ${className}`}
      style={toneStyle[tone]}
    >
      {children}
    </span>
  );
}
