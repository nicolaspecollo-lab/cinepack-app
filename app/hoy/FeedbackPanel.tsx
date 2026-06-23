"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FeedbackPanel() {
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener("cp-feedback-open", onOpen);
    return () => window.removeEventListener("cp-feedback-open", onOpen);
  }, []);

  async function enviar() {
    if (!mensaje.trim()) return;
    setSending(true);
    setMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    const { error } = await supabase.from("feedback_beta").insert({
      user_id: user?.id,
      proyecto_id: projectId || null,
      pagina: typeof window !== "undefined" ? window.location.pathname : null,
      mensaje: mensaje.trim(),
    });
    setSending(false);
    if (error) {
      setMsg({ type: "err", text: "No se pudo enviar. Probá de nuevo en un momento." });
      return;
    }
    setMsg({ type: "ok", text: "¡Gracias! Lo leemos enseguida." });
    setMensaje("");
    setTimeout(() => setOpen(false), 1400);
  }

  if (!open) return null;

  return (
    <div className="cp-inbox-panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="cp-inbox-head">
        <span>Enviar feedback</span>
        <button className="cp-inbox-go" onClick={() => setOpen(false)}>Cerrar</button>
      </div>
      <div style={{ padding: "14px" }}>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={4}
          placeholder="¿Encontraste un bug? ¿Hay algo que te gustaría que funcione distinto?"
          style={{
            width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)",
            padding: "10px 12px", fontSize: "13px", fontFamily: "'Courier New', Courier, monospace", resize: "vertical",
          }}
        />
        {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`} style={{ marginTop: "8px" }}>{msg.text}</p>}
        <button className="abtn" disabled={sending || !mensaje.trim()} onClick={enviar} style={{ marginTop: "10px", width: "100%", justifyContent: "center" }}>
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
