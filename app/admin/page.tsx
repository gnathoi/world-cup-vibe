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
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  if (!session.adminVerified) {
    return (
      <div className="flex-1 flex flex-col">
        <MastheadBar signedInAs="ADMIN" />
        <main className="flex-1 w-full max-w-xl mx-auto px-6 py-16">
          <Frame variant="primary" className="p-8 bg-cream">
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

  const cacheAgeLabel = cacheInfo.fetchedAt
    ? `Last refresh: ${new Date(cacheInfo.fetchedAt).toLocaleString()}`
    : "Never refreshed — no openfootball data cached yet.";

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs="ADMIN" />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 grid gap-6">
        <Frame variant="primary" className="p-6 bg-cream">
          <Stamp tone="scarlet">THE DRAW</Stamp>
          <h2 className="font-display text-2xl mt-3">ALLOCATION OVERRIDE</h2>
          <p className="font-mono text-sm text-ink/70 mt-2">
            {allocation
              ? `Last drawn: ${new Date(allocation.allocatedAt).toLocaleString()} — seed: ${allocation.seed}`
              : "Allocation has not yet run."}
          </p>
          <form action={reallocateAction} className="mt-5 flex gap-3 items-end">
            <label className="block flex-1">
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
              className="px-4 py-3 bg-scarlet text-cream font-display tracking-widest"
            >
              RE-ROLL THE DRAW
            </button>
          </form>
        </Frame>

        <Frame variant="primary" className="p-6 bg-cream">
          <Stamp tone="cobalt">THE WIRE</Stamp>
          <h2 className="font-display text-2xl mt-3">REFRESH OPENFOOTBALL</h2>
          <p className="font-mono text-sm text-ink/70 mt-2">{cacheAgeLabel}</p>
          <form action={refreshOpenfootballAction} className="mt-5">
            <button
              type="submit"
              className="px-4 py-3 bg-cobalt text-cream font-display tracking-widest"
            >
              REFRESH FROM OPENFOOTBALL
            </button>
          </form>
        </Frame>

        <Frame variant="primary" className="p-6 bg-cream">
          <Stamp tone="cobalt">THE POT</Stamp>
          <h2 className="font-display text-2xl mt-3">PAID-IN LEDGER</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {participants.map((p) => {
              const paid = paidBy.includes(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between border-b border-ink/10 py-2"
                >
                  <span className="font-mono text-sm">{p.displayName}</span>
                  <form action={togglePaidAction}>
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

        <Frame variant="primary" className="p-6 bg-cream">
          <Stamp tone="sepia-dark">THE BOOKIE</Stamp>
          <h2 className="font-display text-2xl mt-3">SPECIALS LIST</h2>
          <p className="font-mono text-xs text-ink/60 mt-1">
            Specials are admin-editable until allocation locks. (Editor UI v2.)
          </p>
          <ul className="mt-4">
            {specials.length === 0 ? (
              <li className="font-mono text-sm italic text-ink/60">
                No specials curated yet. Run RE-ROLL THE DRAW to seed them.
              </li>
            ) : (
              specials.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between border-b border-ink/10 py-2 font-mono text-sm"
                >
                  <span>
                    £{s.payoutGbp} — {s.label}
                  </span>
                  <span className="uppercase tracking-widest text-ink/60">
                    {s.status}
                  </span>
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
