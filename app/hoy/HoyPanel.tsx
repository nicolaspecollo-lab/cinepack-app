"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS, ESTADO_COLOR } from "../constants";
import { CICLO_SELECT, fechasCicloDesdeFila, resumenCiclo, type EtapaResumen } from "./cicloVida";

type Pill = "warn" | "mut" | "bad" | "info" | "ok";

type Jornada = {
  id: string;
  dia_numero: number;
  dia_total: number;
  fecha: string | null;
  ubicacion: string | null;
  citacion: string | null;
  escenas_dia: string | null;
  visionado: string | null;
};

type Tarea = {
  id: string;
  para_departamento: string | null;
  titulo: string;
  etiqueta: string;
  tipo: Pill;
  completada: boolean;
};

type Alerta = {
  id: string;
  para_departamento: string | null;
  texto: string;
  tipo: Pill;
  accion_label: string | null;
  leida: boolean;
};

const PILL_LABEL: Record<Pill, string> = {
  warn: "Hoy",
  mut: "Pendiente",
  bad: "Sin leer",
  info: "Info",
  ok: "OK",
};

type GestionTipo = "tarea" | "alerta" | "jornada";

const ETAPA_ESTADO_LABEL: Record<EtapaResumen["estado"], (dias: number | null) => string> = {
  completada: (dias) => `${dias} día${dias === 1 ? "" : "s"} completado${dias === 1 ? "" : "s"}`,
  pendiente: (dias) => `${dias} día${dias === 1 ? "" : "s"} pendiente${dias === 1 ? "" : "s"}`,
  en_curso: (dias) => `${dias} día${dias === 1 ? "" : "s"} (en curso)`,
  sin_fecha: () => "Sin fecha definida",
};

