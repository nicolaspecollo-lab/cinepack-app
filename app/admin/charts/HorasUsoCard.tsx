"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import BarChart from "./BarChart";

type Periodo = "mensual" | "trimestral" | "semestral" | "anual";
type Metrica = "horas_usuario" | "horas_proyecto" | "promedio_sesion";

const DIAS_POR_PERIODO: Record<Periodo, number> = {
  mensual: 30,
  trimestral: 90,
  semestral: 180,
  anual: 365,
};

type Evento = { dia: string; userId: string | null; projectId: string | null; ts: number };

// No hay tracking de sesión real (sin heartbeat, nada visible para el usuario).
// Se estima la "ventana de uso" de cada persona en un día como el rango entre
// su primera y su última acción registrada ese día (alta de fila de
// herramienta o de consulta). Es una aproximación honesta a partir de datos
// que ya existen — no capta tiempo de solo lectura, y los días con una sola
// acción cuentan como 0 horas (pero sí cuentan como "sesión" para el cálculo
// de promedio, con un mínimo de 1 minuto para no dividir por cero).
export default function HorasUsoCard() {
  const t = useTranslations("charts");
  const PERIODO_LABEL: Record<Periodo, string> = {
    mensual: t("periodMonthly"),
    trimestral: t("periodQuarterly"),
    semestral: t("periodSemiannual"),
    anual: t("periodAnnual"),
  };
  const [periodo, setPeriodo] = useState<Periodo>("mensual");
  const [metrica, setMetrica] = useState<Metrica>("horas_usuario");
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [nombrePorUsuario, setNombrePorUsuario] = useState<Record<string, string>>({});
  const [nombrePorProyecto, setNombrePorProyecto] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const desde = new Date();
      desde.setDate(desde.getDate() - 365);
      const desdeIso = desde.toISOString();

      const [{ data: filas, error: e1 }, { data: consultas, error: e2 }, { data: perfiles }, { data: proyectos }] = await Promise.all([
        supabase.from("herramienta_filas").select("created_by, created_at, project_id").gte("created_at", desdeIso),
        supabase.from("consultas").select("autor_id, created_at, project_id").gte("created_at", desdeIso),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("proyectos").select("id, nombre"),
      ]);
      if (e1 || e2) {
        setErr((e1 ?? e2)?.message ?? t("errLoadingUsage"));
        return;
      }

      const ev: Evento[] = [
        ...(filas ?? []).map((f) => ({
          dia: f.created_at.slice(0, 10),
          userId: f.created_by,
          projectId: f.project_id,
          ts: new Date(f.created_at).getTime(),
        })),
        ...(consultas ?? []).map((c) => ({
          dia: c.created_at.slice(0, 10),
          userId: c.autor_id,
          projectId: c.project_id,
          ts: new Date(c.created_at).getTime(),
        })),
      ];
      setEventos(ev);

      const mapaNombres: Record<string, string> = {};
      (perfiles ?? []).forEach((p) => (mapaNombres[p.id] = p.full_name ?? "—"));
      setNombrePorUsuario(mapaNombres);

      const mapaProyectos: Record<string, string> = {};
      (proyectos ?? []).forEach((p) => (mapaProyectos[p.id] = p.nombre));
      setNombrePorProyecto(mapaProyectos);
    })().catch((e) => setErr(e.message));
  }, [t]);

  const datos = useMemo(() => {
    if (!eventos) return null;
    const desde = Date.now() - DIAS_POR_PERIODO[periodo] * 24 * 60 * 60 * 1000;
    const filtrados = eventos.filter((e) => e.ts >= desde && e.userId);

    // ventanas[userId][dia] = { min, max }
    const ventanasUsuario: Record<string, Record<string, { min: number; max: number }>> = {};
    const ventanasProyecto: Record<string, Record<string, { min: number; max: number }>> = {};

    filtrados.forEach((e) => {
      const uid = e.userId as string;
      ventanasUsuario[uid] ??= {};
      const vu = (ventanasUsuario[uid][e.dia] ??= { min: e.ts, max: e.ts });
      vu.min = Math.min(vu.min, e.ts);
      vu.max = Math.max(vu.max, e.ts);

      if (e.projectId) {
        ventanasProyecto[e.projectId] ??= {};
        const vp = (ventanasProyecto[e.projectId][e.dia] ??= { min: e.ts, max: e.ts });
        vp.min = Math.min(vp.min, e.ts);
        vp.max = Math.max(vp.max, e.ts);
      }
    });

    if (metrica === "horas_proyecto") {
      return Object.entries(ventanasProyecto)
        .map(([projectId, dias]) => {
          const horas = Object.values(dias).reduce((acc, v) => acc + (v.max - v.min) / 3_600_000, 0);
          return { label: nombrePorProyecto[projectId] ?? "—", value: Math.round(horas * 10) / 10 };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    if (metrica === "promedio_sesion") {
      return Object.entries(ventanasUsuario)
        .map(([userId, dias]) => {
          const minutos = Object.values(dias).map((v) => Math.max((v.max - v.min) / 60_000, 1));
          const promedio = minutos.reduce((a, b) => a + b, 0) / minutos.length;
          return { label: nombrePorUsuario[userId] ?? "—", value: Math.round(promedio) };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    return Object.entries(ventanasUsuario)
      .map(([userId, dias]) => {
        const horas = Object.values(dias).reduce((acc, v) => acc + (v.max - v.min) / 3_600_000, 0);
        return { label: nombrePorUsuario[userId] ?? "—", value: Math.round(horas * 10) / 10 };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [eventos, periodo, metrica, nombrePorUsuario, nombrePorProyecto]);

  return (
    <div className="cp-chart-card wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
        <h4 style={{ margin: 0 }}><span className="hex"></span>{t("usageHoursTitle")}</h4>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <div className="chip-group" style={{ margin: 0 }}>
            {(Object.keys(DIAS_POR_PERIODO) as Periodo[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`dept-chip ${periodo === p ? "active" : ""}`}
                style={{ "--chip-acc": "var(--violet)" } as React.CSSProperties}
                onClick={() => setPeriodo(p)}
              >
                {PERIODO_LABEL[p]}
              </button>
            ))}
          </div>
          <select
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }}
          >
            <option value="horas_usuario">{t("metricHoursByUser")}</option>
            <option value="horas_proyecto">{t("metricHoursByProject")}</option>
            <option value="promedio_sesion">{t("metricAvgSession")}</option>
          </select>
        </div>
      </div>

      {err && <div className="cp-admin-err">{err}</div>}
      {!err && datos === null && <div className="cp-admin-empty">{t("loading")}</div>}
      {!err && datos?.length === 0 && (
        <div className="cp-admin-empty">{t("noSessionDataYet")}</div>
      )}
      {!err && datos && datos.length > 0 && <BarChart data={datos} color="var(--violet)" />}
      <p style={{ color: "var(--muted)", fontSize: "11px", marginTop: "10px" }}>{t("usageHoursFootnote")}</p>
    </div>
  );
}
