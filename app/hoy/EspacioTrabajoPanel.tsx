"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TipoHerramienta = "tabla" | "nota";

const OPCIONES: { tipo: TipoHerramienta; titulo: string; desc: string; icono: string }[] = [
  {
    tipo: "tabla",
    titulo: "Cuadro de celdas",
    desc: "Tabla de filas y columnas con el mismo motor que Plan de rodaje: toolbar completo, filtros, CSV, PDF.",
    icono: "⊞",
  },
  {
    tipo: "nota",
    titulo: "Nota",
    desc: "Documento de texto enriquecido con el mismo editor que Memoria Ejecutiva del Proyecto.",
    icono: "✎",
  },
];

export default function EspacioTrabajoPanel({
  departamento,
  fullName,
}: {
  departamento: string;
  fullName: string;
}) {
  const [elegido, setElegido] = useState<TipoHerramienta | null>(null);
  const [titulo, setTitulo] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId || !elegido) return;
    if (!titulo.trim()) {
      setMsg({ type: "err", text: "Ponle un nombre a la herramienta." });
      return;
    }
    setSending(true);
    setMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error } = await supabase.from("personal_tools").insert({
      project_id: projectId,
      owner_id: user.id,
      owner_name: fullName,
      departamento,
      titulo: titulo.trim(),
      tipo: elegido,
    });

    setSending(false);
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setMsg({
      type: "ok",
      text: `✓ "${titulo.trim()}" creada. Encontrala en la pestaña Exclusivas.`,
    });
    setTitulo("");
    setElegido(null);
  }

  return (
    <div className="esp-creator">
      <div className="esp-creator-header">
        <span className="hex" style={{ width: 14, height: 12, background: "var(--acc)" }} />
        <div>
          <h4>Espacio de trabajo</h4>
          <p>Creá una herramienta personal. Quedará guardada en tu pestaña <strong>Exclusivas</strong>.</p>
        </div>
      </div>

      {msg && (
        <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`} style={{ margin: "0 30px 16px" }}>
          {msg.text}
        </p>
      )}

      <div className="esp-tipo-cards">
        {OPCIONES.map((op) => (
          <button
            key={op.tipo}
            className={`esp-tipo-card${elegido === op.tipo ? " selected" : ""}`}
            onClick={() => { setElegido(op.tipo); setMsg(null); setTitulo(""); }}
          >
            <span className="esp-tipo-icon">{op.icono}</span>
            <strong>{op.titulo}</strong>
            <span>{op.desc}</span>
          </button>
        ))}
      </div>

      {elegido && (
        <form onSubmit={handleCreate} className="esp-creator-form">
          <label className="afield">
            <span>Nombre de la herramienta</span>
            <input
              type="text"
              required
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={elegido === "tabla" ? "Ej. Seguimiento de props, Lista de VFX…" : "Ej. Ideas de dirección, Notas de guion…"}
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="abtn" disabled={sending}>
              {sending ? "Creando…" : `Crear ${elegido === "tabla" ? "cuadro de celdas" : "nota"}`}
            </button>
            <button type="button" className="btn" onClick={() => { setElegido(null); setMsg(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
