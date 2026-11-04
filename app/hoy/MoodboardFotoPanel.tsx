"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { coincideBusqueda } from "./buscarMoodboardFoto"; // BÚSQUEDA
import { estanEnMismoSitio } from "./compararMoodboardFoto"; // LIBRE
import { idsEnConflicto, referenciasEnMismoSitio } from "./conflictosMoodboardFoto";
import MoodboardFotoComparar from "./MoodboardFotoComparar";
import MoodboardFotoDetalle from "./MoodboardFotoDetalle";
import MoodboardFotoFicha from "./MoodboardFotoFicha";
import MoodboardFotoGaleria from "./MoodboardFotoGaleria";
import MoodboardFotoSelector from "./MoodboardFotoSelector"; // LIBRE
import { CATEGORIAS, NIVELES, type Categoria, type Nivel } from "./moodboardFotoFilas";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import { ERROR_SIN_PROYECTO, useMoodboardFotoFilas } from "./useMoodboardFotoFilas";
import { useMoodboardFotoModo } from "./useMoodboardFotoModo";
import { useUrlsImagenes } from "./useUrlsImagenes";

// Konva necesita el navegador (canvas), así que el lienzo se carga solo en el cliente.
const MoodboardFotoLienzo = dynamic(() => import("./MoodboardFotoLienzo"), { ssr: false });

type Props = { fullName: string; editable: boolean };

