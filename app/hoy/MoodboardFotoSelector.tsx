"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MAX_COMPARAR } from "./compararMoodboardFoto";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  filas: FilaReferencia[];
  urls: Record<string, string>;
  onComparar: (ids: string[]) => void;
  onCerrar: () => void;
};

export default function MoodboardFotoSelector({ filas, urls, onComparar, onCerrar }: Props) {
  const t = useTranslations("moodboardFoto");
  const { estados, categorias, niveles } = useEtiquetasMoodboardFoto();
  const [elegidas, setElegidas] = useState<string[]>([]);

  const llena = elegidas.length >= MAX_COMPARAR;

  // Marca o desmarca una referencia. Si ya hay el máximo, no deja marcar más.
  function alternar(id: string) {
    setElegidas((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= MAX_COMPARAR ? prev : [...prev, id];
    });
  }

  return (
    <div className="dsr-overlay" onClick={onCerrar}>
      <div className="dsr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <div className="dsr-eyebrow"><span className="hex" />{t("compareSelectTitle")}</div>
          <button type="button" className="dsr-close" onClick={onCerrar} aria-label={t("close")}>✕</button>
        </div>

        <div className="dsr-body">
          <p className="amsg">{t("compareSelectNote")}</p>
          <div className="gdes-grid">
            {filas.map((f) => {
              const d = f.datos;
              const url = urls[d.ruta];
              const marcada = elegidas.includes(f.id);
              return (
                <div key={f.id} className="gdes-card" onClick={() => alternar(f.id)}>
                  <div className={`hp-gimg${url ? "" : " hp-gimg-empty"}`}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={d.titulo} />
                    ) : (
                      <span className="hex"></span>
                    )}
                  </div>
                  <div className="gdes-head">
                    <input
                      type="checkbox"
                      checked={marcada}
                      disabled={!marcada && llena}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => alternar(f.id)}
                      aria-label={d.titulo}
                    />
                    <span className="gdes-esc">{d.titulo}</span>
                    <span className="gdes-tag">{estados[d.estado]}</span>
                  </div>
                  <div className="gdes-meta">
                    <span>
                      {niveles[d.nivel]} · {categorias[d.categoria]}
                      {d.destino ? ` · ${d.destino}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dsr-foot">
          <span className="amsg">{t("compareSelected", { count: elegidas.length })}</span>
          <button type="button" className="cp-btn" onClick={onCerrar}>{t("cancel")}</button>
          <button
            type="button"
            className="cp-btn cp-btn-acc"
            disabled={elegidas.length < 2}
            onClick={() => onComparar(elegidas)}
          >
            {t("compareGo")}
          </button>
        </div>
      </div>
    </div>
  );
}