import Stamp from "./Stamp";

type Props = {
  homeCode: string;
  homeName: string;
  awayCode: string;
  awayName: string;
  status: "scheduled" | "live" | "ft" | "ap" | "pen";
  score?: { home: number; away: number };
  matchDayLabel: string;
  kickoffLocalLabel?: string;
};

export default function MatchScore({
  homeCode,
  homeName,
  awayCode,
  awayName,
  status,
  score,
  matchDayLabel,
  kickoffLocalLabel,
}: Props) {
  const statusStamp =
    status === "scheduled" ? (
      <Stamp tone="cobalt">KICKOFF {kickoffLocalLabel ?? "TBD"}</Stamp>
    ) : status === "live" ? (
      <Stamp tone="scarlet">LIVE</Stamp>
    ) : status === "ft" ? (
      <Stamp tone="ink">FULL TIME</Stamp>
    ) : status === "ap" ? (
      <Stamp tone="ink">AFTER EXTRA TIME</Stamp>
    ) : (
      <Stamp tone="ink">AFTER PENALTIES</Stamp>
    );

  return (
    <section className="p-6 bg-cream">
      <div className="flex items-baseline justify-between text-ink/70">
        <span className="font-mono text-xs tracking-widest">
          {matchDayLabel}
        </span>
        {statusStamp}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
        <div className="text-right">
          <p className="font-display text-3xl">{homeName}</p>
          <p className="font-mono text-sm text-ink/60">{homeCode}</p>
        </div>
        <div className="font-mono text-5xl tabular-nums text-ink text-center">
          {score ? `${score.home} - ${score.away}` : "— -—"}
        </div>
        <div>
          <p className="font-display text-3xl">{awayName}</p>
          <p className="font-mono text-sm text-ink/60">{awayCode}</p>
        </div>
      </div>
    </section>
  );
}
