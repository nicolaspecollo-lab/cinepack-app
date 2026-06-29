"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

type Jornada = {
  dia_numero: number;
  dia_total: number;
  fecha: string | null;
  ubicacion: string | null;
  citacion: string | null;
  escenas_dia: string | null;
  visionado: string | null;
};

const fmtFecha = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

export default function RodajePresentacion({ jornada, onClose }: { jornada: Jornada; onClose: () => void }) {
  const t = useTranslations("modoRodaje");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => {});

    function onFsChange() {
      if (!document.fullscreenElement) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  return (
    <div ref={ref} className="cp-rodaje-presentacion">
      <button className="cp-rp-close" onClick={onClose} title={t("exitEsc")}>✕</button>
      <div className="cp-rp-head">
        <span className="rodaje-live"><span className="hex"></span>{t("shootDay")}</span>
        <div className="cp-rp-day">
          {t("dayOf", { n: jornada.dia_numero })} <small>{t("ofTotal", { n: jornada.dia_total })}</small>
        </div>
        {jornada.fecha && <div className="cp-rp-fecha">{fmtFecha(jornada.fecha)}</div>}
      </div>
      <div className="cp-rp-grid">
        {jornada.citacion && (
          <div className="cp-rp-item"><span>{t("callTime")}</span><b>{jornada.citacion}</b></div>
        )}
        {jornada.ubicacion && (
          <div className="cp-rp-item"><span>{t("location")}</span><b>{jornada.ubicacion}</b></div>
        )}
        {jornada.escenas_dia && (
          <div className="cp-rp-item cp-rp-wide"><span>{t("dayScenes")}</span><b>{jornada.escenas_dia}</b></div>
        )}
        {jornada.visionado && (
          <div className="cp-rp-item"><span>{t("dailiesScreening")}</span><b>{jornada.visionado}</b></div>
        )}
      </div>
    </div>
  );
}
