"use client";

import type { Estado } from "./moodboardFotoFilas";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  referencias: FilaReferencia[];
  urls: Record<string, string>;
};

// Color de cada estado. El texto siempre va escrito: el color solo lo refuerza.
const CLASE_ESTADO: Record<Estado, string> = {
  borrador: "p-mut",
  pendiente: "p-warn",
  aprobada: "p-ok",
  descartada: "p-mut",
};

export default function MoodboardFotoGaleria({ referencias, urls }: Props) {
  const { estados, categorias } = useEtiquetasMoodboardFoto();

  return (
    <div className="hp-galeria">
      {referencias.map(({ id, datos }) => {
        const url = urls[datos.ruta];
        return (
          <div key={id} className="hp-gcard">
            <div className={`hp-gimg ${url ? "" : "hp-gimg-empty"}`}>
              {url ? (
                // Imagen firmada de Storage: next/image necesitaría configurar el dominio.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={datos.titulo} />
              ) : (
                <span className="hex"></span>
              )}
            </div>
            <div>
              <span className="com-title">{datos.titulo}</span>
              <span className="com-meta">
                {categorias[datos.categoria]}
                {datos.destino ? ` · ${datos.destino}` : ""}
              </span>
            </div>
            <div className="hp-gfoot">
              <span className={`pill ${CLASE_ESTADO[datos.estado]}`}>{estados[datos.estado]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}