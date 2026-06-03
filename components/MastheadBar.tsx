import Link from "next/link";

type Props = {
  signedInAs?: string | null;
  pageNum?: string;
};

function getPageNum(signedInAs?: string | null): string {
  // determined by calling context; this is the fallback
  return "P100";
}

export default function MastheadBar({ signedInAs, pageNum = "P100" }: Props) {
  const now = new Date();
  const dateStr = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    .toUpperCase()
    .replace(/ /g, " ");

  return (
    <header style={{ background: "#000000", borderBottom: "2px solid #00FFFF" }}>
      {/* Top bar: page number | title banner | date */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "5rem 1fr 8rem",
          alignItems: "center",
          padding: "4px 10px",
        }}
      >
        <span style={{ color: "#00FFFF", fontSize: "1.1em" }}>{pageNum}</span>

        <div
          style={{
            background: "#0000FF",
            textAlign: "center",
            padding: "4px 12px",
            margin: "0 8px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#FFFF00",
              fontSize: "1.6em",
              textDecoration: "none",
              letterSpacing: "2px",
              display: "block",
            }}
          >
            MAKE AMERICA GOAL AGAIN
          </Link>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ color: "#ffffff", fontSize: "0.85em" }}>{dateStr}</span>
          {signedInAs && (
            <span
              style={{
                display: "block",
                color: "#00FFFF",
                fontSize: "0.75em",
                marginTop: "2px",
              }}
            >
              [{signedInAs}]
            </span>
          )}
        </div>
      </div>

      {/* Nav row */}
      <nav
        style={{
          background: "#000000",
          borderTop: "1px solid #0000FF",
          padding: "3px 10px",
          display: "flex",
          gap: "24px",
          fontSize: "0.85em",
        }}
      >
        <Link href="/" style={{ color: "#00FFFF", textDecoration: "none" }}>
          100 STANDINGS
        </Link>
        <Link href="/allocation" style={{ color: "#00FFFF", textDecoration: "none" }}>
          101 WHO HAS WHAT
        </Link>
        <Link href="/schedule" style={{ color: "#00FFFF", textDecoration: "none" }}>
          200 FIXTURES
        </Link>
        {signedInAs && (
          <Link href="/me" style={{ color: "#00FFFF", textDecoration: "none" }}>
            300 MY TEAMS
          </Link>
        )}
        <Link href="/ceremony" style={{ color: "#00FFFF", textDecoration: "none" }}>
          400 CEREMONY
        </Link>
        {!signedInAs && (
          <Link href="/signin" style={{ color: "#FFFF00", textDecoration: "none" }}>
            500 SIGN IN
          </Link>
        )}
      </nav>
    </header>
  );
}
