"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConflictoFrecuencias } from "./useConflictoFrecuencias";
import type { FrecuenciaDatos } from "./useConflictoFrecuencias";
import { useFrecuenciasFilas, ERROR_SIN_PROYECTO } from "./useFrecuenciasFilas";
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
  const { filas, loading, error, crear, editar, aprobar, borrar } = useFrecuenciasFilas(fullName);
  const filasConResultado = useConflictoFrecuencias(filas);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

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
      </div>

      {editable && (
        <div className="od-actionbar">
          <button className="cp-btn cp-btn-acc" onClick={() => setCreando(true)}>
            + {t("addFrequency")}
          </button>
        </div>
      )}

      {error && (
        <p className="amsg err" style={{ margin: "0 30px" }}>
          {error === ERROR_SIN_PROYECTO ? t("errNoProject") : error}
        </p>
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
    </div>
  );
}