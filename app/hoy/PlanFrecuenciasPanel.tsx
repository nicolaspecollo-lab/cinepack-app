"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import ToolMenu from "../components/ToolMenu";
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
  const [soloProblemas, setSoloProblemas] = useState(false);

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

  const filasPorJornada =
    jornadaActiva === "todas"
      ? filasConResultado
      : filasConResultado.filter((f) => f.datos.jornada === jornadaActiva);

  // Filas con problema (advertencia o conflicto) dentro de la jornada que se está viendo.
  const filasConProblema = filasPorJornada.filter((f) => f.resultado.nivel !== "ok");
  const numProblemas = filasConProblema.length;

  // El filtro solo actúa si hay algo que filtrar: al resolver el último problema, la tabla vuelve a verse entera.
  const filtroActivo = soloProblemas && numProblemas > 0;
  const filasVisibles = filtroActivo ? filasConProblema : filasPorJornada;

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
            <ToolMenu
              label={jornadaActiva === "todas" ? t("allDays") : `${t("colJornada")} ${jornadaActiva}`}
            >
              {(close) => (
                <div className="tm-section">
                  <button
                    type="button"
                    className={`tm-item ${jornadaActiva === "todas" ? "active" : ""}`}
                    onClick={() => { setJornadaSel("todas"); close(); }}
                  >
                    <span>{t("allDays")}</span>
                  </button>
                  {jornadas.map((j) => (
                    <button
                      key={j}
                      type="button"
                      className={`tm-item ${jornadaActiva === j ? "active" : ""}`}
                      onClick={() => { setJornadaSel(j); close(); }}
                    >
                      <span>{j}</span>
                    </button>
                  ))}
                </div>
              )}
            </ToolMenu>
            {numProblemas > 0 && (
              <button className="cp-btn" onClick={() => setSoloProblemas(!filtroActivo)}>
                {filtroActivo ? t("viewAll") : `${t("viewConflicts")} (${numProblemas})`}
              </button>
            )}
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