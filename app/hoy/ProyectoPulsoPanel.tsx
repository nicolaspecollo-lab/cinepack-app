"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { CLIENTE_DEPT } from "../constants";
import Icon from "../components/Icon";
import { CICLO_SELECT, fechasCicloDesdeFila, avanceProyectoPct, etapaEnCursoPct, type EtapaResumen } from "./cicloVida";
import { asegurarTareasPersonales } from "./tareasPersonales";

type Conteo = { nombre: string; total: number };

type MiembroEquipo = { user_id: string; full_name: string; departamento: string; cargo: string | null };

type Pulso = {
  tareasTotal: number;
  tareasPorDepto: Conteo[];
  alertasTotal: number;
  alertasPorDepto: Conteo[];
  avancePct: number | null;
  equipo: MiembroEquipo[];
};

type ContratoVence = { empresa: string; tipo: string; fecha_fin: string; diasRestantes: number };
type TareasPersonalesResumen = { pendiente: number; curso: number; hecho: number };
type EtapaAvance = { etapa: EtapaResumen; pct: number; financiacion: { presentadas: number; total: number } | null };

function semaforo(tareas: number, alertas: number): "ok" | "warn" | "bad" {
  const total = tareas + alertas;
  if (total === 0) return "ok";
  if (total <= 2) return "warn";
  return "bad";
}

const SEMAFORO_LABEL_KEY: Record<string, string> = { ok: "statusOk", warn: "statusWarn", bad: "statusBad" };

type Actividad = {
  id: string;
  texto: string;
  autor: string | null;
  depto: string | null;
  fecha: string;
};

function timeAgo(iso: string, t: ReturnType<typeof useTranslations>) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("timeNow");
  if (mins < 60) return t("timeMinsAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("timeHoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("timeYesterday");
  return t("timeDaysAgo", { n: days });
}

function agrupar(rows: { para_departamento: string | null }[]): Conteo[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.para_departamento || "Todos";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}

