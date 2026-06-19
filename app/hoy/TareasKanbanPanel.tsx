"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS_TAREA, ESTADO_LABEL, ESTADO_COLOR, type EstadoTarea } from "../constants";

type TareaKanban = {
  id: string;
  titulo: string;
  para_departamento: string | null;
  etiqueta: string;
  estado: EstadoTarea;
};

export default function TareasKanbanPanel({ projectId }: { projectId: string }) {
  const [tareas, setTareas] = useState<TareaKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tareas")
        .select("id, titulo, para_departamento, etiqueta, estado, completada")
        .eq("project_id", projectId)
        .eq("completada", false);
      setTareas(
        (data ?? []).map((t) => ({
          id: t.id,
          titulo: t.titulo,
          para_departamento: t.para_departamento,
          etiqueta: t.etiqueta,
          estado: (t.estado as EstadoTarea) || "pendiente",
        }))
      );
      setLoading(false);
    })();
  }, [projectId]);

  async function moverA(id: string, estado: EstadoTarea) {
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado } : t)));
    const supabase = createClient();
    if (estado === "hecho") {
      await supabase.from("tareas").update({ estado, completada: true }).eq("id", id);
      setTareas((prev) => prev.filter((t) => t.id !== id));
    } else {
      await supabase.from("tareas").update({ estado }).eq("id", id);
    }
  }

  if (loading) {
    return <p className="pulso-loading">Cargando tareas…</p>;
  }

  return (
    <div className="cp-kanban">
      {ESTADOS_TAREA.map((estado) => (
        <div
          key={estado}
          className="cp-kanban-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragId) moverA(dragId, estado);
            setDragId(null);
          }}
        >
          <h4>
            <span className="cp-estado-dot" style={{ background: ESTADO_COLOR[estado] }}></span>
            {ESTADO_LABEL[estado]}
            <span className="cp-kanban-count">{tareas.filter((t) => t.estado === estado).length}</span>
          </h4>
          <div className="cp-kanban-cards">
            {tareas
              .filter((t) => t.estado === estado)
              .map((t) => (
                <div
                  key={t.id}
                  className="cp-kanban-card"
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                >
                  <span>{t.titulo}</span>
                  <span className="cp-kanban-meta">{t.para_departamento ?? "Todos"} · {t.etiqueta}</span>
                </div>
              ))}
            {tareas.filter((t) => t.estado === estado).length === 0 && (
              <p className="cp-kanban-empty">Sin tareas.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
