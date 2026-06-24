"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Usuario = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  full_name: string | null;
  departamento: string | null;
  app_role: string;
  beta_project_id: string | null;
  beta_project_nombre: string | null;
};

type Proyecto = { id: string; nombre: string };

const APP_ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  support: "Soporte",
  executive_producer: "Productor ejecutivo",
};

export default function AdminUsuarios() {
  const { checking, isAdmin } = useAdminGuard();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch("/api/admin/usuarios");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al cargar usuarios.");
    setUsuarios(json.usuarios);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("proyectos").select("id, nombre").order("nombre");
      setProyectos(data ?? []);
    })();
  }, [isAdmin]);

  async function habilitarBeta(u: Usuario) {
    const project_id = seleccion[u.id];
    if (!project_id) return;
    setBusy(u.id);
    try {
      const res = await fetch("/api/admin/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, project_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revocarBeta(u: Usuario) {
    if (!u.beta_project_id) return;
    setBusy(u.id);
    try {
      const res = await fetch("/api/admin/beta-access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, project_id: u.beta_project_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleBan(u: Usuario) {
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !u.banned }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function eliminar(u: Usuario) {
    if (!confirm(`Eliminar la cuenta de ${u.email}? Esta acción no se puede deshacer.`)) return;
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function impersonar(u: Usuario) {
    if (!u.email) return;
    if (!confirm(`Vas a entrar como ${u.email}. Tu propia sesión de admin se cerrará en esta pestaña. ¿Continuar?`)) return;
    setBusy(u.id);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      window.location.href = json.link;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  async function cambiarRol(u: Usuario, app_role: string) {
    if (app_role === u.app_role) return;
    if (!confirm(`Cambiar el rol de ${u.full_name ?? u.email} a "${APP_ROLE_LABEL[app_role] ?? app_role}"?`)) return;
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resetearPassword(u: Usuario) {
    if (!u.email) return;
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await navigator.clipboard.writeText(json.link);
      alert(`Link de reseteo copiado al portapapeles. Enviáselo a ${u.email}:\n\n${json.link}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (checking) return null;

  const filtrados = usuarios?.filter((u) =>
    !q.trim() || (u.email ?? "").toLowerCase().includes(q.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Usuarios ({filtrados?.length ?? 0})</h3>
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px", minWidth: "220px" }}
          />
        </div>

        {usuarios === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {filtrados?.length === 0 && <div className="cp-admin-empty">Sin resultados.</div>}

        {filtrados && filtrados.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Departamento</th>
                <th>Rol</th>
                <th>Proyecto beta</th>
                <th>Alta</th>
                <th>Último acceso</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name ?? "—"}</td>
                  <td>{u.email}</td>
                  <td>{u.departamento ?? "—"}</td>
                  <td>
                    <select
                      value={u.app_role}
                      disabled={busy === u.id}
                      onChange={(e) => cambiarRol(u, e.target.value)}
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "6px 8px", fontSize: "12px" }}
                    >
                      {Object.entries(APP_ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {u.beta_project_nombre ? (
                      <div className="cons-actions" style={{ marginTop: 0 }}>
                        <span>{u.beta_project_nombre}</span>
                        <button className="btn" disabled={busy === u.id} onClick={() => revocarBeta(u)}>Revocar</button>
                      </div>
                    ) : (
                      <div className="cons-actions" style={{ marginTop: 0 }}>
                        <select
                          value={seleccion[u.id] ?? ""}
                          onChange={(e) => setSeleccion((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "6px 8px", fontSize: "12px" }}
                        >
                          <option value="">Elegir proyecto…</option>
                          {proyectos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                        <button className="btn" disabled={busy === u.id || !seleccion[u.id]} onClick={() => habilitarBeta(u)}>
                          Habilitar beta
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString("es-ES")}</td>
                  <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("es-ES") : "Nunca"}</td>
                  <td><span className={`cp-admin-badge ${u.banned ? "pend" : "ok"}`}>{u.banned ? "suspendido" : "activo"}</span></td>
                  <td>
                    <div className="cons-actions" style={{ marginTop: 0 }}>
                      <button className="btn" disabled={busy === u.id} onClick={() => impersonar(u)}>Suplantar</button>
                      <button className="btn" disabled={busy === u.id} onClick={() => resetearPassword(u)}>Resetear contraseña</button>
                      <button className="btn" disabled={busy === u.id} onClick={() => toggleBan(u)}>
                        {u.banned ? "Reactivar" : "Suspender"}
                      </button>
                      <button className="btn" disabled={busy === u.id} onClick={() => eliminar(u)} style={{ color: "var(--rose)", borderColor: "var(--rose)" }}>
                        Eliminar
                      </button>
                    </div>
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
