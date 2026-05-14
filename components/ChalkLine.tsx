// One row of the Bookies' Specials chalkboard. Lives inside a chalkboard-variant
// <Frame> so the surrounding panel is dark.

type Props = {
  payoutGbp: number;
  label: string;
  status: "pending" | "claimed" | "expired";
  claimedByDisplayName?: string;
};

export default function ChalkLine({
  payoutGbp,
  label,
  status,
  claimedByDisplayName,
}: Props) {
  const statusNode =
    status === "pending" ? (
      <span className="stamp text-cobalt border-cobalt">PENDING</span>
    ) : status === "claimed" ? (
      <span className="stamp text-sepia border-sepia">
        CLAIMED{claimedByDisplayName ? ` — ${claimedByDisplayName}` : ""}
      </span>
    ) : (
      <span className="stamp text-cream/60 border-cream/40 line-through">
        EXPIRED
      </span>
    );

  return (
    <li className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 py-3 border-b border-cream/15 last:border-b-0">
      <span className="font-display text-xl text-sepia tabular-nums">
        £{payoutGbp}
      </span>
      <span className="font-display text-base leading-tight text-cream">
        {label}
      </span>
      <span className="justify-self-end">{statusNode}</span>
    </li>
  );
}
