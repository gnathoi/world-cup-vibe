import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import {
  getParticipants,
  getAllocation,
  getSpecials,
  getWoodenSpoonWinner,
} from "@/lib/db";
import { getMatches } from "@/lib/openfootball";
import { computeStandings, computePotGbp } from "@/lib/leaderboard";
import { DEFAULT_SPECIALS } from "@/lib/specials/defaults";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import HeroStrip from "@/components/HeroStrip";
import RankedRow from "@/components/RankedRow";
import ChalkLine from "@/components/ChalkLine";

export const dynamic = "force-dynamic";

function formatMatchDayLabel(matches: Awaited<ReturnType<typeof getMatches>>): {
  label: string;
  stage: string;
  played: number;
  remaining: number;
} {
  const playedMatches = matches.filter((m) => !!m.score);
  const played = playedMatches.length;
  const remaining = matches.length - played;
  const nowIso = new Date().toISOString();
  const nextScheduled = matches.find(
    (m) => !m.score && m.kickoffUtc >= nowIso,
  );
  const ref = nextScheduled ?? matches[matches.length - 1] ?? null;
  const d = ref ? new Date(ref.kickoffUtc) : new Date();
  const day = `${d.getDate()} ${d
    .toLocaleString("en-GB", { month: "short" })
    .toUpperCase()}`;
  // Top line points at the next fixture's date, not a fixture/day number. Once
  // every match is played there's nothing "next", so fall back accordingly.
  const matchDay =
    matches.length === 0
      ? "PRE-TOURNAMENT"
      : nextScheduled
        ? `NEXT · ${day}`
        : "ALL PLAYED";

  let stage = "AWAITING KICKOFF";
  if (matches.length > 0) {
    if (played === 0) {
      stage = "GROUP STAGE";
    } else {
      const playedRounds = new Set(playedMatches.map((m) => m.round));
      if (playedRounds.has("final")) stage = "FINAL";
      else if (playedRounds.has("semi")) stage = "SEMI-FINALS";
      else if (playedRounds.has("quarter")) stage = "QUARTER-FINALS";
      else if (playedRounds.has("round_of_16")) stage = "ROUND OF 16";
      else if (playedRounds.has("round_of_32")) stage = "ROUND OF 32";
      else stage = "GROUP STAGE";
    }
  }
  return {
    label: `${matchDay} / ${day}`,
    stage,
    played,
    remaining,
  };
}

export default async function HomePage() {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const [, participants, allocation, specials, matches, woodenSpoonWinnerId] =
    await Promise.all([
      Promise.resolve(me),
      getParticipants(),
      getAllocation(),
      getSpecials(),
      getMatches(),
      getWoodenSpoonWinner(),
    ]);

  const standings = computeStandings(participants, allocation, matches);
  const potGbp = computePotGbp(
    standings.reduce((n, r) => n + r.teamCodes.length, 0),
  );

  const displaySpecials =
    specials.length > 0
      ? specials
      : DEFAULT_SPECIALS.map((s) => ({
          ...s,
          ownerParticipantId: null as string | null,
          status: "pending" as const,
        }));
  const heroInfo = formatMatchDayLabel(matches);

  const ownerNames = new Map(
    participants.map((p) => [p.id, p.displayName] as const),
  );

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me?.displayName ?? null} pageNum="P100" />
      <HeroStrip
        matchDayLabel={heroInfo.label}
        stage={heroInfo.stage}
        matchesPlayed={heroInfo.played}
        matchesRemaining={heroInfo.remaining}
        potGbp={potGbp}
        stale={false}
      />

      <main style={{ flex: 1, padding: "0 0 16px" }}>
        {/* Two-column on desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 280px",
            gap: "0",
          }}
          className="teletext-grid"
        >
          {/* STANDINGS */}
          <section style={{ borderRight: "1px solid #0000FF", padding: "0 0 12px" }}>
            <div
              style={{
                background: "#000000",
                color: "#FFFF00",
                borderLeft: "4px solid #FFFF00",
                padding: "5px 10px",
                fontSize: "1.1em",
                letterSpacing: "2px",
              }}
            >
              ★ THE STANDINGS
            </div>
            <div style={{ height: "2px", background: "#FFFF00" }} />

            {standings.length === 0 ? (
              <div style={{ padding: "20px 12px" }}>
                <div
                  style={{
                    border: "2px solid #FFFF00",
                    padding: "16px",
                    color: "#FFFF00",
                    fontSize: "1.1em",
                  }}
                >
                  NO DATA — DRAW NOT YET RUN
                  <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "6px" }}>
                    SIGN UP BEFORE 11 JUN 2026
                  </div>
                </div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333333" }}>
                    <th style={{ color: "#00FFFF", padding: "4px 8px 4px 10px", textAlign: "right", fontSize: "0.8em", fontWeight: "normal" }}>#</th>
                    <th style={{ color: "#00FFFF", padding: "4px 8px", textAlign: "left", fontSize: "0.8em", fontWeight: "normal" }}>PLAYER</th>
                    <th style={{ color: "#00FFFF", padding: "4px 8px", textAlign: "right", fontSize: "0.8em", fontWeight: "normal" }}>IN</th>
                    <th style={{ color: "#00FFFF", padding: "4px 10px 4px 4px", fontSize: "0.8em", fontWeight: "normal" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <RankedRow
                      key={row.participantId}
                      rank={i + 1}
                      displayName={row.displayName}
                      points={row.points}
                      teamCodes={row.teamCodes}
                      status={row.stillIn ? "still-in" : "eliminated"}
                      isYou={me?.id === row.participantId}
                      isLeader={i === 0}
                    />
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: "6px 10px", fontSize: "0.8em", color: "#ffffff", opacity: 0.5 }}>
              <span className="tt-cursor">▌</span> 101 FOR TEAM ALLOCATION
            </div>
          </section>

          {/* SPECIALS SIDEBAR */}
          <section style={{ padding: "0 0 12px" }}>
            <div
              style={{
                background: "#FF00FF",
                color: "#000000",
                padding: "5px 10px",
                fontSize: "1.1em",
                letterSpacing: "2px",
              }}
            >
              SPECIALS
            </div>
            <div style={{ height: "2px", background: "#FF00FF" }} />
            <div style={{ padding: "8px 10px" }}>
              <div style={{ color: "#FFFF00", fontSize: "0.8em", borderBottom: "1px solid #333333", paddingBottom: "4px", marginBottom: "6px" }}>
                BOOKIES&apos; PICKS
              </div>
              {displaySpecials.length === 0 ? (
                <p style={{ color: "#ffffff", opacity: 0.6, fontSize: "0.9em" }}>
                  BOOKIE ON HOLIDAY
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {displaySpecials.map((s) => (
                    <ChalkLine
                      key={s.id}
                      payoutGbp={s.payoutGbp}
                      label={s.label.toUpperCase()}
                      status={s.status}
                      claimedByDisplayName={
                        s.ownerParticipantId
                          ? ownerNames.get(s.ownerParticipantId)
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              <div style={{ color: "#FFFF00", fontSize: "0.8em", marginTop: "10px", borderTop: "1px solid #333333", paddingTop: "6px" }}>
                PRESS 300 FOR MY TEAMS
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />

      <style>{`
        @media (max-width: 700px) {
          .teletext-grid {
            grid-template-columns: 1fr !important;
          }
          .teletext-grid > section:first-child {
            border-right: none !important;
            border-bottom: 2px solid #0000FF;
          }
        }
      `}</style>
    </div>
  );
}
