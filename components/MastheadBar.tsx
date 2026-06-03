import Link from "next/link";

type Props = {
  signedInAs?: string | null;
};

export default function MastheadBar({ signedInAs }: Props) {
  return (
    <header className="bg-scarlet text-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-0 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
        <div
          aria-hidden
          className="hidden sm:block font-mono text-xs tracking-widest opacity-80 select-none shrink-0"
        >
          {"// // // // //"}
        </div>
        <div className="flex flex-col items-center gap-1 min-w-0">
          <Link
            href="/"
            className="font-display text-base sm:text-3xl lg:text-4xl tracking-tight text-center leading-tight"
          >
            MAKE AMERICA GOAL AGAIN
          </Link>
          <nav className="flex gap-3 sm:gap-4 font-mono text-xs tracking-widest text-cream/70">
            <Link href="/" className="hover:text-cream">STANDINGS</Link>
            <Link href="/schedule" className="hover:text-cream">FIXTURES</Link>
            {signedInAs && <Link href="/me" className="hover:text-cream">MY TEAMS</Link>}
          </nav>
        </div>
        <div className="text-right shrink-0">
          {signedInAs ? (
            <span className="stamp text-cream border-cream/60 text-xs">
              {signedInAs}
            </span>
          ) : (
            <Link href="/signin" className="stamp text-cream border-cream/60">
              {Date.now() >= new Date("2026-06-11T00:00:00Z").getTime()
                ? "SIGN IN"
                : "SIGN UP"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
