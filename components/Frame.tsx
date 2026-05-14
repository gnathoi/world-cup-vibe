import type { ReactNode } from "react";

// Double-rule frame wrapper. Three variants per the design doc:
//   primary     — scarlet outer + ink inner (default card style)
//   secondary   — dark sepia outer + ink inner (less prominent rows)
//   chalkboard  — single ink rule on ink background (Bookies' Specials)
//
// Never embedded inside row components. Always wraps:
//   <Frame variant="primary"><RankedRow .../></Frame>

type Variant = "primary" | "secondary" | "chalkboard";

type Props = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "frame-double",
  secondary: "frame-double frame-secondary",
  chalkboard: "frame-chalkboard",
};

export default function Frame({
  variant = "primary",
  className = "",
  children,
}: Props) {
  return (
    <div className={`${variantClass[variant]} ${className}`}>{children}</div>
  );
}
