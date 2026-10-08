"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import { CarpetaArchivos } from "./HerramientaPanel";
import { MOODBOARD_HERRAMIENTA_ID } from "./moodboardFilas";
import { ERROR_SIN_PROYECTO, useMoodboardFila } from "./useMoodboardFila";

// Konva necesita el navegador (canvas), así que el lienzo se carga solo en el cliente.
const MoodboardLienzo = dynamic(() => import("./MoodboardLienzo"), { ssr: false });

// HerramientasPanel sigue importando el id desde aquí.
export { MOODBOARD_HERRAMIENTA_ID };

type Props = {
  departamento: string;
  fullName: string;
  editable: boolean;
};

export default function MoodboardPanel({ departamento, fullName, editable }: Props) {
  const t = useTranslations("moodboard");
  const { existe, elementos, loading, error, crear } = useMoodboardFila(fullName);
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

      {error && <p className="amsg err">{error === ERROR_SIN_PROYECTO ? t("noProject") : error}</p>}

      {vista === "archivos" ? (
        <CarpetaArchivos departamento={departamento} herramientaId={MOODBOARD_HERRAMIENTA_ID} editable={editable} />
      ) : loading ? (
        <p className="amsg">{t("loading")}</p>
      ) : existe ? (
        <MoodboardLienzo elementos={elementos} editable={editable} />
      ) : (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
          {editable && (
            <button className="cp-btn cp-btn-acc" onClick={() => crear()}>
              + {t("create")}
            </button>
          )}
        </div>
      )}
    </>
  );
}