import Stamp from "./Stamp";

type Props = {
  matchDayLabel: string; // e.g. "MATCH DAY 4 / 17 JUN 2026"
  stage: string; // e.g. "GROUP STAGE"
  matchesPlayed: number;
  matchesRemaining: number;
  potGbp: number;
  stale?: boolean;
};

export default function HeroStrip({
  matchDayLabel,
  stage,
  matchesPlayed,
  matchesRemaining,
  potGbp,
  stale,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-cream border-y border-ink/10">
      <div
        aria-hidden
        className="halftone absolute inset-0 -z-0"
      />
      <div className="relative max-w-7xl mx-auto px-6 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Stamp tone="cobalt" className="-rotate-2 origin-left">
            {matchDayLabel}
          </Stamp>
          <p className="font-display text-2xl sm:text-3xl text-ink">{stage}</p>
          <p className="font-mono text-sm text-ink/70">
            {matchesPlayed} played, {matchesRemaining} to go
          </p>
        </div>
        <div className="flex items-center gap-4">
          {stale ? <Stamp tone="scarlet">DATA MAY BE STALE</Stamp> : null}
          <div className="frame-double bg-cream/80 px-8 py-4 text-center min-w-[7rem]">
            <p className="font-mono text-xs tracking-widest text-ink/70">
              POT
            </p>
            <p className="font-display text-3xl text-scarlet leading-none mt-2">
              £{potGbp.toLocaleString("en-GB")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
