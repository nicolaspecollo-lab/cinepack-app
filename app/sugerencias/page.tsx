"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";

export default function SugerenciasPage() {
  const router = useRouter();
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
    setMsg({ type: "ok", text: "¡Gracias! Tu sugerencia fue enviada al equipo de CINE PACK." });
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">Sugiérenos</span>
        <div className="cp-spacer"></div>
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Volver a proyectos
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ padding: "30px 30px 60px", width: "100%" }}>
        <form onSubmit={handleSubmit} className="apanel" style={{ maxWidth: "640px" }}>
          <h3>Sugiérenos</h3>
          <p className="asub">
            ¿Qué cambiarías de CINE PACK? Contanos tu experiencia con el software: lo que funciona, lo que no, y
            qué te gustaría ver. Tu feedback llega directo al equipo.
          </p>

          <label className="afield">
            <span>Tu sugerencia o experiencia</span>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe aquí…"
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" disabled={sending || !content.trim()} className="abtn">
            {sending ? "Enviando…" : "Enviar sugerencia"}
          </button>
        </form>
      </div>
    </div>
  );
}
