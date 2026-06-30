"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  miembros: number;
};

function badgeClass(estado: string) {
  if (estado === "pagado") return "ok";
  if (estado === "beta_gratis") return "muted";
  if (estado === "pendiente_personalizado") return "warn";
  return "pend";
}

export default function AdminProyectos() {
  const t = useTranslations("adminProyectos");
  const locale = useLocale();
  const { checking, isAdmin } = useAdminGuard();
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
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
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin]);

  async function toggleBeta(p: Fila) {
    setBusy(p.id);
    try {
      const supabase = createClient();
      const nuevoEstado = p.pago_estado === "beta_gratis" ? "pendiente_pago" : "beta_gratis";
      const { error } = await supabase.from("proyectos").update({ pago_estado: nuevoEstado }).eq("id", p.id);
      if (error) throw error;
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

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <h3>{t("title", { n: filas?.length ?? 0 })}</h3>
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
                <th>{t("colPayStatus")}</th>
                <th>{t("colPackNote")}</th>
                <th>{t("colCreated")}</th>
                <th>{t("colActions")}</th>
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
                  <td>{new Date(p.created_at).toLocaleDateString(locale)}</td>
                  <td>
                    <div className="cons-actions" style={{ marginTop: 0 }}>
                      <button className="btn" disabled={busy === p.id} onClick={() => toggleBeta(p)}>
                        {p.pago_estado === "beta_gratis" ? t("deactivateBeta") : t("activateBeta")}
                      </button>
                      <button className="btn" disabled={busy === p.id} onClick={() => verComoSoporte(p)}>
                        {t("viewAsSupport")}
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
