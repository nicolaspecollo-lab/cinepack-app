"use client";

import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import type { FrecuenciaDatos, ResultadoInterferencia } from "./useConflictoFrecuencias";

export default function FrecuenciaTable({
  filas,
  onEditar,
  onBorrar,
}: {
  filas: Array<{ id: string; datos: FrecuenciaDatos; resultado: ResultadoInterferencia }>;
  onEditar: (id: string) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("frecuencias");

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
    <div className="twrap" style={{ padding: "0 30px" }}>
      <table className="t">
        <thead>
          <tr>
            <th>{t("colJornada")}</th>
            <th>{t("colEquipo")}</th>
            <th>{t("colDepartamento")}</th>
            <th>{t("colFrecuencia")}</th>
            <th>{t("colEstado")}</th>
            <th style={{ textAlign: "right" }}>{t("colAcciones")}</th>
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
            const pillClase = resultado.nivel === "ok" ? "p-ok" : "p-warn";
            const pillTexto =
              resultado.nivel === "conflicto" ? t("stateConflict") : resultado.nivel === "advertencia" ? t("stateWarning") : t("stateOk");

            return (
              <tr key={id} className={claseFila}>
                <td className="mono">{datos.jornada}</td>
                <td><b>{datos.equipo}</b></td>
                <td>{datos.departamento_responsable}</td>
                <td className="mono">{datos.frecuencia_mhz !== null ? `${datos.frecuencia_mhz} MHz` : t("pending")}</td>
                <td>
                  <span className={`pill ${pillClase}`}>{pillTexto}</span>
                  {datos.estado_aprobacion === "pendiente" && (
                    <span className="pill p-warn" style={{ marginLeft: 6 }}>{t("approvalPending")}</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="cp-btn" onClick={() => onEditar(id)} title={t("edit")}>
                    <Icon name="pencil" size={12} />
                  </button>
                  <button className="cp-btn" onClick={() => onBorrar(id)} title={t("delete")} style={{ marginLeft: "6px" }}>
                    <Icon name="trash" size={12} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}