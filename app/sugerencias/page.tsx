"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";

export default function SugerenciasPage() {
  const router = useRouter();
  const t = useTranslations("sugerencias");
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !content.trim()) return;

    setSending(true);
    setMsg(null);

    const supabase = createClient();
    const { error } = await supabase.from("sugerencias").insert({
      user_id: userId,
      content: content.trim(),
    });

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setContent("");
    setMsg({ type: "ok", text: t("success") });
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">{t("title")}</span>
        <div className="cp-spacer"></div>
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> {t("backToProjects")}
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ padding: "30px 30px 60px", width: "100%" }}>
        <form onSubmit={handleSubmit} className="apanel" style={{ maxWidth: "640px" }}>
          <h3>{t("formTitle")}</h3>
          <p className="asub">{t("formDesc")}</p>

          <label className="afield">
            <span>{t("fieldLabel")}</span>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("placeholder")}
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" disabled={sending || !content.trim()} className="abtn">
            {sending ? t("sending") : t("send")}
          </button>
        </form>
      </div>
    </div>
  );
}
