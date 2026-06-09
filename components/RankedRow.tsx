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
  const rowStyle: React.CSSProperties = isYou
    ? { background: "#0000FF" }
    : isLeader
    ? { background: "#111111" }
    : {};

  const nameStyle: React.CSSProperties = isLeader
    ? { color: "#FFFF00" }
    : { color: "#ffffff" };

  const aliveCount = status === "still-in" ? teamCodes.length : 0;

  return (
    <tr style={rowStyle}>
      <td
        style={{
          color: "#00FFFF",
          textAlign: "right",
          padding: "5px 8px 5px 10px",
          fontSize: "1.2em",
          verticalAlign: "middle",
          whiteSpace: "nowrap",
        }}
      >
        {rank}
      </td>

      <td style={{ padding: "5px 8px", verticalAlign: "middle" }}>
        <span style={nameStyle} className={isLeader ? "tt-flash" : undefined}>
          {displayName}
        </span>
        {isYou && (
          <span
            className="tt-badge tt-badge-cyan"
            style={{ marginLeft: "8px", fontSize: "0.75em" }}
          >
            YOU
          </span>
        )}
        {teamCodes.length > 0 && (
          <div style={{ fontSize: "0.8em", color: "#ffffff", opacity: 0.65, marginTop: "2px" }}>
            {teamCodes.slice(0, 5).map((c) => `${flag(c)} ${c}`).join("  ")}
            {teamCodes.length > 5 && (
              <span style={{ color: "#00FFFF" }}> +{teamCodes.length - 5}</span>
            )}
          </div>
        )}
      </td>

      <td style={{ padding: "5px 8px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        {aliveCount > 0 ? (
          <span style={{ color: "#FFFF00", fontSize: "0.9em" }}>{aliveCount} IN</span>
        ) : (
          <span style={{ color: "#ffffff", opacity: 0.4, fontSize: "0.9em" }}>0</span>
        )}
      </td>

      <td style={{ padding: "5px 10px 5px 4px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        {status === "still-in" ? (
          <span className="tt-badge tt-badge-green">IN</span>
        ) : (
          <span className="tt-badge tt-badge-red">OUT</span>
        )}
      </td>
    </tr>
  );
}