export default function MoodboardFotoPanel({ fullName, editable }: Props) {
  const t = useTranslations("moodboardFoto");
  const { categorias, niveles } = useEtiquetasMoodboardFoto();
  const { referencias, loading, error, crear, editar, cambiarEstado, comentar, guardarGeometrias } =
    useMoodboardFotoFilas(fullName);
  const { modo, cambiarModo } = useMoodboardFotoModo(fullName);
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [comparandoId, setComparandoId] = useState<string | null>(null);
  const [filtroNivel, setFiltroNivel] = useState<Nivel | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | null>(null);
  const [busqueda, setBusqueda] = useState(""); // BÚSQUEDA
  const [selectorAbierto, setSelectorAbierto] = useState(false); // LIBRE
  const [idsLibres, setIdsLibres] = useState<string[] | null>(null); // LIBRE

  const rutas = useMemo(() => referencias.map((r) => r.datos.ruta), [referencias]);
  const urls = useUrlsImagenes(rutas);

  // Los borradores solo los ve quien puede editar (Dirección de fotografía y administrador).
  const base = useMemo(
    () => referencias.filter((r) => editable || r.datos.estado !== "borrador"),
    [referencias, editable],
  );

  // Conflicto: se calcula, no se guarda (dos principales en el mismo sitio).
  const conflictos = useMemo(() => idsEnConflicto(base), [base]);

  // Referencias que se están comparando: las elegidas a mano (comparación libre)
  // o las que compiten por el mismo sitio (desde el Detalle).
  const grupoComparar = useMemo(() => {
    if (idsLibres) return base.filter((r) => idsLibres.includes(r.id)); // LIBRE
    return comparandoId ? referenciasEnMismoSitio(base, comparandoId) : [];
  }, [base, comparandoId, idsLibres]);

  const visibles = useMemo(
    () =>
      base.filter(
        (r) =>
          (!filtroNivel || r.datos.nivel === filtroNivel) &&
          (!filtroCategoria || r.datos.categoria === filtroCategoria) &&
          coincideBusqueda(r.datos, busqueda), // BÚSQUEDA
      ),
    [base, filtroNivel, filtroCategoria, busqueda],
  );

  // LIBRE: lo que se ofrece en el selector es lo que se ve con los filtros, sin descartadas.
  const comparables = useMemo(
    () => visibles.filter((r) => r.datos.estado !== "descartada"),
    [visibles],
  );

  const filaAbierta = abiertaId ? base.find((r) => r.id === abiertaId) : undefined;
  // Solo quien puede editar llega a la Ficha en modo edición.
  const filaEditando = editable && editandoId ? base.find((r) => r.id === editandoId) : undefined;

  // ELEGIR COMO PRINCIPAL: la elegida pasa a Aprobada y principal; las demás del mismo sitio pierden
  // el principal (si estaban Aprobadas vuelven a Pendiente). Así desaparece el conflicto,
  // aunque se haya abierto desde la comparación libre con solo algunas de ellas.
  async function elegirPrincipal(id: string) {
    await cambiarEstado(id, "aprobada", "elige_principal", true);
    for (const f of referenciasEnMismoSitio(base, id)) { // LIBRE
      if (f.id === id) continue;
      await cambiarEstado(f.id, f.datos.estado === "aprobada" ? "pendiente" : f.datos.estado, "pierde_principal", false);
    }
    setComparandoId(null);
    setIdsLibres(null); // LIBRE
  }

  // Al cerrar la Ficha de edición (guardando o no) se vuelve al Detalle de esa referencia.
  function cerrarEdicion() {
    setAbiertaId(editandoId);
    setEditandoId(null);
  }

  const botonAnadir = (
    <button className="cp-btn cp-btn-acc" onClick={() => setFichaAbierta(true)}>
      {t("addReference")}
    </button>
  );

  // Estilo del moodboard que elige el Director para el proyecto (Collage o Galería).
  const selectorModo = (
    <div className="cp-seg">
      <button
        type="button"
        className={`cp-seg-cell${modo === "collage" ? " cp-seg-on" : ""}`}
        onClick={() => cambiarModo("collage")}
      >
        {t("modeCollage")}
      </button>
      <button
        type="button"
        className={`cp-seg-cell${modo === "galeria" ? " cp-seg-on" : ""}`}
        onClick={() => cambiarModo("galeria")}
      >
        {t("modeGallery")}
      </button>
    </div>
  );

  return (
    <>
      {editable && base.length > 0 && (
        <div className="mb-barra mb-barra-foto">
          {botonAnadir}
          {selectorModo}
        </div>
      )}

      {error && <p className="amsg err">{error === ERROR_SIN_PROYECTO ? t("noProject") : error}</p>}

      {base.length > 0 && (
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
            <input
              className="hp-etb-search"
              type="search"
              value={busqueda}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              onChange={(e) => setBusqueda(e.target.value)}
            />{/* BÚSQUEDA */}
            <div className="hp-etb-filtros">
              <button className={`hp-etb-fchip${!filtroCategoria ? " on" : ""}`} onClick={() => setFiltroCategoria(null)}>
                {t("filterAllCat")}
              </button>
              {CATEGORIAS.map((c) => (
                <button key={c} className={`hp-etb-fchip${filtroCategoria === c ? " on" : ""}`} onClick={() => setFiltroCategoria(c)}>
                  {categorias[c]}
                </button>
              ))}
              {/* LIBRE: comparar referencias elegidas a mano */}
              {comparables.length > 1 && (
                <button className="hp-etb-fchip" onClick={() => setSelectorAbierto(true)}>
                  {t("compareFree")}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {loading ? (
        <p className="amsg">{t("loading")}</p>
      ) : base.length === 0 ? (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
          {editable && botonAnadir}
        </div>
      ) : visibles.length === 0 ? (
        <p className="amsg">{t("noResults")}</p>
      ) : modo === "collage" ? (
        <MoodboardFotoLienzo
          referencias={visibles}
          urls={urls}
          conflictos={conflictos}
          editable={editable}
          onAbrir={setAbiertaId}
          onGuardar={guardarGeometrias}
        />
      ) : (
        <MoodboardFotoGaleria referencias={visibles} urls={urls} conflictos={conflictos} onAbrir={setAbiertaId} />
      )}

      {filaAbierta && (
        <MoodboardFotoDetalle
          fila={filaAbierta}
          url={urls[filaAbierta.datos.ruta]}
          editable={editable}
          enConflicto={conflictos.has(filaAbierta.id)}
          fullName={fullName}
          onCerrar={() => setAbiertaId(null)}
          onCambiarEstado={cambiarEstado}
          onComentar={comentar}
          onComparar={() => {
            setComparandoId(filaAbierta.id);
            setAbiertaId(null);
          }}
          onEditar={() => {
            setEditandoId(filaAbierta.id);
            setAbiertaId(null);
          }}
        />
      )}

      {/* LIBRE: selector de referencias a comparar */}
      {selectorAbierto && (
        <MoodboardFotoSelector
          filas={comparables}
          urls={urls}
          onComparar={(ids) => {
            setIdsLibres(ids);
            setSelectorAbierto(false);
          }}
          onCerrar={() => setSelectorAbierto(false)}
        />
      )}

      {(comparandoId || idsLibres) && grupoComparar.length > 1 && (
        <MoodboardFotoComparar
          filas={grupoComparar}
          urls={urls}
          fullName={fullName}
          editable={editable} // LIBRE
          mismoSitio={idsLibres ? estanEnMismoSitio(grupoComparar) : true} // LIBRE
          onElegir={elegirPrincipal}
          onComentar={comentar}
          onCerrar={() => {
            // Desde el Detalle se vuelve al Detalle; la comparación libre simplemente se cierra.
            if (comparandoId) {
              setAbiertaId(comparandoId);
              setComparandoId(null);
            } else {
              setIdsLibres(null); // LIBRE
            }
          }}
        />
      )}

      {fichaAbierta && (
        <MoodboardFotoFicha
          onCerrar={() => setFichaAbierta(false)}
          onGuardar={crear}
          textoSinProyecto={t("noProject")}
        />
      )}

      {filaEditando && (
        <MoodboardFotoFicha
          key={filaEditando.id}
          fila={filaEditando}
          onCerrar={cerrarEdicion}
          onGuardar={(r) => editar(filaEditando.id, r)}
          textoSinProyecto={t("noProject")}
        />
      )}
    </>
  );
}