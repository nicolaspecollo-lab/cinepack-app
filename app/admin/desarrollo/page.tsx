"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";
import { catalogoCompleto } from "../../herramientas";

type Entrada = {
  id: string;
  fecha: string;
  departamento: string;
  herramienta_id: string;
  herramienta_nombre: string;
  estado: string;
  nota: string | null;
  commit_sha: string | null;
  autor: string;
};

const ESTADO_TONO: Record<string, string> = {
  desplegado: "ok",
  confirmado: "warn",
  sin_revisar: "muted",
  rechazado: "pend",
  eliminado: "muted",
};

const ESTADO_LABEL: Record<string, string> = {
  desplegado: "Desplegado",
  confirmado: "Confirmado",
  sin_revisar: "Sin revisar",
  rechazado: "Rechazado",
  eliminado: "Eliminada",
};

export default function AdminDesarrollo() {
  const t = useTranslations("adminDesarrollo");
  const locale = useLocale();
  const { checking, isAdmin } = useAdminGuard();
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dev_actividad")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      setEntradas(data ?? []);
    })().catch((e) => setErr(e.message));
  }, [isAdmin]);

  if (checking) return null;

  const catalogo = catalogoCompleto();
  const ultimaPorHerramienta = new Map<string, Entrada>();
  for (const e of entradas ?? []) {
    if (!ultimaPorHerramienta.has(e.herramienta_id)) ultimaPorHerramienta.set(e.herramienta_id, e);
  }

  function EstadoBadge({ id }: { id: string }) {
    const e = ultimaPorHerramienta.get(id);
    const estado = e?.estado ?? "sin_revisar";
    const tono = ESTADO_TONO[estado] ?? "muted";
    return <span className={`cp-admin-badge ${tono}`}>{e ? ESTADO_LABEL[estado] ?? estado : t("neverTouched")}</span>;
  }

  function Fecha({ id }: { id: string }) {
    const e = ultimaPorHerramienta.get(id);
    return <span className="fecha">{e ? new Date(e.fecha).toLocaleDateString(locale) : "—"}</span>;
  }

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}

      <div className="cp-admin-section">
        <h3>{t("statusTitle")}</h3>
        {catalogo.map((d) => {
          const total = d.deptoTools.length + d.cargos.reduce((s, c) => s + c.tools.length, 0);
          if (total === 0) return null;
          return (
            <details key={d.departamento} className="cp-dev-depto">
              <summary>
                {d.departamento}
                <span className="cp-dev-count">{t("toolCount", { count: total })}</span>
              </summary>
              {d.deptoTools.length > 0 && (
                <>
                  <div className="cp-dev-cargo-label">{t("deptTools")}</div>
                  {d.deptoTools.map((h) => (
                    <div className="cp-dev-row" key={h.id}>
                      <span className="nombre">{h.nombre}</span>
                      <EstadoBadge id={h.id} />
                      <Fecha id={h.id} />
                    </div>
                  ))}
                </>
              )}
              {d.cargos.map((g) => (
                <div key={g.cargo}>
                  <div className="cp-dev-cargo-label">{g.cargo}</div>
                  {g.tools.map((h) => (
                    <div className="cp-dev-row" key={h.id}>
                      <span className="nombre">{h.nombre}</span>
                      <EstadoBadge id={h.id} />
                      <Fecha id={h.id} />
                    </div>
                  ))}
                </div>
              ))}
            </details>
          );
        })}
      </div>

      <div className="cp-admin-section">
        <h3>{t("logTitle")}</h3>
        {entradas === null && !err && <div className="cp-admin-empty">{t("loading")}</div>}
        {entradas?.length === 0 && <div className="cp-admin-empty">{t("noActivityYet")}</div>}
        {entradas && entradas.length > 0 && (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>{t("colWhen")}</th>
                <th>{t("colDept")}</th>
                <th>{t("colTool")}</th>
                <th>{t("colStatus")}</th>
                <th>{t("colNote")}</th>
                <th>{t("colCommit")}</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.fecha).toLocaleString(locale)}</td>
                  <td>{e.departamento}</td>
                  <td>{e.herramienta_nombre}</td>
                  <td><span className={`cp-admin-badge ${ESTADO_TONO[e.estado] ?? "muted"}`}>{ESTADO_LABEL[e.estado] ?? e.estado}</span></td>
                  <td>{e.nota ?? "—"}</td>
                  <td>{e.commit_sha ? <code>{e.commit_sha.slice(0, 7)}</code> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
