"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MOODBOARD_FOTO_DEPARTAMENTO } from "./moodboardFotoFilas";

// Fila de configuración del proyecto: guarda el estilo del moodboard elegido por el Director.
// Tiene su propio herramienta_id, así que no se mezcla con las referencias.
export const MODO_FOTO_HERRAMIENTA_ID = "foto-lookbook-config";

export type ModoFoto = "galeria" | "collage";

export function useMoodboardFotoModo(fullName: string) {
  const [modo, setModoLocal] = useState<ModoFoto>("galeria");
  const [filaId, setFilaId] = useState<string | null>(null);

  // LEER: la fila de configuración del proyecto. Si no existe todavía, se usa la galería.
  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("herramienta_filas")
      .select("id, datos")
      .eq("project_id", projectId)
      .eq("departamento", MOODBOARD_FOTO_DEPARTAMENTO)
      .eq("herramienta_id", MODO_FOTO_HERRAMIENTA_ID)
      .limit(1);
    const fila = data?.[0];
    if (!fila) return;
    setFilaId(fila.id);
    setModoLocal(fila.datos?.modo === "collage" ? "collage" : "galeria");
  }, []);

  useEffect(() => {
    // Carga inicial al montar: el setState llega después del await de Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // CAMBIAR: actualiza la fila si existe; si no, la crea. El permiso se controla en la pantalla.
  async function cambiarModo(nuevo: ModoFoto) {
    const anterior = modo;
    setModoLocal(nuevo);
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const ahora = new Date().toISOString();

    if (filaId) {
      const { error } = await supabase
        .from("herramienta_filas")
        .update({ datos: { modo: nuevo }, editor_nombre: fullName, updated_at: ahora })
        .eq("id", filaId);
      if (error) setModoLocal(anterior);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: MOODBOARD_FOTO_DEPARTAMENTO,
        herramienta_id: MODO_FOTO_HERRAMIENTA_ID,
        datos: { modo: nuevo },
        orden: 0,
        registro: [],
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id")
      .single();
    if (error) {
      setModoLocal(anterior);
      return;
    }
    if (data) setFilaId(data.id);
  }

  return { modo, cambiarModo };
}