export default function ProyectoPulsoPanel({
  departamento,
  onIrAGenerales,
  onAbrirTareas,
}: {
  // Departamento del usuario actual — hace falta para ubicar su tablero
  // personal "Tareas" (misma clave que usa abrirTareasPersonales) y mostrar
  // su previsualización numérica. Sin esto, la tarjeta funciona igual pero
  // sin el desglose.
  departamento?: string;
  onIrAGenerales?: (sub: "comunicados" | "consultas" | "equipo") => void;
  onAbrirTareas?: () => void;
}) {
  const t = useTranslations("pulso");
  const tEtapa = useTranslations("etapas");
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [esEjecutivo, setEsEjecutivo] = useState(false);
  const [contratosVencen, setContratosVencen] = useState<ContratoVence[]>([]);
  const [creditos, setCreditos] = useState<{ nombre: string; escrito_por: string[]; dirigido_por: string[]; producido_por: string[] } | null>(null);
  const [tareasResumen, setTareasResumen] = useState<TareasPersonalesResumen | null>(null);
  const [etapaAvance, setEtapaAvance] = useState<EtapaAvance | null>(null);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) {
        setLoading(false);
        return;
      }
      setProjectId(projectId);
      const supabase = createClient();

      const { data: proyectoCreditos } = await supabase
        .from("proyectos")
        .select(`nombre, escrito_por, dirigido_por, producido_por, ${CICLO_SELECT}`)
        .eq("id", projectId)
        .single();
      if (proyectoCreditos) {
        setCreditos({
          nombre: proyectoCreditos.nombre,
          escrito_por: (proyectoCreditos.escrito_por as string[]) ?? [],
          dirigido_por: (proyectoCreditos.dirigido_por as string[]) ?? [],
          producido_por: (proyectoCreditos.producido_por as string[]) ?? [],
        });
      }
      const fechasCiclo = fechasCicloDesdeFila(proyectoCreditos as Record<string, string | null> | null);
      const avancePct = avanceProyectoPct(fechasCiclo);
      const enCurso = etapaEnCursoPct(fechasCiclo);

      // Tablero personal "Tareas" del usuario en su departamento: mismo
      // tablero que abre onAbrirTareas, solo lo leemos para el resumen.
      if (departamento) {
        const tareasId = await asegurarTareasPersonales(departamento);
        if (tareasId) {
          const { data: filasTareas } = await supabase
            .from("herramienta_filas")
            .select("datos")
            .eq("project_id", projectId)
            .eq("departamento", departamento)
            .eq("herramienta_id", tareasId);
          const resumen = { pendiente: 0, curso: 0, hecho: 0 };
          for (const f of filasTareas ?? []) {
            const col = (f.datos as Record<string, string> | null)?.col ?? "0";
            if (col === "1") resumen.curso++;
            else if (col === "2") resumen.hecho++;
            else resumen.pendiente++;
          }
          setTareasResumen(resumen);
        }
      }

      // Avance de la etapa en curso — con desglose propio del Plan de
      // financiación cuando la etapa en curso es justamente esa.
      if (enCurso) {
        let financiacion: EtapaAvance["financiacion"] = null;
        if (enCurso.etapa.key === "financiacion") {
          const { data: filasFinan } = await supabase
            .from("herramienta_filas")
            .select("datos")
            .eq("project_id", projectId)
            .eq("herramienta_id", "ej-plan-financiacion")
            .neq("orden", -1);
          const total = filasFinan?.length ?? 0;
          const presentadas = (filasFinan ?? []).filter((f) => {
            const estado = (f.datos as Record<string, string> | null)?.estado ?? "";
            return estado && estado !== "Prospecto";
          }).length;
          if (total > 0) financiacion = { presentadas, total };
        }
        setEtapaAvance({ etapa: enCurso.etapa, pct: enCurso.pct, financiacion });
      }

      const [{ data: tareasData }, { data: alertasData }, { data: miembrosEquipo }] =
        await Promise.all([
          supabase.from("tareas").select("para_departamento").eq("project_id", projectId).eq("completada", false),
          supabase.from("alertas").select("para_departamento").eq("project_id", projectId).eq("leida", false),
          supabase.from("project_members").select("user_id, rol, profiles(full_name, cargo)").eq("project_id", projectId),
        ]);

      const equipo: MiembroEquipo[] = (miembrosEquipo ?? [])
        .map((m) => {
          const p = m.profiles as unknown as { full_name: string; cargo: string | null } | null;
          return {
            user_id: m.user_id as string,
            full_name: p?.full_name ?? "—",
            departamento: (m.rol as string) ?? "—",
            cargo: p?.cargo ?? null,
          };
        })
        .sort((a, b) => a.departamento.localeCompare(b.departamento) || a.full_name.localeCompare(b.full_name));

      const [{ data: tareasRecientes }, { data: alertasRecientes }, { data: filasRecientes }] =
        await Promise.all([
          supabase
            .from("tareas")
            .select("id, titulo, autor_nombre, para_departamento, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("alertas")
            .select("id, texto, autor_nombre, para_departamento, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("herramienta_filas")
            .select("id, herramienta_id, departamento, editor_nombre, updated_at")
            .eq("project_id", projectId)
            .neq("orden", -1)
            .order("updated_at", { ascending: false })
            .limit(8),
        ]);

      const items: Actividad[] = [
        ...(tareasRecientes ?? []).map((tarea) => ({
          id: `tarea-${tarea.id}`,
          texto: t("newTask", { title: tarea.titulo }),
          autor: tarea.autor_nombre,
          depto: tarea.para_departamento,
          fecha: tarea.created_at,
        })),
        ...(alertasRecientes ?? []).map((a) => ({
          id: `alerta-${a.id}`,
          texto: t("newAlert", { text: a.texto }),
          autor: a.autor_nombre,
          depto: a.para_departamento,
          fecha: a.created_at,
        })),
        ...(filasRecientes ?? []).map((f) => ({
          id: `fila-${f.id}`,
          texto: t("toolUpdate", { tool: f.herramienta_id }),
          autor: f.editor_nombre,
          depto: f.departamento,
          fecha: f.updated_at,
        })),
      ]
        .filter((i) => i.fecha)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 10);

      setActividad(items);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: member }, { data: profile }] = await Promise.all([
          supabase
            .from("project_members")
            .select("rol")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
        ]);
        const esEj = member?.rol === "Ejecutivo" || !!profile?.is_admin;
        setEsEjecutivo(esEj);

        // Contratos por vencer en < 30 días
        if (esEj) {
          const { data: contratosData } = await supabase
            .from("herramienta_filas")
            .select("datos")
            .eq("project_id", projectId)
            .in("herramienta_id", ["ej-contratos", "ej-derechos-pi"]);

          const hoy = new Date();
          const vencen: ContratoVence[] = [];
          for (const row of contratosData ?? []) {
            const d = (row.datos ?? {}) as Record<string, string>;
            const fechaStr = d.fecha_fin || d.vencimiento || d.fecha_vencimiento;
            if (!fechaStr) continue;
            const fechaVenc = new Date(fechaStr);
            const diff = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / 86400000);
            if (diff >= 0 && diff <= 30) {
              vencen.push({ empresa: d.empresa || d.titulo || d.nombre || "Sin nombre", tipo: d.tipo || "Contrato", fecha_fin: fechaStr, diasRestantes: diff });
            }
          }
          vencen.sort((a, b) => a.diasRestantes - b.diasRestantes);
          setContratosVencen(vencen);
        }
      }

      setPulso({
        tareasTotal: tareasData?.length ?? 0,
        tareasPorDepto: agrupar(tareasData ?? []),
        alertasTotal: alertasData?.length ?? 0,
        alertasPorDepto: agrupar(alertasData ?? []),
        avancePct,
        equipo,
      });
      setLoading(false);
    })();
  }, [departamento]);

  if (loading) {
    return <p className="pulso-loading">{t("loading")}</p>;
  }

  if (!pulso) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("noProjectTitle")}</h4>
        <p>{t("noProjectDesc")}</p>
      </div>
    );
  }

  return (
    <div className="pulso">
      {creditos && (creditos.escrito_por.length > 0 || creditos.dirigido_por.length > 0 || creditos.producido_por.length > 0) && (
        <div className="tcard pulso-card cp-creditos-card">
          <h4><span className="hex"></span>{creditos.nombre}</h4>
          <dl className="cp-creditos-list">
            {creditos.dirigido_por.length > 0 && (
              <>
                <dt>{t("directedBy")}</dt>
                <dd>{creditos.dirigido_por.join(", ")}</dd>
              </>
            )}
            {creditos.escrito_por.length > 0 && (
              <>
                <dt>{t("writtenBy")}</dt>
                <dd>{creditos.escrito_por.join(", ")}</dd>
              </>
            )}
            {creditos.producido_por.length > 0 && (
              <>
                <dt>{t("producedBy")}</dt>
                <dd>{creditos.producido_por.join(", ")}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {esEjecutivo && contratosVencen.length > 0 && (
        <div className="tcard pulso-card cp-contratos-vencen">
          <h4><span className="hex"></span>{t("contractsExpiring")}</h4>
          <ul className="cp-contratos-list">
            {contratosVencen.map((c, i) => (
              <li key={i}>
                <div className="cp-contratos-info">
                  <b>{c.empresa}</b>
                  <span className="muted">{c.tipo} · {t("expiresOn", { date: c.fecha_fin })}</span>
                </div>
                <span className={`cp-contratos-badge ${c.diasRestantes <= 7 ? "tono-bad" : "tono-warn"}`}>
                  {c.diasRestantes === 0 ? t("today") : `${c.diasRestantes}d`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esEjecutivo && (pulso.tareasPorDepto.length > 0 || pulso.alertasPorDepto.length > 0) && (
        <div className="tcard pulso-card cp-semaforo-card">
          <h4><span className="hex"></span>{t("deptSemaphore")}</h4>
          <div className="cp-semaforo-grid">
            {Array.from(new Set([...pulso.tareasPorDepto.map(d => d.nombre), ...pulso.alertasPorDepto.map(d => d.nombre)])).map((dept) => {
              const numTareas = pulso.tareasPorDepto.find(d => d.nombre === dept)?.total ?? 0;
              const a = pulso.alertasPorDepto.find(d => d.nombre === dept)?.total ?? 0;
              const s = semaforo(numTareas, a);
              return (
                <div key={dept} className={`cp-semaforo-item tono-${s}`}>
                  <span className="cp-semaforo-dot"></span>
                  <div className="cp-semaforo-info">
                    <b>{dept}</b>
                    <span>{numTareas > 0 ? t("tasksCount", { n: numTareas }) : ""}{numTareas > 0 && a > 0 ? " · " : ""}{a > 0 ? t("alertsCount", { n: a }) : ""}</span>
                  </div>
                  <span className="cp-semaforo-label">{t(SEMAFORO_LABEL_KEY[s])}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pulso-grid">
        {onAbrirTareas && (
          <div className="tcard pulso-card">
            <h4>
              <span className="hex"></span>{t("pendingTasks")}
            </h4>
            <div className="cp-notif-accesos">
              <button className="cp-notif-acceso" onClick={onAbrirTareas}>
                <span className="cp-notif-acceso-ic"><Icon name="checklist" size={15} /></span>
                <span className="cp-notif-acceso-txt">{t("openBoard")}</span>
                <Icon name="arrow-right" size={13} />
              </button>
            </div>
            {tareasResumen && (
              <div className="cp-pulso-mini-stats">
                <div className="cp-pulso-mini-stat">
                  <b>{tareasResumen.pendiente}</b>
                  <span>{t("tasksPending")}</span>
                </div>
                <div className="cp-pulso-mini-stat">
                  <b>{tareasResumen.curso}</b>
                  <span>{t("tasksDoing")}</span>
                </div>
                <div className="cp-pulso-mini-stat">
                  <b>{tareasResumen.hecho}</b>
                  <span>{t("tasksDone")}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {onIrAGenerales && (
          <div className="tcard pulso-card">
            <h4>
              <span className="hex"></span>{t("notificationsTitle")}
            </h4>
            <div className="cp-notif-accesos">
              <button className="cp-notif-acceso" onClick={() => onIrAGenerales("comunicados")}>
                <span className="cp-notif-acceso-ic"><Icon name="message" size={15} /></span>
                <span className="cp-notif-acceso-txt">{t("goComunicados")}</span>
                <Icon name="arrow-right" size={13} />
              </button>
              <button className="cp-notif-acceso" onClick={() => onIrAGenerales("consultas")}>
                <span className="cp-notif-acceso-ic"><Icon name="message" size={15} /></span>
                <span className="cp-notif-acceso-txt">{t("goConsultas")}</span>
                <Icon name="arrow-right" size={13} />
              </button>
            </div>
          </div>
        )}

        <div className="tcard pulso-card">
          <h4>
            <span className="hex"></span>{t("projectProgress")}
          </h4>
          {pulso.avancePct === null ? (
            <p>{t("noProgressData")}</p>
          ) : (
            <>
              <div className="hp-check-bar pulso-bar"><span style={{ width: `${pulso.avancePct}%` }}></span></div>
              <div className="pulso-bar-label">{t("progressPct", { pct: pulso.avancePct })}</div>
            </>
          )}
          {etapaAvance && (
            <div className="cp-pulso-etapa-sub">
              <div className="cp-pulso-etapa-sub-label">{t("stageProgress", { etapa: tEtapa(etapaAvance.etapa.key) })}</div>
              <div className="hp-check-bar pulso-bar pulso-bar-sm"><span style={{ width: `${etapaAvance.pct}%` }}></span></div>
              <div className="pulso-bar-label">{t("progressPct", { pct: etapaAvance.pct })}</div>
              {etapaAvance.financiacion && (
                <div className="cp-pulso-mini-stats">
                  <div className="cp-pulso-mini-stat">
                    <b>{etapaAvance.financiacion.presentadas}</b>
                    <span>{t("financiacionPresentadas", { total: etapaAvance.financiacion.total })}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tcard pulso-card">
          <h4>
            <span className="hex"></span>{t("teamTitle")}
          </h4>
          {pulso.equipo.length === 0 ? (
            <p>{t("noTeam")}</p>
          ) : (
            <ul className="cp-pulso-equipo">
              {pulso.equipo.map((m) => (
                <li key={m.user_id}>
                  <span className="cp-pulso-equipo-nombre">{m.full_name}</span>
                  <span className="cp-pulso-equipo-rol">{m.cargo ? `${m.departamento} · ${m.cargo}` : m.departamento}</span>
                </li>
              ))}
            </ul>
          )}
          {onIrAGenerales && (
            <button className="cp-notif-acceso cp-pulso-equipo-link" onClick={() => onIrAGenerales("equipo")}>
              <span className="cp-notif-acceso-ic"><Icon name="users" size={15} /></span>
              <span className="cp-notif-acceso-txt">{t("goEquipo")}</span>
              <Icon name="arrow-right" size={13} />
            </button>
          )}
        </div>
      </div>

      {actividad.length > 0 && (
        <div className="tcard pulso-card cp-activity-card">
          <h4>
            <span className="hex"></span>{t("recentActivity")}
          </h4>
          <ul className="cp-activity-list">
            {actividad.map((a) => (
              <li key={a.id}>
                <span className="cp-activity-texto">{a.texto}</span>
                <span className="cp-activity-meta">
                  {a.autor ? `${a.autor}` : t("someone")}{a.depto ? ` · ${a.depto}` : ""} · {timeAgo(a.fecha, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esEjecutivo && projectId && <CompartirClientePanel projectId={projectId} />}
    </div>
  );
}

type InvitacionCliente = { full_name: string; email: string; token: string; used: boolean };

function CompartirClientePanel({ projectId }: { projectId: string }) {
  const t = useTranslations("pulso");
  const [invitaciones, setInvitaciones] = useState<InvitacionCliente[]>([]);
  const [nombre, setNombreInv] = useState("");
  const [email, setEmail] = useState("");
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("invitaciones")
        .select("full_name, email, token, used")
        .eq("project_id", projectId)
        .eq("departamento", CLIENTE_DEPT);
      setInvitaciones((data ?? []) as InvitacionCliente[]);
    })();
  }, [projectId]);

  async function generarLink(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;
    setCreando(true);
    setError(null);

    const supabase = createClient();
    const { data, error: errInv } = await supabase
      .from("invitaciones")
      .insert({
        project_id: projectId,
        email: email.trim(),
        full_name: nombre.trim(),
        departamento: CLIENTE_DEPT,
        cargo: null,
      })
      .select("full_name, email, token, used")
      .single();

    setCreando(false);
    if (errInv || !data) {
      setError(errInv?.message ?? t("errNoLink"));
      return;
    }
    setInvitaciones((prev) => [...prev, data as InvitacionCliente]);
    setNombreInv("");
    setEmail("");
  }

  function copiar(token: string) {
    const url = `${window.location.origin}/invitacion/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div className="tcard pulso-card cp-share-cliente">
      <h4>
        <span className="hex"></span>{t("shareReadOnly")}
      </h4>
      <p>
        {t("shareDesc")}
      </p>

      {invitaciones.length > 0 && (
        <ul className="cp-share-list">
          {invitaciones.map((inv) => (
            <li key={inv.token}>
              <span>
                <b>{inv.full_name}</b> · {inv.email} {inv.used ? t("activeAccount") : t("pendingAccount")}
              </span>
              <button type="button" className="btn" onClick={() => copiar(inv.token)}>
                {copiado === inv.token ? t("copied") : t("copyLink")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={generarLink} className="cp-share-form">
        <input
          type="text"
          placeholder={t("clientNamePlaceholder")}
          value={nombre}
          onChange={(e) => setNombreInv(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="btn acc" disabled={creando}>
          {creando ? t("generating") : t("generateLink")}
        </button>
      </form>
      {error && <p className="hp-error">{error}</p>}
    </div>
  );
}
