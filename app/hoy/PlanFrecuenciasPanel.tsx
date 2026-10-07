"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import { useConflictoFrecuencias } from "./useConflictoFrecuencias";
import type { FrecuenciaDatos } from "./useConflictoFrecuencias";
import { useFrecuenciasFilas, ERROR_SIN_PROYECTO } from "./useFrecuenciasFilas";
import { FRECUENCIAS_DEPARTAMENTO, FRECUENCIAS_HERRAMIENTA_ID } from "./frecuenciasFilas";
import { CarpetaArchivos } from "./HerramientaPanel";
import FrecuenciaTable from "./FrecuenciaTable";
import FrecuenciaFormModal from "./FrecuenciaFormModal";

export default function PlanFrecuenciasPanel({
  fullName,
  editable = false,
  puedeAprobar = false,
}: {
  fullName: string;
  editable?: boolean;
  puedeAprobar?: boolean;
}) {
  const t = useTranslations("frecuencias");
  // Textos de las pestañas: ya existen en el bloque "hp" y los usa el panel genérico.
  const tHp = useTranslations("hp");
  const { filas, loading, error, crear, editar, aprobar, borrar } = useFrecuenciasFilas(fullName);
  const filasConResultado = useConflictoFrecuencias(filas);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [vista, setVista] = useState<"tabla" | "archivos">("tabla");

  async function guardar(datos: FrecuenciaDatos) {
    if (editandoId) {
      await editar(editandoId, datos);
      setEditandoId(null);
    } else {
      await crear(datos);
      setCreando(false);
    }
  }

  function cerrarModal() {
    setCreando(false);
    setEditandoId(null);
  }

  const filaEditando = editandoId ? filas.find((f) => f.id === editandoId)?.datos ?? null : null;

  return (
    <div className="hp-open">
      <div className="hp-open-head">
        <h3><span className="hex"></span> {t("title")}</h3>

        <div className="hp-pc-toolrow" style={{ marginLeft: "auto", padding: 0, border: "none" }}>
          <button
            className={`hp-pc-toolrow-btn ${vista === "tabla" ? "active" : ""}`}
            onClick={() => setVista("tabla")}
          >
            <Icon name="table" size={12} /> {tHp("viewTable")}
          </button>
          <button
            className={`hp-pc-toolrow-btn ${vista === "archivos" ? "active" : ""}`}
            onClick={() => setVista("archivos")}
          >
            <Icon name="folder" size={12} /> {tHp("viewFiles")}
          </button>
        </div>
      </div>

      {error && (
        <p className="amsg err" style={{ margin: "0 30px" }}>
          {error === ERROR_SIN_PROYECTO ? t("errNoProject") : error}
        </p>
      )}

      {vista === "tabla" ? (
        <>
          {editable && (
            <div className="od-actionbar">
              <button className="cp-btn cp-btn-acc" onClick={() => setCreando(true)}>
                + {t("addFrequency")}
              </button>
            </div>
          )}

          {loading ? (
            <p className="cons-text">{t("loading")}</p>
          ) : (
            <FrecuenciaTable
              filas={filasConResultado}
              editable={editable}
              puedeAprobar={puedeAprobar}
              onEditar={(id) => setEditandoId(id)}
              onBorrar={borrar}
              onAprobar={aprobar}
            />
          )}

          {editable && (creando || editandoId) && (
            <FrecuenciaFormModal inicial={filaEditando} onGuardar={guardar} onCancelar={cerrarModal} />
          )}
        </>
      ) : (
        <CarpetaArchivos
          departamento={FRECUENCIAS_DEPARTAMENTO}
          herramientaId={FRECUENCIAS_HERRAMIENTA_ID}
          editable={editable}
        />
      )}
    </div>
  );
}