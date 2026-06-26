"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANTILLAS_DOCUMENTO, PLANTILLAS_TABLA, type PlantillaDocumento, type PlantillaTabla } from "./plantillasEspacio";

type TipoHerramienta = "tabla" | "nota";

const OPCIONES: { tipo: TipoHerramienta; titulo: string; icono: string; color: string }[] = [
  { tipo: "tabla", titulo: "Cuadro de celdas", icono: "⊞", color: "var(--cyan)" },
  { tipo: "nota", titulo: "Documento", icono: "✎", color: "var(--lime)" },
];

export default function EspacioTrabajoPanel({
  departamento,
  fullName,
  onCreated,
  onCancel,
}: {
  departamento: string;
  fullName: string;
  onCreated?: () => void;
  onCancel?: () => void;
}) {
  const [elegido, setElegido] = useState<TipoHerramienta | null>(null);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId || !elegido) return;
    if (!plantillaId) {
      setMsg({ type: "err", text: "Elegí un estilo antes de crear." });
      return;
    }
    setSending(true);
    setMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const tituloPorDefecto = elegido === "tabla" ? "Cuadro sin título" : "Documento sin título";

    const { data: nuevaHerramienta, error } = await supabase
      .from("personal_tools")
      .insert({
        project_id: projectId,
        owner_id: user.id,
        owner_name: fullName,
        departamento,
        titulo: tituloPorDefecto,
        tipo: elegido,
        plantilla_id: plantillaId,
      })
      .select("id")
      .single();

    if (error || !nuevaHerramienta) {
      setSending(false);
      setMsg({ type: "err", text: error?.message ?? "No se pudo crear la herramienta." });
      return;
    }

    // El documento arranca con la estructura real de la plantilla (no contenido
    // de ejemplo): así el estilo elegido se nota desde el primer momento.
    if (elegido === "nota") {
      const plantilla = PLANTILLAS_DOCUMENTO.find((p) => p.id === plantillaId);
      if (plantilla) {
        await supabase.from("herramienta_filas").insert({
          project_id: projectId,
          departamento,
          herramienta_id: nuevaHerramienta.id,
          datos: { texto: plantilla.esqueletoHtml },
          orden: 0,
          registro: [],
          visionado_por: [],
          created_by: user.id,
          autor_nombre: fullName,
          editor_nombre: fullName,
        });
      }
    }

    setSending(false);
    setMsg({
      type: "ok",
      text: "✓ Creado. Ponele nombre desde adentro y encontralo en la pestaña Exclusivas.",
    });
    setElegido(null);
    setPlantillaId(null);
    onCreated?.();
  }

  return (
    <div className="esp-creator">
      <div className="esp-creator-header">
        <span className="hex esp-creator-hex" />
        <div>
          <h4>Espacio de trabajo</h4>
          <p>Creá una herramienta personal.</p>
        </div>
      </div>

      {msg && (
        <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`} style={{ margin: "0 30px 16px" }}>
          {msg.text}
        </p>
      )}

      {!elegido && (
        <div className="esp-tipo-cards">
          {OPCIONES.map((op) => (
            <button
              key={op.tipo}
              className={`esp-tipo-card${elegido === op.tipo ? " selected" : ""}`}
              style={{ "--esp-tipo-color": op.color } as React.CSSProperties}
              onClick={() => { setElegido(op.tipo); setMsg(null); setPlantillaId(null); }}
            >
              <span className="esp-tipo-icon">{op.icono}</span>
              <strong>{op.titulo}</strong>
            </button>
          ))}
          {onCancel && (
            <button type="button" className="btn esp-tipo-cancel" onClick={onCancel}>Cancelar</button>
          )}
        </div>
      )}

      {elegido && (
        <form onSubmit={handleCreate} className="esp-creator-form">
          <div className="esp-plantilla-box">
            <div className="esp-plantilla-box-head">
              <strong>Estilo {elegido === "tabla" ? "de cuadro de celdas" : "de documento"}</strong>
              <span>Elegí cómo se va a ver. Empieza vacío, podés editar todo después.</span>
            </div>
            <div className="esp-plantilla-cards">
              {elegido === "tabla"
                ? PLANTILLAS_TABLA.map((p) => (
                    <PlantillaTablaCard key={p.id} p={p} selected={plantillaId === p.id} onClick={() => setPlantillaId(p.id)} />
                  ))
                : PLANTILLAS_DOCUMENTO.map((p) => (
                    <PlantillaDocCard key={p.id} p={p} selected={plantillaId === p.id} onClick={() => setPlantillaId(p.id)} />
                  ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="abtn" disabled={sending}>
              {sending ? "Creando…" : `Crear ${elegido === "tabla" ? "cuadro de celdas" : "documento"}`}
            </button>
            <button type="button" className="btn" onClick={() => { setElegido(null); setPlantillaId(null); setMsg(null); }}>
              Volver
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
      <div className="esp-plantilla-a4-wrap">
        <div className={`esp-plantilla-a4 ${p.estiloDoc}`}>
          <DocPreview id={p.id} lineas={p.previewLineas} />
        </div>
      </div>
      <div className="esp-plantilla-info">
        <strong>{p.titulo}</strong>
        <span>{p.descripcion}</span>
      </div>
    </button>
  );
}

function DocPreview({ id, lineas }: { id: string; lineas: string[] }) {
  if (id === "clasico") {
    return (
      <>
        <span className="esp-pp-l1">{lineas[0]}</span>
        <span className="esp-doc-rule" />
        {lineas.slice(1).map((l, i) => <span key={i} className="esp-pp-l2">{l}</span>)}
      </>
    );
  }
  if (id === "guion") {
    return (
      <>
        <span className="esp-doc-chip">INT.</span>
        {lineas.map((l, i) => <span key={i} className="esp-pp-l1">{l}</span>)}
      </>
    );
  }
  if (id === "manifiesto") {
    return (
      <div className="esp-doc-manifiesto-row">
        <span className="esp-doc-bar" />
        <div className="esp-doc-manifiesto-txt">
          {lineas.map((l, i) => <span key={i} className="esp-pp-l1">{l}</span>)}
        </div>
      </div>
    );
  }
  if (id === "diario") {
    return (
      <>
        {lineas.map((l, i) => (
          <span key={i} className={/^\d/.test(l) ? "esp-pp-l1 esp-doc-fecha" : "esp-pp-l2"}>{l}</span>
        ))}
      </>
    );
  }
  if (id === "tablon") {
    return (
      <>
        <span className="esp-pp-l1">{lineas[0]}</span>
        <div className="esp-doc-tablon-row">
          <span className="esp-doc-swatch" style={{ background: "#EE9962" }} />
          <span className="esp-pp-l2">{lineas[1]}</span>
        </div>
        <div className="esp-doc-tablon-row">
          <span className="esp-doc-swatch" style={{ background: "#5BEDD6" }} />
          <span className="esp-pp-l2">{lineas[2]}</span>
        </div>
      </>
    );
  }
  // minimalista
  return (
    <>
      <span className="esp-doc-dash" />
      {lineas.map((l, i) => <span key={i} className="esp-pp-l1">{l}</span>)}
    </>
  );
}

function PlantillaTablaCard({ p, selected, onClick }: { p: PlantillaTabla; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`esp-plantilla-card${selected ? " selected" : ""}`} onClick={onClick}>
      <div className="esp-plantilla-tabla-wrap">
        <TablaPreview id={p.id} p={p} />
      </div>
      <div className="esp-plantilla-info">
        <strong>{p.titulo}</strong>
        <span>{p.descripcion}</span>
      </div>
    </button>
  );
}

function TablaPreview({ id, p }: { id: string; p: PlantillaTabla }) {
  if (id === "kanban") {
    return (
      <div className="esp-tp esp-tp-kanban">
        <div className="esp-tp-kcol">
          <span className="esp-tp-khead">Por hacer</span>
          <span className="esp-tp-kcard" style={{ background: "rgba(31,125,226,0.16)", borderColor: "#1F7DE2" }} />
          <span className="esp-tp-kcard" style={{ background: "rgba(31,125,226,0.16)", borderColor: "#1F7DE2", height: 22 }} />
        </div>
        <div className="esp-tp-kcol">
          <span className="esp-tp-khead">En curso</span>
          <span className="esp-tp-kcard" style={{ background: "rgba(158,238,106,0.18)", borderColor: "#9EEE6A", height: 30 }} />
        </div>
        <div className="esp-tp-kcol">
          <span className="esp-tp-khead">Hecho</span>
          <span className="esp-tp-kcard" style={{ background: "rgba(243,127,181,0.16)", borderColor: "#F37FB5" }} />
          <span className="esp-tp-kcard" style={{ background: "rgba(243,127,181,0.16)", borderColor: "#F37FB5", height: 18 }} />
        </div>
      </div>
    );
  }
  if (id === "timeline") {
    return (
      <div className="esp-tp esp-tp-timeline">
        {p.previewFilas.map((f, i) => (
          <div className="esp-tp-trow" key={i}>
            <span className="esp-tp-tdot" style={{ background: i === 0 ? "#19CBE6" : "#E6B019" }} />
            <span className="esp-tp-tfecha">{f.fecha}</span>
            <span className="esp-tp-thito">{f.hito}</span>
          </div>
        ))}
      </div>
    );
  }
  if (id === "mosaico") {
    const colores = ["#1F7DE2", "#F5E26A", "#EE9962", "#5BEDD6", "#C98AF2", "#52EC64", "#F37FB5", "#E6B019", "#66C3EE", "#F07A7A", "#9EEE6A", "#5F70ED"];
    return (
      <div className="esp-tp esp-tp-mosaico">
        {colores.map((c, i) => (
          <span key={i} className="esp-tp-swatch" style={{ background: c }} />
        ))}
      </div>
    );
  }
  if (id === "checklist-tabla") {
    return (
      <div className="esp-tp esp-tp-checklist">
        {p.previewFilas.map((f, i) => (
          <div className="esp-tp-crow" key={i}>
            <span className={`esp-tp-cdot${f.estado === "Hecho" ? " on" : ""}`} />
            <span className="esp-tp-ctxt">{f.verificar}</span>
          </div>
        ))}
        <div className="esp-tp-crow">
          <span className="esp-tp-cdot" />
          <span className="esp-tp-ctxt esp-tp-ctxt-muted">Liberación de derechos de imagen</span>
        </div>
      </div>
    );
  }
  if (id === "storyboard") {
    return (
      <div className="esp-tp esp-tp-storyboard">
        {p.previewFilas.map((f, i) => (
          <div className="esp-tp-frame" key={i}>
            <span className="esp-tp-frame-num">{f.plano}</span>
          </div>
        ))}
        <div className="esp-tp-frame esp-tp-frame-empty" />
      </div>
    );
  }
  // grid-clasico
  return (
    <div className="esp-tp esp-tp-grid">
      <div className="esp-tp-grow esp-tp-ghead">
        {p.columnas.map((c) => <span key={c.key}>{c.label}</span>)}
      </div>
      {p.previewFilas.map((f, i) => (
        <div className="esp-tp-grow" key={i}>
          {p.columnas.map((c) => <span key={c.key}>{f[c.key] ?? ""}</span>)}
        </div>
      ))}
    </div>
  );
}
