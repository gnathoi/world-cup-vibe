"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/types";

type Props = {
  placeholder?: string;
  // Server action passed in by the page.
  onSubmit: (body: string) => Promise<ActionResult<unknown>>;
  disabled?: boolean;
};

export default function Compose({
  placeholder = "POST TO THE WIRE...",
  onSubmit,
  disabled,
}: Props) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 flex items-stretch gap-0 border border-ink"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        const body = value;
        startTransition(async () => {
          setError(null);
          const r = await onSubmit(body);
          if (r.ok) setValue("");
          else setError(r.error);
        });
      }}
    >
      <label htmlFor="compose-body" className="sr-only">
        Post to the wire
      </label>
      <input
        id="compose-body"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || pending}
        maxLength={280}
        className="flex-1 px-3 py-2 bg-cream font-mono text-sm focus:outline-none disabled:opacity-50 italic placeholder:not-italic placeholder:text-ink/40"
      />
      <button
        type="submit"
        disabled={disabled || pending || !value.trim()}
        className="px-4 bg-scarlet text-cream font-display tracking-widest text-sm disabled:opacity-50"
      >
        {pending ? "..." : "SEND"}
      </button>
      {error ? (
        <p
          role="alert"
          className="absolute -mt-6 ml-2 font-mono text-xs text-scarlet"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
