"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import type { FrecuenciaDatos, ResultadoInterferencia } from "./useConflictoFrecuencias";

export default function FrecuenciaTable({
  filas,
  editable = true,
  puedeAprobar = false,
  onEditar,
  onBorrar,
  onAprobar,
}: {
  filas: Array<{ id: string; datos: FrecuenciaDatos; resultado: ResultadoInterferencia }>;
  editable?: boolean;
  puedeAprobar?: boolean;
  onEditar: (id: string) => void;
  onBorrar: (id: string) => void;
  onAprobar?: (id: string) => void;
}) {
  const t = useTranslations("frecuencias");
  // Fila cuyo detalle de conflicto está desplegado (solo una a la vez).
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  // La columna de acciones existe si el usuario puede editar o aprobar.
  const hayAcciones = editable || puedeAprobar;
  // Jornada, Equipo, Tipo, Asignado a, Frecuencia, Reserva, Estado (+ Acciones).
  const numColumnas = hayAcciones ? 8 : 7;

  if (filas.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("emptyTitle")}</h4>
        <p>{t("emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="twrap fr-table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>{t("colJornada")}</th>
            <th>{t("colEquipo")}</th>
            <th>{t("colTipo")}</th>
            <th>{t("colAsignadoA")}</th>
            <th>{t("colFrecuencia")}</th>
            <th>{t("colReserva")}</th>
            <th>{t("colEstado")}</th>
            {hayAcciones && <th className="fr-actions">{t("colAcciones")}</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map(({ id, datos, resultado }) => {
            const claseFila =
              resultado.nivel === "conflicto"
                ? "fr-row-conflicto"
                : resultado.nivel === "advertencia"
                ? "fr-row-advertencia"
                : undefined;
            const pillClase =
              resultado.nivel === "conflicto" ? "p-bad" : resultado.nivel === "advertencia" ? "p-warn" : "p-ok";
            const pillTexto =
              resultado.nivel === "conflicto" ? t("stateConflict") : resultado.nivel === "advertencia" ? t("stateWarning") : t("stateOk");

            // Solo se aprueba lo pendiente, con frecuencia asignada y sin conflicto.
            const puedeAprobarFila =
              puedeAprobar &&
              !!onAprobar &&
              datos.estado_aprobacion === "pendiente" &&
              datos.frecuencia_mhz !== null &&
              resultado.nivel !== "conflicto";

            const tieneDetalle = resultado.nivel !== "ok";
            const abierto = abiertoId === id;

            return (
              <Fragment key={id}>
                <tr className={claseFila}>
                  <td className="mono">{datos.jornada}</td>
                  <td><b>{datos.equipo}</b></td>
                  <td>{datos.tipo || "—"}</td>
                  <td>{datos.asignado_a || "—"}</td>
                  <td className="mono">{datos.frecuencia_mhz !== null ? `${datos.frecuencia_mhz} MHz` : t("pending")}</td>
                  <td className="mono">
                    {datos.reserva_mhz !== null && datos.reserva_mhz !== undefined ? `${datos.reserva_mhz} MHz` : "—"}
                  </td>
                  <td>
                    {tieneDetalle ? (
                      <span
                        className={`pill ${pillClase} fr-pill-link`}
                        role="button"
                        tabIndex={0}
                        aria-expanded={abierto}
                        title={t("seeDetail")}
                        onClick={() => setAbiertoId(abierto ? null : id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setAbiertoId(abierto ? null : id);
                          }
                        }}
                      >
                        {pillTexto}
                      </span>
                    ) : (
                      <span className={`pill ${pillClase}`}>{pillTexto}</span>
                    )}
                    {datos.estado_aprobacion === "pendiente" ? (
                      <span className="pill p-warn fr-pill-gap">{t("approvalPending")}</span>
                    ) : (
                      <span className="pill p-ok fr-pill-gap">{t("approved")}</span>
                    )}
                  </td>
                  {hayAcciones && (
                    <td className="fr-actions">
                      {puedeAprobarFila && (
                        <button className="cp-btn cp-btn-acc" onClick={() => onAprobar?.(id)} title={t("approve")}>
                          {t("approve")}
                        </button>
                      )}
                      {editable && (
                        <>
                          <button className="cp-btn" onClick={() => onEditar(id)} title={t("edit")}>
                            <Icon name="pencil" size={12} />
                          </button>
                          <button className="cp-btn" onClick={() => onBorrar(id)} title={t("delete")}>
                            <Icon name="trash" size={12} />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>

                {abierto && tieneDetalle && (
                  <tr>
                    <td colSpan={numColumnas}>
                      <div className="fr-detail">
                        <b>
                          {resultado.motivo === "intermodulacion" ? t("reasonIntermod") : t("reasonSeparation")}
                        </b>
                        <div>{t("conflictWith")}</div>
                        <ul>
                          {(resultado.causadoPor ?? []).map((otroId) => {
                            const otra = filas.find((f) => f.id === otroId);
                            if (!otra) return null;
                            return (
                              <li key={otroId}>
                                {otra.datos.equipo} · {otra.datos.frecuencia_mhz} MHz · {otra.datos.departamento_responsable}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}