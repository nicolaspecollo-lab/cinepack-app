"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import CarpetaNavegable from "./CarpetaNavegable";
import { CAMPO_TITULAR, CAMPOS_POR_TIPO, COLOR_ETAPA, TIPOS_EVENTO, type EventoProyecto, type EventoTipo } from "./eventosCalendario";

const TABS = ["bases", "entregas", "recibidos"] as const;
type Tab = (typeof TABS)[number];

export default function DossierConvocatoria({
  evento,
  editable,
  onClose,
}: {
  evento: EventoProyecto;
  editable: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("ciclo");
  const tEt = useTranslations("etapas");
  const [tab, setTab] = useState<Tab>("entregas");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ev, setEv] = useState<EventoProyecto>(evento);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setProjectId(localStorage.getItem("cinepack-proyecto-id"));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const color = COLOR_ETAPA[ev.tipo];
  const titulo = ev.titulo || ev.datos?.[CAMPO_TITULAR[ev.tipo]] || tEt(ev.tipo);
  const campos = CAMPOS_POR_TIPO[ev.tipo].filter((c) => ev.datos?.[c.key]);
  const enlace = ev.datos?.enlace;
  const base = projectId ? `${projectId}/_convocatorias/${ev.id}` : null;

  async function guardar(nuevo: { tipo: EventoTipo; fecha: string; datos: Record<string, string>; aviso_dias: number }) {
    const supabase = createClient();
    const nuevoTitulo = nuevo.datos[CAMPO_TITULAR[nuevo.tipo]] ?? "";
    await supabase.from("eventos_proyecto")
      .update({ tipo: nuevo.tipo, fecha: nuevo.fecha, titulo: nuevoTitulo, datos: nuevo.datos, aviso_dias: nuevo.aviso_dias, updated_at: new Date().toISOString() })
      .eq("id", ev.id);
    setEv({ ...ev, ...nuevo, titulo: nuevoTitulo });
    setEditing(false);
    window.dispatchEvent(new CustomEvent("cp-cal-changed"));
  }

  const contenido = (
    <div className="dsr-overlay" onClick={onClose}>
      <div className="dsr-panel" style={{ borderTopColor: color }} onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <span className="dsr-eyebrow"><span className="hex" style={{ background: color }} /> {t("dossierTitle")}</span>
          <button className="dsr-close" onClick={onClose} title="Esc">✕</button>
        </div>

        {editing ? (
          <InfoForm ev={ev} onGuardar={guardar} onCancelar={() => setEditing(false)} />
        ) : (
          <div className="dsr-head">
            <div className="dsr-head-main">
              <div className="dsr-tipo" style={{ color }}>{tEt(ev.tipo)}</div>
              <div className="dsr-titulo">{titulo}</div>
              <div className="dsr-fecha">{fmt(ev.fecha)}</div>
              {enlace && (
                <a className="dsr-enlace" href={hrefDe(enlace)} target="_blank" rel="noopener noreferrer">
                  {t("openLink")} ↗
                </a>
              )}
            </div>
            <div className="dsr-head-side">
              {campos.length > 0 && (
                <div className="dsr-meta">
                  {campos.map((c) => (
                    <div key={c.key} className="dsr-meta-item">
                      <span className="dsr-meta-lab">{c.label}</span>
                      <span className="dsr-meta-val">{ev.datos[c.key]}</span>
                    </div>
                  ))}
                </div>
              )}
              {editable && <button className="cp-btn" onClick={() => setEditing(true)}>{t("editInfo")}</button>}
            </div>
          </div>
        )}

        <div className="dsr-tabs">
          {TABS.map((tb) => (
            <button
              key={tb}
              className={`dsr-tab ${tb === tab ? "on" : ""}`}
              style={tb === tab ? { background: color, borderColor: color, color: "#0D0D12" } : undefined}
              onClick={() => setTab(tb)}
            >
              {tb === "bases" ? t("tab_bases") : tb === "entregas" ? t("tab_entregas") : t("tab_recibidos")}
            </button>
          ))}
        </div>

        <div className="dsr-body">
          {base ? <CarpetaNavegable key={tab} base={`${base}/${tab}`} editable={editable} /> : null}
        </div>

        <div className="dsr-foot">
          <span className="dsr-foot-note"><span className="hex" /> {t("dossierNote")}</span>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  const host = document.querySelector(".cp-dash") ?? document.body;
  return createPortal(contenido, host);
}

function InfoForm({
  ev,
  onGuardar,
  onCancelar,
}: {
  ev: EventoProyecto;
  onGuardar: (nuevo: { tipo: EventoTipo; fecha: string; datos: Record<string, string>; aviso_dias: number }) => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("ciclo");
  const tEt = useTranslations("etapas");
  const [tipo, setTipo] = useState<EventoTipo>(ev.tipo);
  const [fecha, setFecha] = useState(ev.fecha);
  const [datos, setDatos] = useState<Record<string, string>>({ ...ev.datos });
  const [aviso, setAviso] = useState(ev.aviso_dias);
  const campos = CAMPOS_POR_TIPO[tipo];
  const set = (k: string, v: string) => setDatos((d) => ({ ...d, [k]: v }));

  return (
    <div className="dsr-form" style={{ borderTopColor: COLOR_ETAPA[tipo] }}>
      <div className="cal-seg">
        {TIPOS_EVENTO.map((tp) => (
          <button key={tp} className={`cal-seg-btn ${tp === tipo ? "on" : ""}`}
            style={tp === tipo ? { background: COLOR_ETAPA[tp], borderColor: COLOR_ETAPA[tp], color: "#0D0D12" } : undefined}
            onClick={() => setTipo(tp)}>
            {tEt(tp)}
          </button>
        ))}
      </div>
      <div className="cal-form-grid">
        <label className="cal-field"><span>{t("fDate")}</span><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        {campos.map((c) => (
          <label key={c.key} className={`cal-field ${c.tipo === "largo" ? "wide" : ""}`}>
            <span>{c.label}</span>
            {c.tipo === "largo"
              ? <textarea rows={2} value={datos[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />
              : <input type={c.tipo === "money" ? "number" : "text"} value={datos[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />}
          </label>
        ))}
        <label className="cal-field wide"><span>{t("linkLabel")}</span><input type="url" placeholder="https://…" value={datos.enlace ?? ""} onChange={(e) => set("enlace", e.target.value)} /></label>
        <label className="cal-field"><span>{t("fAlert")}</span><input type="number" min={0} value={aviso} onChange={(e) => setAviso(Number(e.target.value))} /></label>
      </div>
      <div className="cal-form-actions">
        <button className="cp-btn cp-btn-acc" onClick={() => onGuardar({ tipo, fecha, datos, aviso_dias: aviso })}>{t("save")}</button>
        <button className="cp-btn" onClick={onCancelar}>{t("cancel")}</button>
      </div>
    </div>
  );
}

function hrefDe(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function fmt(iso: string) {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}
