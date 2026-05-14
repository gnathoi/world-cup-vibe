import { getAllocation, getParticipants, getSpecials } from "@/lib/db";
import MastheadBar from "@/components/MastheadBar";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
import { getCurrentParticipant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CeremonyPage() {
  const [me, allocation, participants, specials] = await Promise.all([
    getCurrentParticipant(),
    getAllocation(),
    getParticipants(),
    getSpecials(),
  ]);

  const idToName = new Map(participants.map((p) => [p.id, p.displayName]));

  return (
    <div className="flex-1">
      <MastheadBar signedInAs={me?.displayName ?? null} />

      {!allocation ? (
        <section className="bg-ink text-cream flex-1 flex flex-col items-center justify-center py-32 px-6 text-center">
          <Stamp tone="cream" className="border-cream/60">
            THE CEREMONY OF 2026
          </Stamp>
          <h1 className="mt-6 font-display text-5xl tracking-tight">
            DOORS OPEN AT MIDNIGHT.
          </h1>
          <p className="mt-4 font-mono text-sm text-cream/70 max-w-md">
            The draw runs at 2026-06-11 00:00 UTC. Until then, this page sits in
            silence. The clock ticks alone.
          </p>
        </section>
      ) : (
        <main className="max-w-5xl mx-auto px-6 py-10">
          <header className="mb-8 text-center">
            <Stamp tone="cobalt">THE LEDGER STANDS</Stamp>
            <h1 className="mt-3 font-display text-5xl">
              THE CEREMONY OF 2026 — FINAL LEDGER
            </h1>
            <p className="mt-2 font-mono text-sm text-ink/60">
              Drawn {new Date(allocation.allocatedAt).toLocaleString()} — seed{" "}
              <code>{allocation.seed}</code>
            </p>
          </header>

          <section className="mb-10">
            <h2 className="font-display text-2xl mb-4">ACT 1 — THE TEAMS</h2>
            <Frame variant="primary" className="bg-cream">
              <ul>
                {allocation.byParticipant.map((row) => (
                  <li
                    key={row.participantId}
                    className="grid grid-cols-[1fr_auto] gap-4 items-baseline px-5 py-3 border-b border-ink/10 last:border-b-0"
                  >
                    <span className="font-display text-2xl">
                      {idToName.get(row.participantId) ?? "?"}
                    </span>
                    <span className="font-mono text-sm tracking-widest text-ink/80">
                      {row.teamCodes.join("  ")}{" "}
                      <span className="text-ink/50">
                        ({row.teamCodes.length} teams)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Frame>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-4">
              ACT 2 — THE BOOKIES&apos; SPECIALS
            </h2>
            <Frame variant="chalkboard" className="p-6">
              <ul>
                {specials.map((s) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-[4rem_1fr_auto] items-baseline gap-4 py-3 border-b border-cream/15 last:border-b-0"
                  >
                    <span className="font-display text-xl text-sepia tabular-nums">
                      £{s.payoutGbp}
                    </span>
                    <span className="font-display text-base text-cream leading-tight">
                      {s.label.toUpperCase()}
                    </span>
                    <span className="stamp text-cream border-cream/40">
                      → {s.ownerParticipantId
                        ? (idToName.get(s.ownerParticipantId) ?? "?")
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </Frame>
          </section>
        </main>
      )}
    </div>
  );
}
