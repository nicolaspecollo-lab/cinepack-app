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
  // Los conflictos se calculan con TODAS las filas; el selector solo filtra lo que se ve.
  const filasConResultado = useConflictoFrecuencias(filas);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [vista, setVista] = useState<"tabla" | "archivos">("tabla");
  const [jornadaSel, setJornadaSel] = useState<string>("todas");

  // Jornadas que tienen equipos, ordenadas de más antigua a más reciente.
  const jornadas = Array.from(
    new Set(filasConResultado.map((f) => f.datos.jornada).filter((j) => j !== ""))
  ).sort();

  // Si la jornada elegida ya no existe (por ejemplo, se borró su último equipo), se vuelve a "todas".
  const jornadaActiva = jornadaSel !== "todas" && jornadas.includes(jornadaSel) ? jornadaSel : "todas";

  // Fecha de hoy en formato AAAA-MM-DD, en hora local (las jornadas se guardan así).
  const hoy = new Date().toLocaleDateString("sv-SE");
  const esPasada = jornadaActiva !== "todas" && jornadaActiva < hoy;

  // Una jornada pasada se abre en solo lectura: no se edita ni se aprueba.
  const editableEfectivo = editable && !esPasada;
  const puedeAprobarEfectivo = puedeAprobar && !esPasada;

  const filasVisibles =
    jornadaActiva === "todas"
      ? filasConResultado
      : filasConResultado.filter((f) => f.datos.jornada === jornadaActiva);

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

        <div className="hp-open-head-tabs">
          <div className="hp-pc-toolrow">
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
      </div>

      {error && (
        <p className="amsg err fr-msg">
          {error === ERROR_SIN_PROYECTO ? t("errNoProject") : error}
        </p>
      )}

      {vista === "tabla" ? (
        <>
          <div className="fr-toolbar">
            <label className="cal-field">
              <span>{t("colJornada")}</span>
              <select
                className="cdp-select"
                value={jornadaActiva}
                onChange={(e) => setJornadaSel(e.target.value)}
              >
                <option value="todas">{t("allDays")}</option>
                {jornadas.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </label>
            {esPasada && <span className="pill p-warn">{t("pastDay")}</span>}
          </div>

          {editableEfectivo && (
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
              filas={filasVisibles}
              editable={editableEfectivo}
              puedeAprobar={puedeAprobarEfectivo}
              onEditar={(id) => setEditandoId(id)}
              onBorrar={borrar}
              onAprobar={aprobar}
            />
          )}

          {editableEfectivo && (creando || editandoId) && (
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