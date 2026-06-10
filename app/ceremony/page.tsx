import { redirect } from "next/navigation";
import { getAllocation, getParticipants, getSpecials } from "@/lib/db";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import { getCurrentParticipant } from "@/lib/auth";
import { flag } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function CeremonyPage() {
  const me = await getCurrentParticipant();
  if (!me) redirect("/signin");

  const [allocation, participants, specials] = await Promise.all([
    getAllocation(),
    getParticipants(),
    getSpecials(),
  ]);

  const idToName = new Map(participants.map((p) => [p.id, p.displayName]));

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar signedInAs={me?.displayName ?? null} pageNum="P400" />

      {!allocation ? (
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#00FFFF", fontSize: "0.9em", marginBottom: "12px" }}>
            THE CEREMONY OF 2026
          </div>
          <div style={{ color: "#FFFF00", fontSize: "2em", lineHeight: 1.1 }}>
            DOORS OPEN AT MIDNIGHT.
          </div>
          <div style={{ color: "#ffffff", fontSize: "0.9em", marginTop: "12px", opacity: 0.7 }}>
            DRAW RUNS 11 JUN 2026 00:00 UTC
          </div>
          <div style={{ marginTop: "24px" }}>
            <span className="tt-cursor">▌</span>
            <span style={{ color: "#ffffff", opacity: 0.5, fontSize: "0.85em" }}>
              {" "}THE CLOCK TICKS ALONE
            </span>
          </div>
        </main>
      ) : (
        <main style={{ flex: 1, padding: "0 0 16px" }}>
          <section
            style={{
              background: "#000000",
              borderBottom: "2px solid #FF00FF",
              padding: "8px 12px",
            }}
          >
            <div style={{ color: "#FFFF00", fontSize: "1.5em" }}>
              THE CEREMONY OF 2026 — FINAL LEDGER
            </div>
            <div style={{ color: "#00FFFF", fontSize: "0.85em", marginTop: "2px" }}>
              DRAWN {new Date(allocation.allocatedAt).toLocaleString("en-GB", { timeZone: "Europe/London" }).toUpperCase()}
            </div>
          </section>

          {/* ACT 1 — THE TEAMS */}
          <section style={{ marginBottom: "0" }}>
            <div
              style={{
                background: "#0000FF",
                color: "#ffffff",
                padding: "4px 12px",
                fontSize: "1em",
                borderTop: "1px solid #00FFFF",
              }}
            >
              ACT 1 — THE TEAMS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {allocation.byParticipant.map((row) => (
                  <tr key={row.participantId} style={{ borderBottom: "1px solid #222222" }}>
                    <td style={{ padding: "6px 12px", color: "#FFFF00", fontSize: "1.1em", whiteSpace: "nowrap" }}>
                      {idToName.get(row.participantId) ?? "?"}
                    </td>
                    <td style={{ padding: "6px 12px", color: "#ffffff", fontSize: "0.9em" }}>
                      {row.teamCodes.map((c) => `${flag(c)} ${c}`).join("  ")}
                      <span style={{ color: "#00FFFF", opacity: 0.6, fontSize: "0.8em", marginLeft: "8px" }}>
                        ({row.teamCodes.length} TEAMS)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ACT 2 — SPECIALS */}
          <section>
            <div
              style={{
                background: "#FF00FF",
                color: "#000000",
                padding: "4px 12px",
                fontSize: "1em",
                marginTop: "8px",
              }}
            >
              ACT 2 — BOOKIES&apos; SPECIALS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #FF00FF" }}>
              <tbody>
                {specials.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #222222" }}>
                    <td style={{ padding: "5px 12px", color: "#00FF00", whiteSpace: "nowrap" }}>
                      £{s.payoutGbp}
                    </td>
                    <td style={{ padding: "5px 12px", color: "#00FFFF", flex: 1 }}>
                      {s.label.toUpperCase()}
                    </td>
                    <td style={{ padding: "5px 12px", textAlign: "right", color: "#FFFF00" }}>
                      {s.ownerParticipantId
                        ? (idToName.get(s.ownerParticipantId) ?? "?")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      )}

      <SiteFooter />
    </div>
  );
}
