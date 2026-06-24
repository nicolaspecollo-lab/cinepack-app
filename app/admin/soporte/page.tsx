"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Perfil = { id: string; full_name: string | null; app_role: string };
type Proyecto = { id: string; nombre: string };
type Acceso = {
  user_id: string;
  project_id: string;
  status: string;
  granted_at: string;
  profiles: { full_name: string | null } | null;
  proyectos: { nombre: string } | null;
};

export default function AdminSoporte() {
  const { checking, isAdmin } = useAdminGuard();
  const [soportes, setSoportes] = useState<Perfil[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [accesos, setAccesos] = useState<Acceso[] | null>(null);
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = createClient();
    const [{ data: perfiles }, { data: proys }, { data: accesosData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, app_role").eq("app_role", "support"),
      supabase.from("proyectos").select("id, nombre").order("nombre"),
      supabase
        .from("support_access")
        .select("user_id, project_id, status, granted_at, profiles(full_name), proyectos(nombre)")
        .eq("status", "active")
        .order("granted_at", { ascending: false }),
    ]);
    setSoportes(perfiles ?? []);
    setProyectos(proys ?? []);
    setAccesos((accesosData ?? []) as unknown as Acceso[]);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin]);

  async function otorgar(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !projectId) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("support_access")
        .upsert(
          { user_id: userId, project_id: projectId, status: "active", granted_by: user?.id },
          { onConflict: "user_id,project_id" }
        );
      if (error) throw error;
      setUserId("");
      setProjectId("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revocar(a: Acceso) {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("support_access")
        .update({ status: "revoked" })
        .eq("user_id", a.user_id)
        .eq("project_id", a.project_id);
      if (error) throw error;
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}

      <div className="cp-admin-section">
        <h3>Otorgar acceso de soporte</h3>
        <p style={{ color: "var(--muted)", fontSize: "12.5px", marginBottom: "16px" }}>
          El usuario de soporte va a poder ver el proyecto en modo lectura. No puede modificar ningún dato
          (las políticas de escritura siguen exigiendo ser miembro del proyecto).
        </p>
        {soportes.length === 0 ? (
          <div className="cp-admin-empty">
            Todavía no hay ningún usuario con rol &quot;support&quot;. Asignalo primero desde la sección de Usuarios
            cambiando su app_role.
          </div>
        ) : (
          <form onSubmit={otorgar} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }}
            >
              <option value="" disabled>Usuario de soporte…</option>
              {soportes.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
              ))}
            </select>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }}
            >
              <option value="" disabled>Proyecto…</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <button type="submit" className="btn" disabled={busy}>Otorgar acceso</button>
          </form>
        )}
      </div>

      <div className="cp-admin-section">
        <h3>Accesos de soporte activos ({accesos?.length ?? 0})</h3>
        {accesos === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {accesos?.length === 0 && <div className="cp-admin-empty">Sin accesos de soporte activos.</div>}
        {accesos && accesos.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>Usuario de soporte</th>
                <th>Proyecto</th>
                <th>Otorgado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((a) => (
                <tr key={`${a.user_id}-${a.project_id}`}>
                  <td>{a.profiles?.full_name ?? a.user_id}</td>
                  <td>{a.proyectos?.nombre ?? a.project_id}</td>
                  <td>{new Date(a.granted_at).toLocaleDateString("es-ES")}</td>
                  <td>
                    <button className="btn" disabled={busy} onClick={() => revocar(a)}>Revocar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
