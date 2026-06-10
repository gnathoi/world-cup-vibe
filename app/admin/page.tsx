import {
  getAllocation,
  getParticipants,
  getSpecials,
  getPotPaidBy,
} from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession, getCurrentParticipant } from "@/lib/auth";
import { getCacheAge } from "@/lib/openfootball";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import {
  reallocateAction,
  togglePaidAction,
  refreshOpenfootballAction,
  verifyAdminPinAction,
  addParticipantAction,
} from "./actions";

export const dynamic = "force-dynamic";

const panelStyle: React.CSSProperties = {
  border: "2px solid #00FFFF",
  padding: "16px 20px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#00FFFF",
  fontSize: "0.8em",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#000000",
  color: "#ffffff",
  border: "1px solid #ffffff",
  padding: "6px 10px",
  fontSize: "1em",
  fontFamily: "inherit",
};

const btnBlue: React.CSSProperties = {
  background: "#0000FF",
  color: "#ffffff",
  border: "2px solid #00FFFF",
  padding: "8px 16px",
  fontSize: "1em",
  fontFamily: "inherit",
  cursor: "pointer",
  letterSpacing: "1px",
};

const btnRed: React.CSSProperties = {
  ...btnBlue,
  background: "#FF0000",
  border: "2px solid #FF0000",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const session = await getSession();

  if (!session.adminVerified) {
    const { error } = await searchParams;
    const pinError = error === "pin";
    return (
      <div className="flex-1 flex flex-col">
        <MastheadBar signedInAs="ADMIN" pageNum="P600" />
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 12px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "420px" }}>
            <div style={panelStyle}>
              <div className="tt-badge tt-badge-red" style={{ marginBottom: "12px" }}>
                RESTRICTED
              </div>
              <div style={{ color: "#FFFF00", fontSize: "1.4em", marginBottom: "16px" }}>
                ADMIN ACCESS
              </div>
              {pinError && (
                <div
                  style={{
                    background: "#FF0000",
                    color: "#ffffff",
                    padding: "6px 10px",
                    marginBottom: "12px",
                    fontSize: "0.9em",
                  }}
                >
                  INCORRECT PIN — TRY AGAIN
                </div>
              )}
              <form action={verifyAdminPinAction} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label>
                  <span style={labelStyle}>ENTER PIN:</span>
                  <input
                    name="pin"
                    type="password"
                    required
                    autoComplete="current-password"
                    style={inputStyle}
                  />
                </label>
                <button type="submit" style={btnBlue}>ENTER ▌</button>
              </form>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [participants, allocation, specials, paidBy, cacheInfo] =
    await Promise.all([
      getParticipants(),
      getAllocation(),
      getSpecials(),
      getPotPaidBy(),
      getCacheAge(),
    ]);

  const bst = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" }).toUpperCase();

  const cacheAgeLabel = cacheInfo.fetchedAt
    ? `LAST REFRESH: ${bst(cacheInfo.fetchedAt)} BST`
    : "NEVER REFRESHED";

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs="ADMIN" pageNum="P600" />

      <section
        style={{
          background: "#000000",
          borderBottom: "2px solid #FF00FF",
          padding: "8px 12px",
        }}
      >
        <div style={{ color: "#FF0000", fontSize: "1.3em" }}>ADMIN — RESTRICTED</div>
        <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "2px" }}>
          {cacheAgeLabel}
        </div>
      </section>

      <main
        style={{
          flex: 1,
          padding: "12px",
          display: "grid",
          gap: "12px",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        }}
      >
        {/* ── Add Participant ── */}
        <section style={{ ...panelStyle, gridColumn: "1 / -1" }}>
          <div className="tt-badge tt-badge-cyan" style={{ marginBottom: "10px" }}>THE PLAYERS</div>
          <div style={{ color: "#FFFF00", fontSize: "1.2em", marginBottom: "8px" }}>ADD PARTICIPANT</div>
          <p style={{ color: "#ffffff", opacity: 0.7, fontSize: "0.9em", marginBottom: "12px" }}>
            CREATES NEW ACCOUNT — SHARE USERNAME + PASSWORD DIRECTLY
          </p>
          <form
            action={addParticipantAction}
            style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-end" }}
          >
            <label style={{ flex: "1 1 160px" }}>
              <span style={labelStyle}>USERNAME</span>
              <input name="username" type="text" required placeholder="E.G. NAT" style={inputStyle} />
            </label>
            <label style={{ flex: "1 1 160px" }}>
              <span style={labelStyle}>PASSWORD</span>
              <input name="password" type="text" required placeholder="WORD-WORD-WORD" style={inputStyle} />
            </label>
            <button type="submit" style={btnBlue}>ADD</button>
          </form>
          {participants.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #222222" }}>
                    <td style={{ padding: "4px 0", color: "#ffffff", fontSize: "0.9em" }}>
                      {p.displayName}
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: "#00FFFF", fontSize: "0.8em" }}>
                      {p.spectator ? "SPECTATOR" : "PLAYER"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ── Refresh ── */}
        <section style={panelStyle}>
          <div className="tt-badge tt-badge-cyan" style={{ marginBottom: "10px" }}>THE WIRE</div>
          <div style={{ color: "#FFFF00", fontSize: "1.2em", marginBottom: "8px" }}>REFRESH OPENFOOTBALL</div>
          <p style={{ color: "#ffffff", opacity: 0.7, fontSize: "0.9em", marginBottom: "12px", wordBreak: "break-all" }}>
            {cacheAgeLabel}
          </p>
          <form action={refreshOpenfootballAction}>
            <button type="submit" style={btnBlue}>REFRESH FROM OPENFOOTBALL</button>
          </form>
        </section>

        {/* ── Draw ── */}
        <section style={panelStyle}>
          <div className="tt-badge tt-badge-red" style={{ marginBottom: "10px" }}>THE DRAW</div>
          <div style={{ color: "#FFFF00", fontSize: "1.2em", marginBottom: "8px" }}>ALLOCATION OVERRIDE</div>
          <p style={{ color: "#ffffff", opacity: 0.7, fontSize: "0.9em", marginBottom: "4px", wordBreak: "break-all" }}>
            {allocation ? `LAST DRAWN: ${bst(allocation.allocatedAt)} BST` : "NOT YET RUN"}
          </p>
          {allocation && (
            <p style={{ color: "#00FFFF", opacity: 0.5, fontSize: "0.75em", marginBottom: "12px", wordBreak: "break-all" }}>
              SEED: {allocation.seed}
            </p>
          )}
          <form
            action={reallocateAction}
            style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-end" }}
          >
            <label style={{ flex: "1 1 200px" }}>
              <span style={labelStyle}>SEED (BLANK = RANDOM)</span>
              <input name="seed" type="text" placeholder="OPTIONAL" style={inputStyle} />
            </label>
            <button type="submit" style={btnRed}>RE-ROLL</button>
          </form>
        </section>

        {/* ── Paid-in Ledger ── */}
        <section style={panelStyle}>
          <div className="tt-badge tt-badge-cyan" style={{ marginBottom: "10px" }}>THE POT</div>
          <div style={{ color: "#FFFF00", fontSize: "1.2em", marginBottom: "12px" }}>PAID-IN LEDGER</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {participants.map((p) => {
                const paid = paidBy.includes(p.id);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #222222" }}>
                    <td style={{ padding: "5px 0", color: "#ffffff", fontSize: "0.9em" }}>
                      {p.displayName}
                    </td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>
                      <form action={togglePaidAction}>
                        <input type="hidden" name="participantId" value={p.id} />
                        <button
                          type="submit"
                          className={paid ? "tt-badge tt-badge-green" : "tt-badge tt-badge-white"}
                          style={{ cursor: "pointer", border: "none" }}
                        >
                          {paid ? "PAID" : "UNPAID"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ── Specials ── */}
        <section style={panelStyle}>
          <div className="tt-badge tt-badge-magenta" style={{ marginBottom: "10px" }}>THE BOOKIE</div>
          <div style={{ color: "#FFFF00", fontSize: "1.2em", marginBottom: "12px" }}>SPECIALS</div>
          {specials.length === 0 ? (
            <p style={{ color: "#ffffff", opacity: 0.5, fontSize: "0.9em" }}>
              NO SPECIALS — HIT REFRESH FROM OPENFOOTBALL TO SEED
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {specials.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #222222" }}>
                    <td style={{ padding: "4px 0", color: "#00FF00", whiteSpace: "nowrap", paddingRight: "10px" }}>
                      £{s.payoutGbp}
                    </td>
                    <td style={{ padding: "4px 0", color: "#00FFFF", fontSize: "0.9em" }}>
                      {s.label.toUpperCase()}
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: "#FFFF00", fontSize: "0.8em" }}>
                      {s.status.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
