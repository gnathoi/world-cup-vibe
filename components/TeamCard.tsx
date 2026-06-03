import Stamp from "./Stamp";
import { flag } from "@/lib/flags";

type Props = {
  code: string;
  name: string;
  group?: string;
  record: { w: number; d: number; l: number };
  status: "still-in" | "eliminated";
  nextOpponentCode?: string;
  nextKickoffLocalLabel?: string;
};

export default function TeamCard({
  code,
  name,
  group,
  record,
  status,
  nextOpponentCode,
  nextKickoffLocalLabel,
}: Props) {
  return (
    <article className="p-5 bg-cream/60 flex flex-col gap-3 h-full">
      <header className="flex items-baseline justify-between">
        <span className="flex items-center gap-2">
          <span className="text-2xl leading-none" role="img" aria-label={name}>
            {flag(code)}
          </span>
          <span className="font-display text-2xl text-sepia-dark">{code}</span>
        </span>
        {group ? (
          <span className="font-mono text-xs text-ink/60 tracking-widest">
            GROUP {group}
          </span>
        ) : null}
      </header>
      <h3 className="font-display text-xl leading-tight">{name}</h3>
      <p className="font-mono text-sm text-ink/80 tabular-nums">
        W{record.w} D{record.d} L{record.l}
      </p>
      <p>
        {status === "still-in" ? (
          <Stamp tone="cobalt">STILL IN</Stamp>
        ) : null}
      </p>
      {nextOpponentCode ? (
        <p className="font-mono text-xs text-ink/70 mt-auto">
          NEXT: {flag(nextOpponentCode)} vs {nextOpponentCode}
          {nextKickoffLocalLabel ? ` — ${nextKickoffLocalLabel}` : ""}
        </p>
      ) : (
        <p className="font-mono text-xs text-ink/50 mt-auto italic">
          NO MORE FIXTURES
        </p>
      )}
    </article>
  );
}
