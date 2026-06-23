"use client";

import { useEffect, useState } from "react";
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
};

export default function AdminUsuarios() {
  const { checking, isAdmin } = useAdminGuard();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
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
  }, [isAdmin]);

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
                  <td>{new Date(u.created_at).toLocaleDateString("es-ES")}</td>
                  <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("es-ES") : "Nunca"}</td>
                  <td><span className={`cp-admin-badge ${u.banned ? "pend" : "ok"}`}>{u.banned ? "suspendido" : "activo"}</span></td>
                  <td>
                    <div className="cons-actions" style={{ marginTop: 0 }}>
                      <button className="btn" disabled={busy === u.id} onClick={() => impersonar(u)}>Suplantar</button>
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
