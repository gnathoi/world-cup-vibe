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
        padding: "6px 0",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      {/* Label row */}
      <div style={{ color: "#00FFFF", fontSize: "0.9em", lineHeight: 1.2 }}>
        {label}
      </div>
      {/* Payout + status row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
        <span style={{ color: "#00FF00", fontSize: "1em" }}>£{payoutGbp}</span>
        <span>
          {status === "pending" ? (
            <span style={{ color: "#ffffff", opacity: 0.4, fontSize: "0.8em" }}>PENDING</span>
          ) : status === "claimed" ? (
            <span className="tt-badge tt-badge-yellow" style={{ fontSize: "0.8em" }}>
              {claimedByDisplayName ?? "CLAIMED"}
            </span>
          ) : (
            <span style={{ color: "#FF0000", fontSize: "0.8em" }}>EXPIRED</span>
          )}
        </span>
      </div>
    </li>
  );
}
