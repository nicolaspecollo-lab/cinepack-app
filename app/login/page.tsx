"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import LocaleToggle from "../components/LocaleToggle";
import "../cp-theme.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    searchParams.get("registro") === "cerrado" ? { type: "err", text: t("closedRegistration") } : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMsg({ type: "err", text: error.message });
      return;
    }

    const pendingToken = localStorage.getItem("cinepack-pending-invite-token");
    if (pendingToken) {
      const { error: errAccept } = await supabase.rpc("accept_invitation", { p_token: pendingToken });
      if (!errAccept) {
        localStorage.removeItem("cinepack-pending-invite-token");
      }
    }

    setLoading(false);
    router.push("/proyectos");
    router.refresh();
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
      <div className="cp-auth-wrap">
        <div className="hexbg"></div>
        <div className="cp-theme-toggle-floating">
          <LocaleToggle />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <div className="cp-auth-logo">
            <img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" />
          </div>

          <div className="authcard">
            <div className="atabs">
              <span className="atab active">{t("tabLogin")}</span>
            </div>

            <form onSubmit={handleSubmit} className="apanel">
              <h3>{t("welcomeBack")}</h3>
              <p className="asub">{t("loginSubtitle")}</p>

              <label className="afield">
                <span>{t("email")}</span>
                <input
                  type="email"
                  placeholder="tu@productora.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="afield">
                <span>{t("password")}</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {msg && (
                <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>
              )}

              <button type="submit" disabled={loading} className="abtn">
                {loading ? t("entering") : t("enter")}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"></path></svg>
              </button>

              <p className="aswitch">{t("closedRegistration")}</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
