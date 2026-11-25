"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  REP_PREP_DEPARTAMENTO,
  REP_PREP_HERRAMIENTA_ID,
  PERSONAJES_EJEMPLO,
  datosAPersonaje,
  personajeADatos,
  type DatosFila,
  type Personaje,
} from "./repNotasPreparacionFilas";
import { ERROR_SIN_PROYECTO } from "./useMoodboardFila";

export { ERROR_SIN_PROYECTO };

type Intervencion = { accion: string; usuario: string; fecha: string };
type FilaDB = { id: string; datos: DatosFila; orden: number; registro: Intervencion[] | null; created_by: string | null };
export type FilaPersonaje = { id: string; datos: Personaje; registro: Intervencion[]; esMia: boolean };

export function useRepNotasPreparacion(fullName: string) {
  const [filasDB, setFilasDB] = useState<FilaDB[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filasRef = useRef<FilaDB[]>([]);
  const cola = useRef<Promise<unknown>>(Promise.resolve());

  function aplicar(nuevas: FilaDB[]) {
    filasRef.current = nuevas;
    setFilasDB(nuevas);
  }

  function guardar(id: string, cambios: Record<string, unknown>) {
    cola.current = cola.current.then(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.from("herramienta_filas").update(cambios).eq("id", id);
      setError(err ? err.message : null);
    });
  }

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUid(user?.id ?? null);
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .select("id, datos, orden, registro, created_by")
      .eq("project_id", projectId)
      .eq("departamento", REP_PREP_DEPARTAMENTO)
      .eq("herramienta_id", REP_PREP_HERRAMIENTA_ID)
      .order("orden", { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const filas = (data ?? []) as FilaDB[];
    aplicar(filas);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function crear(p: Personaje): Promise<boolean> {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      return false;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const actuales = filasRef.current;
    const orden = actuales.length ? Math.max(...actuales.map((x) => x.orden)) + 1 : 0;
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: REP_PREP_DEPARTAMENTO,
        herramienta_id: REP_PREP_HERRAMIENTA_ID,
        datos: personajeADatos(p),
        orden,
        registro: [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }],
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id, datos, orden, registro, created_by")
      .single();
    if (err) {
      setError(err.message);
      return false;
    }
    if (data) aplicar([...filasRef.current, data as FilaDB]);
    setError(null);
    return true;
  }

  function editar(id: string, p: Personaje) {
    const actual = filasRef.current.find((x) => x.id === id);
    if (!actual) return;
    const datos = { ...actual.datos, ...personajeADatos(p) };
    const ahora = new Date().toISOString();
    const registro = [...(actual.registro ?? []), { accion: "edita", usuario: fullName, fecha: ahora }];
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos, registro } : x)));
    guardar(id, { datos, registro, editor_nombre: fullName, updated_at: ahora });
  }

  function borrar(id: string) {
    aplicar(filasRef.current.filter((x) => x.id !== id));
    const supabase = createClient();
    cola.current = cola.current.then(async () => {
      const { error: err } = await supabase.from("herramienta_filas").delete().eq("id", id);
      setError(err ? err.message : null);
    });
  }

  // Siembra inicial (una sola vez por proyecto): si no hay ningún personaje
  // registrado todavía, se cargan los ejemplos reales en vez de dejar la
  // herramienta vacía — regla de la oficina ("prohibido el cuadro vacío
  // genérico").
  const sembradoRef = useRef(false);
  async function sembrarEjemplos() {
    if (sembradoRef.current) return;
    sembradoRef.current = true;
    for (const p of PERSONAJES_EJEMPLO) {
      await crear(p);
    }
  }

  const personajes: FilaPersonaje[] = filasDB.map((x) => ({
    id: x.id,
    datos: datosAPersonaje(x.datos),
    registro: x.registro ?? [],
    esMia: !!uid && x.created_by === uid,
  }));

  return { personajes, loading, error, crear, editar, borrar, sembrarEjemplos };
}
