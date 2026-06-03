import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import Frame from "@/components/Frame";
import Stamp from "@/components/Stamp";
import { signInAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const me = await getCurrentParticipant();
  if (me) redirect("/me");

  const { error } = await searchParams;

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar />
      <main className="flex-1 w-full max-w-xl mx-auto px-6 py-16">
        <Frame variant="primary" className="p-8 bg-cream">
          <Stamp tone="cobalt">MEMBERS ONLY</Stamp>
          <h1 className="mt-4 font-display text-4xl text-ink leading-tight">
            MAKE AMERICA GOAL AGAIN
          </h1>
          <p className="mt-4 font-mono text-sm text-ink/80">
            Sign in with the username and password sent to you.
          </p>
          {error && (
            <p className="mt-3 font-mono text-sm text-scarlet">
              Invalid username or password.
            </p>
          )}
          <form action={signInAction} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                USERNAME
              </span>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                className="w-full px-3 py-2 bg-cream border border-ink font-mono"
              />
            </label>
            <label className="block">
              <span className="block font-mono text-xs tracking-widest text-ink/70 mb-1">
                PASSWORD
              </span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
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
