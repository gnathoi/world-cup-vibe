import { redirect } from "next/navigation";
import { getMatches } from "@/lib/openfootball";
import { getCurrentParticipant } from "@/lib/auth";
import { flag } from "@/lib/flags";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROUND_LABELS: Record<Match["round"], string> = {
  group: "GROUP STAGE",
  round_of_32: "ROUND OF 32",
  round_of_16: "ROUND OF 16",
  quarter: "QUARTER-FINALS",
  semi: "SEMI-FINALS",
  third_place: "THIRD PLACE",
  final: "THE FINAL",
};

function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function formatDate(utc: string): string {
  return new Date(utc)
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/London",
    })
    .toUpperCase();
}

function groupByDate(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const day = new Date(m.kickoffUtc).toLocaleDateString("en-GB", {
      timeZone: "Europe/London",
    });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(m);
  }
  return Array.from(map.entries());
}

function MatchRow({ m }: { m: Match }) {
  const played = !!m.score;
  const isLive = m.status === "live";
  const isPens = m.status === "pen";
  const isAet = m.status === "ap";

  return (
    <tr style={{ borderBottom: "1px solid #222222" }}>
      <td style={{ color: "#00FFFF", padding: "4px 8px", fontSize: "0.85em", whiteSpace: "nowrap" }}>
        {formatKickoff(m.kickoffUtc)}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: "#ffffff", fontSize: "0.95em", whiteSpace: "nowrap" }}>
        {flag(m.home.code)} {m.home.code}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "center", minWidth: "60px", fontSize: "1.1em", whiteSpace: "nowrap" }}>
        {played ? (
          <span style={{ color: isLive ? "#FF0000" : "#FFFF00" }}>
            {m.score!.home}–{m.score!.away}
          </span>
        ) : (
          <span style={{ color: "#333333" }}>vs</span>
        )}
      </td>
      <td style={{ padding: "4px 6px", color: "#ffffff", fontSize: "0.95em", whiteSpace: "nowrap" }}>
        {m.away.code} {flag(m.away.code)}
      </td>
      <td style={{ padding: "4px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
        {isLive ? (
          <span className="tt-badge tt-badge-red tt-flash">LIVE</span>
        ) : isPens ? (
          <span className="tt-badge tt-badge-yellow">PENS</span>
        ) : isAet ? (
          <span className="tt-badge tt-badge-yellow">AET</span>
        ) : played ? (
          <span className="tt-badge tt-badge-cyan">FT</span>
        ) : null}
      </td>
    </tr>
  );
}

export default async function SchedulePage() {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const matches = await getMatches();

  const now = new Date().toISOString();
  const upcoming = matches.filter((m) => !m.score && m.kickoffUtc >= now);
  const played = matches.filter((m) => !!m.score);

  const days = groupByDate(matches);

  const currentRound = (() => {
    const live = matches.find((m) => m.status === "live");
    if (live) return ROUND_LABELS[live.round];
    const next = upcoming[0];
    if (next) return ROUND_LABELS[next.round];
    if (played.length > 0) return ROUND_LABELS[played[played.length - 1].round];
    return "ALL FIXTURES";
  })();

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me?.displayName ?? null} pageNum="P200" />

      <section
        style={{
          background: "#000000",
          borderBottom: "2px solid #FF00FF",
          padding: "8px 12px",
        }}
      >
        <div style={{ color: "#00FF00", fontSize: "1.4em" }}>THE FIXTURE LIST</div>
        <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "2px" }}>
          {played.length} PLAYED · {upcoming.length} REMAINING · {currentRound}
        </div>
      </section>

      <main style={{ flex: 1, padding: "0 0 16px" }}>
        {days.length === 0 && (
          <div style={{ padding: "20px 12px" }}>
            <div style={{ border: "2px solid #FFFF00", padding: "16px", color: "#FFFF00" }}>
              NO FIXTURE DATA YET
              <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "6px" }}>
                AWAITING OPENFOOTBALL FEED
              </div>
            </div>
          </div>
        )}

        {days.map(([day, dayMatches]) => {
          const rounds = new Map<string, Match[]>();
          for (const m of dayMatches) {
            const label = ROUND_LABELS[m.round];
            if (!rounds.has(label)) rounds.set(label, []);
            rounds.get(label)!.push(m);
          }

          return (
            <section key={day} style={{ marginBottom: "0" }}>
              <div
                style={{
                  background: "#0000FF",
                  color: "#ffffff",
                  padding: "4px 12px",
                  fontSize: "1em",
                  borderTop: "1px solid #00FFFF",
                }}
              >
                {formatDate(dayMatches[0].kickoffUtc)}
              </div>
              {Array.from(rounds.entries()).map(([roundLabel, roundMatches]) => (
                <div key={roundLabel}>
                  <div
                    style={{
                      background: "#000000",
                      color: "#FF00FF",
                      padding: "3px 12px",
                      fontSize: "0.85em",
                      borderBottom: "1px solid #FF00FF",
                    }}
                  >
                    {roundLabel}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {roundMatches.map((m) => (
                        <MatchRow key={m.id} m={m} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          );
        })}
      </main>

      <SiteFooter showAdminLink />
    </div>
  );
}
