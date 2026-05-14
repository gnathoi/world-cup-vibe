"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  startDemoAction,
  tickDemoAction,
  resetDemoAction,
} from "./actions";

type Status = {
  participants: number;
  matchesPlayed: number;
  totalMatches: number;
  specialsClaimed: number;
};

type Props = {
  initial: Status;
};

const TICK_INTERVAL_MS = 3000;

export default function DemoControls({ initial }: Props) {
  const [status, setStatus] = useState<Status>(initial);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance loop.
  useEffect(() => {
    if (!running) {
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      return;
    }
    const id = setInterval(async () => {
      try {
        const r = await tickDemoAction();
        setStatus((s) => ({
          ...s,
          matchesPlayed: r.matchesPlayed,
          totalMatches: r.totalMatches,
        }));
        if (r.scoreLine) setLastEvent(r.scoreLine);
        if (r.done) {
          setRunning(false);
          setLastEvent("TOURNAMENT COMPLETE");
        }
      } catch (e) {
        setError((e as Error).message);
        setRunning(false);
      }
    }, TICK_INTERVAL_MS);
    tickerRef.current = id;
    return () => clearInterval(id);
  }, [running]);

  const progress =
    status.totalMatches > 0
      ? Math.round((status.matchesPlayed / status.totalMatches) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-4 gap-3 font-mono text-sm">
        <Stat label="PARTICIPANTS" value={String(status.participants)} />
        <Stat
          label="MATCHES"
          value={`${status.matchesPlayed} / ${status.totalMatches}`}
        />
        <Stat label="SPECIALS CLAIMED" value={String(status.specialsClaimed)} />
        <Stat
          label="STATUS"
          value={
            running
              ? "RUNNING"
              : status.matchesPlayed === 0
                ? "IDLE"
                : status.matchesPlayed === status.totalMatches
                  ? "DONE"
                  : "PAUSED"
          }
        />
      </div>

      <div className="border border-ink h-3 bg-cream relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-scarlet"
          style={{ width: `${progress}%` }}
        />
      </div>

      {lastEvent ? (
        <p className="font-mono text-sm">
          <span className="stamp text-cobalt border-cobalt mr-2">LATEST</span>
          {lastEvent}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="font-mono text-sm text-scarlet">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setLastEvent(null);
              try {
                await startDemoAction();
                setStatus({
                  participants: 12,
                  matchesPlayed: 0,
                  totalMatches: 104,
                  specialsClaimed: 0,
                });
                setRunning(true);
              } catch (e) {
                setError((e as Error).message);
              }
            })
          }
          disabled={pending || running}
          className="px-4 py-3 bg-scarlet text-cream font-display tracking-widest disabled:opacity-50"
        >
          {pending ? "STARTING..." : "START NEW DEMO"}
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          disabled={
            pending ||
            (status.matchesPlayed === 0 && !running) ||
            status.matchesPlayed === status.totalMatches
          }
          className="px-4 py-3 bg-cobalt text-cream font-display tracking-widest disabled:opacity-50"
        >
          {running ? "PAUSE" : "RESUME"}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              setError(null);
              const r = await tickDemoAction();
              setStatus((s) => ({
                ...s,
                matchesPlayed: r.matchesPlayed,
                totalMatches: r.totalMatches,
              }));
              if (r.scoreLine) setLastEvent(r.scoreLine);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
          disabled={
            pending || running || status.matchesPlayed === status.totalMatches
          }
          className="px-4 py-3 border border-ink text-ink font-display tracking-widest disabled:opacity-50"
        >
          STEP ONE MATCH
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setLastEvent(null);
              setRunning(false);
              try {
                await resetDemoAction();
                setStatus({
                  participants: 0,
                  matchesPlayed: 0,
                  totalMatches: 0,
                  specialsClaimed: 0,
                });
              } catch (e) {
                setError((e as Error).message);
              }
            })
          }
          disabled={pending}
          className="px-4 py-3 border border-scarlet text-scarlet font-display tracking-widest disabled:opacity-50 ml-auto"
        >
          RESET ALL DATA
        </button>
      </div>

      <p className="font-mono text-xs text-ink/60">
        Auto-advance fires every {TICK_INTERVAL_MS / 1000}s. 104 matches at that
        cadence = ~5 minutes for the full tournament. PAUSE freezes the
        leaderboard mid-tournament if you want to take screenshots.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/20 p-3">
      <p className="text-ink/60 uppercase tracking-widest text-[10px]">
        {label}
      </p>
      <p className="font-display text-2xl text-ink mt-1">{value}</p>
    </div>
  );
}
