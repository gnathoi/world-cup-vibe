import Link from "next/link";

type Props = {
  signedInAs?: string | null;
};

export default function MastheadBar({ signedInAs }: Props) {
  return (
    <header className="bg-scarlet text-cream">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        <div
          aria-hidden
          className="font-mono text-xs tracking-widest opacity-80 select-none"
        >
          {"// // // // //"}
        </div>
        <Link
          href="/"
          className="font-display text-3xl sm:text-4xl tracking-tight text-center"
        >
          GOAL! THE 2026 SWEEPSTAKE
        </Link>
        <div className="text-right">
          {signedInAs ? (
            <span className="stamp text-cream border-cream/60">
              SIGNED IN — {signedInAs}
            </span>
          ) : (
            <Link href="/signin" className="stamp text-cream border-cream/60">
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
