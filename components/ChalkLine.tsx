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
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: "8px",
        alignItems: "baseline",
        padding: "5px 0",
        borderBottom: "1px dotted #333333",
      }}
    >
      <span style={{ color: "#00FFFF", fontSize: "0.95em" }}>{label}</span>

      <span style={{ color: "#00FF00", minWidth: "3.5em", textAlign: "right" }}>
        £{payoutGbp}
      </span>

      <span style={{ minWidth: "9em", textAlign: "right" }}>
        {status === "pending" ? (
          <span style={{ color: "#ffffff", opacity: 0.5, fontSize: "0.85em" }}>PENDING</span>
        ) : status === "claimed" ? (
          <span className="tt-badge tt-badge-yellow">
            {claimedByDisplayName ?? "CLAIMED"}
          </span>
        ) : (
          <span style={{ color: "#FF0000", fontSize: "0.85em", textDecoration: "line-through" }}>
            EXPIRED
          </span>
        )}
      </span>
    </li>
  );
}
