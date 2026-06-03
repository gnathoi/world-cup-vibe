import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import MastheadBar from "@/components/MastheadBar";
import SiteFooter from "@/components/SiteFooter";
import { signInAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const me = await getCurrentParticipant();
  if (me) redirect("/me");

  const { error } = await searchParams;

  return (
    <div className="flex-1 flex flex-col">
      <MastheadBar pageNum="P500" />
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 12px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <div
            style={{
              border: "2px solid #00FFFF",
              padding: "24px",
            }}
          >
            <div style={{ color: "#FFFF00", fontSize: "1.5em", marginBottom: "4px" }}>
              MAKE AMERICA GOAL AGAIN
            </div>
            <div style={{ color: "#00FFFF", fontSize: "0.85em", marginBottom: "20px" }}>
              MEMBERS ONLY — SIGN IN TO CONTINUE
            </div>

            <div style={{ height: "1px", background: "#00FFFF", marginBottom: "20px" }} />

            {error && (
              <div
                style={{
                  color: "#FF0000",
                  fontSize: "0.95em",
                  marginBottom: "16px",
                  border: "1px solid #FF0000",
                  padding: "6px 10px",
                }}
              >
                INVALID USERNAME OR PASSWORD
              </div>
            )}

            <form action={signInAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <label>
                <div style={{ color: "#00FFFF", fontSize: "0.85em", marginBottom: "6px" }}>
                  ENTER YOUR USERNAME:
                </div>
                <input
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  style={{
                    width: "100%",
                    background: "#000000",
                    color: "#ffffff",
                    border: "1px solid #ffffff",
                    padding: "6px 10px",
                    fontSize: "1em",
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <label>
                <div style={{ color: "#00FFFF", fontSize: "0.85em", marginBottom: "6px" }}>
                  ENTER YOUR PASSWORD:
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    background: "#000000",
                    color: "#ffffff",
                    border: "1px solid #ffffff",
                    padding: "6px 10px",
                    fontSize: "1em",
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <button
                type="submit"
                style={{
                  marginTop: "8px",
                  background: "#0000FF",
                  color: "#ffffff",
                  border: "2px solid #00FFFF",
                  padding: "10px",
                  fontSize: "1.1em",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  letterSpacing: "2px",
                }}
              >
                SIGN IN ▌
              </button>
            </form>

            <div style={{ marginTop: "16px", fontSize: "0.8em", color: "#ffffff", opacity: 0.5 }}>
              <span className="tt-cursor">▌</span> PRESS ENTER TO CONTINUE
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
