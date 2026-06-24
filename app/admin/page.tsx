"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "./useAdminGuard";
import AdminShell from "./AdminShell";
import BarChart from "./charts/BarChart";
import DonutChart from "./charts/DonutChart";
import LineChart from "./charts/LineChart";
import HorasUsoCard from "./charts/HorasUsoCard";
import RegionUsoCard from "./charts/RegionUsoCard";

type Stats = {
  proyectos: number;
  miembros: number;
  feedbackAbierto: number;
  betaMode: boolean | null;
};

const PAGO_COLOR: Record<string, string> = {
  beta_gratis: "var(--muted)",
  pagado: "var(--lime)",
  pendiente_pago: "var(--rose)",
  pendiente_personalizado: "var(--amber)",
};

const PAGO_LABEL: Record<string, string> = {
  beta_gratis: "Beta gratis",
  pagado: "Pagado",
  pendiente_pago: "Pendiente de pago",
  pendiente_personalizado: "Personalizado pendiente",
};

function ultimosNDias(n: number) {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

export default function AdminDashboard() {
  const { checking, isAdmin } = useAdminGuard();
  const [stats, setStats] = useState<Stats | null>(null);
  const [porTipo, setPorTipo] = useState<{ label: string; value: number }[] | null>(null);
  const [porPago, setPorPago] = useState<{ label: string; value: number; color: string }[] | null>(null);
  const [actividadDiaria, setActividadDiaria] = useState<{ label: string; value: number; usuarios: number }[] | null>(null);
  const [horasPico, setHorasPico] = useState<{ label: string; value: number; color?: string; hint: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const supabase = createClient();
      const [{ count: proyectos }, { count: miembros }, { count: feedbackAbierto }, { data: flag }] =
        await Promise.all([
          supabase.from("proyectos").select("*", { count: "exact", head: true }),
          supabase.from("project_members").select("*", { count: "exact", head: true }),
          supabase.from("sugerencias").select("*", { count: "exact", head: true }).eq("resuelto", false),
          supabase.from("feature_flags").select("enabled").eq("key", "beta_mode").maybeSingle(),
        ]);
      setStats({
        proyectos: proyectos ?? 0,
        miembros: miembros ?? 0,
        feedbackAbierto: feedbackAbierto ?? 0,
        betaMode: flag?.enabled ?? null,
      });

      const { data: todosProyectos } = await supabase.from("proyectos").select("tipo, pago_estado");
      const conteoTipo: Record<string, number> = {};
      const conteoPago: Record<string, number> = {};
      (todosProyectos ?? []).forEach((p) => {
        const tipo = p.tipo ?? "Sin tipo";
        conteoTipo[tipo] = (conteoTipo[tipo] ?? 0) + 1;
        conteoPago[p.pago_estado] = (conteoPago[p.pago_estado] ?? 0) + 1;
      });
      setPorTipo(
        Object.entries(conteoTipo)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      );
      setPorPago(
        Object.entries(conteoPago).map(([key, value]) => ({
          label: PAGO_LABEL[key] ?? key,
          value,
          color: PAGO_COLOR[key] ?? "var(--muted)",
        }))
      );

      const dias = ultimosNDias(14);
      const desde = `${dias[0]}T00:00:00.000Z`;
      const [{ data: filas }, { data: consultas }] = await Promise.all([
        supabase.from("herramienta_filas").select("created_at, autor_nombre, editor_nombre").gte("created_at", desde),
        supabase.from("consultas").select("created_at, autor_nombre").gte("created_at", desde),
      ]);
      const conteoDia: Record<string, number> = {};
      const usuariosDia: Record<string, Set<string>> = {};
      dias.forEach((d) => {
        conteoDia[d] = 0;
        usuariosDia[d] = new Set();
      });
      (filas ?? []).forEach((r) => {
        const dia = r.created_at.slice(0, 10);
        if (!(dia in conteoDia)) return;
        conteoDia[dia] += 1;
        if (r.editor_nombre) usuariosDia[dia].add(r.editor_nombre);
        else if (r.autor_nombre) usuariosDia[dia].add(r.autor_nombre);
      });
      (consultas ?? []).forEach((r) => {
        const dia = r.created_at.slice(0, 10);
        if (!(dia in conteoDia)) return;
        conteoDia[dia] += 1;
        if (r.autor_nombre) usuariosDia[dia].add(r.autor_nombre);
      });
      setActividadDiaria(
        dias.map((d) => ({ label: d.slice(5).replace("-", "/"), value: conteoDia[d], usuarios: usuariosDia[d].size }))
      );

      const { data: logs } = await supabase.from("audit_logs").select("created_at");
      const conteoHora = Array.from({ length: 24 }, () => 0);
      (logs ?? []).forEach((l) => {
        const hora = new Date(l.created_at).getHours();
        conteoHora[hora] += 1;
      });
      const totalLogs = conteoHora.reduce((a, b) => a + b, 0);
      if (totalLogs === 0) {
        setHorasPico([]);
      } else {
        const top5 = [...conteoHora]
          .map((v, h) => ({ h, v }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 5)
          .map((x) => x.h);
        setHorasPico(
          conteoHora.map((v, h) => ({
            label: `${h}h`,
            value: v,
            color: top5.includes(h) && v > 0 ? "var(--rose)" : undefined,
            hint: `${v} evento${v === 1 ? "" : "s"} entre las ${h}h y las ${h + 1}h`,
          }))
        );
      }
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

      <div className="cp-admin-charts">
        <div className="cp-chart-card wide">
          <h4><span className="hex"></span>Actividad últimos 14 días (filas de herramientas + consultas)</h4>
          {actividadDiaria ? <LineChart data={actividadDiaria} color="var(--lime)" /> : <div className="cp-admin-empty">Cargando…</div>}
        </div>
        <HorasUsoCard />
        <div className="cp-chart-card">
          <h4><span className="hex"></span>Proyectos por tipo</h4>
          {porTipo ? <BarChart data={porTipo} color="var(--cyan)" /> : <div className="cp-admin-empty">Cargando…</div>}
        </div>
        <div className="cp-chart-card">
          <h4><span className="hex"></span>Proyectos por estado de pago</h4>
          {porPago ? <DonutChart data={porPago} /> : <div className="cp-admin-empty">Cargando…</div>}
        </div>
        <div className="cp-chart-card wide">
          <h4><span className="hex"></span>Horas del día con más uso (top 5 destacadas)</h4>
          {horasPico === null && <div className="cp-admin-empty">Cargando…</div>}
          {horasPico?.length === 0 && <div className="cp-admin-empty">Sin datos suficientes aún.</div>}
          {horasPico && horasPico.length > 0 && <BarChart data={horasPico} color="var(--cyan)" />}
        </div>
        <RegionUsoCard />
      </div>

      <div className="cp-admin-section">
        <h3>Atajos</h3>
        <div className="chip-group">
          <a className="dept-chip" href="/admin/usuarios" style={{ "--chip-acc": "var(--lime)" } as React.CSSProperties}>Ver usuarios</a>
          <a className="dept-chip" href="/admin/proyectos" style={{ "--chip-acc": "var(--cyan)" } as React.CSSProperties}>Ver proyectos</a>
          <a className="dept-chip" href="/admin/feedback" style={{ "--chip-acc": "var(--rose)" } as React.CSSProperties}>Revisar feedback</a>
          <a className="dept-chip" href="/admin/flags" style={{ "--chip-acc": "var(--violet)" } as React.CSSProperties}>Configurar flags</a>
          <a className="dept-chip" href="https://cinepack.es/biblia/" target="_blank" rel="noreferrer" style={{ "--chip-acc": "var(--blue)" } as React.CSSProperties}>Biblia de Producto ↗</a>
        </div>
      </div>
    </AdminShell>
  );
}
