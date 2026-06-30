"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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

export default function AdminUsuarios() {
  const t = useTranslations("adminUsuarios");
  const locale = useLocale();
  const APP_ROLE_LABEL: Record<string, string> = {
    super_admin: t("roleSuperAdmin"),
    support: t("roleSupport"),
    executive_producer: t("roleExecutiveProducer"),
  };
  const { checking, isAdmin } = useAdminGuard();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [miembrosPorProyecto, setMiembrosPorProyecto] = useState<Record<string, Set<string>>>({});
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch("/api/admin/usuarios");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || t("errLoadUsers"));
    setUsuarios(json.usuarios);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("proyectos").select("id, nombre").order("nombre");
      setProyectos(data ?? []);
      const { data: miembros } = await supabase.from("project_members").select("project_id, user_id");
      const mapa: Record<string, Set<string>> = {};
      (miembros ?? []).forEach((m) => {
        if (!mapa[m.project_id]) mapa[m.project_id] = new Set();
        mapa[m.project_id].add(m.user_id);
      });
      setMiembrosPorProyecto(mapa);
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
    if (!confirm(t("confirmDelete", { email: u.email ?? "" }))) return;
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
    if (!confirm(t("confirmImpersonate", { email: u.email ?? "" }))) return;
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
    if (!confirm(t("confirmChangeRole", { who: u.full_name ?? u.email ?? "", role: APP_ROLE_LABEL[app_role] ?? app_role }))) return;
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
      alert(t("resetLinkCopied", { email: u.email ?? "", link: json.link }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (checking) return null;

  const filtrados = usuarios?.filter((u) => {
    const coincideTexto =
      !q.trim() || (u.email ?? "").toLowerCase().includes(q.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase());
    const coincideProyecto = !filtroProyecto || miembrosPorProyecto[filtroProyecto]?.has(u.id);
    return coincideTexto && coincideProyecto;
  });

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("title", { n: filtrados?.length ?? 0 })}</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={filtroProyecto}
              onChange={(e) => setFiltroProyecto(e.target.value)}
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }}
            >
              <option value="">{t("allProjects")}</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder={t("searchPh")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px", minWidth: "220px" }}
            />
          </div>
        </div>

        {usuarios === null && !err && <div className="cp-admin-empty">{t("loading")}</div>}
        {filtrados?.length === 0 && <div className="cp-admin-empty">{t("noResults")}</div>}

        {filtrados && filtrados.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>{t("colName")}</th>
                <th>{t("colEmail")}</th>
                <th>{t("colDepartment")}</th>
                <th>{t("colRole")}</th>
                <th>{t("colBetaProject")}</th>
                <th>{t("colSignup")}</th>
                <th>{t("colLastAccess")}</th>
                <th>{t("colStatus")}</th>
                <th>{t("colActions")}</th>
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
                        <button className="btn" disabled={busy === u.id} onClick={() => revocarBeta(u)}>{t("revoke")}</button>
                      </div>
                    ) : (
                      <div className="cons-actions" style={{ marginTop: 0 }}>
                        <select
                          value={seleccion[u.id] ?? ""}
                          onChange={(e) => setSeleccion((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "6px 8px", fontSize: "12px" }}
                        >
                          <option value="">{t("chooseProject")}</option>
                          {proyectos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                        <button className="btn" disabled={busy === u.id || !seleccion[u.id]} onClick={() => habilitarBeta(u)}>
                          {t("enableBeta")}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString(locale)}</td>
                  <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(locale) : t("never")}</td>
                  <td><span className={`cp-admin-badge ${u.banned ? "pend" : "ok"}`}>{u.banned ? t("statusSuspended") : t("statusActive")}</span></td>
                  <td>
                    <div className="cons-actions" style={{ marginTop: 0 }}>
                      <button className="btn" disabled={busy === u.id} onClick={() => impersonar(u)}>{t("impersonate")}</button>
                      <button className="btn" disabled={busy === u.id} onClick={() => resetearPassword(u)}>{t("resetPassword")}</button>
                      <button className="btn" disabled={busy === u.id} onClick={() => toggleBan(u)}>
                        {u.banned ? t("reactivate") : t("suspend")}
                      </button>
                      <button className="btn" disabled={busy === u.id} onClick={() => eliminar(u)} style={{ color: "var(--rose)", borderColor: "var(--rose)" }}>
                        {t("delete")}
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
