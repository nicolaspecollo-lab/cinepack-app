"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import CarpetaNavegable from "./CarpetaNavegable";
import { CAMPO_TITULAR, CAMPOS_POR_TIPO, COLOR_ETAPA, type EventoProyecto } from "./eventosCalendario";

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

  useEffect(() => {
    setProjectId(localStorage.getItem("cinepack-proyecto-id"));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const color = COLOR_ETAPA[evento.tipo];
  const titulo = evento.titulo || evento.datos?.[CAMPO_TITULAR[evento.tipo]] || tEt(evento.tipo);
  const campos = CAMPOS_POR_TIPO[evento.tipo].filter((c) => evento.datos?.[c.key]).slice(0, 4);
  const fecha = fmt(evento.fecha);
  const base = projectId ? `${projectId}/_convocatorias/${evento.id}` : null;

  const contenido = (
    <div className="dsr-overlay" onClick={onClose}>
      <div className="dsr-panel" style={{ borderTopColor: color }} onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <span className="dsr-eyebrow"><span className="hex" style={{ background: color }} /> {t("dossierTitle")}</span>
          <button className="dsr-close" onClick={onClose} title="Esc">✕</button>
        </div>

        <div className="dsr-head">
          <div className="dsr-head-main">
            <div className="dsr-tipo" style={{ color }}>{tEt(evento.tipo)}</div>
            <div className="dsr-titulo">{titulo}</div>
            <div className="dsr-fecha">{fecha}</div>
          </div>
          {campos.length > 0 && (
            <div className="dsr-meta">
              {campos.map((c) => (
                <div key={c.key} className="dsr-meta-item">
                  <span className="dsr-meta-lab">{c.label}</span>
                  <span className="dsr-meta-val">{evento.datos[c.key]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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

function fmt(iso: string) {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}
