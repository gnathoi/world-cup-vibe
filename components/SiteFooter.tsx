import Link from "next/link";

type Props = {
  showAdminLink?: boolean;
};

export default function SiteFooter({ showAdminLink = false }: Props) {
  return (
    <footer
      style={{
        background: "#0000FF",
        color: "#ffffff",
        padding: "6px 10px",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "center",
        fontSize: "0.9em",
        borderTop: "2px solid #00FFFF",
      }}
    >
      <Link href="/" style={{ color: "#ffffff", textDecoration: "none" }}>
        <span style={{ color: "#FFFF00" }}>100 </span>STANDINGS
      </Link>
      <Link href="/allocation" style={{ color: "#ffffff", textDecoration: "none" }}>
        <span style={{ color: "#FFFF00" }}>101 </span>WHO HAS WHAT
      </Link>
      <Link href="/schedule" style={{ color: "#ffffff", textDecoration: "none" }}>
        <span style={{ color: "#FFFF00" }}>200 </span>FIXTURES
      </Link>
      <Link href="/me" style={{ color: "#ffffff", textDecoration: "none" }}>
        <span style={{ color: "#FFFF00" }}>300 </span>MY TEAMS
      </Link>
      <Link href="/ceremony" style={{ color: "#ffffff", textDecoration: "none" }}>
        <span style={{ color: "#FFFF00" }}>400 </span>CEREMONY
      </Link>
      <Link href="/signin" style={{ color: "#ffffff", textDecoration: "none" }}>
        <span style={{ color: "#FFFF00" }}>500 </span>SIGN IN
      </Link>
      {showAdminLink && (
        <Link href="/admin" style={{ color: "#ffffff", textDecoration: "none" }}>
          <span style={{ color: "#FFFF00" }}>600 </span>ADMIN
        </Link>
      )}
      <span style={{ marginLeft: "auto" }}>
        <span className="tt-cursor">▌</span>
      </span>
    </footer>
  );
}
