import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import { getAllocation, getParticipants } from "@/lib/db";
import { getMatches } from "@/lib/openfootball";
import { computeStandings } from "@/lib/leaderboard";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import { flag } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const [participants, allocation, matches] = await Promise.all([
    getParticipants(),
    getAllocation(),
    getMatches(),
  ]);

  const standings = computeStandings(participants, allocation, matches);

  // Build a set of eliminated team codes
  const eliminatedCodes = new Set<string>();
  for (const m of matches) {
    if (!m.score) continue;
    const homeGoals = m.score.home;
    const awayGoals = m.score.away;
    if (m.round !== "group") {
      // In knockouts, loser is eliminated
      if (homeGoals < awayGoals) eliminatedCodes.add(m.home.code);
      else if (awayGoals < homeGoals) eliminatedCodes.add(m.away.code);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me?.displayName ?? null} pageNum="P101" />

      <section
        style={{
          background: "#000000",
          borderBottom: "2px solid #FF00FF",
          padding: "8px 12px",
        }}
      >
        <div style={{ color: "#FFFF00", fontSize: "1.4em" }}>WHO HAS WHAT</div>
        <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "2px" }}>
          FULL TEAM ALLOCATION — {participants.length} PLAYERS
        </div>
      </section>

      <main style={{ flex: 1, padding: "0 0 16px" }}>
        {!allocation ? (
          <div style={{ padding: "20px 12px" }}>
            <div style={{ border: "2px solid #FFFF00", padding: "16px", color: "#FFFF00" }}>
              DRAW NOT YET RUN
              <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "6px" }}>
                CHECK BACK ON 11 JUN 2026
              </div>
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #00FFFF", background: "#111111" }}>
                <th style={{ color: "#00FFFF", padding: "5px 12px", textAlign: "left", fontWeight: "normal", fontSize: "0.85em" }}>
                  PLAYER
                </th>
                <th style={{ color: "#00FFFF", padding: "5px 12px", textAlign: "left", fontWeight: "normal", fontSize: "0.85em" }}>
                  TEAMS
                </th>
                <th style={{ color: "#00FFFF", padding: "5px 12px", textAlign: "right", fontWeight: "normal", fontSize: "0.85em" }}>
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const isYou = row.participantId === me?.id;
                const aliveTeams = row.teamCodes.filter((c) => !eliminatedCodes.has(c));
                const deadTeams = row.teamCodes.filter((c) => eliminatedCodes.has(c));

                return (
                  <tr
                    key={row.participantId}
                    style={{
                      borderBottom: "1px solid #222222",
                      background: isYou ? "#0000FF" : undefined,
                    }}
                  >
                    <td style={{ padding: "6px 12px", whiteSpace: "nowrap", verticalAlign: "top" }}>
                      <span style={{ color: isYou ? "#ffffff" : "#FFFF00", fontSize: "1.05em" }}>
                        {row.displayName}
                      </span>
                      {isYou && (
                        <span className="tt-badge tt-badge-cyan" style={{ marginLeft: "8px", fontSize: "0.75em" }}>
                          YOU
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "6px 12px", fontSize: "0.9em", verticalAlign: "top" }}>
                      {/* Alive teams in white */}
                      {aliveTeams.map((c) => (
                        <span key={c} style={{ color: "#ffffff", marginRight: "12px", whiteSpace: "nowrap" }}>
                          {flag(c)} {c}
                        </span>
                      ))}
                      {/* Eliminated teams in red */}
                      {deadTeams.map((c) => (
                        <span key={c} style={{ color: "#FF0000", marginRight: "12px", whiteSpace: "nowrap", opacity: 0.7 }}>
                          {flag(c)} {c}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right", verticalAlign: "top" }}>
                      {row.stillIn ? (
                        <span className="tt-badge tt-badge-green">
                          {aliveTeams.length} ALIVE
                        </span>
                      ) : (
                        <span className="tt-badge tt-badge-red">OUT</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>

      <SiteFooter showAdminLink />
    </div>
  );
}
