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
import Frame from "@/components/Frame";
import RankedRow from "@/components/RankedRow";
import ChalkLine from "@/components/ChalkLine";
import Stamp from "@/components/Stamp";

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
  const matchDay = ref?.matchDay ? `MATCH DAY ${ref.matchDay}` : "PRE-TOURNAMENT";

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
  const [me, participants, allocation, specials, matches, woodenSpoonWinnerId] =
    await Promise.all([
      getCurrentParticipant(),
      getParticipants(),
      getAllocation(),
      getSpecials(),
      getMatches(),
      getWoodenSpoonWinner(),
    ]);

  const standings = computeStandings(participants, allocation, matches);
  const potGbp = computePotGbp(participants.length);

  // Fall back to defaults when no draw has run yet so the chalkboard
  // always shows the bets, not "bookie is on holiday".
  const displaySpecials =
    specials.length > 0
      ? specials
      : DEFAULT_SPECIALS.map((s) => ({
          ...s,
          ownerParticipantId: null as string | null,
          status: "pending" as const,
        }));
  const heroInfo = formatMatchDayLabel(matches);
  const stale = false; // stale notice lives on /admin, not the homepage

  const ownerNames = new Map(
    participants.map((p) => [p.id, p.displayName] as const),
  );

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me?.displayName ?? null} />
      <HeroStrip
        matchDayLabel={heroInfo.label}
        stage={heroInfo.stage}
        matchesPlayed={heroInfo.played}
        matchesRemaining={heroInfo.remaining}
        potGbp={potGbp}
        stale={stale}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* THE STANDINGS */}
        <section>
          <h2 className="font-display text-3xl mb-4">THE STANDINGS</h2>
          {standings.length === 0 ? (
            <Frame variant="primary" className="p-6 bg-cream">
              <p className="font-display text-lg">
                THE DRAW IS NOT YET DRAWN.
              </p>
              <p className="font-mono text-sm text-ink/70 mt-2">
                Sign up before midnight on 11 June to be included.
              </p>
              {!me && (
                <a
                  href="/signin"
                  className="mt-5 inline-block px-4 py-2 bg-scarlet text-cream font-display tracking-widest"
                >
                  JOIN THE SWEEPSTAKE
                </a>
              )}
            </Frame>
          ) : (
            <ol className="space-y-3">
              {standings.slice(0, 8).map((row, i) => (
                <Frame
                  key={row.participantId}
                  variant={i === 0 ? "primary" : "secondary"}
                  className="bg-cream"
                >
                  <div className="relative">
                    {row.participantId === woodenSpoonWinnerId && (
                      <div className="absolute top-2 right-2">
                        <Stamp tone="sepia-dark">WOODEN SPOON £20</Stamp>
                      </div>
                    )}
                    <RankedRow
                      rank={i + 1}
                      displayName={row.displayName}
                      points={row.points}
                      teamCodes={row.teamCodes}
                      status={row.stillIn ? "still-in" : "eliminated"}
                      isYou={me?.id === row.participantId}
                      isLeader={i === 0}
                    />
                  </div>
                </Frame>
              ))}
            </ol>
          )}
        </section>

        {/* BOOKIES' SPECIALS */}
        <section>
          <h2 className="font-display text-3xl mb-1">THE BOOKIES&apos; SPECIALS</h2>
          <p className="font-mono italic text-xs text-ink/70 mb-3">
            side wagers on unlikely events
          </p>
          <Frame variant="chalkboard" className="p-5">
            {displaySpecials.length === 0 ? (
              <p className="font-display text-cream/80">
                THE BOOKIE IS ON HOLIDAY. NO SPECIALS THIS TOURNAMENT.
              </p>
            ) : (
              <ul>
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
          </Frame>
          {!me && (
            <div className="mt-4">
              <Frame variant="primary" className="p-5 bg-cream text-center">
                <Stamp tone="cobalt">FOR FRIENDS</Stamp>
                <h3 className="mt-3 font-display text-xl leading-tight">
                  MAKE AMERICA GOAL AGAIN
                </h3>
                <a
                  href="/signin"
                  className="mt-4 inline-block px-4 py-2 bg-scarlet text-cream font-display tracking-widest"
                >
                  SIGN IN
                </a>
              </Frame>
            </div>
          )}
        </section>
      </main>

      <SiteFooter showAdminLink />
    </div>
  );
}
