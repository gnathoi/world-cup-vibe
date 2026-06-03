import Link from "next/link";

type Props = {
  signedInAs?: string | null;
  pageNum?: string;
};

export default function MastheadBar({ signedInAs, pageNum = "P100" }: Props) {
  const now = new Date();
  const dateStr = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    .toUpperCase();

  return (
    <header style={{ background: "#000000", borderBottom: "2px solid #00FFFF" }}>
      <style>{`
        .tt-masthead-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 3px 10px;
        }
        .tt-masthead-banner {
          background: #0000FF;
          text-align: center;
          padding: 5px 12px;
        }
        .tt-masthead-banner a {
          color: #FFFF00;
          text-decoration: none;
          display: block;
          letter-spacing: 2px;
          font-size: 1.6em;
        }
        .tt-masthead-nav {
          border-top: 1px solid #0000FF;
          padding: 3px 10px;
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 0.85em;
        }
        @media (max-width: 480px) {
          .tt-masthead-banner a {
            font-size: 1.1em;
            letter-spacing: 1px;
          }
          .tt-masthead-nav {
            gap: 12px;
            font-size: 0.8em;
          }
        }
      `}</style>

      {/* Page num + date + username */}
      <div className="tt-masthead-top">
        <span style={{ color: "#00FFFF", fontSize: "1em" }}>{pageNum}</span>
        <div style={{ textAlign: "right" }}>
          <span style={{ color: "#ffffff", fontSize: "0.8em" }}>{dateStr}</span>
          {signedInAs && (
            <span style={{ color: "#00FFFF", fontSize: "0.75em", marginLeft: "8px" }}>
              [{signedInAs}]
            </span>
          )}
        </div>
      </div>

      {/* Full-width MAGA banner */}
      <div className="tt-masthead-banner">
        <Link href="/">MAKE AMERICA GOAL AGAIN</Link>
      </div>

      {/* Nav */}
      <nav className="tt-masthead-nav">
        <Link href="/" style={{ color: "#00FFFF", textDecoration: "none" }}>100 STAND</Link>
        <Link href="/allocation" style={{ color: "#00FFFF", textDecoration: "none" }}>101 ALLOC</Link>
        <Link href="/schedule" style={{ color: "#00FFFF", textDecoration: "none" }}>200 FIX</Link>
        {signedInAs && (
          <Link href="/me" style={{ color: "#00FFFF", textDecoration: "none" }}>300 TEAMS</Link>
        )}
        <Link href="/ceremony" style={{ color: "#00FFFF", textDecoration: "none" }}>400 CER</Link>
        <Link href="/admin" style={{ color: "#FF00FF", textDecoration: "none" }}>600 ADMIN</Link>
      </nav>
    </header>
  );
}
