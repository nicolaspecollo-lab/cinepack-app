"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { idsEnConflicto, referenciasEnMismoSitio } from "./conflictosMoodboardFoto";
import MoodboardFotoComparar from "./MoodboardFotoComparar";
import MoodboardFotoDetalle from "./MoodboardFotoDetalle";
import MoodboardFotoFicha from "./MoodboardFotoFicha";
import MoodboardFotoGaleria from "./MoodboardFotoGaleria";
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

  const rutas = useMemo(() => referencias.map((r) => r.datos.ruta), [referencias]);
  const urls = useUrlsImagenes(rutas);

  // Los borradores solo los ve quien puede editar (Dirección de fotografía y administrador).
  const base = useMemo(
    () => referencias.filter((r) => editable || r.datos.estado !== "borrador"),
    [referencias, editable],
  );

  // Conflicto: se calcula, no se guarda (dos principales en el mismo sitio).
  const conflictos = useMemo(() => idsEnConflicto(base), [base]);

  // Referencias que se están comparando (las que compiten por el mismo sitio).
  const grupoComparar = useMemo(
    () => (comparandoId ? referenciasEnMismoSitio(base, comparandoId) : []),
    [base, comparandoId],
  );

  const visibles = useMemo(
    () =>
      base.filter(
        (r) =>
          (!filtroNivel || r.datos.nivel === filtroNivel) &&
          (!filtroCategoria || r.datos.categoria === filtroCategoria),
      ),
    [base, filtroNivel, filtroCategoria],
  );

  const filaAbierta = abiertaId ? base.find((r) => r.id === abiertaId) : undefined;
  // Solo quien puede editar llega a la Ficha en modo edición.
  const filaEditando = editable && editandoId ? base.find((r) => r.id === editandoId) : undefined;

  // ELEGIR COMO PRINCIPAL: la elegida pasa a Aprobada y principal; las demás pierden el principal
  // (si estaban Aprobadas vuelven a Pendiente). Así desaparece el conflicto.
  async function elegirPrincipal(id: string) {
    await cambiarEstado(id, "aprobada", "elige_principal", true);
    for (const f of grupoComparar) {
      if (f.id === id) continue;
      await cambiarEstado(f.id, f.datos.estado === "aprobada" ? "pendiente" : f.datos.estado, "pierde_principal", false);
    }
    setComparandoId(null);
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

       {comparandoId && grupoComparar.length > 1 && (
        <MoodboardFotoComparar
          filas={grupoComparar}
          urls={urls}
          fullName={fullName}
          onElegir={elegirPrincipal}
          onComentar={comentar}
          onCerrar={() => {
            // Al cerrar o cancelar se vuelve al Detalle de la referencia desde la que se abrió Comparar.
            setAbiertaId(comparandoId);
            setComparandoId(null);
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