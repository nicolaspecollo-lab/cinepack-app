"use client";

import { useTranslations } from "next-intl";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  filas: FilaReferencia[];
  urls: Record<string, string>;
  onCerrar: () => void;
};

export default function MoodboardFotoComparar({ filas, urls, onCerrar }: Props) {
  const t = useTranslations("moodboardFoto");
  const { estados, categorias, niveles } = useEtiquetasMoodboardFoto();

  if (filas.length === 0) return null;
  const sitio = filas[0].datos;

  return (
    <div className="dsr-overlay" onClick={onCerrar}>
      <div className="dsr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <div className="dsr-eyebrow"><span className="hex" />{t("compareTitle")}</div>
          <button type="button" className="dsr-close" onClick={onCerrar} aria-label={t("close")}>✕</button>
        </div>

        <div className="dsr-head">
          <div>
            <div className="dsr-tipo">{niveles[sitio.nivel]} · {categorias[sitio.categoria]}</div>
            {sitio.destino && <div className="dsr-titulo">{sitio.destino}</div>}
          </div>
        </div>

        <div className="dsr-body">
          <p className="amsg">{t("compareNote")}</p>
          <div className="gdes-grid">
            {filas.map((f) => {
              const d = f.datos;
              const url = urls[d.ruta];
              return (
                <div key={f.id} className="gdes-card">
                  <div className={`hp-gimg${url ? "" : " hp-gimg-empty"}`}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={d.titulo} />
                    ) : (
                      <span className="hex"></span>
                    )}
                  </div>
                  <div className="gdes-head">
                    <span className="gdes-hex" />
                    <span className="gdes-esc">{d.titulo}</span>
                    <span className="gdes-tag">{estados[d.estado]}</span>
                  </div>
                  {d.descripcion && <p className="gdes-resumen">{d.descripcion}</p>}
                  {d.queTomar && <p className="gdes-resumen"><b>{t("fldTake")}:</b> {d.queTomar}</p>}
                  {d.fuente && (
                    <div className="gdes-meta"><span>{t("fldSource")}: {d.fuente}</span></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="dsr-foot">
          <button type="button" className="cp-btn" onClick={onCerrar}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}