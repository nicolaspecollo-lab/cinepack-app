"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLIENTE_DEPT } from "../constants";
import TareasKanbanPanel from "./TareasKanbanPanel";

type Conteo = { nombre: string; total: number };

type Item = { texto: string; hecho: boolean };

type Pulso = {
  tareasTotal: number;
  tareasPorDepto: Conteo[];
  alertasTotal: number;
  alertasPorDepto: Conteo[];
  checklistsTotal: number;
  checklistItemsHechos: number;
  checklistItemsTotal: number;
  presupuestado: number;
  comprometido: number;
  real: number;
};

type ContratoVence = { empresa: string; tipo: string; fecha_fin: string; diasRestantes: number };

function semaforo(tareas: number, alertas: number): "ok" | "warn" | "bad" {
  const total = tareas + alertas;
  if (total === 0) return "ok";
  if (total <= 2) return "warn";
  return "bad";
}

const SEMAFORO_LABEL: Record<string, string> = { ok: "OK", warn: "Atención", bad: "Crítico" };

type Actividad = {
  id: string;
  texto: string;
  autor: string | null;
  depto: string | null;
  fecha: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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

export default function ProyectoPulsoPanel() {
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const [vista, setVista] = useState<"resumen" | "kanban">("resumen");
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [esEjecutivo, setEsEjecutivo] = useState(false);
  const [contratosVencen, setContratosVencen] = useState<ContratoVence[]>([]);
  const [creditos, setCreditos] = useState<{ nombre: string; escrito_por: string[]; dirigido_por: string[]; producido_por: string[] } | null>(null);

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
        .select("nombre, escrito_por, dirigido_por, producido_por")
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

      const [{ data: tareasData }, { data: alertasData }, { data: filasData }] =
        await Promise.all([
          supabase.from("tareas").select("para_departamento").eq("project_id", projectId).eq("completada", false),
          supabase.from("alertas").select("para_departamento").eq("project_id", projectId).eq("leida", false),
          supabase.from("herramienta_filas").select("herramienta_id, departamento, datos").eq("project_id", projectId),
        ]);

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
        ...(tareasRecientes ?? []).map((t) => ({
          id: `tarea-${t.id}`,
          texto: `Nueva tarea: ${t.titulo}`,
          autor: t.autor_nombre,
          depto: t.para_departamento,
          fecha: t.created_at,
        })),
        ...(alertasRecientes ?? []).map((a) => ({
          id: `alerta-${a.id}`,
          texto: `Nueva alerta: ${a.texto}`,
          autor: a.autor_nombre,
          depto: a.para_departamento,
          fecha: a.created_at,
        })),
        ...(filasRecientes ?? []).map((f) => ({
          id: `fila-${f.id}`,
          texto: `Actualización en ${f.herramienta_id}`,
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

      let checklistsTotal = 0;
      let checklistItemsHechos = 0;
      let checklistItemsTotal = 0;
      let presupuestado = 0;
      let comprometido = 0;
      let real = 0;

      for (const fila of filasData ?? []) {
        const datos = (fila.datos ?? {}) as Record<string, string>;
        if (typeof datos.items === "string") {
          try {
            const items = JSON.parse(datos.items) as Item[];
            if (items.length > 0) {
              checklistsTotal += 1;
              checklistItemsTotal += items.length;
              checklistItemsHechos += items.filter((i) => i.hecho).length;
            }
          } catch {
            // ignora checklists con datos corruptos
          }
        }
        if (fila.herramienta_id === "ej-presupuesto-general") {
          presupuestado += parseFloat(datos.presup || "0") || 0;
          comprometido += parseFloat(datos.comprometido || "0") || 0;
          real += parseFloat(datos.real || "0") || 0;
        }
      }

      setPulso({
        tareasTotal: tareasData?.length ?? 0,
        tareasPorDepto: agrupar(tareasData ?? []),
        alertasTotal: alertasData?.length ?? 0,
        alertasPorDepto: agrupar(alertasData ?? []),
        checklistsTotal,
        checklistItemsHechos,
        checklistItemsTotal,
        presupuestado,
        comprometido,
        real,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="pulso-loading">Cargando el pulso del proyecto…</p>;
  }

  if (!pulso) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin proyecto activo</h4>
        <p>Volvé a iniciar sesión o elegí un proyecto para ver su pulso.</p>
      </div>
    );
  }

  const checklistPct =
    pulso.checklistItemsTotal > 0 ? Math.round((pulso.checklistItemsHechos / pulso.checklistItemsTotal) * 100) : null;
  const presupuestoPct = pulso.presupuestado > 0 ? Math.min(100, Math.round((pulso.real / pulso.presupuestado) * 100)) : null;

  return (
    <div className="pulso">
      <div className="cp-pulso-tabs">
        <button className={`cp-pulso-tab ${vista === "resumen" ? "active" : ""}`} onClick={() => setVista("resumen")}>
          Resumen
        </button>
        <button className={`cp-pulso-tab ${vista === "kanban" ? "active" : ""}`} onClick={() => setVista("kanban")}>
          Kanban
        </button>
      </div>

      {vista === "kanban" && projectId && <TareasKanbanPanel projectId={projectId} />}

      {vista === "resumen" && (
      <>

      {creditos && (creditos.escrito_por.length > 0 || creditos.dirigido_por.length > 0 || creditos.producido_por.length > 0) && (
        <div className="tcard pulso-card cp-creditos-card">
          <h4><span className="hex"></span>{creditos.nombre}</h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {creditos.dirigido_por.length > 0 && (
              <li><span style={{ color: "var(--muted)" }}>Dirigido por</span> {creditos.dirigido_por.join(", ")}</li>
            )}
            {creditos.escrito_por.length > 0 && (
              <li><span style={{ color: "var(--muted)" }}>Escrito por</span> {creditos.escrito_por.join(", ")}</li>
            )}
            {creditos.producido_por.length > 0 && (
              <li><span style={{ color: "var(--muted)" }}>Producido por</span> {creditos.producido_por.join(", ")}</li>
            )}
          </ul>
        </div>
      )}

      {esEjecutivo && (
        <div className="tcard pulso-card cp-ej-briefing">
          <h4><span className="hex"></span>Briefing ejecutivo</h4>
          <div className="cp-ej-briefing-grid">
            <div className="cp-ej-briefing-item">
              <span className="cp-ej-briefing-label">Tareas abiertas</span>
              <span className={`cp-ej-briefing-val ${pulso.tareasTotal > 5 ? "tono-bad" : pulso.tareasTotal > 2 ? "tono-warn" : "tono-ok"}`}>{pulso.tareasTotal}</span>
            </div>
            <div className="cp-ej-briefing-item">
              <span className="cp-ej-briefing-label">Alertas activas</span>
              <span className={`cp-ej-briefing-val ${pulso.alertasTotal > 3 ? "tono-bad" : pulso.alertasTotal > 0 ? "tono-warn" : "tono-ok"}`}>{pulso.alertasTotal}</span>
            </div>
            <div className="cp-ej-briefing-item">
              <span className="cp-ej-briefing-label">Contratos por vencer</span>
              <span className={`cp-ej-briefing-val ${contratosVencen.length > 0 ? "tono-warn" : "tono-ok"}`}>{contratosVencen.length}</span>
            </div>
            {presupuestoPct !== null && (
              <div className="cp-ej-briefing-item">
                <span className="cp-ej-briefing-label">Presupuesto ejecutado</span>
                <span className={`cp-ej-briefing-val ${presupuestoPct > 90 ? "tono-bad" : presupuestoPct > 70 ? "tono-warn" : "tono-ok"}`}>{presupuestoPct}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {esEjecutivo && contratosVencen.length > 0 && (
        <div className="tcard pulso-card cp-contratos-vencen">
          <h4><span className="hex"></span>Contratos por vencer en &lt;30 días</h4>
          <ul className="cp-contratos-list">
            {contratosVencen.map((c, i) => (
              <li key={i}>
                <div className="cp-contratos-info">
                  <b>{c.empresa}</b>
                  <span className="muted">{c.tipo} · vence {c.fecha_fin}</span>
                </div>
                <span className={`cp-contratos-badge ${c.diasRestantes <= 7 ? "tono-bad" : "tono-warn"}`}>
                  {c.diasRestantes === 0 ? "Hoy" : `${c.diasRestantes}d`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esEjecutivo && (pulso.tareasPorDepto.length > 0 || pulso.alertasPorDepto.length > 0) && (
        <div className="tcard pulso-card cp-semaforo-card">
          <h4><span className="hex"></span>Semáforo por departamento</h4>
          <div className="cp-semaforo-grid">
            {Array.from(new Set([...pulso.tareasPorDepto.map(d => d.nombre), ...pulso.alertasPorDepto.map(d => d.nombre)])).map((dept) => {
              const t = pulso.tareasPorDepto.find(d => d.nombre === dept)?.total ?? 0;
              const a = pulso.alertasPorDepto.find(d => d.nombre === dept)?.total ?? 0;
              const s = semaforo(t, a);
              return (
                <div key={dept} className={`cp-semaforo-item tono-${s}`}>
                  <span className="cp-semaforo-dot"></span>
                  <div className="cp-semaforo-info">
                    <b>{dept}</b>
                    <span>{t > 0 ? `${t} tareas` : ""}{t > 0 && a > 0 ? " · " : ""}{a > 0 ? `${a} alertas` : ""}</span>
                  </div>
                  <span className="cp-semaforo-label">{SEMAFORO_LABEL[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pulso-grid">
        <div className="tcard pulso-card">
          <h4>
            <span className="hex"></span>Tareas pendientes
          </h4>
          <div className="pulso-big-num">{pulso.tareasTotal}</div>
          {pulso.tareasPorDepto.length === 0 && <p>No hay tareas pendientes en el proyecto.</p>}
          {pulso.tareasPorDepto.length > 0 && (
            <ul>
              {pulso.tareasPorDepto.slice(0, 6).map((c) => (
                <li key={c.nombre}><span>{c.nombre}</span><span className="pulso-count">{c.total}</span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="tcard pulso-card">
          <h4>
            <span className="hex"></span>Alertas activas
          </h4>
          <div className="pulso-big-num">{pulso.alertasTotal}</div>
          {pulso.alertasPorDepto.length === 0 && <p>Sin alertas activas en el proyecto.</p>}
          {pulso.alertasPorDepto.length > 0 && (
            <ul>
              {pulso.alertasPorDepto.slice(0, 6).map((c) => (
                <li key={c.nombre}><span>{c.nombre}</span><span className="pulso-count">{c.total}</span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="tcard pulso-card">
          <h4>
            <span className="hex"></span>Checklists del proyecto
          </h4>
          {checklistPct === null ? (
            <p>Todavía no hay items de checklist cargados.</p>
          ) : (
            <>
              <div className="hp-check-bar pulso-bar"><span style={{ width: `${checklistPct}%` }}></span></div>
              <div className="pulso-bar-label">
                {pulso.checklistItemsHechos}/{pulso.checklistItemsTotal} items · {checklistPct}% completado en {pulso.checklistsTotal} checklist{pulso.checklistsTotal !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>

        <div className="tcard pulso-card">
          <h4>
            <span className="hex"></span>Presupuesto general
          </h4>
          {presupuestoPct === null ? (
            <p>Todavía no hay datos en el presupuesto general (top sheet).</p>
          ) : (
            <>
              <div className="hp-check-bar pulso-bar"><span style={{ width: `${presupuestoPct}%` }}></span></div>
              <div className="pulso-bar-label">{presupuestoPct}% del presupuesto ejecutado</div>
              <ul>
                <li><span>Presupuestado</span><span>{fmtMoney(pulso.presupuestado)} €</span></li>
                <li><span>Comprometido</span><span>{fmtMoney(pulso.comprometido)} €</span></li>
                <li><span>Real</span><span>{fmtMoney(pulso.real)} €</span></li>
              </ul>
            </>
          )}
        </div>
      </div>

      {actividad.length > 0 && (
        <div className="tcard pulso-card cp-activity-card">
          <h4>
            <span className="hex"></span>Actividad reciente
          </h4>
          <ul className="cp-activity-list">
            {actividad.map((a) => (
              <li key={a.id}>
                <span className="cp-activity-texto">{a.texto}</span>
                <span className="cp-activity-meta">
                  {a.autor ? `${a.autor}` : "Alguien"}{a.depto ? ` · ${a.depto}` : ""} · {timeAgo(a.fecha)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esEjecutivo && projectId && <CompartirClientePanel projectId={projectId} />}
      </>
      )}
    </div>
  );
}

type InvitacionCliente = { full_name: string; email: string; token: string; used: boolean };

function CompartirClientePanel({ projectId }: { projectId: string }) {
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
      setError(errInv?.message ?? "No se pudo generar el link.");
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
        <span className="hex"></span>Compartir vista de solo lectura
      </h4>
      <p>
        Generá un link de acceso para que un cliente o productora vea el Pulso del proyecto, sin acceso a las
        herramientas internas.
      </p>

      {invitaciones.length > 0 && (
        <ul className="cp-share-list">
          {invitaciones.map((inv) => (
            <li key={inv.token}>
              <span>
                <b>{inv.full_name}</b> · {inv.email} {inv.used ? "· cuenta activa" : "· pendiente"}
              </span>
              <button type="button" className="btn" onClick={() => copiar(inv.token)}>
                {copiado === inv.token ? "¡Copiado!" : "Copiar link"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={generarLink} className="cp-share-form">
        <input
          type="text"
          placeholder="Nombre del cliente/productora"
          value={nombre}
          onChange={(e) => setNombreInv(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="btn acc" disabled={creando}>
          {creando ? "Generando…" : "Generar link"}
        </button>
      </form>
      {error && <p className="hp-error">{error}</p>}
    </div>
  );
}
