"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // Última versión de las filas, siempre al día (el estado de React se actualiza
  // con retraso y dos cambios seguidos partirían de datos viejos).
  const filasRef = useRef<FilaDB[]>([]);
  // Cola de guardados: se envían de uno en uno y en orden.
  const cola = useRef<Promise<unknown>>(Promise.resolve());

  function aplicar(nuevas: FilaDB[]) {
    filasRef.current = nuevas;
    setFilasDB(nuevas);
  }

  // Encola un UPDATE de una fila. El siguiente no empieza hasta que acabe el anterior.
  function guardar(id: string, cambios: Record<string, unknown>) {
    cola.current = cola.current.then(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.from("herramienta_filas").update(cambios).eq("id", id);
      setError(err ? err.message : null);
    });
  }

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

  // CREAR: una fila nueva por escena.
  async function crear(f: FichaEscena) {
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
    if (data) aplicar([...filasRef.current, data as FilaDB]);
    setError(null);
  }

  // EDITAR: se fusiona con lo ya guardado para no perder claves que este panel no conoce.
  // Si la ficha estaba "lista" y se edita, vuelve a "en preparación" (hay que revisarla de nuevo).
  function editar(id: string, f: FichaEscena) {
    const actual = filasRef.current.find((x) => x.id === id);
    if (!actual) return;
    const estabaLista = datosAFicha(actual.datos).lista;
    const datos = { ...actual.datos, ...fichaADatos({ ...f, lista: false }) };
    const ahora = new Date().toISOString();
    const registro = [
      ...(actual.registro ?? []),
      { accion: estabaLista ? "edita_y_reabre" : "edita", usuario: fullName, fecha: ahora },
    ];
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    guardar(id, { datos, registro, editor_nombre: fullName, updated_at: ahora });
  }

  // MARCAR COMO LISTA / REABRIR: cambia solo el campo "lista" y lo anota en el registro.
  // La regla "no se puede marcar sin método y riesgo" se controla en la pantalla (puedeMarcarLista).
  // El permiso también se controla en la pantalla (quién ve el botón), no aquí.
  function marcarLista(id: string, lista: boolean) {
    const actual = filasRef.current.find((x) => x.id === id);
    if (!actual) return;
    const ahora = new Date().toISOString();
    const datos = { ...actual.datos, lista: String(lista) };
    const registro = [
      ...(actual.registro ?? []),
      { accion: lista ? "marca_lista" : "reabre", usuario: fullName, fecha: ahora },
    ];
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    guardar(id, { datos, registro, editor_nombre: fullName, updated_at: ahora });
  }

  // Fichas ya traducidas a la forma tipada (con método, riesgo y lista).
  const fichas = useMemo<FilaFicha[]>(
    () => filasDB.map((x) => ({ id: x.id, datos: datosAFicha(x.datos), registro: x.registro ?? [] })),
    [filasDB]
  );

  return { fichas, loading, error, crear, editar, marcarLista };
}