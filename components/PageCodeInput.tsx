"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PAGE_MAP: Record<string, string> = {
  "100": "/",
  "101": "/allocation",
  "200": "/schedule",
  "300": "/me",
  "400": "/ceremony",
  "500": "/signin",
  "600": "/admin",
};

type Props = { pageNum: string };

export default function PageCodeInput({ pageNum }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [invalid, setInvalid] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!/^\d$/.test(e.key)) return;
      // Ignore if focus is inside an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      setDigits((prev) => {
        const next = prev + e.key;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (next.length === 3) {
          const route = PAGE_MAP[next];
          if (route) {
            router.push(route);
          } else {
            setInvalid(true);
            timeoutRef.current = setTimeout(() => {
              setDigits("");
              setInvalid(false);
            }, 1000);
          }
          return "";
        }

        // Auto-clear partial entry after 3 s
        timeoutRef.current = setTimeout(() => setDigits(""), 3000);
        return next;
      });
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  const display = invalid
    ? "???"
    : digits.length === 0
    ? pageNum
    : `P${digits.padEnd(3, "_").slice(0, 3)}`;

  return (
    <span
      style={{
        color: invalid ? "#FF0000" : digits.length > 0 ? "#FFFF00" : "#00FFFF",
        fontSize: "1em",
        fontFamily: "inherit",
        letterSpacing: "1px",
        minWidth: "4ch",
        display: "inline-block",
      }}
    >
      {display}
    </span>
  );
}
