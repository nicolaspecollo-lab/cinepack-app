"use client";

// ===========================================================================
// "Hoja de cálculo y Documento en blanco" — herramienta transversal
// ---------------------------------------------------------------------------
// Expediente: 2026-11-16_transversal_hoja-documento-blanco
// Panel a medida (no HerramientaPanel genérico): el contenido no es una fila
// tipada, es un lienzo de hoja de cálculo (Univer) o un documento rico
// (TipTap) — ver arquitectura.md, sección 3 y 5.
//
// Persiste contra Supabase real — tabla public.docs_blanco (ver docsBlanco.ts).
// ===========================================================================

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "../components/Icon";
import { createClient } from "@/lib/supabase/client";
import {
  type DocBlanco,
  type TipoDocBlanco,
  crearDocBlanco,
  eliminarDocBlanco,
  guardarContenidoDocBlanco,
  listarDocsBlanco,
  renombrarDocBlanco,
  cambiarVisibilidadDocBlanco,
} from "./docsBlanco";

// Univer necesita canvas/DOM real: se monta solo en cliente, mismo patrón que
// MoodboardLienzo/MoodboardFotoLienzo (Konva) en este mismo directorio.
const UniverHojaEditor = dynamic(() => import("./UniverHojaEditor"), {
  ssr: false,
  loading: () => <div className="docb-loading">Cargando hoja de cálculo…</div>,
});
const TiptapDocumentoEditor = dynamic(() => import("./TiptapDocumentoEditor"), {
  ssr: false,
  loading: () => <div className="docb-loading">Cargando documento…</div>,
});

export default function DocsBlancoPanel({
  departamento,
  fullName,
  ownerId,
}: {
  departamento: string;
  fullName: string;
  ownerId: string;
}) {
  const supabase = useState(() => createClient())[0];
  const [projectId, setProjectId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocBlanco[]>([]);
  const [abierto, setAbierto] = useState<DocBlanco | null>(null);

  useEffect(() => {
    setProjectId(localStorage.getItem("cinepack-proyecto-id"));
  }, []);

  async function recargar(pid: string) {
    setDocs(await listarDocsBlanco(supabase, pid, ownerId, departamento));
  }

  useEffect(() => {
    if (projectId) recargar(projectId);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projectId) {
    return <div className="docb-loading">Elegí un proyecto para usar esta herramienta.</div>;
  }

  async function crear(tipo: TipoDocBlanco) {
    const nombre = tipo === "hoja" ? "Hoja sin título" : "Documento sin título";
    const doc = await crearDocBlanco(supabase, {
      projectId: projectId!,
      tipo,
      nombre,
      ownerId,
      ownerName: fullName,
      departamento,
      contenidoInicial: {},
    });
    if (!doc) return;
    await recargar(projectId!);
    setAbierto(doc);
  }

  function abrir(d: DocBlanco) {
    setAbierto(d);
  }

  function cerrar() {
    setAbierto(null);
  }

  function guardarContenido(contenido: Record<string, unknown>) {
    if (!abierto) return;
    guardarContenidoDocBlanco(supabase, abierto.id, contenido);
  }

  async function renombrar(valor: string) {
    if (!abierto) return;
    const nombre = valor.trim() || (abierto.tipo === "hoja" ? "Hoja sin título" : "Documento sin título");
    await renombrarDocBlanco(supabase, abierto.id, nombre);
    setAbierto({ ...abierto, nombre });
    await recargar(projectId!);
  }

  async function toggleCompartido() {
    if (!abierto) return;
    const visibilidad = abierto.visibilidad === "compartido" ? "privado" : "compartido";
    await cambiarVisibilidadDocBlanco(supabase, abierto.id, visibilidad);
    setAbierto({ ...abierto, visibilidad });
    await recargar(projectId!);
  }

  async function borrar(d: DocBlanco) {
    if (!confirm(`¿Eliminar "${d.nombre}"? No se puede deshacer.`)) return;
    await eliminarDocBlanco(supabase, d.id);
    if (abierto?.id === d.id) setAbierto(null);
    await recargar(projectId!);
  }

  if (abierto) {
    return (
      <div className="docb-open">
        <div className="docb-open-head">
          <button className="docb-back" onClick={cerrar} title="Volver al listado">
            <Icon name="arrow-left" size={14} />
          </button>
          <span className="docb-open-icon">
            <Icon name={abierto.tipo === "hoja" ? "table" : "file-text"} size={14} />
          </span>
          <input
            key={abierto.id}
            className="docb-open-title"
            defaultValue={abierto.nombre}
            onBlur={(e) => renombrar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <button
            className={`docb-share ${abierto.visibilidad === "compartido" ? "on" : ""}`}
            onClick={toggleCompartido}
            title="Compartir con el proyecto"
          >
            <Icon name="users" size={13} />
            {abierto.visibilidad === "compartido" ? "Compartido" : "Privado"}
          </button>
          <button className="docb-delete" onClick={() => borrar(abierto)} title="Eliminar">
            <Icon name="trash" size={14} />
          </button>
        </div>

        {abierto.tipo === "hoja" ? (
          <UniverHojaEditor key={abierto.id} nombre={abierto.nombre} snapshot={abierto.contenido} onGuardar={guardarContenido} />
        ) : (
          <TiptapDocumentoEditor key={abierto.id} nombre={abierto.nombre} contenido={abierto.contenido} onGuardar={guardarContenido} />
        )}
      </div>
    );
  }

  return (
    <div className="docb-index">
      <div className="docb-index-head">
        <span className="hex" />
        <div>
          <h4>Hoja de cálculo y Documento en blanco</h4>
          <p>Tu propia hoja con fórmulas o tu propio documento de texto, sin plantilla fija. Se autoguarda.</p>
        </div>
      </div>

      <div className="docb-nuevo-cards">
        <button className="docb-nuevo-card" style={{ "--docb-color": "var(--cyan)" } as React.CSSProperties} onClick={() => crear("hoja")}>
          <span className="docb-nuevo-icon"><Icon name="table" size={16} /></span>
          <div>
            <strong>Nueva hoja de cálculo</strong>
            <span>Fórmulas, formato de celda, filas y columnas</span>
          </div>
        </button>
        <button className="docb-nuevo-card" style={{ "--docb-color": "var(--lime)" } as React.CSSProperties} onClick={() => crear("documento")}>
          <span className="docb-nuevo-icon"><Icon name="file-text" size={16} /></span>
          <div>
            <strong>Nuevo documento</strong>
            <span>Texto enriquecido: negrita, listas, títulos, exportar a PDF</span>
          </div>
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="soon-box" style={{ margin: "0 var(--gutter)" }}>
          <span className="hex"></span>
          <h4>Todavía no creaste nada</h4>
          <p>Elegí &ldquo;Nueva hoja de cálculo&rdquo; o &ldquo;Nuevo documento&rdquo; para empezar.</p>
        </div>
      ) : (
        <div className="docb-lista">
          {docs.map((d) => (
            <button key={d.id} className="docb-item" onClick={() => abrir(d)}>
              <span className="docb-item-icon">
                <Icon name={d.tipo === "hoja" ? "table" : "file-text"} size={15} />
              </span>
              <div className="docb-item-info">
                <strong>{d.nombre}</strong>
                <span>
                  {d.owner_id === ownerId ? "Tuyo" : `De ${d.owner_name}`}
                  {d.visibilidad === "compartido" ? " · Compartido" : " · Privado"}
                </span>
              </div>
              <span className="docb-item-go"><Icon name="arrow-right" size={14} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
