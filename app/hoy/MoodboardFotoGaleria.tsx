"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CATEGORIAS, type Estado } from "./moodboardFotoFilas";
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
  conflictos: Set<string>;
  onAbrir: (id: string) => void;
};

type Agrupacion = "categoria" | "escena";
type Grupo = { clave: string; titulo: string; filas: FilaReferencia[] };

export default function MoodboardFotoGaleria({ referencias, urls, conflictos, onAbrir }: Props) {
  const t = useTranslations("moodboardFoto");
  const { estados, categorias, niveles } = useEtiquetasMoodboardFoto();
  // Cómo se organiza la galería. Es solo una preferencia de vista: no se guarda.
  const [agrupar, setAgrupar] = useState<Agrupacion>("categoria");

  // Por categoría: un grupo por cada categoría que tenga referencias, en el orden de la especificación.
  function agruparPorCategoria(): Grupo[] {
    return CATEGORIAS.map((c) => ({
      clave: c,
      titulo: categorias[c],
      filas: referencias.filter((f) => f.datos.categoria === c),
    })).filter((g) => g.filas.length > 0);
  }

  // Por escena: un grupo por cada destino vinculado. Las que no tienen destino (look general) van primero.
  function agruparPorEscena(): Grupo[] {
    const mapa = new Map<string, Grupo>();
    for (const f of referencias) {
      const destino = f.datos.destino.trim();
      const clave = destino.toLowerCase();
      const grupo = mapa.get(clave) ?? { clave: clave || "general", titulo: destino || niveles.general, filas: [] };
      grupo.filas.push(f);
      mapa.set(clave, grupo);
    }
    return Array.from(mapa.entries())
      .sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b, undefined, { numeric: true })))
      .map(([, grupo]) => grupo);
  }

  const grupos = agrupar === "categoria" ? agruparPorCategoria() : agruparPorEscena();

  function tarjeta(f: FilaReferencia) {
    const d = f.datos;
    const url = urls[d.ruta];
    const enConflicto = conflictos.has(f.id);
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
          <span className={`pill ${enConflicto ? "p-bad" : CLASE_ESTADO[d.estado]}`}>
            {enConflicto ? t("stateConflict") : estados[d.estado]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-barra">
        <span className="com-meta">{t("groupBy")}</span>
        <div className="cp-seg">
          <button
            type="button"
            className={`cp-seg-cell${agrupar === "categoria" ? " cp-seg-on" : ""}`}
            onClick={() => setAgrupar("categoria")}
          >
            {t("groupCategory")}
          </button>
          <button
            type="button"
            className={`cp-seg-cell${agrupar === "escena" ? " cp-seg-on" : ""}`}
            onClick={() => setAgrupar("escena")}
          >
            {t("groupScene")}
          </button>
        </div>
      </div>

      {grupos.map((g) => (
        <section key={g.clave} className="hp-gal-group">
          <div className="hp-gal-group-head">
            <span className="hex" />
            <span>{g.titulo}</span>
            <span className="hp-gal-group-count">{g.filas.length}</span>
          </div>
          <div className="hp-galeria">{g.filas.map(tarjeta)}</div>
        </section>
      ))}
    </>
  );
}