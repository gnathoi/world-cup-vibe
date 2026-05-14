import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
import { signInAction } from "./actions";

export default async function SignInPage() {
  const me = await getCurrentParticipant();
  if (me) redirect("/me");

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar />
      <main className="flex-1 w-full max-w-xl mx-auto px-6 py-16">
        <Frame variant="primary" className="p-8 bg-cream">
          <Stamp tone="cobalt">JOIN THE WIRE</Stamp>
          <h1 className="mt-4 font-display text-4xl text-ink leading-tight">
            JOIN THE 2026 SWEEPSTAKE
          </h1>
          <p className="mt-4 font-mono text-sm text-ink/80">
            Enter an email and a display name. No password. No verification.
            For friends, for the love of the game.
          </p>
          <form action={signInAction} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                DISPLAY NAME
              </span>
              <input
                name="displayName"
                type="text"
                required
                maxLength={40}
                placeholder="e.g. NAT"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
              />
            </label>
            <label className="block">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                EMAIL
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
              />
            </label>
            <button
              type="submit"
              className="mt-2 px-4 py-3 bg-scarlet text-cream font-display tracking-widest"
            >
              SIGN IN
            </button>
          </form>
        </Frame>
      </main>
      <SiteFooter />
    </div>
  );
}
