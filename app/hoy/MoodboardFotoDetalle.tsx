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
  onCerrar: () => void;
  onCambiarEstado: (id: string, estado: Estado, accion: string) => Promise<unknown>;
};

type Accion = { estado: Estado; accion: string; texto: string; acc: boolean };

export default function MoodboardFotoDetalle({ fila, url, editable, onCerrar, onCambiarEstado }: Props) {
  const t = useTranslations("moodboardFoto");
  const { estados, categorias, niveles } = useEtiquetasMoodboardFoto();
  const [ocupado, setOcupado] = useState(false);
  const d = fila.datos;

  const acciones: Accion[] = [];
  if (editable) {
    if (d.estado === "borrador") acciones.push({ estado: "pendiente", accion: "envia_revision", texto: t("actSend"), acc: true });
    if (d.estado === "pendiente") acciones.push({ estado: "aprobada", accion: "aprueba", texto: t("actApprove"), acc: true });
    if (d.estado !== "descartada") acciones.push({ estado: "descartada", accion: "descarta", texto: t("actDiscard"), acc: false });
  }

  async function ejecutar(a: Accion) {
    setOcupado(true);
    await onCambiarEstado(fila.id, a.estado, a.accion);
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
          <span className={`pill ${CLASE_ESTADO[d.estado]}`}>{estados[d.estado]}</span>
        </div>

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

        {acciones.length > 0 && (
          <div className="gdes-detail-actions mb-acciones-foto">
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