"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANTILLAS_DOCUMENTO, PLANTILLAS_TABLA, type PlantillaTabla } from "./plantillasEspacio";
import Icon from "../components/Icon";

type TipoHerramienta = "tabla" | "nota";

const OPCIONES: { tipo: TipoHerramienta; titulo: string; icono: "table" | "file-text"; color: string }[] = [
  { tipo: "tabla", titulo: "Cuadro de celdas", icono: "table", color: "var(--cyan)" },
  { tipo: "nota", titulo: "Documento", icono: "file-text", color: "var(--lime)" },
];

export default function EspacioTrabajoPanel({
  departamento,
  fullName,
  onCreated,
  flush = false,
}: {
  departamento: string;
  fullName: string;
  onCreated?: () => void;
  // flush = el contenedor padre ya aporta el gutter lateral (ej. hp-index en
  // Departamento/Exclusivas). En Generales se monta sin flush y aporta el suyo.
  flush?: boolean;
}) {
  const [elegido, setElegido] = useState<TipoHerramienta | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function crear(tipo: TipoHerramienta, plantillaId: string) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId || sending) return;
    setSending(true);
    setMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const tituloPorDefecto = tipo === "tabla" ? "Cuadro sin título" : "Documento sin título";

    const { data: nuevaHerramienta, error } = await supabase
      .from("personal_tools")
      .insert({
        project_id: projectId,
        owner_id: user.id,
        owner_name: fullName,
        departamento,
        titulo: tituloPorDefecto,
        tipo,
        plantilla_id: plantillaId,
      })
      .select("id")
      .single();

    if (error || !nuevaHerramienta) {
      setSending(false);
      setMsg({ type: "err", text: error?.message ?? "No se pudo crear la herramienta." });
      return;
    }

    // Sembrar la estructura real de la plantilla para que se vea desde el
    // primer momento (no un empty-state genérico).
    const base = {
      project_id: projectId,
      departamento,
      herramienta_id: nuevaHerramienta.id,
      registro: [],
      visionado_por: [],
      created_by: user.id,
      autor_nombre: fullName,
      editor_nombre: fullName,
    };
    if (tipo === "nota") {
      // Documento: una fila con el esqueleto HTML del estilo elegido.
      const plantilla = PLANTILLAS_DOCUMENTO.find((p) => p.id === plantillaId);
      if (plantilla) {
        await supabase.from("herramienta_filas").insert({ ...base, datos: { texto: plantilla.esqueletoHtml }, orden: 0 });
      }
    } else if (plantillaId === "grid-clasico") {
      // Solo la grilla genérica necesita filas sembradas (su empty-state
      // ocultaría las columnas). Las vistas kanban/timeline/mosaico/checklist/
      // storyboard renderizan su estructura aunque arranquen sin filas.
      const filasIniciales = [0, 1, 2].map((orden) => ({ ...base, datos: {}, orden }));
      await supabase.from("herramienta_filas").insert(filasIniciales);
    }

    setSending(false);
    setMsg({
      type: "ok",
      text: "✓ Creado. Ponele nombre desde adentro y encontralo en la pestaña Exclusivas.",
    });
    setElegido(null);
    onCreated?.();
  }

  return (
    <div className={`esp-creator${flush ? " flush" : ""}`}>
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

      <div className="esp-tipo-cards">
        {OPCIONES.map((op) => (
          <button
            key={op.tipo}
            className={`esp-tipo-card${elegido === op.tipo ? " selected" : ""}`}
            style={{ "--esp-tipo-color": op.color } as React.CSSProperties}
            onClick={() => { setMsg(null); setElegido((cur) => (cur === op.tipo ? null : op.tipo)); }}
          >
            <span className="esp-tipo-icon"><Icon name={op.icono} size={15} /></span>
            <strong>{op.titulo}</strong>
          </button>
        ))}
      </div>

      {elegido && (
        <div className="esp-plantilla-box">
          <div className="esp-plantilla-box-head">
            <strong>Estilo {elegido === "tabla" ? "de cuadro de celdas" : "de documento"}</strong>
            <span>Tocá una para crearla. Empieza con esta estructura, podés editar todo después.</span>
          </div>
          <div className={`esp-plantilla-cards${sending ? " sending" : ""}`}>
            {elegido === "tabla"
              ? PLANTILLAS_TABLA.map((p) => (
                  <PlantillaTablaCard key={p.id} p={p} onClick={() => crear("tabla", p.id)} />
                ))
              : PLANTILLAS_DOCUMENTO.map((p) => (
                  <PlantillaDocCard key={p.id} id={p.id} titulo={p.titulo} descripcion={p.descripcion} estiloDoc={p.estiloDoc} heading={p.previewLineas[0]} onClick={() => crear("nota", p.id)} />
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlantillaDocCard({
  id, titulo, descripcion, estiloDoc, heading, onClick,
}: {
  id: string; titulo: string; descripcion: string; estiloDoc: string; heading: string; onClick: () => void;
}) {
  return (
    <button type="button" className="esp-plantilla-card" onClick={onClick}>
      <div className="esp-plantilla-a4-wrap">
        <div className={`esp-plantilla-a4 ${estiloDoc}`}>
          <DocPreview id={id} heading={heading} />
        </div>
      </div>
      <div className="esp-plantilla-info">
        <strong>{titulo}</strong>
        <span>{descripcion}</span>
      </div>
      <span className="esp-plantilla-go"><Icon name="arrow-right" size={15} /></span>
    </button>
  );
}

function Bars({ widths }: { widths: number[] }) {
  return (
    <>
      {widths.map((w, i) => <span key={i} className="esp-doc-bar-line" style={{ width: `${w}%` }} />)}
    </>
  );
}

function DocPreview({ id, heading }: { id: string; heading: string }) {
  if (id === "clasico") {
    return (
      <>
        <span className="esp-pp-l1">{heading}</span>
        <span className="esp-doc-rule" />
        <Bars widths={[80, 65, 70]} />
      </>
    );
  }
  if (id === "guion") {
    return (
      <>
        <span className="esp-doc-chip">INT.</span>
        <span className="esp-doc-bar-line esp-doc-bar-center" style={{ width: "55%" }} />
        <span className="esp-doc-bar-line esp-doc-bar-indent" style={{ width: "38%" }} />
        <span className="esp-doc-bar-line esp-doc-bar-indent" style={{ width: "28%" }} />
      </>
    );
  }
  if (id === "manifiesto") {
    return (
      <div className="esp-doc-manifiesto-row">
        <span className="esp-doc-bar" />
        <div className="esp-doc-manifiesto-txt">
          <span className="esp-pp-l1">{heading}</span>
          <span className="esp-pp-l1">no se puede actuar.</span>
        </div>
      </div>
    );
  }
  if (id === "diario") {
    return (
      <>
        <span className="esp-pp-l1 esp-doc-fecha">{heading}</span>
        <Bars widths={[75, 58]} />
        <span className="esp-pp-l1 esp-doc-fecha">Día 5</span>
        <Bars widths={[64]} />
      </>
    );
  }
  if (id === "tablon") {
    return (
      <>
        <span className="esp-pp-l1">{heading}</span>
        <div className="esp-doc-tablon-row">
          <span className="esp-doc-swatch" style={{ background: "#EE9962" }} />
          <span className="esp-doc-bar-line" style={{ width: "55%" }} />
        </div>
        <div className="esp-doc-tablon-row">
          <span className="esp-doc-swatch" style={{ background: "#5BEDD6" }} />
          <span className="esp-doc-bar-line" style={{ width: "45%" }} />
        </div>
      </>
    );
  }
  // minimalista
  return (
    <>
      <span className="esp-doc-dash" />
      <span className="esp-pp-l1">{heading}</span>
    </>
  );
}

function PlantillaTablaCard({ p, onClick }: { p: PlantillaTabla; onClick: () => void }) {
  return (
    <button type="button" className="esp-plantilla-card" onClick={onClick}>
      <div className="esp-plantilla-tabla-wrap">
        <TablaPreview id={p.id} p={p} />
      </div>
      <div className="esp-plantilla-info">
        <strong>{p.titulo}</strong>
        <span>{p.descripcion}</span>
      </div>
      <span className="esp-plantilla-go"><Icon name="arrow-right" size={15} /></span>
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
