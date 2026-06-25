"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANTILLAS_DOCUMENTO, PLANTILLAS_TABLA, type PlantillaDocumento, type PlantillaTabla } from "./plantillasEspacio";

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
    titulo: "Documento",
    desc: "Documento de texto enriquecido con el mismo editor que Memoria Ejecutiva del Proyecto.",
    icono: "✎",
  },
];

export default function EspacioTrabajoPanel({
  departamento,
  fullName,
  onCreated,
}: {
  departamento: string;
  fullName: string;
  onCreated?: () => void;
}) {
  const [elegido, setElegido] = useState<TipoHerramienta | null>(null);
  const [titulo, setTitulo] = useState("");
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
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
    if (!plantillaId) {
      setMsg({ type: "err", text: "Elegí un estilo antes de crear." });
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
      plantilla_id: plantillaId,
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
    setPlantillaId(null);
    onCreated?.();
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

          <label className="afield" style={{ marginBottom: 0 }}>
            <span>Elegí un estilo {elegido === "tabla" ? "de cuadro" : "de documento"}</span>
          </label>
          <div className="esp-plantilla-cards">
            {elegido === "tabla"
              ? PLANTILLAS_TABLA.map((p) => (
                  <PlantillaTablaCard key={p.id} p={p} selected={plantillaId === p.id} onClick={() => setPlantillaId(p.id)} />
                ))
              : PLANTILLAS_DOCUMENTO.map((p) => (
                  <PlantillaDocCard key={p.id} p={p} selected={plantillaId === p.id} onClick={() => setPlantillaId(p.id)} />
                ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="abtn" disabled={sending}>
              {sending ? "Creando…" : `Crear ${elegido === "tabla" ? "cuadro de celdas" : "documento"}`}
            </button>
            <button type="button" className="btn" onClick={() => { setElegido(null); setPlantillaId(null); setMsg(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PlantillaDocCard({ p, selected, onClick }: { p: PlantillaDocumento; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`esp-plantilla-card${selected ? " selected" : ""}`} onClick={onClick}>
      <div className={`esp-plantilla-doc-preview ${p.estiloDoc}`}>
        {p.previewLineas.map((linea, i) => (
          <span key={i} className={i === 0 ? "esp-pp-l1" : "esp-pp-l2"}>{linea}</span>
        ))}
      </div>
      <strong>{p.titulo}</strong>
      <span>{p.descripcion}</span>
    </button>
  );
}

function PlantillaTablaCard({ p, selected, onClick }: { p: PlantillaTabla; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`esp-plantilla-card${selected ? " selected" : ""}`} onClick={onClick}>
      <div className="esp-plantilla-tabla-preview">
        <div className="esp-pp-row esp-pp-head">
          {p.columnas.map((c) => (
            <span key={c.key}>{c.label}</span>
          ))}
        </div>
        {p.previewFilas.map((fila, i) => (
          <div className="esp-pp-row" key={i}>
            {p.columnas.map((c) => (
              <span key={c.key}>{fila[c.key] ?? ""}</span>
            ))}
          </div>
        ))}
      </div>
      <strong>{p.titulo}</strong>
      <span>{p.descripcion}</span>
    </button>
  );
}
