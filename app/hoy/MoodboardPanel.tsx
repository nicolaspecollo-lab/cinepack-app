"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import { CarpetaArchivos } from "./HerramientaPanel";

export const MOODBOARD_HERRAMIENTA_ID = "arte-moodboard";

type Props = {
  departamento: string;
  editable: boolean;
};

export default function MoodboardPanel({ departamento, editable }: Props) {
  const t = useTranslations("moodboard");
  const [vista, setVista] = useState<"tablero" | "archivos">("tablero");

  // Mismas pestañas Tablero / Archivos que el resto de herramientas: se portan
  // a la cabecera de HerramientasPanel (#hp-open-head-tabs) y, si todavía no
  // existe ese nodo, caen en línea.
  const tabs = (
    <div className="dsubtabs hp-view-tabs">
      <button className={`dsubtab ${vista === "tablero" ? "active" : ""}`} onClick={() => setVista("tablero")}>
        <Icon name="film" size={12} /> {t("tabBoard")}
      </button>
      <button className={`dsubtab ${vista === "archivos" ? "active" : ""}`} onClick={() => setVista("archivos")}>
        <Icon name="folder" size={12} /> {t("tabFiles")}
      </button>
    </div>
  );
  const slot = typeof document !== "undefined" ? document.getElementById("hp-open-head-tabs") : null;

  return (
    <>
      {slot ? createPortal(tabs, slot) : tabs}

      {vista === "tablero" ? (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
          {editable && <button className="cp-btn cp-btn-acc">+ {t("create")}</button>}
        </div>
      ) : (
        <CarpetaArchivos departamento={departamento} herramientaId={MOODBOARD_HERRAMIENTA_ID} editable={editable} />
      )}
    </>
  );
}