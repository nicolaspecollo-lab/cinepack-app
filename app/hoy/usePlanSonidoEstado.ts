"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DatosFila } from "./moodboardFilas";
import {
  PLAN_SONIDO_DEPARTAMENTO,
  PLAN_SONIDO_ESTADO_HERRAMIENTA_ID,
  datosAPlan,
  planADatos,
} from "./planSonidoFilas";
import { ERROR_SIN_PROYECTO } from "./useMoodboardFila";

export { ERROR_SIN_PROYECTO };

// Una intervención del historial de la fila (misma forma que en las fichas).
type Intervencion = { accion: string; usuario: string; fecha: string };

// Forma de la fila en herramienta_filas (solo las columnas que usamos).
type FilaDB = { id: string; datos: DatosFila; registro: Intervencion[] | null };

// Un único estado de plan por proyecto: una sola fila, compartida por todo el departamento.
export function usePlanSonidoEstado(fullName: string) {
  const [fila, setFila] = useState<FilaDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Evita publicar o cerrar dos veces si se pulsa el botón dos veces seguidas.
  const publicando = useRef(false);

  // LEER: misma consulta que las fichas, pero con el identificador del estado y solo la primera fila.
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
      .select("id, datos, registro")
      .eq("project_id", projectId)
      .eq("departamento", PLAN_SONIDO_DEPARTAMENTO)
      .eq("herramienta_id", PLAN_SONIDO_ESTADO_HERRAMIENTA_ID)
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

  // Datos del plan ya traducidos. Sin fila guardada, el plan no está publicado ni cerrado.
  const plan = useMemo(
    () => datosAPlan(fila ? fila.datos : {}),
    [fila]
  );

  // PUBLICAR: marca el plan como publicado y anota quién y cuándo. Se puede volver a publicar
  // si el plan cambió después. Si ya existe la fila la actualiza; si no, la crea.
  // El permiso se controla en la pantalla (quién ve el botón), no aquí.
  async function publicar() {
    if (publicando.current || plan.cerrado) return;
    publicando.current = true;

    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(ERROR_SIN_PROYECTO);
      publicando.current = false;
      return;
    }

    const ahora = new Date().toISOString();
    const datosPlan = planADatos({ ...plan, publicado: true, publicadoPor: fullName, publicadoEn: ahora });
    const registro = [
      ...(fila?.registro ?? []),
      { accion: "publica", usuario: fullName, fecha: ahora },
    ];
    const supabase = createClient();

    if (fila) {
      const datos = { ...fila.datos, ...datosPlan };
      const { error: err } = await supabase
        .from("herramienta_filas")
        .update({ datos, registro, editor_nombre: fullName, updated_at: ahora })
        .eq("id", fila.id);
      if (err) {
        setError(err.message);
      } else {
        setFila({ ...fila, datos, registro });
        setError(null);
      }
      publicando.current = false;
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: PLAN_SONIDO_DEPARTAMENTO,
        herramienta_id: PLAN_SONIDO_ESTADO_HERRAMIENTA_ID,
        datos: datosPlan,
        orden: 0,
        registro,
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id, datos, registro")
      .single();
    if (err) {
      setError(err.message);
    } else if (data) {
      setFila(data as FilaDB);
      setError(null);
    }
    publicando.current = false;
  }

  // CERRAR (enviar a postproducción): solo un plan ya publicado. Anota quién y cuándo.
  // Un plan cerrado queda en solo lectura. El permiso se controla en la pantalla.
  async function cerrar() {
    if (publicando.current || !fila || !plan.publicado || plan.cerrado) return;
    publicando.current = true;

    const ahora = new Date().toISOString();
    const datosPlan = planADatos({ ...plan, cerrado: true, cerradoPor: fullName, cerradoEn: ahora });
    const datos = { ...fila.datos, ...datosPlan };
    const registro = [
      ...(fila.registro ?? []),
      { accion: "cierra", usuario: fullName, fecha: ahora },
    ];
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, registro, editor_nombre: fullName, updated_at: ahora })
      .eq("id", fila.id);
    if (err) {
      setError(err.message);
    } else {
      setFila({ ...fila, datos, registro });
      setError(null);
    }
    publicando.current = false;
  }

  return { plan, loading, error, publicar, cerrar };
}