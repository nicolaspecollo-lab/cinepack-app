"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Fila = {
  id: string;
  nombre: string;
  tipo: string | null;
  departamentos: string[] | null;
  pago_estado: string;
  pack_tipo: string | null;
  pack_config: { personalizado?: boolean; mensaje?: string } | null;
  created_at: string;
  miembros: number;
};

function badgeClass(estado: string) {
  if (estado === "pagado") return "ok";
  if (estado === "beta_gratis") return "muted";
  if (estado === "pendiente_personalizado") return "warn";
  return "pend";
}

export default function AdminProyectos() {
  const { checking, isAdmin } = useAdminGuard();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const supabase = createClient();
      const { data: proyectos, error } = await supabase
        .from("proyectos")
        .select("id, nombre, tipo, departamentos, pago_estado, pack_tipo, pack_config, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: membresias } = await supabase.from("project_members").select("project_id");
      const conteo: Record<string, number> = {};
      (membresias ?? []).forEach((m) => {
        conteo[m.project_id] = (conteo[m.project_id] ?? 0) + 1;
      });

      setFilas(
        (proyectos ?? []).map((p) => ({ ...p, miembros: conteo[p.id] ?? 0 }))
      );
    })().catch((e) => setErr(e.message));
  }, [isAdmin]);

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <h3>Todos los proyectos ({filas?.length ?? 0})</h3>
        {filas === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {filas?.length === 0 && <div className="cp-admin-empty">Todavía no hay proyectos.</div>}
        {filas && filas.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Departamentos</th>
                <th>Miembros</th>
                <th>Estado de pago</th>
                <th>Pack / Nota</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.tipo ?? "—"}</td>
                  <td>{(p.departamentos ?? []).length}</td>
                  <td>{p.miembros}</td>
                  <td><span className={`cp-admin-badge ${badgeClass(p.pago_estado)}`}>{p.pago_estado.replace("_", " ")}</span></td>
                  <td>{p.pack_config?.mensaje ? p.pack_config.mensaje : (p.pack_tipo ?? "—")}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("es-ES")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
