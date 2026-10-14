"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DatosFila } from "./moodboardFilas";
import {
  PLAN_SONIDO_DEPARTAMENTO,
  PLAN_SONIDO_HERRAMIENTA_ID,
  datosAFicha,
  fichaADatos,
  type FichaEscena,
} from "./planSonidoFilas";
import { ERROR_SIN_PROYECTO } from "./useMoodboardFila";

export { ERROR_SIN_PROYECTO };

// Una intervención del historial de la fila (misma forma que en Fotografía).
type Intervencion = { accion: string; usuario: string; fecha: string };

// Forma de la fila en herramienta_filas (solo las columnas que usamos).
type FilaDB = { id: string; datos: DatosFila; orden: number; registro: Intervencion[] | null };

export type FilaFicha = { id: string; datos: FichaEscena; registro: Intervencion[] };

export function usePlanSonidoFilas(fullName: string) {
  const [filasDB, setFilasDB] = useState<FilaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LEER: todas las fichas del Plan de sonido directo en el proyecto.
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
      .eq("departamento", PLAN_SONIDO_DEPARTAMENTO)
      .eq("herramienta_id", PLAN_SONIDO_HERRAMIENTA_ID)
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

  // CREAR: una fila nueva por escena.
  async function crear(f: FichaEscena) {
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
        departamento: PLAN_SONIDO_DEPARTAMENTO,
        herramienta_id: PLAN_SONIDO_HERRAMIENTA_ID,
        datos: fichaADatos(f),
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

  // EDITAR: se fusiona con lo ya guardado para no perder claves que este panel no conoce.
  // Si la ficha estaba "lista" y se edita, vuelve a "en preparación" (hay que revisarla de nuevo).
  async function editar(id: string, f: FichaEscena) {
    const actual = filasDB.find((x) => x.id === id);
    if (!actual) return;
    const estabaLista = datosAFicha(actual.datos).lista;
    const datos = { ...actual.datos, ...fichaADatos({ ...f, lista: false }) };
    const ahora = new Date().toISOString();
    const registro = [
      ...(actual.registro ?? []),
      { accion: estabaLista ? "edita_y_reabre" : "edita", usuario: fullName, fecha: ahora },
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

  // MARCAR COMO LISTA / REABRIR: cambia solo el campo "lista" y lo anota en el registro.
  // La regla "no se puede marcar sin método y riesgo" se controla en la pantalla (puedeMarcarLista).
  // El permiso también se controla en la pantalla (quién ve el botón), no aquí.
  async function marcarLista(id: string, lista: boolean) {
    const actual = filasDB.find((x) => x.id === id);
    if (!actual) return;
    const ahora = new Date().toISOString();
    const datos = { ...actual.datos, lista: String(lista) };
    const registro = [
      ...(actual.registro ?? []),
      { accion: lista ? "marca_lista" : "reabre", usuario: fullName, fecha: ahora },
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

  // Fichas ya traducidas a la forma tipada (con método, riesgo y lista).
  const fichas = useMemo<FilaFicha[]>(
    () => filasDB.map((x) => ({ id: x.id, datos: datosAFicha(x.datos), registro: x.registro ?? [] })),
    [filasDB]
  );

  return { fichas, loading, error, crear, editar, marcarLista };
}