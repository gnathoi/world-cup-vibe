import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import {
  getAllocation,
  getParticipants,
  getSpecials,
  getPotPaidBy,
} from "@/lib/db";
import { getMatches } from "@/lib/openfootball";
import { computeStandings, computePotGbp } from "@/lib/leaderboard";
import { TEAMS_2026 } from "@/lib/teams";
import MastheadBar from "@/components/MastheadBar";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
import TeamCard from "@/components/TeamCard";
import ChalkLine from "@/components/ChalkLine";

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
    label: `${h}h ${m}m`,
    matchLabel: `${next.home.code} vs ${next.away.code}`,
  };
}

export default async function MePage() {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const [participants, allocation, specials, paidBy, matches] = await Promise.all([
    getParticipants(),
    getAllocation(),
    getSpecials(),
    getPotPaidBy(),
    getMatches(),
  ]);

  const standings = computeStandings(participants, allocation, matches);
  const myRow = standings.find((r) => r.participantId === me.id);
  const myRank = standings.findIndex((r) => r.participantId === me.id) + 1;
  const potGbp = computePotGbp(paidBy.length);
  const countdown = countdownToNext(matches);
  const mySpecials = specials.filter((s) => s.ownerParticipantId === me.id);

  const myTeamCodes = myRow?.teamCodes ?? [];

  const teamRows = myTeamCodes.map((code) => {
    const team =
      TEAMS_2026.find((t) => t.code === code) ?? { code, name: code };
    let w = 0;
    let d = 0;
    let l = 0;
    let stillIn = true;
    let nextOpponent: string | undefined;
    let nextLabel: string | undefined;

    for (const m of matches) {
      const isHome = m.home.code === code;
      const isAway = m.away.code === code;
      if (!isHome && !isAway) continue;
      if (m.score) {
        const my = isHome ? m.score.home : m.score.away;
        const opp = isHome ? m.score.away : m.score.home;
        if (my > opp) w++;
        else if (my < opp) {
          l++;
          if (m.round !== "group") stillIn = false;
        } else d++;
      } else if (!nextOpponent) {
        nextOpponent = isHome ? m.away.code : m.home.code;
        const kd = new Date(m.kickoffUtc);
        nextLabel = kd.toLocaleString("en-GB", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    return {
      code,
      name: team.name,
      record: { w, d, l },
      status: stillIn ? ("still-in" as const) : ("eliminated" as const),
      nextOpponentCode: nextOpponent,
      nextKickoffLocalLabel: nextLabel,
    };
  });

  return (
    <div className="flex-1">
      <MastheadBar signedInAs={me.displayName} />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-4xl">
            {me.displayName.toUpperCase()}&apos;S TEAMS
          </h1>
          <div className="flex items-center gap-4">
            <Stamp tone="cobalt">
              NEXT MATCH IN {countdown.label}
              {countdown.matchLabel ? ` — ${countdown.matchLabel}` : ""}
            </Stamp>
          </div>
        </header>

        <Frame variant="secondary" className="p-4 mb-8 bg-cream">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-sm">
            <div>
              <p className="text-ink/60 uppercase tracking-widest text-[10px]">
                STANDING
              </p>
              <p className="font-display text-2xl text-ink">
                {myRank > 0 ? `${myRank} of ${participants.length}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-ink/60 uppercase tracking-widest text-[10px]">
                POINTS
              </p>
              <p className="font-display text-2xl text-ink">
                {myRow?.points ?? 0}
              </p>
            </div>
            <div>
              <p className="text-ink/60 uppercase tracking-widest text-[10px]">
                POT
              </p>
              <p className="font-display text-2xl text-scarlet">£{potGbp}</p>
            </div>
            <div>
              <p className="text-ink/60 uppercase tracking-widest text-[10px]">
                SPECIALS
              </p>
              <p className="font-display text-2xl text-ink">
                {mySpecials.length}
              </p>
            </div>
          </div>
        </Frame>

        {me.spectator ? (
          <Frame variant="primary" className="p-6 bg-cream mb-8">
            <p className="font-display text-xl">
              YOU JOINED AFTER THE DRAW.
            </p>
            <p className="font-mono text-sm text-ink/80 mt-2">
              You can still post to the wire and (when they open) play the
              predictions side game.
            </p>
          </Frame>
        ) : teamRows.length === 0 ? (
          <Frame variant="primary" className="p-6 bg-cream mb-8">
            <p className="font-display text-xl">
              THE DRAW IS NOT YET DRAWN.
            </p>
            <p className="font-mono text-sm text-ink/80 mt-2">
              Return at midnight on the day before the first match.
            </p>
          </Frame>
        ) : (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {teamRows.map((t) => (
              <Frame key={t.code} variant="primary">
                <TeamCard
                  code={t.code}
                  name={t.name}
                  record={t.record}
                  status={t.status}
                  nextOpponentCode={t.nextOpponentCode}
                  nextKickoffLocalLabel={t.nextKickoffLocalLabel}
                />
              </Frame>
            ))}
          </section>
        )}

        {mySpecials.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl mb-3">
              YOUR BOOKIES&apos; SPECIALS
            </h2>
            <Frame variant="chalkboard" className="p-5">
              <ul>
                {mySpecials.map((s) => (
                  <ChalkLine
                    key={s.id}
                    payoutGbp={s.payoutGbp}
                    label={s.label.toUpperCase()}
                    status={s.status}
                  />
                ))}
              </ul>
            </Frame>
          </section>
        ) : null}
      </main>
    </div>
  );
}
