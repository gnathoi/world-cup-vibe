import { flag } from "@/lib/flags";

type Props = {
  rank: number;
  displayName: string;
  points: number;
  teamCodes: string[];
  eliminatedTeamCodes?: string[];
  status: "still-in" | "eliminated";
  isYou?: boolean;
  isLeader?: boolean;
};

export default function RankedRow({
  rank,
  displayName,
  points,
  teamCodes,
  eliminatedTeamCodes = [],
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

  const outCodes = new Set(eliminatedTeamCodes);
  // Teams still in = allocated teams that aren't knocked out. Show alive first
  // so the count and the badges below read consistently.
  const orderedCodes = [
    ...teamCodes.filter((c) => !outCodes.has(c)),
    ...teamCodes.filter((c) => outCodes.has(c)),
  ];
  const aliveCount = teamCodes.length - outCodes.size;

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
          <div style={{ fontSize: "0.8em", marginTop: "2px" }}>
            {orderedCodes.map((c, i) => {
              const isOut = outCodes.has(c);
              return (
                <span
                  key={c}
                  style={{
                    color: "#ffffff",
                    opacity: isOut ? 0.35 : 0.75,
                    textDecoration: isOut ? "line-through" : "none",
                    marginRight: i < orderedCodes.length - 1 ? "8px" : 0,
                  }}
                >
                  {flag(c)} {c}
                </span>
              );
            })}
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
