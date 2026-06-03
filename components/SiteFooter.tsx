import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      style={{
        background: "#0000FF",
        color: "#ffffff",
        padding: "4px 10px",
        display: "flex",
        gap: "0",
        alignItems: "center",
        fontSize: "0.9em",
        borderTop: "2px solid #00FFFF",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {[
        { href: "/",          num: "100", label: "STAND" },
        { href: "/allocation", num: "101", label: "ALLOC" },
        { href: "/schedule",  num: "200", label: "FIX"   },
        { href: "/me",        num: "300", label: "TEAMS" },
        { href: "/ceremony",  num: "400", label: "CER"   },
        { href: "/admin",     num: "600", label: "ADMIN", magenta: true },
      ].map(({ href, num, label, magenta }) => (
        <Link
          key={href}
          href={href}
          style={{
            color: "#ffffff",
            textDecoration: "none",
            padding: "0 10px 0 0",
          }}
        >
          <span style={{ color: magenta ? "#FF00FF" : "#FFFF00" }}>{num} </span>
          {label}
        </Link>
      ))}
      <span style={{ marginLeft: "auto" }}>
        <span className="tt-cursor">▌</span>
      </span>
    </footer>
  );
}
