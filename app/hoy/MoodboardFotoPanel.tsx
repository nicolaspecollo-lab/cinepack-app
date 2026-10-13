"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import MoodboardFotoFicha from "./MoodboardFotoFicha";
import MoodboardFotoGaleria from "./MoodboardFotoGaleria";
import { CATEGORIAS, NIVELES, type Categoria, type Nivel } from "./moodboardFotoFilas";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import { ERROR_SIN_PROYECTO, useMoodboardFotoFilas } from "./useMoodboardFotoFilas";
import { useUrlsImagenes } from "./useUrlsImagenes";

type Props = { fullName: string; editable: boolean };

export default function MoodboardFotoPanel({ fullName, editable }: Props) {
  const t = useTranslations("moodboardFoto");
  const { categorias, niveles } = useEtiquetasMoodboardFoto();
  const { referencias, loading, error, crear } = useMoodboardFotoFilas(fullName);
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState<Nivel | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | null>(null);

  const rutas = useMemo(() => referencias.map((r) => r.datos.ruta), [referencias]);
  const urls = useUrlsImagenes(rutas);

  const visibles = useMemo(
    () =>
      referencias.filter(
        (r) =>
          (!filtroNivel || r.datos.nivel === filtroNivel) &&
          (!filtroCategoria || r.datos.categoria === filtroCategoria),
      ),
    [referencias, filtroNivel, filtroCategoria],
  );

  const botonAnadir = (
    <button className="cp-btn cp-btn-acc" onClick={() => setFichaAbierta(true)}>
      {t("addReference")}
    </button>
  );

  return (
    <>
      {editable && referencias.length > 0 && (
        <div className="mb-barra mb-barra-foto">{botonAnadir}</div>
      )}

      {error && <p className="amsg err">{error === ERROR_SIN_PROYECTO ? t("noProject") : error}</p>}

      {referencias.length > 0 && (
        <>
          <div className="dsubtabs">
            <button className={`dsubtab ${!filtroNivel ? "active" : ""}`} onClick={() => setFiltroNivel(null)}>
              {t("filterAll")}
            </button>
            {NIVELES.map((n) => (
              <button key={n} className={`dsubtab ${filtroNivel === n ? "active" : ""}`} onClick={() => setFiltroNivel(n)}>
                {niveles[n]}
              </button>
            ))}
          </div>
          <div className="hp-etb-wrap">
            <div className="hp-etb-filtros">
              <button className={`hp-etb-fchip${!filtroCategoria ? " on" : ""}`} onClick={() => setFiltroCategoria(null)}>
                {t("filterAllCat")}
              </button>
              {CATEGORIAS.map((c) => (
                <button key={c} className={`hp-etb-fchip${filtroCategoria === c ? " on" : ""}`} onClick={() => setFiltroCategoria(c)}>
                  {categorias[c]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {loading ? (
        <p className="amsg">{t("loading")}</p>
      ) : referencias.length === 0 ? (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
          {editable && botonAnadir}
        </div>
      ) : visibles.length === 0 ? (
        <p className="amsg">{t("noResults")}</p>
      ) : (
        <MoodboardFotoGaleria referencias={visibles} urls={urls} />
      )}

      {fichaAbierta && (
        <MoodboardFotoFicha
          onCerrar={() => setFichaAbierta(false)}
          onGuardar={crear}
          textoSinProyecto={t("noProject")}
        />
      )}
    </>
  );
}