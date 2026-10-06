"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FrecuenciaDatos } from "./useConflictoFrecuencias";
import {
  FRECUENCIAS_DEPARTAMENTO,
  FRECUENCIAS_HERRAMIENTA_ID,
  datosAFrecuencia,
  frecuenciaADatos,
  type DatosFila,
} from "./frecuenciasFilas";

// Código de error que el panel traduce con t(): el texto no vive en este archivo.
export const ERROR_SIN_PROYECTO = "sin-proyecto";

// Forma de la fila en herramienta_filas (solo las columnas que usamos).
type FilaDB = { id: string; datos: DatosFila; orden: number };

export type FilaFrecuencia = { id: string; datos: FrecuenciaDatos };

export function useFrecuenciasFilas(fullName: string) {
  const [filasDB, setFilasDB] = useState<FilaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LEER: mismos filtros que `load` de HerramientaPanel.
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
      .select("id, datos, orden")
      .eq("project_id", projectId)
      .eq("departamento", FRECUENCIAS_DEPARTAMENTO)
      .eq("herramienta_id", FRECUENCIAS_HERRAMIENTA_ID)
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

  // CREAR: mismas columnas que `crearFila` de HerramientaPanel.
  async function crear(f: FrecuenciaDatos) {
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
        departamento: FRECUENCIAS_DEPARTAMENTO,
        herramienta_id: FRECUENCIAS_HERRAMIENTA_ID,
        datos: frecuenciaADatos(f),
        orden,
        registro: [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }],
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id, datos, orden")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setFilasDB((prev) => [...prev, data as FilaDB]);
    setError(null);
  }

  // EDITAR: como `guardarFila` y OrdenRodajePanel (datos + editor_nombre + updated_at).
  async function editar(id: string, f: FrecuenciaDatos) {
    const actual = filasDB.find((x) => x.id === id);
    if (!actual) return;
    // Se fusiona con lo ya guardado para no perder claves que este panel no conoce.
    const datos = { ...actual.datos, ...frecuenciaADatos(f) };
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

  // BORRAR: como `borrarFila`. Solo se quita de la pantalla si la base de datos lo aceptó.
  async function borrar(id: string) {
    const supabase = createClient();
    const { error: err } = await supabase.from("herramienta_filas").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setFilasDB((prev) => prev.filter((x) => x.id !== id));
    setError(null);
  }

  // Filas ya traducidas a datos tipados. Memoizadas porque useConflictoFrecuencias
  // recalcula cuando cambia la identidad de este array.
  const filas = useMemo<FilaFrecuencia[]>(
    () => filasDB.map((x) => ({ id: x.id, datos: datosAFrecuencia(x.datos) })),
    [filasDB]
  );

  return { filas, loading, error, crear, editar, borrar };
}