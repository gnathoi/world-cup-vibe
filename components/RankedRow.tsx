import Stamp from "./Stamp";
import { flag } from "@/lib/flags";

type Props = {
  rank: number;
  displayName: string;
  points: number;
  teamCodes: string[];
  status: "still-in" | "eliminated";
  isYou?: boolean;
  isLeader?: boolean;
};

export default function RankedRow({
  rank,
  displayName,
  points,
  teamCodes,
  status,
  isYou,
  isLeader,
}: Props) {
  return (
    <li
      className={`grid grid-cols-[3rem_1fr_auto] gap-x-4 gap-y-2 items-baseline p-4 ${
        isYou ? "bg-sepia/10" : ""
      } ${isLeader ? "outline outline-2 outline-scarlet" : ""}`}
    >
      <span
        className="font-display text-5xl text-sepia-dark leading-none text-right"
        aria-hidden
      >
        {rank}
      </span>
      <span className="font-display text-2xl text-ink leading-tight">
        {displayName}
        {isYou ? (
          <span className="ml-2 stamp text-cobalt border-cobalt">YOU</span>
        ) : null}
      </span>
      <span className="font-mono text-xl text-ink tabular-nums">
        {points} pts
      </span>
      <span />
      <ul className="col-span-1 flex flex-wrap gap-1.5">
        {teamCodes.slice(0, 6).map((code) => (
          <li key={code}>
            <span className="stamp text-ink border-ink/40">
              {flag(code)} {code}
            </span>
          </li>
        ))}
        {teamCodes.length > 6 ? (
          <li>
            <span className="stamp text-ink/70 border-ink/30">
              +{teamCodes.length - 6} MORE
            </span>
          </li>
        ) : null}
      </ul>
      <span className="justify-self-end">
        {status === "still-in" ? (
          <Stamp tone="cobalt">STILL IN</Stamp>
        ) : (
          <Stamp tone="scarlet" className="line-through decoration-2">
            ELIMINATED
          </Stamp>
        )}
      </span>
    </li>
  );
}
