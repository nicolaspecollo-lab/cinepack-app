"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CLASE_ESTADO_FICHA,
  CLASE_ESTADO_PLAN,
  CLASE_RIESGO,
  METODOS,
  RIESGOS,
  estadoDe,
  estadoPlanDe,
  hayCambiosTrasPublicar,
  puedeMarcarLista,
  type FichaEscena,
} from "./planSonidoFilas";
import { usePlanSonidoEstado } from "./usePlanSonidoEstado";
import { usePlanSonidoFilas, type FilaFicha } from "./usePlanSonidoFilas";

type Props = { fullName: string; editable: boolean };

// Para ordenar las fichas por número de escena. Lo que no sea número va al final.
function numeroDe(escena: string): number {
  const n = parseInt(escena, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

export default function PlanSonidoPanel({ fullName, editable }: Props) {
  const t = useTranslations("planSonido");
  const { fichas, loading, error, crear, editar, marcarLista } = usePlanSonidoFilas(fullName);
  const { plan, loading: cargandoPlan, error: errorPlan, publicar } = usePlanSonidoEstado(fullName); // PUBLICAR

  const ordenadas = useMemo(
    () => [...fichas].sort((a, b) => numeroDe(a.datos.escena) - numeroDe(b.datos.escena)),
    [fichas]
  );

  // Nueva ficha: propone el número de escena siguiente al más alto que exista.
  function anadirFicha() {
    const numeros = fichas.map((f) => parseInt(f.datos.escena, 10)).filter((n) => !Number.isNaN(n));
    const siguiente = numeros.length ? Math.max(...numeros) + 1 : 1;
    crear({
      escena: String(siguiente),
      metodo: "",
      riesgo: "",
      estrategia: "",
      retos: "",
      wildtrack: "",
      lista: false,
    });
  }

  // Guarda un campo solo si de verdad cambió. Así, entrar y salir de un campo sin tocar
  // nada no genera un guardado ni reabre una ficha que ya estaba lista.
  function cambiar<K extends keyof FichaEscena>(fila: FilaFicha, campo: K, valor: FichaEscena[K]) {
    if (fila.datos[campo] === valor) return;
    editar(fila.id, { ...fila.datos, [campo]: valor });
  }

  // PUBLICAR: pide confirmación diciendo cuántas fichas no están listas y, si se acepta, publica.
  async function publicarPlan() {
    const sinLista = ordenadas.filter((f) => !f.datos.lista).length;
    const texto =
      sinLista > 0 ? t("confirmPublishPending", { count: sinLista }) : t("confirmPublish");
    if (!window.confirm(texto)) return;
    await publicar();
  }

  if (loading || cargandoPlan) return null;

  const botonNuevaFicha = (
    <button className="cp-btn cp-btn-acc" onClick={anadirFicha}>
      {t("addScene")}
    </button>
  );

  const botonAnadir = <div className="hp-actions">{botonNuevaFicha}</div>;

  const fallo = error ?? errorPlan;
  if (fallo) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <p>{fallo}</p>
      </div>
    );
  }

  // Estado del plan completo. Vacío, Borrador y Modificado se calculan; Publicado viene de la base de datos.
  const estadoPlan = estadoPlanDe(
    ordenadas.length,
    plan.publicado,
    hayCambiosTrasPublicar(fichas, plan.publicadoEn)
  );
  
  const barraEstadoPlan = (
    <div className="doc-status">
      <span className={`pill ${CLASE_ESTADO_PLAN[estadoPlan]}`}>{t(`planState_${estadoPlan}`)}</span>
      <span className="txt">
        {estadoPlan === "publicado"
          ? t("planHint_publicado", {
              user: plan.publicadoPor,
              date: new Date(plan.publicadoEn).toLocaleString(),
            })
          : t(`planHint_${estadoPlan}`)}
      </span>
    </div>
  );

  // PUBLICAR: los botones de abajo. "Aprobar y publicar" solo para quien edita y con el plan en Borrador.
  const botonera = (
    <div className="hp-actions">
      {botonNuevaFicha}
      {(estadoPlan === "borrador" || estadoPlan === "modificado") && (
        <button className="cp-btn cp-btn-acc" onClick={publicarPlan}>
          {t("publish")}
        </button>
      )}
    </div>
  );

  if (ordenadas.length === 0) {
    return (
      <>
        {barraEstadoPlan}
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
          {editable && botonAnadir}
        </div>
      </>
    );
  }

  return (
    <div className="sdir-wrap">
      {barraEstadoPlan}
      <div className="sdir-grid hp-galeria">
        {ordenadas.map((fila) => {
          const d = fila.datos;
          const estado = estadoDe(d);
          const listaParaMarcar = puedeMarcarLista(d);

          return (
            <div key={fila.id} className="sdir-card">
              <div className="sdir-head">
                {editable ? (
                  <input
                    className="sdir-esc"
                    defaultValue={d.escena}
                    aria-label={t("scene")}
                    onBlur={(e) => cambiar(fila, "escena", e.target.value.trim())}
                  />
                ) : (
                  <span className="sdir-esc">{d.escena || "•"}</span>
                )}
                <span className={`pill ${CLASE_ESTADO_FICHA[estado]} fr-pill-gap`}>{t(`state_${estado}`)}</span>
              </div>

              <div className="sdir-field">
                <span>{t("method")}</span>
                <div className="cp-seg" role="group" aria-label={t("method")}>
                  {METODOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`cp-seg-cell${d.metodo === m ? " cp-seg-on" : ""}`}
                      aria-pressed={d.metodo === m}
                      disabled={!editable}
                      onClick={() => cambiar(fila, "metodo", d.metodo === m ? "" : m)}
                    >
                      {t(`method_${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sdir-field">
                <span>{t("risk")}</span>
                <div className="cp-seg" role="group" aria-label={t("risk")}>
                  {RIESGOS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`cp-seg-cell${d.riesgo === r ? ` cp-seg-on ${CLASE_RIESGO[r]}` : ""}`}
                      aria-pressed={d.riesgo === r}
                      disabled={!editable}
                      onClick={() => cambiar(fila, "riesgo", d.riesgo === r ? "" : r)}
                    >
                      {t(`risk_${r}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sdir-estrat">
                <span className="sdir-lbl">{t("strategy")}</span>
                <textarea
                  className="sdir-estrat-ta"
                  defaultValue={d.estrategia}
                  placeholder={editable ? "—" : ""}
                  readOnly={!editable}
                  rows={2}
                  onBlur={(e) => cambiar(fila, "estrategia", e.target.value)}
                />
              </div>

              {(editable || d.retos) && (
                <label className="sdir-field">
                  <span>{t("challenges")}</span>
                  <textarea
                    className="sdir-ta"
                    defaultValue={d.retos}
                    placeholder={editable ? "—" : ""}
                    readOnly={!editable}
                    rows={2}
                    onBlur={(e) => cambiar(fila, "retos", e.target.value)}
                  />
                </label>
              )}

              {(editable || d.wildtrack) && (
                <div className="sdir-wild">
                  <span className="sdir-wild-lbl">{t("wildtrack")}</span>
                  <input
                    className="sdir-wild-in"
                    defaultValue={d.wildtrack}
                    placeholder={editable ? "—" : ""}
                    readOnly={!editable}
                    onBlur={(e) => cambiar(fila, "wildtrack", e.target.value)}
                  />
                </div>
              )}

              {editable && (
                <div className="sdir-field">
                  {d.lista ? (
                    <button className="cp-btn" onClick={() => marcarLista(fila.id, false)}>
                      {t("reopen")}
                    </button>
                  ) : (
                    <button
                      className="cp-btn cp-btn-acc"
                      disabled={!listaParaMarcar}
                      onClick={() => marcarLista(fila.id, true)}
                    >
                      {t("markReady")}
                    </button>
                  )}
                  {!d.lista && !listaParaMarcar && <span>{t("markReadyHint")}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editable && botonera}
    </div>
  );
}