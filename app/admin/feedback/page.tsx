"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Fila = {
  id: string;
  content: string;
  resuelto: boolean;
  created_at: string;
  user_id: string | null;
  profiles: { full_name: string | null } | null;
};

export default function AdminFeedback() {
  const t = useTranslations("adminFeedback");
  const locale = useLocale();
  const { checking, isAdmin } = useAdminGuard();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"abierto" | "todos">("abierto");

  async function load() {
    const supabase = createClient();
    let query = supabase
      .from("sugerencias")
      .select("id, content, resuelto, created_at, user_id, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (filtro === "abierto") query = query.eq("resuelto", false);
    const { data, error } = await query;
    if (error) throw error;
    setFilas((data ?? []) as unknown as Fila[]);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin, filtro]);

  async function resolver(id: string) {
    const supabase = createClient();
    await supabase.from("sugerencias").update({ resuelto: true }).eq("id", id);
    load().catch((e) => setErr(e.message));
  }

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0 }}>{t("title")}</h3>
          <div className="cons-filters" style={{ padding: 0 }}>
            <button className={`cfilter ${filtro === "abierto" ? "active" : ""}`} onClick={() => setFiltro("abierto")}>{t("pending")}</button>
            <button className={`cfilter ${filtro === "todos" ? "active" : ""}`} onClick={() => setFiltro("todos")}>{t("all")}</button>
          </div>
        </div>
        {filas === null && !err && <div className="cp-admin-empty">{t("loading")}</div>}
        {filas?.length === 0 && <div className="cp-admin-empty">{filtro === "abierto" ? t("noFeedbackPending") : t("noFeedbackYet")}</div>}
        {filas?.map((f) => (
          <div key={f.id} className="cons" style={{ marginBottom: "10px" }}>
            <div className="cons-top">
              <div>
                <span className="cons-meta">{f.profiles?.full_name ?? t("anonymousUser")} · {new Date(f.created_at).toLocaleString(locale)}</span>
              </div>
              <span className={`cp-admin-badge ${!f.resuelto ? "warn" : "ok"}`}>{f.resuelto ? t("resolved") : t("pendingStatus")}</span>
            </div>
            <div className="cons-text">{f.content}</div>
            {!f.resuelto && (
              <div className="cons-actions">
                <button className="btn acc" onClick={() => resolver(f.id)}>{t("markResolved")}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
