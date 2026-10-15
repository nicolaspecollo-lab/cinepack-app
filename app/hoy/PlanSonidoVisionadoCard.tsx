"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import PlanSonidoPanel from "./PlanSonidoPanel";
import { usePlanSonidoEstado } from "./usePlanSonidoEstado";
import { usePlanSonidoFilas } from "./usePlanSonidoFilas";
import { CLASE_ESTADO_PLAN, estadoPlanDe } from "./planSonidoFilas";

// Tarjeta del Plan de sonido directo para Visionado (solo lectura).
// Muestra el estado del plan y abre el plan completo en una ventana sin botones de edición.
export default function PlanSonidoVisionadoCard({ fullName }: { fullName: string }) {
  const t = useTranslations("planSonido");
  const { fichas, loading: cargandoFichas } = usePlanSonidoFilas(fullName);
  const { plan, loading: cargandoPlan } = usePlanSonidoEstado(fullName);
  const [abierto, setAbierto] = useState(false);

  if (cargandoFichas || cargandoPlan) return null;

  const estado = estadoPlanDe(fichas.length, plan.publicado);
  // Misma regla que el aviso de "Aprobar y publicar": una ficha está lista si tiene datos.lista
  const listas = fichas.filter((f) => f.datos.lista).length;

  return (
    <>
      <div className="com-list">
        <div className="com">
          <div className="com-top">
            <span className="com-title">{t("cardTitle")}</span>
            <span className={`pill ${CLASE_ESTADO_PLAN[estado]}`}>{t(`planState_${estado}`)}</span>
          </div>
          <div className="com-text">{t("cardDesc")}</div>
          <div className="cons-meta">
            {t("cardCount", { total: fichas.length, ready: listas })}
            {" · "}
            {estado === "publicado"
              ? t("planHint_publicado", {
                  user: plan.publicadoPor,
                  date: new Date(plan.publicadoEn).toLocaleString(),
                })
              : t(`planHint_${estado}`)}
          </div>
          <button className="btn" onClick={() => setAbierto(true)}>
            {t("cardOpen")}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="dsr-overlay" onClick={() => setAbierto(false)}>
          <div className="dsr-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dsr-top">
              <span>{t("cardTitle")}</span>
              <button className="dsr-close" onClick={() => setAbierto(false)} title={t("cardClose")}>
                ✕
              </button>
            </div>
            <div className="dsr-body">
              <PlanSonidoPanel fullName={fullName} editable={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}