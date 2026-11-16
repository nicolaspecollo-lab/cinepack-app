"use client";

// ===========================================================================
// "Documentos" — listado a NIVEL PROYECTO de los docs_blanco compartidos.
// ---------------------------------------------------------------------------
// Expediente: 2026-11-16_transversal_hoja-documento-blanco
// Resuelve la objeción del comité (ronda 1, objeción 2) y lo que ya pedía
// arquitectura.md apartado 4 (Nivel 2): un doc marcado "Compartido" tiene que
// verse en un listado de proyecto, no solo en la pestaña "Exclusivas" de
// quien lo creó.
//
// Dónde vive: arquitectura.md (apartado 5) decía que esto podía vivir como
// sección/pestaña en WorkspaceShell.tsx O, de forma equivalente, en el mismo
// lugar donde ya se listan "las herramientas generales" del proyecto. Elegí
// la segunda variante: una sub-pestaña nueva "Documentos" dentro de
// GeneralesPanel.tsx (que es exactamente esa pestaña "Generales", igual para
// todo el proyecto, visible a todos los departamentos) — WorkspaceShell.tsx
// es solo la barra superior (logo/menú de cuenta), no tiene pestañas propias;
// las pestañas de proyecto viven en DepartmentDashboard/GeneralesPanel. Es una
// integración real y visible a nivel proyecto, no un panel nuevo paralelo.
//
// Limitación conocida (documentada para el comité): este prototipo no
// implementa `docs_blanco_accesos` (Nivel 3 de permisos granulares por
// persona). Por eso este listado es de descubrimiento + apertura directa
// para cualquiera del proyecto que vea esta pestaña, sin distinguir todavía
// "Editor" vs "Visionario" fila por fila — eso queda para cuando se construya
// GestionAccesosPanel.tsx con la pestaña de accesos de docs_blanco que ya
// anticipó arquitectura.md apartado 4 (Nivel 3).
// ===========================================================================

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "../components/Icon";
import { createClient } from "@/lib/supabase/client";
import {
  type DocBlanco,
  guardarContenidoDocBlanco,
  listarDocsCompartidosProyecto,
} from "./docsBlanco";

const UniverHojaEditor = dynamic(() => import("./UniverHojaEditor"), {
  ssr: false,
  loading: () => <div className="docb-loading">Cargando hoja de cálculo…</div>,
});
const TiptapDocumentoEditor = dynamic(() => import("./TiptapDocumentoEditor"), {
  ssr: false,
  loading: () => <div className="docb-loading">Cargando documento…</div>,
});

export default function DocumentosProyectoPanel() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocBlanco[]>([]);
  const [abierto, setAbierto] = useState<DocBlanco | null>(null);

  useEffect(() => {
    setProjectId(localStorage.getItem("cinepack-proyecto-id"));
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setOwnerId(user?.id ?? null);
    })();
  }, []);

  function recargar(pid: string) {
    setDocs(listarDocsCompartidosProyecto(pid));
  }

  useEffect(() => {
    if (projectId) recargar(projectId);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projectId) {
    return <div className="docb-loading">Elegí un proyecto para ver los documentos compartidos.</div>;
  }

  function guardarContenido(contenido: Record<string, unknown>) {
    if (!abierto) return;
    guardarContenidoDocBlanco(projectId!, abierto.id, contenido);
  }

  if (abierto) {
    return (
      <div className="docb-open">
        <div className="docb-open-head">
          <button className="docb-back" onClick={() => setAbierto(null)} title="Volver al listado">
            <Icon name="arrow-left" size={14} />
          </button>
          <span className="docb-open-icon">
            <Icon name={abierto.tipo === "hoja" ? "table" : "file-text"} size={14} />
          </span>
          <span className="docb-open-title" style={{ display: "flex", alignItems: "center" }}>
            {abierto.nombre}
          </span>
          <span className="docb-share on" title="Compartido con el proyecto">
            <Icon name="users" size={13} />
            Compartido · de {abierto.owner_name}
          </span>
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
          <h4>Documentos del proyecto</h4>
          <p>
            Hojas y documentos que cualquier cargo marcó como &ldquo;Compartido&rdquo; desde su panel de Herramientas
            → Exclusivas. Todo el equipo del proyecto los ve acá.
          </p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="soon-box" style={{ margin: "0 var(--gutter)" }}>
          <span className="hex"></span>
          <h4>Todavía no hay nada compartido</h4>
          <p>Cuando alguien marque una hoja o documento propio como &ldquo;Compartido&rdquo;, aparece aquí.</p>
        </div>
      ) : (
        <div className="docb-lista">
          {docs.map((d) => (
            <button key={d.id} className="docb-item" onClick={() => setAbierto(d)}>
              <span className="docb-item-icon">
                <Icon name={d.tipo === "hoja" ? "table" : "file-text"} size={15} />
              </span>
              <div className="docb-item-info">
                <strong>{d.nombre}</strong>
                <span>
                  {d.owner_id === ownerId ? "Tuyo" : `De ${d.owner_name}`}
                  {d.departamento ? ` · ${d.departamento}` : ""}
                  {" · Compartido"}
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
