"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "./useAdminGuard";
import AdminShell from "./AdminShell";

type Stats = {
  proyectos: number;
  miembros: number;
  feedbackAbierto: number;
  betaMode: boolean | null;
};

export default function AdminDashboard() {
  const { checking, isAdmin } = useAdminGuard();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const supabase = createClient();
      const [{ count: proyectos }, { count: miembros }, { count: feedbackAbierto }, { data: flag }] =
        await Promise.all([
          supabase.from("proyectos").select("*", { count: "exact", head: true }),
          supabase.from("project_members").select("*", { count: "exact", head: true }),
          supabase.from("feedback_beta").select("*", { count: "exact", head: true }).eq("estado", "abierto"),
          supabase.from("feature_flags").select("enabled").eq("key", "beta_mode").maybeSingle(),
        ]);
      setStats({
        proyectos: proyectos ?? 0,
        miembros: miembros ?? 0,
        feedbackAbierto: feedbackAbierto ?? 0,
        betaMode: flag?.enabled ?? null,
      });
    })().catch((e) => setErr(e.message));
  }, [isAdmin]);

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-kpis">
        <div className="cp-admin-kpi">
          <span className="num">{stats?.proyectos ?? "—"}</span>
          <span className="label">Proyectos totales</span>
        </div>
        <div className="cp-admin-kpi">
          <span className="num">{stats?.miembros ?? "—"}</span>
          <span className="label">Membresías (usuarios × proyecto)</span>
        </div>
        <div className="cp-admin-kpi">
          <span className="num">{stats?.feedbackAbierto ?? "—"}</span>
          <span className="label">Feedback sin resolver</span>
        </div>
        <div className="cp-admin-kpi">
          <span className="num">{stats?.betaMode == null ? "—" : stats.betaMode ? "ON" : "OFF"}</span>
          <span className="label">Modo beta (proyectos gratis)</span>
        </div>
      </div>

      <div className="cp-admin-section">
        <h3>Atajos</h3>
        <div className="chip-group">
          <a className="dept-chip" href="/admin/usuarios" style={{ "--chip-acc": "var(--lime)" } as React.CSSProperties}>Ver usuarios</a>
          <a className="dept-chip" href="/admin/proyectos" style={{ "--chip-acc": "var(--cyan)" } as React.CSSProperties}>Ver proyectos</a>
          <a className="dept-chip" href="/admin/feedback" style={{ "--chip-acc": "var(--rose)" } as React.CSSProperties}>Revisar feedback</a>
          <a className="dept-chip" href="/admin/flags" style={{ "--chip-acc": "var(--violet)" } as React.CSSProperties}>Configurar flags</a>
        </div>
      </div>
    </AdminShell>
  );
}
