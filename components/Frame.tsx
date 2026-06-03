import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "chalkboard";

type Props = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary:    { border: "2px solid #00FFFF" },
  secondary:  { border: "1px solid #ffffff" },
  chalkboard: { border: "1px solid #ffffff", background: "#000000", color: "#ffffff" },
};

export default function Frame({
  variant = "primary",
  className = "",
  children,
}: Props) {
  return (
    <div className={className} style={variantStyle[variant]}>
      {children}
    </div>
  );
}
