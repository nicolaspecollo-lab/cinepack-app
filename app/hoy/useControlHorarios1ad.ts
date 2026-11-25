"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CONTROL_HORARIOS_1AD_DEPARTAMENTO,
  CONTROL_HORARIOS_1AD_HERRAMIENTA_ID,
  DIAS_EJEMPLO,
  datosADia,
  diaADatos,
  type DatosFilaDB,
  type DiaControlHorarios,
} from "./controlHorarios1adFilas";
import { ERROR_SIN_PROYECTO } from "./useMoodboardFila";

export { ERROR_SIN_PROYECTO };

type FilaDB = { id: string; datos: DatosFilaDB; orden: number };
export type FilaDia = { id: string; dia: DiaControlHorarios };

export function useControlHorarios1ad(fullName: string) {
  const [filasDB, setFilasDB] = useState<FilaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filasRef = useRef<FilaDB[]>([]);
  const cola = useRef<Promise<unknown>>(Promise.resolve());

  function aplicar(nuevas: FilaDB[]) {
    filasRef.current = nuevas;
    setFilasDB(nuevas);
  }

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
      .eq("departamento", CONTROL_HORARIOS_1AD_DEPARTAMENTO)
      .eq("herramienta_id", CONTROL_HORARIOS_1AD_HERRAMIENTA_ID)
      .order("orden", { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    aplicar((data ?? []) as FilaDB[]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function crearDia(dia: DiaControlHorarios): Promise<string | null> {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      return null;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const actuales = filasRef.current;
    const orden = actuales.length ? Math.max(...actuales.map((x) => x.orden)) + 1 : 0;
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: CONTROL_HORARIOS_1AD_DEPARTAMENTO,
        herramienta_id: CONTROL_HORARIOS_1AD_HERRAMIENTA_ID,
        datos: diaADatos(dia),
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
      return null;
    }
    if (data) aplicar([...filasRef.current, data as FilaDB]);
    setError(null);
    return (data as FilaDB)?.id ?? null;
  }

  function guardarDia(id: string, dia: DiaControlHorarios) {
    aplicar(filasRef.current.map((x) => (x.id === id ? { ...x, datos: diaADatos(dia) } : x)));
    cola.current = cola.current.then(async () => {
      const supabase = createClient();
      const ahora = new Date().toISOString();
      const { error: err } = await supabase
        .from("herramienta_filas")
        .update({ datos: diaADatos(dia), editor_nombre: fullName, updated_at: ahora })
        .eq("id", id);
      setError(err ? err.message : null);
    });
  }

  // Siembra inicial (una sola vez por proyecto, nunca un cuadro vacío
  // genérico): si no hay NINGÚN día registrado todavía, carga las 3
  // jornadas de ejemplo reales de controlHorarios1adFilas.ts.
  const sembradoRef = useRef(false);
  async function sembrarEjemplos() {
    if (sembradoRef.current) return;
    sembradoRef.current = true;
    for (const d of DIAS_EJEMPLO) {
      await crearDia(d);
    }
  }

  const dias: FilaDia[] = filasDB.map((x) => ({ id: x.id, dia: datosADia(x.datos) }));

  return { dias, loading, error, crearDia, guardarDia, sembrarEjemplos };
}
