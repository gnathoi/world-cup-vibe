import { redirect } from "next/navigation";
import { getMatches } from "@/lib/openfootball";
import { getCurrentParticipant } from "@/lib/auth";
import { flag } from "@/lib/flags";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
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
  return new Date(utc).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  });
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

  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-ink/10 last:border-0 font-mono text-sm ${
        played ? "" : "text-ink/70"
      }`}
    >
      {/* Kickoff / round label */}
      <span className="w-12 shrink-0 text-xs text-ink/50 tabular-nums">
        {formatKickoff(m.kickoffUtc)}
      </span>

      {/* Home */}
      <span className="flex items-center gap-1.5 flex-1 justify-end">
        <span className="font-display text-base hidden sm:block">{m.home.name}</span>
        <span className="font-display text-base sm:hidden">{m.home.code}</span>
        <span className="text-xl">{flag(m.home.code)}</span>
      </span>

      {/* Score or vs */}
      <span className="shrink-0 w-16 text-center font-display text-xl tabular-nums">
        {played ? (
          <span className={isLive ? "text-scarlet" : ""}>
            {m.score!.home} – {m.score!.away}
          </span>
        ) : (
          <span className="text-ink/30 text-sm">vs</span>
        )}
      </span>

      {/* Away */}
      <span className="flex items-center gap-1.5 flex-1">
        <span className="text-xl">{flag(m.away.code)}</span>
        <span className="font-display text-base hidden sm:block">{m.away.name}</span>
        <span className="font-display text-base sm:hidden">{m.away.code}</span>
      </span>

      {/* Status stamp — hidden on mobile to avoid overflow */}
      <span className="shrink-0 hidden sm:block">
        {isLive ? (
          <Stamp tone="scarlet">LIVE</Stamp>
        ) : m.status === "pen" ? (
          <Stamp tone="sepia-dark">PENS</Stamp>
        ) : m.status === "ap" ? (
          <Stamp tone="sepia-dark">AET</Stamp>
        ) : played ? (
          <Stamp tone="cobalt">FT</Stamp>
        ) : null}
      </span>
    </div>
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

  // Current / next round for the heading
  const currentRound = (() => {
    const live = matches.find((m) => m.status === "live");
    if (live) return ROUND_LABELS[live.round];
    const next = upcoming[0];
    if (next) return ROUND_LABELS[next.round];
    if (played.length > 0)
      return ROUND_LABELS[played[played.length - 1].round];
    return "ALL FIXTURES";
  })();

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me?.displayName ?? null} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <h1 className="font-display text-4xl">THE FIXTURE LIST</h1>
            <p className="font-mono text-sm text-ink/60 mt-1">
              {played.length} played · {upcoming.length} remaining ·{" "}
              {currentRound}
            </p>
          </div>
        </header>

        <div className="space-y-8">
          {days.map(([day, dayMatches]) => {
            // Group this day's matches by round
            const rounds = new Map<string, Match[]>();
            for (const m of dayMatches) {
              const label = ROUND_LABELS[m.round];
              if (!rounds.has(label)) rounds.set(label, []);
              rounds.get(label)!.push(m);
            }

            return (
              <section key={day}>
                <h2 className="font-display text-xl mb-3 pb-1 border-b-2 border-ink">
                  {formatDate(dayMatches[0].kickoffUtc).toUpperCase()}
                </h2>
                <div className="space-y-4">
                  {Array.from(rounds.entries()).map(([roundLabel, roundMatches]) => (
                    <Frame key={roundLabel} variant="secondary" className="bg-cream">
                      <div className="px-4 pt-3 pb-1">
                        <span className="font-mono text-xs tracking-widest text-ink/50">
                          {roundLabel}
                        </span>
                      </div>
                      <div className="px-4 pb-2">
                        {roundMatches.map((m) => (
                          <MatchRow key={m.id} m={m} />
                        ))}
                      </div>
                    </Frame>
                  ))}
                </div>
              </section>
            );
          })}

          {matches.length === 0 && (
            <Frame variant="primary" className="p-8 bg-cream text-center">
              <p className="font-display text-xl">
                NO FIXTURE DATA YET.
              </p>
              <p className="font-mono text-sm text-ink/60 mt-2">
                Fixtures will appear once the openfootball feed is refreshed.
              </p>
            </Frame>
          )}
        </div>
      </main>

      <SiteFooter showAdminLink />
    </div>
  );
}
