"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
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
  archivado_at: string | null;
  suspendido_at: string | null;
  aviso_impago_at: string | null;
  aviso_bloqueo_fecha: string | null;
  miembros: number;
};

function badgeClass(estado: string) {
  if (estado === "pagado") return "ok";
  if (estado === "beta_gratis") return "muted";
  if (estado === "pendiente_personalizado") return "warn";
  return "pend";
}

// Estado operativo derivado del ciclo de vida (independiente del pago).
type EstadoOp = "archivado" | "suspendido" | "aviso" | "activo";
function estadoOperativo(p: Fila): EstadoOp {
  if (p.archivado_at) return "archivado";
  if (p.suspendido_at) return "suspendido";
  if (p.aviso_impago_at) return "aviso";
  return "activo";
}
function badgeOpClass(e: EstadoOp) {
  if (e === "activo") return "ok";
  if (e === "aviso") return "warn";
  return "pend"; // suspendido / archivado
}

// Fecha por defecto para el bloqueo tras un aviso de impago: hoy + 7 días.
function fechaMasDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function AdminProyectos() {
  const t = useTranslations("adminProyectos");
  const locale = useLocale();
  const { checking, isAdmin } = useAdminGuard();
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [verArchivados, setVerArchivados] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: proyectos, error } = await supabase
      .from("proyectos")
      .select("id, nombre, tipo, departamentos, pago_estado, pack_tipo, pack_config, created_at, archivado_at, suspendido_at, aviso_impago_at, aviso_bloqueo_fecha")
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
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin]);

  async function actualizar(p: Fila, cambios: Partial<Fila>) {
    setBusy(p.id);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("proyectos").update(cambios).eq("id", p.id);
      if (error) throw error;
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleBeta(p: Fila) {
    const nuevoEstado = p.pago_estado === "beta_gratis" ? "pendiente_pago" : "beta_gratis";
    await actualizar(p, { pago_estado: nuevoEstado });
  }

  function avisarImpago(p: Fila) {
    const fecha = prompt(t("promptBlockDate"), fechaMasDias(7));
    if (!fecha) return;
    actualizar(p, { aviso_impago_at: new Date().toISOString(), aviso_bloqueo_fecha: fecha });
  }

  function suspenderAhora(p: Fila) {
    if (!confirm(t("confirmSuspend", { nombre: p.nombre }))) return;
    actualizar(p, { suspendido_at: new Date().toISOString() });
  }

  function reactivar(p: Fila) {
    actualizar(p, { suspendido_at: null, aviso_impago_at: null, aviso_bloqueo_fecha: null });
  }

  function archivar(p: Fila) {
    if (!confirm(t("confirmArchive", { nombre: p.nombre }))) return;
    actualizar(p, { archivado_at: new Date().toISOString() });
  }

  function restaurar(p: Fila) {
    actualizar(p, { archivado_at: null });
  }

  async function borrarDefinitivo(p: Fila) {
    const escrito = prompt(t("promptDeleteConfirm", { nombre: p.nombre }));
    if (escrito == null) return;
    if (escrito.trim() !== p.nombre) {
      setErr(t("deleteNameMismatch"));
      return;
    }
    setBusy(p.id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/borrar-proyecto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: p.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function verComoSoporte(p: Fila) {
    localStorage.setItem("cinepack-proyecto", p.nombre);
    localStorage.setItem("cinepack-proyecto-id", p.id);
    router.push("/hoy");
  }

  if (checking) return null;

  const visibles = (filas ?? []).filter((p) => verArchivados || !p.archivado_at);
  const nArchivados = (filas ?? []).filter((p) => p.archivado_at).length;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3>{t("title", { n: visibles.length })}</h3>
          {nArchivados > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} />
              {t("showArchived", { n: nArchivados })}
            </label>
          )}
        </div>
        {filas === null && !err && <div className="cp-admin-empty">{t("loading")}</div>}
        {filas?.length === 0 && <div className="cp-admin-empty">{t("noProjectsYet")}</div>}
        {filas && filas.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>{t("colName")}</th>
                <th>{t("colType")}</th>
                <th>{t("colDepartments")}</th>
                <th>{t("colMembers")}</th>
                <th>{t("colOpStatus")}</th>
                <th>{t("colPayStatus")}</th>
                <th>{t("colMasterFolder")}</th>
                <th>{t("colCreated")}</th>
                <th>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const eop = estadoOperativo(p);
                const disabled = busy === p.id;
                return (
                  <tr key={p.id} style={p.archivado_at ? { opacity: 0.6 } : undefined}>
                    <td>{p.nombre}</td>
                    <td>{p.tipo ?? "—"}</td>
                    <td>{(p.departamentos ?? []).length}</td>
                    <td>{p.miembros}</td>
                    <td>
                      <span className={`cp-admin-badge ${badgeOpClass(eop)}`}>
                        {eop === "aviso" && p.aviso_bloqueo_fecha
                          ? t("opAvisoDate", { fecha: new Date(p.aviso_bloqueo_fecha).toLocaleDateString(locale) })
                          : t(`op_${eop}`)}
                      </span>
                    </td>
                    <td><span className={`cp-admin-badge ${badgeClass(p.pago_estado)}`}>{p.pago_estado.replace("_", " ")}</span></td>
                    <td>
                      <Link href={`/admin/proyectos/${p.id}/carpeta`} className="cp-cm-entry-btn">
                        <span className="hex"></span>
                        {t("openMasterFolder")}
                      </Link>
                    </td>
                    <td>{new Date(p.created_at).toLocaleDateString(locale)}</td>
                    <td>
                      <div className="cons-actions" style={{ marginTop: 0 }}>
                        {p.archivado_at ? (
                          <>
                            <button className="btn" disabled={disabled} onClick={() => restaurar(p)}>{t("restore")}</button>
                            <button className="btn" disabled={disabled} onClick={() => borrarDefinitivo(p)} style={{ color: "var(--rose)", borderColor: "var(--rose)" }}>{t("deleteForever")}</button>
                          </>
                        ) : (
                          <>
                            {p.suspendido_at ? (
                              <button className="btn" disabled={disabled} onClick={() => reactivar(p)}>{t("reactivate")}</button>
                            ) : p.aviso_impago_at ? (
                              <>
                                <button className="btn" disabled={disabled} onClick={() => suspenderAhora(p)}>{t("suspendNow")}</button>
                                <button className="btn" disabled={disabled} onClick={() => reactivar(p)}>{t("reactivate")}</button>
                              </>
                            ) : (
                              <>
                                <button className="btn" disabled={disabled} onClick={() => avisarImpago(p)}>{t("warnUnpaid")}</button>
                                <button className="btn" disabled={disabled} onClick={() => suspenderAhora(p)}>{t("suspendNow")}</button>
                              </>
                            )}
                            <button className="btn" disabled={disabled} onClick={() => archivar(p)}>{t("archive")}</button>
                            <button className="btn" disabled={disabled} onClick={() => toggleBeta(p)}>
                              {p.pago_estado === "beta_gratis" ? t("deactivateBeta") : t("activateBeta")}
                            </button>
                          </>
                        )}
                        <button className="btn" disabled={disabled} onClick={() => verComoSoporte(p)}>{t("viewAsSupport")}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
