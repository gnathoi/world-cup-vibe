import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import {
  getAllocation,
  getParticipants,
  getSpecials,
  getWoodenSpoonWinner,
} from "@/lib/db";
import { getMatches } from "@/lib/openfootball";
import { computeStandings, computePotGbp } from "@/lib/leaderboard";
import { TEAMS_2026 } from "@/lib/teams";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import ChalkLine from "@/components/ChalkLine";
import { flag } from "@/lib/flags";

export const dynamic = "force-dynamic";

function countdownToNext(matches: Awaited<ReturnType<typeof getMatches>>): {
  label: string;
  matchLabel: string;
} {
  const now = Date.now();
  const next = matches.find(
    (m) => !m.score && new Date(m.kickoffUtc).getTime() > now,
  );
  if (!next) return { label: "NO UPCOMING MATCHES", matchLabel: "" };
  const ms = new Date(next.kickoffUtc).getTime() - now;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return {
    label: `${h}H ${m}M`,
    matchLabel: `${next.home.code} VS ${next.away.code}`,
  };
}

export default async function MePage() {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const [participants, allocation, specials, matches, woodenSpoonWinnerId] =
    await Promise.all([
      getParticipants(),
      getAllocation(),
      getSpecials(),
      getMatches(),
      getWoodenSpoonWinner(),
    ]);

  const standings = computeStandings(participants, allocation, matches);
  const myRow = standings.find((r) => r.participantId === me.id);
  const myRank = standings.findIndex((r) => r.participantId === me.id) + 1;
  const potGbp = computePotGbp(participants.length);
  const countdown = countdownToNext(matches);
  const mySpecials = specials.filter((s) => s.ownerParticipantId === me.id);
  const myTeamCodes = myRow?.teamCodes ?? [];

  const teamRows = myTeamCodes.map((code) => {
    const team = TEAMS_2026.find((t) => t.code === code) ?? { code, name: code };
    let w = 0, d = 0, l = 0, stillIn = true;
    let nextOpponent: string | undefined;

    for (const m of matches) {
      const isHome = m.home.code === code;
      const isAway = m.away.code === code;
      if (!isHome && !isAway) continue;
      if (m.score) {
        const my = isHome ? m.score.home : m.score.away;
        const opp = isHome ? m.score.away : m.score.home;
        if (my > opp) w++;
        else if (my < opp) { l++; if (m.round !== "group") stillIn = false; }
        else d++;
      } else if (!nextOpponent) {
        nextOpponent = isHome ? m.away.code : m.home.code;
      }
    }
    return { code, name: team.name, record: { w, d, l }, stillIn, nextOpponent };
  });

  const aliveCount = teamRows.filter((t) => t.stillIn).length;

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me.displayName} pageNum="P300" />

      <section
        style={{
          background: "#000000",
          borderBottom: "2px solid #FF00FF",
          padding: "8px 12px",
        }}
      >
        <div style={{ color: "#FFFF00", fontSize: "1.5em" }}>
          {me.displayName.toUpperCase()}&apos;S TEAMS
        </div>
        <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "2px" }}>
          NEXT MATCH: {countdown.label}
          {countdown.matchLabel ? ` — ${countdown.matchLabel}` : ""}
        </div>
        {woodenSpoonWinnerId === me.id && (
          <div style={{ marginTop: "6px" }}>
            <span className="tt-badge tt-badge-yellow tt-flash">WOODEN SPOON £20</span>
          </div>
        )}
      </section>

      <main style={{ flex: 1, padding: "12px" }}>
        {/* Stats bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            border: "1px solid #00FFFF",
            marginBottom: "16px",
          }}
        >
          {[
            { label: "RANK", value: myRank > 0 ? `${myRank} OF ${participants.filter((p) => !p.spectator).length}` : "—" },
            { label: "IN", value: aliveCount > 0 ? `${aliveCount} TEAMS` : "NONE" },
            { label: "POT", value: `£${potGbp}` },
            { label: "SPECIALS", value: String(mySpecials.length) },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                padding: "8px 10px",
                borderRight: i < 3 ? "1px solid #00FFFF" : "none",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#00FFFF", fontSize: "0.75em" }}>{label}</div>
              <div style={{ color: "#FFFF00", fontSize: "1.4em", marginTop: "2px" }}>{value}</div>
            </div>
          ))}
        </div>

        {me.spectator ? (
          <div style={{ border: "2px solid #FFFF00", padding: "16px", color: "#FFFF00", marginBottom: "16px" }}>
            YOU JOINED AFTER THE DRAW
            <div style={{ color: "#ffffff", fontSize: "0.9em", marginTop: "6px" }}>
              YOU CAN STILL FOLLOW ALONG
            </div>
          </div>
        ) : teamRows.length === 0 ? (
          <div style={{ border: "2px solid #FFFF00", padding: "16px", color: "#FFFF00", marginBottom: "16px" }}>
            DRAW NOT YET RUN
            <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "6px" }}>
              RETURN AT MIDNIGHT ON 11 JUN
            </div>
          </div>
        ) : (
          <section style={{ marginBottom: "16px" }}>
            <div
              style={{
                background: "#000000",
                color: "#FFFF00",
                borderLeft: "4px solid #FFFF00",
                padding: "4px 10px",
                fontSize: "1em",
                marginBottom: "0",
              }}
            >
              YOUR TEAMS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #00FFFF" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333333", background: "#111111" }}>
                  <th style={{ color: "#00FFFF", padding: "4px 10px", textAlign: "left", fontWeight: "normal", fontSize: "0.85em" }}>TEAM</th>
                  <th style={{ color: "#00FFFF", padding: "4px 8px", textAlign: "center", fontWeight: "normal", fontSize: "0.85em" }}>W/D/L</th>
                  <th style={{ color: "#00FFFF", padding: "4px 8px", textAlign: "center", fontWeight: "normal", fontSize: "0.85em" }}>NEXT</th>
                  <th style={{ color: "#00FFFF", padding: "4px 10px", textAlign: "right", fontWeight: "normal", fontSize: "0.85em" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((t) => (
                  <tr key={t.code} style={{ borderBottom: "1px solid #222222" }}>
                    <td style={{ padding: "5px 10px", color: "#ffffff" }}>
                      {flag(t.code)} {t.code}
                      <span style={{ color: "#ffffff", opacity: 0.5, fontSize: "0.8em", marginLeft: "6px" }}>
                        {t.name.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center", color: "#FFFF00", fontSize: "0.9em" }}>
                      {t.record.w}/{t.record.d}/{t.record.l}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center", color: "#00FFFF", fontSize: "0.85em" }}>
                      {t.nextOpponent ? `VS ${t.nextOpponent}` : "—"}
                    </td>
                    <td style={{ padding: "5px 10px", textAlign: "right" }}>
                      {t.stillIn ? (
                        <span className="tt-badge tt-badge-green">IN</span>
                      ) : (
                        <span className="tt-badge tt-badge-red">OUT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {mySpecials.length > 0 && (
          <section>
            <div
              style={{
                background: "#FF00FF",
                color: "#000000",
                padding: "4px 10px",
                fontSize: "1em",
              }}
            >
              YOUR SPECIALS
            </div>
            <div style={{ border: "1px solid #FF00FF", padding: "8px 10px" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {mySpecials.map((s) => (
                  <ChalkLine
                    key={s.id}
                    payoutGbp={s.payoutGbp}
                    label={s.label.toUpperCase()}
                    status={s.status}
                  />
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
