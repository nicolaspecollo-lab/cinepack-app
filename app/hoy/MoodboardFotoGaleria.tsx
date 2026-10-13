"use client";

import type { Estado } from "./moodboardFotoFilas";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

export const CLASE_ESTADO: Record<Estado, string> = {
  borrador: "p-mut",
  pendiente: "p-warn",
  aprobada: "p-ok",
  descartada: "p-mut",
};

type Props = {
  referencias: FilaReferencia[];
  urls: Record<string, string>;
  onAbrir: (id: string) => void;
};

export default function MoodboardFotoGaleria({ referencias, urls, onAbrir }: Props) {
  const { estados, categorias } = useEtiquetasMoodboardFoto();

  return (
    <div className="hp-galeria">
      {referencias.map((f) => {
        const d = f.datos;
        const url = urls[d.ruta];
        return (
          <div
            key={f.id}
            className="hp-gcard"
            role="button"
            tabIndex={0}
            onClick={() => onAbrir(f.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAbrir(f.id);
            }}
          >
            <div className={`hp-gimg${url ? "" : " hp-gimg-empty"}`}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={d.titulo} />
              ) : (
                <span className="hex"></span>
              )}
            </div>
            <div className="com-title">{d.titulo}</div>
            <div className="com-meta">
              {categorias[d.categoria]}
              {d.destino ? ` · ${d.destino}` : ""}
            </div>
            <div className="hp-gfoot">
              <span className={`pill ${CLASE_ESTADO[d.estado]}`}>{estados[d.estado]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}