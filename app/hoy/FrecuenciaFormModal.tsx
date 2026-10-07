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
  const [tipo, setTipo] = useState(inicial?.tipo ?? "");
  const [asignadoA, setAsignadoA] = useState(inicial?.asignado_a ?? "");
  const [departamento, setDepartamento] = useState(inicial?.departamento_responsable ?? "");
  const [frecuencia, setFrecuencia] = useState(
    inicial?.frecuencia_mhz !== null && inicial?.frecuencia_mhz !== undefined ? String(inicial.frecuencia_mhz) : ""
  );
  const [reserva, setReserva] = useState(
    inicial?.reserva_mhz !== null && inicial?.reserva_mhz !== undefined ? String(inicial.reserva_mhz) : ""
  );
  const [posicionPetaca, setPosicionPetaca] = useState(inicial?.posicion_petaca ?? "");

  // El estado de aprobación no se edita en este formulario: solo Sonido puede
  // aprobar, mediante una acción propia en la tabla.
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
      tipo: tipo.trim(),
      asignado_a: asignadoA.trim(),
      reserva_mhz: reserva.trim() === "" ? null : Number(reserva),
      posicion_petaca: posicionPetaca.trim(),
    });
  }

  return (
    <div className="dsr-overlay" onClick={onCancelar}>
      <div className="dsr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <span>{inicial ? t("editTitle") : t("newTitle")}</span>
          <button className="dsr-close" onClick={onCancelar} title={t("close")}>✕</button>
        </div>

        <div className="fr-form">
          <label className="cal-field">
            <span>{t("colJornada")}</span>
            <input type="date" value={jornada} onChange={(e) => setJornada(e.target.value)} />
          </label>
          <label className="cal-field">
            <span>{t("colEquipo")}</span>
            <input value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder={t("equipoPlaceholder")} />
          </label>
          <label className="cal-field">
            <span>{t("colTipo")}</span>
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder={t("tipoPlaceholder")} />
          </label>
          <label className="cal-field">
            <span>{t("colAsignadoA")}</span>
            <input value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} placeholder={t("asignadoPlaceholder")} />
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
          <label className="cal-field">
            <span>{t("colReserva")} {t("optional")}</span>
            <input
              type="number"
              step="0.01"
              value={reserva}
              onChange={(e) => setReserva(e.target.value)}
              placeholder={t("reservaPlaceholder")}
            />
          </label>
          <label className="cal-field">
            <span>{t("colPosicionPetaca")} {t("optional")}</span>
            <input value={posicionPetaca} onChange={(e) => setPosicionPetaca(e.target.value)} placeholder={t("petacaPlaceholder")} />
          </label>

          <div className="cal-form-actions">
            <button className="cp-btn cp-btn-acc" onClick={guardar}>{t("saveEquipment")}</button>
            <button className="cp-btn" onClick={onCancelar}>{t("cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}