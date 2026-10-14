"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CLASE_ESTADO } from "./MoodboardFotoGaleria";
import type { Estado } from "./moodboardFotoFilas";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  fila: FilaReferencia;
  url?: string;
  editable: boolean;
  enConflicto: boolean;
  fullName: string;
  onCerrar: () => void;
  onCambiarEstado: (id: string, estado: Estado, accion: string, principal?: boolean) => Promise<unknown>;
  onComentar: (id: string, texto: string) => Promise<unknown>;
  onComparar: () => void;
};

type Accion = { estado: Estado; accion: string; texto: string; acc: boolean; principal?: boolean };

export default function MoodboardFotoDetalle({
  fila,
  url,
  editable,
  enConflicto,
  fullName,
  onCerrar,
  onCambiarEstado,
  onComentar,
  onComparar,
}: Props) {
  const t = useTranslations("moodboardFoto");
  const { estados, categorias, niveles } = useEtiquetasMoodboardFoto();
  const [ocupado, setOcupado] = useState(false);
  const [comentario, setComentario] = useState("");
  const d = fila.datos;

  const acciones: Accion[] = [];
  if (editable) {
    // Al enviar a revisión la referencia se propone como principal de su sitio.
    if (d.estado === "borrador") acciones.push({ estado: "pendiente", accion: "envia_revision", texto: t("actSend"), acc: true, principal: true });
    // Con conflicto no se aprueba directamente: se elige con Comparar.
    if (d.estado === "pendiente" && !enConflicto) acciones.push({ estado: "aprobada", accion: "aprueba", texto: t("actApprove"), acc: true });
    if (d.estado !== "descartada") acciones.push({ estado: "descartada", accion: "descarta", texto: t("actDiscard"), acc: false, principal: false });
  }

  async function ejecutar(a: Accion) {
    setOcupado(true);
    await onCambiarEstado(fila.id, a.estado, a.accion, a.principal);
    setOcupado(false);
  }

  async function enviarComentario() {
    if (!comentario.trim()) return;
    setOcupado(true);
    await onComentar(fila.id, comentario);
    setComentario("");
    setOcupado(false);
  }

  return (
    <div className="gdes-overlay" onClick={onCerrar}>
      <div className="gdes-detail" onClick={(e) => e.stopPropagation()}>
        <div className="gdes-detail-head">
          <div>
            <p className="gdes-detail-sub">
              {niveles[d.nivel]} · {categorias[d.categoria]}{d.destino ? ` · ${d.destino}` : ""}
            </p>
            <h3><span className="hex" />{d.titulo}</h3>
          </div>
          <button type="button" className="gdes-close" onClick={onCerrar} aria-label={t("close")}>✕</button>
        </div>

        <div className="gdes-pers">
          <span className={`pill ${enConflicto ? "p-bad" : CLASE_ESTADO[d.estado]}`}>
            {enConflicto ? t("stateConflict") : estados[d.estado]}
          </span>
        </div>

        {enConflicto && <p className="amsg err">{t("conflictNote")}</p>}

        {url && (
          <div className="gdes-field">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={d.titulo} />
          </div>
        )}

        {d.descripcion && (
          <label className="gdes-field">
            <span>{t("fldDescription")}</span>
            <textarea rows={2} value={d.descripcion} readOnly />
          </label>
        )}
        {d.queTomar && (
          <label className="gdes-field">
            <span>{t("fldTake")}</span>
            <textarea rows={2} value={d.queTomar} readOnly />
          </label>
        )}
        {d.fuente && (
          <label className="gdes-field">
            <span>{t("fldSource")}</span>
            <input value={d.fuente} readOnly />
          </label>
        )}
        {d.etiquetas.length > 0 && (
          <div className="gdes-field">
            <span>{t("fldTags")}</span>
            <div className="gdes-pers">{d.etiquetas.map((e, i) => <span key={i} className="gdes-chip">{e}</span>)}</div>
          </div>
        )}

        <div className="gdes-field">
          <span>{t("fldComments")}</span>
          {d.comentarios.length === 0 ? (
            <p className="amsg">{t("noComments")}</p>
          ) : (
            <div className="cq-thread">
              {d.comentarios.map((c, i) => (
                <div key={i} className={`cq-bubble${c.usuario === fullName ? " cq-bubble-me" : ""}`}>
                  <div className="cq-bubble-head">
                    <b>{c.usuario}</b> · {new Date(c.fecha).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </div>
                  {c.texto}
                </div>
              ))}
            </div>
          )}
          <div className="cq-reply-row">
            <input
              className="cq-reply-input"
              value={comentario}
              placeholder={t("commentPlaceholder")}
              onChange={(e) => setComentario(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviarComentario();
              }}
            />
            <button type="button" className="cp-btn cp-btn-acc" disabled={ocupado || !comentario.trim()} onClick={enviarComentario}>
              {t("commentSend")}
            </button>
          </div>
        </div>

        {(acciones.length > 0 || (editable && enConflicto)) && (
          <div className="gdes-detail-actions mb-acciones-foto">
            {editable && enConflicto && (
              <button type="button" className="cp-btn cp-btn-acc" disabled={ocupado} onClick={onComparar}>
                {t("actCompare")}
              </button>
            )}
            {acciones.map((a) => (
              <button key={a.estado} type="button" className={`cp-btn${a.acc ? " cp-btn-acc" : ""}`} disabled={ocupado} onClick={() => ejecutar(a)}>
                {a.texto}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}