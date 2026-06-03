import {
  getAllocation,
  getParticipants,
  getSpecials,
  getPotPaidBy,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCacheAge } from "@/lib/openfootball";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
import {
  reallocateAction,
  togglePaidAction,
  refreshOpenfootballAction,
  verifyAdminPinAction,
  addParticipantAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  if (!session.adminVerified) {
    return (
      <div className="flex-1 flex flex-col">
        <MastheadBar signedInAs="ADMIN" />
        <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-16">
          <Frame variant="primary" className="p-8 sm:p-10 bg-cream">
            <Stamp tone="scarlet">RESTRICTED</Stamp>
            <h1 className="mt-4 font-display text-3xl text-ink">
              ADMIN ACCESS
            </h1>
            <p className="mt-3 font-mono text-sm text-ink/70">
              Enter the admin PIN to continue.
            </p>
            <form action={verifyAdminPinAction} className="mt-6 flex flex-col gap-4">
              <label className="block">
                <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                  PIN
                </span>
                <input
                  name="pin"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 bg-cream border border-ink font-mono"
                />
              </label>
              <button
                type="submit"
                className="px-4 py-3 bg-scarlet text-cream font-display tracking-widest"
              >
                ENTER
              </button>
            </form>
          </Frame>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [participants, allocation, specials, paidBy, cacheInfo] =
    await Promise.all([
      getParticipants(),
      getAllocation(),
      getSpecials(),
      getPotPaidBy(),
      getCacheAge(),
    ]);

  const bst = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });

  const cacheAgeLabel = cacheInfo.fetchedAt
    ? `Last refresh: ${bst(cacheInfo.fetchedAt)} BST`
    : "Never refreshed — no openfootball data cached yet.";

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs="ADMIN" />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-5 lg:grid-cols-2">

        {/* ── Add Participant ─────────────────────────────────────────── */}
        <Frame variant="primary" className="p-6 sm:p-8 bg-cream lg:col-span-2">
          <Stamp tone="cobalt">THE PLAYERS</Stamp>
          <h2 className="font-display text-2xl mt-3">ADD PARTICIPANT</h2>
          <p className="font-mono text-sm text-ink/70 mt-2">
            Creates a new account. Share the username and password directly.
          </p>
          <form action={addParticipantAction} className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <label className="block flex-1 min-w-0">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                USERNAME
              </span>
              <input
                name="username"
                type="text"
                required
                placeholder="e.g. NAT"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
              />
            </label>
            <label className="block flex-1 min-w-0">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                PASSWORD
              </span>
              <input
                name="password"
                type="text"
                required
                placeholder="word-word-word"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
              />
            </label>
            <button
              type="submit"
              className="shrink-0 px-4 py-3 bg-cobalt text-cream font-display tracking-widest"
            >
              ADD
            </button>
          </form>
          {participants.length > 0 && (
            <ul className="mt-4 divide-y divide-ink/10">
              {participants.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between font-mono text-sm gap-2">
                  <span className="truncate">{p.displayName}</span>
                  <span className="shrink-0 text-ink/40 text-xs">
                    {p.spectator ? "SPECTATOR" : "PLAYER"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Frame>

        {/* ── Refresh ─────────────────────────────────────────────────── */}
        <Frame variant="primary" className="p-6 sm:p-8 bg-cream">
          <Stamp tone="cobalt">THE WIRE</Stamp>
          <h2 className="font-display text-2xl mt-3">REFRESH OPENFOOTBALL</h2>
          <p className="font-mono text-sm text-ink/70 mt-2 break-words">{cacheAgeLabel}</p>
          <form action={refreshOpenfootballAction} className="mt-4">
            <button
              type="submit"
              className="px-4 py-3 bg-cobalt text-cream font-display tracking-widest"
            >
              REFRESH FROM OPENFOOTBALL
            </button>
          </form>
        </Frame>

        {/* ── Draw ────────────────────────────────────────────────────── */}
        <Frame variant="primary" className="p-6 sm:p-8 bg-cream">
          <Stamp tone="scarlet">THE DRAW</Stamp>
          <h2 className="font-display text-2xl mt-3">ALLOCATION OVERRIDE</h2>
          <p className="font-mono text-sm text-ink/70 mt-2 break-all">
            {allocation
              ? `Last drawn: ${bst(allocation.allocatedAt)} BST`
              : "Allocation has not yet run."}
          </p>
          {allocation && (
            <p className="font-mono text-xs text-ink/40 mt-1 break-all">
              seed: {allocation.seed}
            </p>
          )}
          <form action={reallocateAction} className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <label className="block flex-1 min-w-0">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                SEED (LEAVE BLANK FOR RANDOM)
              </span>
              <input
                name="seed"
                type="text"
                placeholder="optional"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
              />
            </label>
            <button
              type="submit"
              className="shrink-0 px-4 py-3 bg-scarlet text-cream font-display tracking-widest"
            >
              RE-ROLL THE DRAW
            </button>
          </form>
        </Frame>

        {/* ── Paid-in Ledger ──────────────────────────────────────────── */}
        <Frame variant="primary" className="p-6 sm:p-8 bg-cream">
          <Stamp tone="cobalt">THE POT</Stamp>
          <h2 className="font-display text-2xl mt-3">PAID-IN LEDGER</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {participants.map((p) => {
              const paid = paidBy.includes(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between border-b border-ink/10 py-2 gap-2"
                >
                  <span className="font-mono text-sm truncate">{p.displayName}</span>
                  <form action={togglePaidAction} className="shrink-0">
                    <input type="hidden" name="participantId" value={p.id} />
                    <button
                      type="submit"
                      className={`stamp ${paid ? "text-cobalt border-cobalt" : "text-ink/40 border-ink/30"}`}
                    >
                      {paid ? "PAID" : "PAY"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Frame>

        {/* ── Specials ────────────────────────────────────────────────── */}
        <Frame variant="primary" className="p-6 sm:p-8 bg-cream">
          <Stamp tone="sepia-dark">THE BOOKIE</Stamp>
          <h2 className="font-display text-2xl mt-3">SPECIALS</h2>
          <ul className="mt-4 divide-y divide-ink/10">
            {specials.length === 0 ? (
              <li className="font-mono text-sm italic text-ink/60 py-2">
                No specials yet — hit REFRESH FROM OPENFOOTBALL to seed them.
              </li>
            ) : (
              specials.map((s) => (
                <li key={s.id} className="py-3 font-mono text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex-1 min-w-0">
                      <span className="text-scarlet">£{s.payoutGbp}</span>
                      {" — "}
                      {s.label}
                    </span>
                    <span className="shrink-0 uppercase tracking-widest text-ink/50 text-xs pt-0.5">
                      {s.status}
                    </span>
                  </div>
                  {s.ownerParticipantId && (
                    <p className="text-xs text-ink/40 mt-1">
                      owner set
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        </Frame>

      </main>
      <SiteFooter />
    </div>
  );
}
