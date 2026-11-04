"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DatosFila } from "./moodboardFilas";
import {
  MOODBOARD_FOTO_DEPARTAMENTO,
  MOODBOARD_FOTO_HERRAMIENTA_ID,
  datosAReferencia,
  leerComentarios,
  referenciaADatos,
  type Estado,
  type Geometria,
  type Referencia,
} from "./moodboardFotoFilas";
import { ERROR_SIN_PROYECTO } from "./useMoodboardFila";

export { ERROR_SIN_PROYECTO };

// Una intervención del historial de la fila (misma forma que en el Plan de frecuencias).
type Intervencion = { accion: string; usuario: string; fecha: string };

// Forma de la fila en herramienta_filas (solo las columnas que usamos).
type FilaDB = { id: string; datos: DatosFila; orden: number; registro: Intervencion[] | null };

export type FilaReferencia = { id: string; datos: Referencia; registro: Intervencion[] };

export function useMoodboardFotoFilas(fullName: string) {
  const [filasDB, setFilasDB] = useState<FilaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Última versión de las filas, siempre al día (el estado de React se actualiza
  // con retraso y dos cambios seguidos partirían de datos viejos y se pisarían).
  const filasRef = useRef<FilaDB[]>([]);
  // Cola de guardados: se envían de uno en uno y en orden.
  const cola = useRef<Promise<void>>(Promise.resolve());

  function aplicar(nuevas: FilaDB[]) {
    filasRef.current = nuevas;
    setFilasDB(nuevas);
  }

  // Encola un UPDATE de una fila. El siguiente no empieza hasta que acabe el anterior.
  function guardar(id: string, cambios: Record<string, unknown>): Promise<void> {
    const tarea = cola.current.then(async () => {
      try {
        const supabase = createClient();
        const { error: err } = await supabase.from("herramienta_filas").update(cambios).eq("id", id);
        setError(err ? err.message : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
    cola.current = tarea;
    return tarea;
  }

  // LEER: todas las filas de esta herramienta en el proyecto.
  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .select("id, datos, orden, registro")
      .eq("project_id", projectId)
      .eq("departamento", MOODBOARD_FOTO_DEPARTAMENTO)
      .eq("herramienta_id", MOODBOARD_FOTO_HERRAMIENTA_ID)
      .order("orden", { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const filas = (data ?? []) as FilaDB[];
    filasRef.current = filas;
    setFilasDB(filas);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Carga inicial al montar. El setState síncrono solo ocurre en el caso "sin proyecto",
    // una única vez; el resto de actualizaciones llegan después del await de Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // CREAR: una fila nueva por referencia.
  async function crear(r: Referencia) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const actuales = filasRef.current;
    const orden = actuales.length ? Math.max(...actuales.map((x) => x.orden)) + 1 : 0;
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: MOODBOARD_FOTO_DEPARTAMENTO,
        herramienta_id: MOODBOARD_FOTO_HERRAMIENTA_ID,
        datos: referenciaADatos(r),
        orden,
        registro: [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }],
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id, datos, orden, registro")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) aplicar([...filasRef.current, data as FilaDB]);
    setError(null);
  }

  // EDITAR: se fusiona con lo ya guardado para no perder claves que este panel todavía no conoce
  // (posición del collage...).
  async function editar(id: string, r: Referencia) {
    const actual = filasRef.current.find((x) => x.id === id);
    if (!actual) return;
    const datos = { ...actual.datos, ...referenciaADatos(r) };
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos } : x)));
    await guardar(id, { datos, editor_nombre: fullName, updated_at: new Date().toISOString() });
  }

  // CAMBIAR ESTADO: envía a revisión, aprueba o descarta, y anota quién lo hizo y cuándo.
  // Si se indica "principal", también marca o desmarca la referencia como principal.
  // El permiso se controla en la pantalla (quién ve el botón), no aquí.
  async function cambiarEstado(id: string, estado: Estado, accion: string, principal?: boolean) {
    const actual = filasRef.current.find((x) => x.id === id);
    if (!actual) return;
    const datos = {
      ...actual.datos,
      estado,
      ...(principal === undefined ? {} : { principal: String(principal) }),
    };
    const registro = [
      ...(actual.registro ?? []),
      { accion, usuario: fullName, fecha: new Date().toISOString() },
    ];
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    await guardar(id, { datos, registro, editor_nombre: fullName, updated_at: new Date().toISOString() });
  }

  // COMENTAR: añade un comentario (usuario, fecha y texto) a la referencia.
  // Pueden comentar todos los cargos; el permiso de estado no aplica aquí.
  async function comentar(id: string, texto: string) {
    const actual = filasRef.current.find((x) => x.id === id);
    const limpio = texto.trim();
    if (!actual || !limpio) return;
    const ahora = new Date().toISOString();
    const comentarios = [
      ...leerComentarios(actual.datos.comentarios),
      { usuario: fullName, fecha: ahora, texto: limpio },
    ];
    const datos = { ...actual.datos, comentarios: JSON.stringify(comentarios) };
    const registro = [
      ...(actual.registro ?? []),
      { accion: "comenta", usuario: fullName, fecha: ahora },
    ];
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    await guardar(id, { datos, registro, editor_nombre: fullName, updated_at: ahora });
  }

  // GUARDAR GEOMETRÍAS: posición y tamaño de varias referencias del Collage de una vez.
  // No se anota en el registro (mover imágenes no es un cambio que auditar).
  // El permiso se controla en la pantalla (solo ve el botón quien puede editar).
  async function guardarGeometrias(cambios: Record<string, Geometria>) {
    const nuevosDatos: Record<string, DatosFila> = {};
    for (const [id, geometria] of Object.entries(cambios)) {
      const actual = filasRef.current.find((x) => x.id === id);
      if (actual) nuevosDatos[id] = { ...actual.datos, geometria: JSON.stringify(geometria) };
    }
    const ids = Object.keys(nuevosDatos);
    if (ids.length === 0) return;

    const ahora = new Date().toISOString();
    aplicar(filasRef.current.map((x) => (nuevosDatos[x.id] ? { ...x, datos: nuevosDatos[x.id] } : x)));
    await Promise.all(
      ids.map((id) => guardar(id, { datos: nuevosDatos[id], editor_nombre: fullName, updated_at: ahora })),
    );
  }

  // Referencias ya traducidas. Las filas que no son referencias (galería genérica antigua) se descartan.
  const referencias = useMemo<FilaReferencia[]>(
    () =>
      filasDB.flatMap((x) => {
        const datos = datosAReferencia(x.datos);
        return datos ? [{ id: x.id, datos, registro: x.registro ?? [] }] : [];
      }),
    [filasDB]
  );

  return { referencias, loading, error, crear, editar, cambiarEstado, comentar, guardarGeometrias };
}