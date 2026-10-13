"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MOODBOARD_DEPARTAMENTO,
  MOODBOARD_HERRAMIENTA_ID,
  datosAElementos,
  elementosADatos,
  type DatosFila,
  type ElementoMoodboard,
} from "./moodboardFilas";

// Código de error que el panel traduce con t(): el texto no vive en este archivo.
export const ERROR_SIN_PROYECTO = "sin-proyecto";

// Forma de la fila en herramienta_filas (solo las columnas que usamos).
type FilaDB = { id: string; datos: DatosFila };

// Un único moodboard por proyecto: una sola fila, compartida por todo el departamento.
export function useMoodboardFila(fullName: string) {
  const [fila, setFila] = useState<FilaDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LEER: mismos filtros que useFrecuenciasFilas, pero solo la primera fila.
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
      .select("id, datos")
      .eq("project_id", projectId)
      .eq("departamento", MOODBOARD_DEPARTAMENTO)
      .eq("herramienta_id", MOODBOARD_HERRAMIENTA_ID)
      .order("orden", { ascending: true })
      .limit(1);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setFila(((data ?? [])[0] as FilaDB | undefined) ?? null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Carga inicial al montar. El setState síncrono solo ocurre en el caso "sin proyecto",
    // una única vez; el resto de actualizaciones llegan después del await de Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Un moodboard "existe" solo si la fila tiene la clave `elementos`.
  // Una fila antigua (p. ej. de la galería genérica) no cuenta como moodboard creado.
  const existe = fila !== null && typeof fila.datos?.elementos === "string";

  // CREAR: la fila única del proyecto, con el tablero vacío.
  // Si ya hay una fila antigua sin `elementos`, la reutiliza en vez de insertar otra.
  async function crear() {
    if (existe) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      return;
    }
    const supabase = createClient();

    if (fila) {
      const datos = { ...fila.datos, ...elementosADatos([]) };
      const { error: err } = await supabase
        .from("herramienta_filas")
        .update({ datos, editor_nombre: fullName, updated_at: new Date().toISOString() })
        .eq("id", fila.id);
      if (err) {
        setError(err.message);
        return;
      }
      setFila({ ...fila, datos });
      setError(null);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: MOODBOARD_DEPARTAMENTO,
        herramienta_id: MOODBOARD_HERRAMIENTA_ID,
        datos: elementosADatos([]),
        orden: 0,
        registro: [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }],
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id, datos")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setFila(data as FilaDB);
    setError(null);
  }

  // GUARDAR: sustituye la lista de elementos, conservando cualquier otra clave de la fila.
  async function guardar(elementos: ElementoMoodboard[]) {
    if (!fila) return;
    const datos = { ...fila.datos, ...elementosADatos(elementos) };
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, editor_nombre: fullName, updated_at: new Date().toISOString() })
      .eq("id", fila.id);
    if (err) {
      setError(err.message);
      return;
    }
    setFila({ ...fila, datos });
    setError(null);
  }

  // Elementos ya traducidos; memoizados para no recalcular en cada render.
  const elementos = useMemo<ElementoMoodboard[]>(() => (fila ? datosAElementos(fila.datos) : []), [fila]);

  return { existe, elementos, loading, error, crear, guardar };
}