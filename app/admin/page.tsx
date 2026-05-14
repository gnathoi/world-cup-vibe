import { cookies } from "next/headers";
import {
  getAllocation,
  getParticipants,
  getSpecials,
  getPotPaidBy,
} from "@/lib/db";
import MastheadBar from "@/components/MastheadBar";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
import { reallocateAction, togglePaidAction } from "./actions";

const ADMIN_COOKIE = "goal-1966-admin";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === "ok";
}

async function adminLoginAction(formData: FormData) {
  "use server";
  const submitted = String(formData.get("password") ?? "");
  if (submitted && submitted === process.env.ADMIN_PASSWORD) {
    const store = await cookies();
    store.set(ADMIN_COOKIE, "ok", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    throw new Error("Wrong password.");
  }
}

export default async function AdminPage() {
  const authed = await isAdmin();

  if (!authed) {
    return (
      <div className="flex-1">
        <MastheadBar />
        <main className="max-w-md mx-auto px-6 py-16">
          <Frame variant="primary" className="p-6 bg-cream">
            <Stamp tone="scarlet">ADMIN</Stamp>
            <h1 className="mt-3 font-display text-3xl">THE BOOKMAKER&apos;S OFFICE</h1>
            <form action={adminLoginAction} className="mt-5 flex flex-col gap-3">
              <input
                name="password"
                type="password"
                placeholder="PASSWORD"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
                required
              />
              <button
                type="submit"
                className="px-4 py-3 bg-scarlet text-cream font-display tracking-widest"
              >
                ENTER
              </button>
            </form>
          </Frame>
        </main>
      </div>
    );
  }

  const [participants, allocation, specials, paidBy] = await Promise.all([
    getParticipants(),
    getAllocation(),
    getSpecials(),
    getPotPaidBy(),
  ]);

  return (
    <div className="flex-1">
      <MastheadBar signedInAs="ADMIN" />
      <main className="max-w-5xl mx-auto px-6 py-10 grid gap-6">
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
                No specials curated yet.
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
    </div>
  );
}