export default function HoyPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [ciclo, setCiclo] = useState<EtapaResumen[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [gestionTipo, setGestionTipo] = useState<GestionTipo>("tarea");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Tarea / Alerta form fields
  const [para, setPara] = useState("");
  const [titulo, setTitulo] = useState("");
  const [etiqueta, setEtiqueta] = useState("Hoy");
  const [texto, setTexto] = useState("");
  const [accionLabel, setAccionLabel] = useState("");
  const [tipo, setTipo] = useState<Pill>("warn");

  // Jornada form fields
  const [diaNumero, setDiaNumero] = useState("");
  const [diaTotal, setDiaTotal] = useState("");
  const [fecha, setFecha] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [citacion, setCitacion] = useState("");
  const [escenasDia, setEscenasDia] = useState("");
  const [visionado, setVisionado] = useState("");

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    const [{ data: jornadaData }, { data: tareasData }, { data: alertasData }, { data: proyectoData }] = await Promise.all([
      supabase
        .from("jornadas")
        .select("*")
        .eq("project_id", projectId)
        .eq("activa", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tareas")
        .select("*")
        .eq("project_id", projectId)
        .eq("completada", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("alertas")
        .select("*")
        .eq("project_id", projectId)
        .eq("leida", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("proyectos")
        .select(CICLO_SELECT)
        .eq("id", projectId)
        .single(),
    ]);

    setJornada(jornadaData ?? null);
    setTareas((tareasData ?? []).filter((t) => !t.para_departamento || t.para_departamento === deDepartamento));
    setAlertas((alertasData ?? []).filter((a) => !a.para_departamento || a.para_departamento === deDepartamento));
    setCiclo(resumenCiclo(fechasCicloDesdeFila(proyectoData)));
    setLoading(false);
  }, [deDepartamento]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (jornada) {
      setDiaNumero(String(jornada.dia_numero));
      setDiaTotal(String(jornada.dia_total));
      setFecha(jornada.fecha ?? "");
      setUbicacion(jornada.ubicacion ?? "");
      setCitacion(jornada.citacion ?? "");
      setEscenasDia(jornada.escenas_dia ?? "");
      setVisionado(jornada.visionado ?? "");
    }
  }, [jornada]);

  async function completarTarea(id: string) {
    const supabase = createClient();
    await supabase.from("tareas").update({ completada: true }).eq("id", id);
    await load();
  }

  async function descartarAlerta(id: string) {
    const supabase = createClient();
    await supabase.from("alertas").update({ leida: true }).eq("id", id);
    await load();
  }

  function resetForm() {
    setPara("");
    setTitulo("");
    setEtiqueta("Hoy");
    setTexto("");
    setAccionLabel("");
    setTipo("warn");
    setMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
      return;
    }

    setSending(true);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    let error = null;

    if (gestionTipo === "tarea") {
      ({ error } = await supabase.from("tareas").insert({
        project_id: projectId,
        para_departamento: para || null,
        titulo,
        etiqueta,
        tipo,
        autor_id: user.id,
        autor_nombre: fullName,
        de_departamento: deDepartamento,
      }));
    } else if (gestionTipo === "alerta") {
      ({ error } = await supabase.from("alertas").insert({
        project_id: projectId,
        para_departamento: para || null,
        texto,
        tipo,
        accion_label: accionLabel || null,
        autor_id: user.id,
        autor_nombre: fullName,
        de_departamento: deDepartamento,
      }));
      if (!error && tipo === "bad") {
        fetch("/api/webhook/alerta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, texto, paraDepartamento: para || null, autorNombre: fullName }),
        }).catch(() => {});
      }
    } else {
      const payload = {
        project_id: projectId,
        dia_numero: Number(diaNumero),
        dia_total: Number(diaTotal),
        fecha: fecha || null,
        ubicacion: ubicacion || null,
        citacion: citacion || null,
        escenas_dia: escenasDia || null,
        visionado: visionado || null,
        activa: true,
      };
      if (jornada) {
        ({ error } = await supabase.from("jornadas").update(payload).eq("id", jornada.id));
      } else {
        ({ error } = await supabase.from("jornadas").insert(payload));
      }
    }

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    resetForm();
    setShowForm(false);
    await load();
  }

  return (
    <>
      <div className="today">
        <div className="tcard">
          <h4>
            <span className="hex"></span>Ciclo de vida del proyecto
          </h4>
          {loading && <p>Cargando…</p>}
          {!loading && ciclo.every((e) => e.estado === "sin_fecha") && (
            <p>El Ejecutivo todavía no definió las fechas de las etapas en el Admin.</p>
          )}
          {!loading && ciclo.some((e) => e.estado !== "sin_fecha") && (
            <ul>
              {ciclo.map((e) => (
                <li key={e.key} className={e.enCurso ? "etapa-actual" : undefined}>
                  <span>{e.label}</span>
                  <span>{ETAPA_ESTADO_LABEL[e.estado](e.dias)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tcard">
          <h4>
            <span className="hex"></span>Pendiente de mí
          </h4>
          {!loading && tareas.length === 0 && <p>No tienes tareas pendientes por ahora.</p>}
          {tareas.length > 0 && (
            <ul>
              {tareas.map((t) => (
                <li key={t.id} style={{ cursor: "pointer" }} onClick={() => completarTarea(t.id)} title="Marcar como hecha">
                  <span><span className="cp-estado-dot" style={{ background: ESTADO_COLOR.pendiente }}></span>{t.titulo}</span>
                  <span className={`pill p-${t.tipo}`}>{t.etiqueta}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tcard">
          <h4>
            <span className="hex"></span>Alertas
          </h4>
          {!loading && alertas.length === 0 && <p>Sin alertas activas.</p>}
          {alertas.length > 0 && (
            <ul>
              {alertas.map((a) => (
                <li key={a.id} style={{ cursor: "pointer" }} onClick={() => descartarAlerta(a.id)} title="Descartar alerta">
                  <span>{a.texto}</span>
                  <span className={`pill p-${a.tipo}`}>{a.accion_label || PILL_LABEL[a.tipo]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Gestionar Hoy"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>Tipo</span>
            <select value={gestionTipo} onChange={(e) => setGestionTipo(e.target.value as GestionTipo)}>
              <option value="tarea">Nueva tarea</option>
              <option value="alerta">Nueva alerta</option>
              <option value="jornada">Editar jornada del día</option>
            </select>
          </label>

          {gestionTipo !== "jornada" && (
            <>
              <label className="afield">
                <span>Para</span>
                <select value={para} onChange={(e) => setPara(e.target.value)}>
                  <option value="">Todos</option>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="afield">
                <span>Estilo</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as Pill)}>
                  <option value="warn">Aviso (amarillo)</option>
                  <option value="bad">Urgente (rojo)</option>
                  <option value="info">Información (cian)</option>
                  <option value="ok">OK (verde)</option>
                  <option value="mut">Neutro (gris)</option>
                </select>
              </label>
            </>
          )}

          {gestionTipo === "tarea" && (
            <>
              <label className="afield">
                <span>Título</span>
                <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Qué hay que hacer" />
              </label>
              <label className="afield">
                <span>Etiqueta</span>
                <input type="text" required value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Hoy, Antes D3…" />
              </label>
            </>
          )}

          {gestionTipo === "alerta" && (
            <>
              <label className="afield">
                <span>Texto</span>
                <textarea required value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Descripción de la alerta" />
              </label>
              <label className="afield">
                <span>Etiqueta del botón (opcional)</span>
                <input type="text" value={accionLabel} onChange={(e) => setAccionLabel(e.target.value)} placeholder="Agenda, Sin leer…" />
              </label>
            </>
          )}

          {gestionTipo === "jornada" && (
            <>
              <label className="afield">
                <span>Día (número)</span>
                <input type="number" required min="1" value={diaNumero} onChange={(e) => setDiaNumero(e.target.value)} />
              </label>
              <label className="afield">
                <span>Días totales del rodaje</span>
                <input type="number" required min="1" value={diaTotal} onChange={(e) => setDiaTotal(e.target.value)} />
              </label>
              <label className="afield">
                <span>Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </label>
              <label className="afield">
                <span>Ubicación</span>
                <input type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Localización del día" />
              </label>
              <label className="afield">
                <span>Citación</span>
                <input type="text" value={citacion} onChange={(e) => setCitacion(e.target.value)} placeholder="07:00" />
              </label>
              <label className="afield">
                <span>Escenas del día</span>
                <input type="text" value={escenasDia} onChange={(e) => setEscenasDia(e.target.value)} placeholder="1, 2, 3, 7, 8, 9" />
              </label>
              <label className="afield">
                <span>Visionado dailies</span>
                <input type="text" value={visionado} onChange={(e) => setVisionado(e.target.value)} placeholder="20:00" />
              </label>
            </>
          )}

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}
    </>
  );
}
