"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { FrecuenciaDatos, EstadoAprobacion } from "./useConflictoFrecuencias";

export default function FrecuenciaFormModal({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: FrecuenciaDatos | null; // null = creando una nueva
  onGuardar: (datos: FrecuenciaDatos) => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("frecuencias");
  const [jornada, setJornada] = useState(inicial?.jornada ?? "");
  const [equipo, setEquipo] = useState(inicial?.equipo ?? "");
  const [departamento, setDepartamento] = useState(inicial?.departamento_responsable ?? "");
  const [frecuencia, setFrecuencia] = useState(
    inicial?.frecuencia_mhz !== null && inicial?.frecuencia_mhz !== undefined ? String(inicial.frecuencia_mhz) : ""
  );
  
// El estado de aprobación no se edita en este formulario: solo Sonido puede
// aprobar, mediante una acción propia en la tabla (pendiente de construir).
// Acá se conserva tal cual venía, o "pendiente" si es una fila nueva.
const estadoAprobacion: EstadoAprobacion = inicial?.estado_aprobacion ?? "pendiente";

  function guardar() {
    if (!jornada || !equipo || !departamento) return; // validación mínima
    onGuardar({
      jornada,
      equipo,
      departamento_responsable: departamento,
      frecuencia_mhz: frecuencia.trim() === "" ? null : Number(frecuencia),
      estado_aprobacion: estadoAprobacion,
      creado_por_departamento: inicial?.creado_por_departamento ?? departamento,
      notas: inicial?.notas,
    });
  }

  return (
    <div className="dsr-overlay" onClick={onCancelar}>
      <div className="dsr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <span>{inicial ? t("editTitle") : t("newTitle")}</span>
          <button className="dsr-close" onClick={onCancelar} title={t("close")}>✕</button>
        </div>

        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="cal-field">
            <span>{t("colJornada")}</span>
            <input type="date" value={jornada} onChange={(e) => setJornada(e.target.value)} />
          </label>
          <label className="cal-field">
            <span>{t("colEquipo")}</span>
            <input value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder={t("equipoPlaceholder")} />
          </label>
          <label className="cal-field">
            <span>{t("colDepartamento")}</span>
            <input value={departamento} onChange={(e) => setDepartamento(e.target.value)} placeholder={t("departamentoPlaceholder")} />
          </label>
          <label className="cal-field">
            <span>{t("colFrecuencia")}</span>
            <input
              type="number"
              step="0.01"
              value={frecuencia}
              onChange={(e) => setFrecuencia(e.target.value)}
              placeholder={t("frecuenciaPlaceholder")}
            />
          </label>

          <div className="cal-form-actions">
            <button className="cp-btn cp-btn-acc" onClick={guardar}>{t("save")}</button>
            <button className="cp-btn" onClick={onCancelar}>{t("cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}