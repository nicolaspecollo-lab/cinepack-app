"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CLASE_ESTADO_FICHA,
  CLASE_RIESGO,
  METODOS,
  RIESGOS,
  estadoDe,
  puedeMarcarLista,
  type FichaEscena,
} from "./planSonidoFilas";
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

  if (loading) return null;

  const botonAnadir = (
    <div className="hp-actions">
      <button className="cp-btn cp-btn-acc" onClick={anadirFicha}>
        {t("addScene")}
      </button>
    </div>
  );

  if (error) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <p>{error}</p>
      </div>
    );
  }

  if (ordenadas.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("emptyTitle")}</h4>
        <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
        {editable && botonAnadir}
      </div>
    );
  }

  return (
    <div className="sdir-wrap">
      <div className="sdir-grid">
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
      {editable && botonAnadir}
    </div>
  );
}