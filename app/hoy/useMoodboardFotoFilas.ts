"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DatosFila } from "./moodboardFilas";
import {
  MOODBOARD_FOTO_DEPARTAMENTO,
  MOODBOARD_FOTO_HERRAMIENTA_ID,
  datosAReferencia,
  leerComentarios,
  referenciaADatos,
  type Estado,
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
    setFilasDB((data ?? []) as FilaDB[]);
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
    const orden = filasDB.length ? Math.max(...filasDB.map((x) => x.orden)) + 1 : 0;
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
    if (data) setFilasDB((prev) => [...prev, data as FilaDB]);
    setError(null);
  }

  // EDITAR: se fusiona con lo ya guardado para no perder claves que este panel todavía no conoce
  // (posición del collage...).
  async function editar(id: string, r: Referencia) {
    const actual = filasDB.find((x) => x.id === id);
    if (!actual) return;
    const datos = { ...actual.datos, ...referenciaADatos(r) };
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, editor_nombre: fullName, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setFilasDB((prev) => prev.map((x) => (x.id === id ? { ...x, datos } : x)));
    setError(null);
  }

  // CAMBIAR ESTADO: envía a revisión, aprueba o descarta, y anota quién lo hizo y cuándo.
  // El permiso se controla en la pantalla (quién ve el botón), no aquí.
  async function cambiarEstado(id: string, estado: Estado, accion: string) {
    const actual = filasDB.find((x) => x.id === id);
    if (!actual) return;
    const datos = { ...actual.datos, estado };
    const registro = [
      ...(actual.registro ?? []),
      { accion, usuario: fullName, fecha: new Date().toISOString() },
    ];
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, registro, editor_nombre: fullName, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setFilasDB((prev) => prev.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    setError(null);
  }

  // COMENTAR: añade un comentario (usuario, fecha y texto) a la referencia.
  // Pueden comentar todos los cargos; el permiso de estado no aplica aquí.
  async function comentar(id: string, texto: string) {
    const actual = filasDB.find((x) => x.id === id);
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
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, registro, editor_nombre: fullName, updated_at: ahora })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setFilasDB((prev) => prev.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    setError(null);
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

  return { referencias, loading, error, crear, editar, cambiarEstado, comentar };
}