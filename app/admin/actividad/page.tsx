"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Evento = {
  id: string;
  cuando: string;
  quien: string;
  que: string;
  proyecto: string;
};

export default function AdminActividad() {
  const { checking, isAdmin } = useAdminGuard();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const supabase = createClient();
      const { data: proyectos } = await supabase.from("proyectos").select("id, nombre");
      const nombreProyecto: Record<string, string> = {};
      (proyectos ?? []).forEach((p) => (nombreProyecto[p.id] = p.nombre));

      const { data: filas } = await supabase
        .from("herramienta_filas")
        .select("id, project_id, departamento, herramienta_id, autor_nombre, editor_nombre, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(40);

      const { data: consultas } = await supabase
        .from("consultas")
        .select("id, project_id, titulo, autor_nombre, estado, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      const eventosFilas: Evento[] = (filas ?? []).map((f) => ({
        id: `fila-${f.id}`,
        cuando: f.updated_at,
        quien: f.editor_nombre || f.autor_nombre || "—",
        que: `${f.editor_nombre && f.editor_nombre !== f.autor_nombre ? "editó" : "creó/editó"} una fila en ${f.departamento} · ${f.herramienta_id}`,
        proyecto: nombreProyecto[f.project_id] ?? "—",
      }));

      const eventosConsultas: Evento[] = (consultas ?? []).map((c) => ({
        id: `consulta-${c.id}`,
        cuando: c.created_at,
        quien: c.autor_nombre,
        que: `creó la consulta "${c.titulo}" (${c.estado})`,
        proyecto: nombreProyecto[c.project_id] ?? "—",
      }));

      setEventos(
        [...eventosFilas, ...eventosConsultas].sort(
          (a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime()
        )
      );
    })().catch((e) => setErr(e.message));
  }, [isAdmin]);

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <h3>Actividad reciente (todos los proyectos)</h3>
        {eventos === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {eventos?.length === 0 && <div className="cp-admin-empty">Sin actividad todavía.</div>}
        {eventos && eventos.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Proyecto</th></tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.cuando).toLocaleString("es-ES")}</td>
                  <td>{e.quien}</td>
                  <td>{e.que}</td>
                  <td>{e.proyecto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
