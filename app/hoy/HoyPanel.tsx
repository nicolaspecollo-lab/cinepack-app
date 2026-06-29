"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const PILL_LABEL_KEY: Record<Pill, string> = {
  warn: "pillToday",
  mut: "pillPending",
  bad: "pillUnread",
  info: "pillInfo",
  ok: "pillOk",
};

type GestionTipo = "tarea" | "alerta" | "jornada";

function etapaEstadoLabel(estado: EtapaResumen["estado"], dias: number | null, t: ReturnType<typeof useTranslations>): string {
  switch (estado) {
    case "completada": return t("stageCompleted", { n: dias ?? 0 });
    case "pendiente": return t("stagePending", { n: dias ?? 0 });
    case "en_curso": return t("stageInProgress", { n: dias ?? 0 });
    case "sin_fecha": return t("stageNoDate");
  }
}

export default function HoyPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const t = useTranslations("hoyPanel");
  const tEtapas = useTranslations("etapas");
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
      setMsg({ type: "err", text: t("errNoProject") });
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
            <span className="hex"></span>{t("lifecycleTitle")}
          </h4>
          {loading && <p>{t("loading")}</p>}
          {!loading && ciclo.every((e) => e.estado === "sin_fecha") && (
            <p>{t("noDatesYet")}</p>
          )}
          {!loading && ciclo.some((e) => e.estado !== "sin_fecha") && (
            <ul>
              {ciclo.map((e) => (
                <li key={e.key} className={e.enCurso ? "etapa-actual" : undefined}>
                  <span>{tEtapas(e.key)}</span>
                  <span>{etapaEstadoLabel(e.estado, e.dias, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tcard">
          <h4>
            <span className="hex"></span>{t("pendingForMe")}
          </h4>
          {!loading && tareas.length === 0 && <p>{t("noPendingTasks")}</p>}
          {tareas.length > 0 && (
            <ul>
              {tareas.map((tarea) => (
                <li key={tarea.id} style={{ cursor: "pointer" }} onClick={() => completarTarea(tarea.id)} title={t("markDone")}>
                  <span><span className="cp-estado-dot" style={{ background: ESTADO_COLOR.pendiente }}></span>{tarea.titulo}</span>
                  <span className={`pill p-${tarea.tipo}`}>{tarea.etiqueta}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tcard">
          <h4>
            <span className="hex"></span>{t("alertsTitle")}
          </h4>
          {!loading && alertas.length === 0 && <p>{t("noActiveAlerts")}</p>}
          {alertas.length > 0 && (
            <ul>
              {alertas.map((a) => (
                <li key={a.id} style={{ cursor: "pointer" }} onClick={() => descartarAlerta(a.id)} title={t("dismissAlert")}>
                  <span>{a.texto}</span>
                  <span className={`pill p-${a.tipo}`}>{a.accion_label || t(PILL_LABEL_KEY[a.tipo])}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("manageToday")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>{t("fieldType")}</span>
            <select value={gestionTipo} onChange={(e) => setGestionTipo(e.target.value as GestionTipo)}>
              <option value="tarea">{t("newTask")}</option>
              <option value="alerta">{t("newAlert")}</option>
              <option value="jornada">{t("editDayShoot")}</option>
            </select>
          </label>

          {gestionTipo !== "jornada" && (
            <>
              <label className="afield">
                <span>{t("fieldFor")}</span>
                <select value={para} onChange={(e) => setPara(e.target.value)}>
                  <option value="">{t("all")}</option>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="afield">
                <span>{t("fieldStyle")}</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as Pill)}>
                  <option value="warn">{t("styleWarn")}</option>
                  <option value="bad">{t("styleBad")}</option>
                  <option value="info">{t("styleInfo")}</option>
                  <option value="ok">{t("styleOk")}</option>
                  <option value="mut">{t("styleMut")}</option>
                </select>
              </label>
            </>
          )}

          {gestionTipo === "tarea" && (
            <>
              <label className="afield">
                <span>{t("fieldTitle")}</span>
                <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t("titlePlaceholder")} />
              </label>
              <label className="afield">
                <span>{t("fieldLabel")}</span>
                <input type="text" required value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder={t("labelPlaceholder")} />
              </label>
            </>
          )}

          {gestionTipo === "alerta" && (
            <>
              <label className="afield">
                <span>{t("fieldText")}</span>
                <textarea required value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder={t("textPlaceholder")} />
              </label>
              <label className="afield">
                <span>{t("fieldButtonLabel")}</span>
                <input type="text" value={accionLabel} onChange={(e) => setAccionLabel(e.target.value)} placeholder={t("buttonLabelPlaceholder")} />
              </label>
            </>
          )}

          {gestionTipo === "jornada" && (
            <>
              <label className="afield">
                <span>{t("fieldDayNumber")}</span>
                <input type="number" required min="1" value={diaNumero} onChange={(e) => setDiaNumero(e.target.value)} />
              </label>
              <label className="afield">
                <span>{t("fieldTotalDays")}</span>
                <input type="number" required min="1" value={diaTotal} onChange={(e) => setDiaTotal(e.target.value)} />
              </label>
              <label className="afield">
                <span>{t("fieldDate")}</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </label>
              <label className="afield">
                <span>{t("fieldLocation")}</span>
                <input type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder={t("locationPlaceholder")} />
              </label>
              <label className="afield">
                <span>{t("fieldCallTime")}</span>
                <input type="text" value={citacion} onChange={(e) => setCitacion(e.target.value)} placeholder="07:00" />
              </label>
              <label className="afield">
                <span>{t("fieldDayScenes")}</span>
                <input type="text" value={escenasDia} onChange={(e) => setEscenasDia(e.target.value)} placeholder={t("scenesPlaceholder")} />
              </label>
              <label className="afield">
                <span>{t("fieldDailies")}</span>
                <input type="text" value={visionado} onChange={(e) => setVisionado(e.target.value)} placeholder="20:00" />
              </label>
            </>
          )}

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? t("saving") : t("save")}
          </button>
        </form>
      )}
    </>
  );
}
