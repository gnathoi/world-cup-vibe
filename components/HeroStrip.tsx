type Props = {
  matchDayLabel: string;
  stage: string;
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
    <section
      style={{
        background: "#000000",
        borderBottom: "2px solid #FF00FF",
        padding: "10px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "10px",
      }}
    >
      <div>
        <div style={{ color: "#00FFFF", fontSize: "0.9em", marginBottom: "4px" }}>
          {matchDayLabel}
        </div>
        <div style={{ color: "#00FF00", fontSize: "1.6em", lineHeight: 1.1 }}>
          {stage}
        </div>
        <div style={{ color: "#ffffff", fontSize: "0.85em", marginTop: "4px", opacity: 0.7 }}>
          {matchesPlayed} PLAYED · {matchesRemaining} REMAINING
        </div>
        {stale && (
          <div
            className="tt-badge tt-badge-red"
            style={{ marginTop: "6px", fontSize: "0.8em" }}
          >
            DATA MAY BE STALE
          </div>
        )}
      </div>

      <div
        style={{
          border: "2px solid #FFFF00",
          padding: "8px 20px",
          textAlign: "center",
          minWidth: "110px",
        }}
      >
        <div style={{ color: "#FFFF00", fontSize: "0.8em", letterSpacing: "3px" }}>POT</div>
        <div style={{ color: "#ffffff", fontSize: "2em", lineHeight: 1 }}>
          £{potGbp.toLocaleString("en-GB")}
        </div>
      </div>
    </section>
  );
}
