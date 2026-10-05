"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConflictoFrecuencias } from "./useConflictoFrecuencias";
import type { FrecuenciaDatos } from "./useConflictoFrecuencias";
import FrecuenciaTable from "./FrecuenciaTable";
import FrecuenciaFormModal from "./FrecuenciaFormModal";

// TODO: datos de prueba solo para ver la interfaz funcionando.
// Reemplazar por la carga real desde Supabase en cuanto Nicolás confirme
// si usamos herramienta_filas (como Orden de Rodaje) o se extiende DocumentosPanel.
const FILAS_DEMO: Array<{ id: string; datos: FrecuenciaDatos }> = [
  {
    id: "demo-1",
    datos: {
      jornada: "2026-10-09",
      equipo: "Petaca inalámbrica - Actor principal",
      departamento_responsable: "Sonido",
      frecuencia_mhz: 650.0,
      estado_aprobacion: "aprobada",
      creado_por_departamento: "Sonido",
    },
  },
  {
    id: "demo-2",
    datos: {
      jornada: "2026-10-09",
      equipo: "Walkie Canal 3",
      departamento_responsable: "Producción",
      frecuencia_mhz: 650.3,
      estado_aprobacion: "pendiente",
      creado_por_departamento: "Producción",
    },
  },
];

export default function PlanFrecuenciasPanel() {
  const t = useTranslations("frecuencias");
  const [filas, setFilas] = useState(FILAS_DEMO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const filasConResultado = useConflictoFrecuencias(filas);

  function guardar(datos: FrecuenciaDatos) {
    if (editandoId) {
      setFilas((prev) => prev.map((f) => (f.id === editandoId ? { ...f, datos } : f)));
      setEditandoId(null);
    } else {
      const id = `demo-${Date.now()}`;
      setFilas((prev) => [...prev, { id, datos }]);
      setCreando(false);
    }
  }

  function borrar(id: string) {
    setFilas((prev) => prev.filter((f) => f.id !== id));
  }

  const filaEditando = editandoId ? filas.find((f) => f.id === editandoId)?.datos ?? null : null;

  return (
    <div className="hp-open">
      <div className="hp-open-head">
        <h3><span className="hex"></span> {t("title")}</h3>
      </div>
      <div className="od-actionbar">
        <button className="cp-btn cp-btn-acc" onClick={() => setCreando(true)}>
          + {t("addFrequency")}
        </button>
      </div>
      <FrecuenciaTable
        filas={filasConResultado}
        onEditar={(id) => setEditandoId(id)}
        onBorrar={borrar}
      />

      {(creando || editandoId) && (
        <FrecuenciaFormModal
          inicial={filaEditando}
          onGuardar={guardar}
          onCancelar={() => { setCreando(false); setEditandoId(null); }}
        />
      )}
    </div>
  );
}