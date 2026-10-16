"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PrintHeader } from "./HerramientaPanel";
import {
  CLASE_ESTADO_FICHA,
  CLASE_ESTADO_PLAN,
  CLASE_RIESGO,
  METODOS,
  PLAN_SONIDO_DEPARTAMENTO,
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

// Cuánto tiempo se ve el aviso "Guardado".
const MS_AVISO_GUARDADO = 2000;

// Para ordenar las fichas por número de escena. Lo que no sea número va al final.
function numeroDe(escena: string): number {
  const n = parseInt(escena, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

export default function PlanSonidoPanel({ fullName, editable: permitido }: Props) {
  const t = useTranslations("planSonido");
  const { fichas, loading, error, crear, editar, marcarLista } = usePlanSonidoFilas(fullName);
  const { plan, loading: cargandoPlan, error: errorPlan, publicar, cerrar } = usePlanSonidoEstado(fullName);
  // Un plan cerrado queda en solo lectura para todos, también para quien lo editaba.
  const editable = permitido && !plan.cerrado;

  // Aviso breve "Guardado" tras cada cambio.
  const [guardado, setGuardado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Al salir de la pantalla se cancela el aviso pendiente.
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function avisarGuardado() {
    setGuardado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setGuardado(false), MS_AVISO_GUARDADO);
  }

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
    avisarGuardado();
  }

  // Marcar como lista o reabrir una ficha.
  function cambiarLista(fila: FilaFicha, lista: boolean) {
    marcarLista(fila.id, lista);
    avisarGuardado();
  }

  // PUBLICAR: pide confirmación diciendo cuántas fichas no están listas y, si se acepta, publica.
  async function publicarPlan() {
    const sinLista = ordenadas.filter((f) => !f.datos.lista).length;
    const texto =
      sinLista > 0 ? t("confirmPublishPending", { count: sinLista }) : t("confirmPublish");
    if (!window.confirm(texto)) return;
    await publicar();
  }

  // CERRAR: pide confirmación y, si se acepta, envía el plan a postproducción (queda cerrado).
  async function cerrarPlan() {
    if (!window.confirm(t("confirmClose"))) return;
    await cerrar();
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

  // Título de la herramienta: hexágono y nombre arriba a la izquierda, como el resto de herramientas.
  const titulo = (
    <h3>
      <span className="hex"></span>
      {t("cardTitle")}
    </h3>
  );

  // Estado del plan completo. Vacío, Borrador, Modificado y Cerrado se calculan o vienen de la base de datos.
  const estadoPlan = estadoPlanDe(
    ordenadas.length,
    plan.publicado,
    hayCambiosTrasPublicar(fichas, plan.publicadoEn),
    plan.cerrado
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
          : estadoPlan === "cerrado"
            ? t("planHint_cerrado", {
                user: plan.cerradoPor,
                date: new Date(plan.cerradoEn).toLocaleString(),
              })
            : t(`planHint_${estadoPlan}`)}
      </span>
      {guardado && (
        <span className="amsg ok" role="status">
          {t("saved")}
        </span>
      )}
    </div>
  );

  if (ordenadas.length === 0) {
    return (
      <>
        <div className="hp-open-head">{titulo}</div>
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

  // Acciones de la herramienta, arriba a la derecha (como pide el informe de Marta).
  // "Vista de impresión" para quien ve el plan; "Aprobar y publicar" con el plan en Borrador o Modificado;
  // "Enviar a postproducción" solo con el plan Publicado y sin cambios pendientes.
  const acciones = (
    <div className="printbar">
      <button type="button" className="cp-btn" onClick={() => window.print()}>
        {t("printView")}
      </button>
      {editable && (estadoPlan === "borrador" || estadoPlan === "modificado") && (
        <button type="button" className="cp-btn cp-btn-acc-fill" onClick={publicarPlan}>
          {t("publish")}
        </button>
      )}
      {editable && estadoPlan === "publicado" && (
        <button type="button" className="cp-btn cp-btn-acc-fill" onClick={cerrarPlan}>
          {t("sendToPost")}
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="hp-open-head">
        {titulo}
        <div className="hp-open-head-tabs">{acciones}</div>
      </div>
      <div className="sdir-wrap hp-print-area">
        <PrintHeader herramientaNombre={t("cardTitle")} departamento={PLAN_SONIDO_DEPARTAMENTO} />
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
                      <button className="cp-btn" onClick={() => cambiarLista(fila, false)}>
                        {t("reopen")}
                      </button>
                    ) : (
                      <button
                        className="cp-btn cp-btn-acc"
                        disabled={!listaParaMarcar}
                        onClick={() => cambiarLista(fila, true)}
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
        {editable && botonAnadir}
      </div>
    </>
  );
}