"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS } from "../constants";

type Hito = {
  id: string;
  departamento: string;
  titulo: string;
  descripcion: string | null;
  fecha_prevista: string;
  fecha_real: string | null;
  estado: "pendiente" | "en_curso" | "cumplido" | "retrasado";
  creado_por: string;
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function estadoVisual(h: Hito) {
  if (h.fecha_real) {
    if (h.fecha_real <= h.fecha_prevista) return { cls: "p-ok", label: "Cumplido a tiempo" };
    return { cls: "p-warn", label: "Cumplido con retraso" };
  }
  if (h.fecha_prevista < hoyISO()) return { cls: "p-bad", label: "Retrasado" };
  if (h.estado === "en_curso") return { cls: "p-info", label: "En curso" };
  return { cls: "p-mut", label: "Pendiente" };
}

export default function PipelinePanel({ fullName }: { fullName: string }) {
  const [hitos, setHitos] = useState<Hito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dep, setDep] = useState(DEPARTAMENTOS[0]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaPrevista, setFechaPrevista] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("hitos")
      .select("*")
      .eq("project_id", projectId)
      .order("fecha_prevista", { ascending: true });
    setHitos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
      return;
    }
    if (!titulo || !fechaPrevista) {
      setMsg({ type: "err", text: "Completa al menos el título y la fecha prevista." });
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

    const { error } = await supabase.from("hitos").insert({
      project_id: projectId,
      departamento: dep,
      titulo,
      descripcion: descripcion || null,
      fecha_prevista: fechaPrevista,
      creado_por: fullName,
      creado_por_id: user.id,
    });

    setSending(false);
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }
    setTitulo("");
    setDescripcion("");
    setFechaPrevista("");
    setShowForm(false);
    await load();
  }

  async function marcarCumplido(h: Hito) {
    const supabase = createClient();
    await supabase.from("hitos").update({ fecha_real: hoyISO(), estado: "cumplido" }).eq("id", h.id);
    await load();
  }

  async function marcarEnCurso(h: Hito) {
    const supabase = createClient();
    await supabase.from("hitos").update({ estado: "en_curso" }).eq("id", h.id);
    await load();
  }

  if (loading) return <p className="cons-text">Cargando pipeline…</p>;

  const total = hitos.length;
  const cumplidosTiempo = hitos.filter((h) => h.fecha_real && h.fecha_real <= h.fecha_prevista).length;
  const retrasados = hitos.filter((h) => !h.fecha_real && h.fecha_prevista < hoyISO()).length;
  const cumplidosTarde = hitos.filter((h) => h.fecha_real && h.fecha_real > h.fecha_prevista).length;
  const pendientes = total - cumplidosTiempo - cumplidosTarde - retrasados;

  return (
    <div className="tools">
      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>Line-up · cumplimiento de fechas</h3>
          <div className="right">{total} hitos</div>
        </div>
        <div className="grid2" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <div className="mini">
            <h4>A tiempo</h4>
            <ul>
              <li>
                <span className="pill p-ok">{cumplidosTiempo}</span>
              </li>
            </ul>
          </div>
          <div className="mini">
            <h4>Con retraso</h4>
            <ul>
              <li>
                <span className="pill p-warn">{cumplidosTarde}</span>
              </li>
            </ul>
          </div>
          <div className="mini">
            <h4>Retrasados</h4>
            <ul>
              <li>
                <span className="pill p-bad">{retrasados}</span>
              </li>
            </ul>
          </div>
          <div className="mini">
            <h4>Pendientes</h4>
            <ul>
              <li>
                <span className="pill p-mut">{pendientes}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>Hitos por departamento</h3>
        </div>
        {hitos.length === 0 ? (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>Sin hitos todavía</h4>
            <p>Añade los hitos clave de cada departamento (entregas, plan de rodaje, contratos, etc.) con su fecha prevista para controlar el cumplimiento.</p>
          </div>
        ) : (
          <div className="twrap">
            <table className="t">
              <tbody>
                <tr>
                  <th>Departamento</th>
                  <th>Hito</th>
                  <th>Prevista</th>
                  <th>Real</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
                {hitos.map((h) => {
                  const ev = estadoVisual(h);
                  return (
                    <tr key={h.id}>
                      <td>{h.departamento}</td>
                      <td>
                        <b>{h.titulo}</b>
                        {h.descripcion && <div className="cons-meta">{h.descripcion}</div>}
                      </td>
                      <td className="mono">{h.fecha_prevista}</td>
                      <td className="mono">{h.fecha_real ?? "—"}</td>
                      <td>
                        <span className={`pill ${ev.cls}`}>
                          {(ev.cls === "p-bad" || ev.cls === "p-info") && <span className="pulse"></span>}
                          {ev.label}
                        </span>
                      </td>
                      <td>
                        {!h.fecha_real && (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {h.estado !== "en_curso" && (
                              <button className="btn" onClick={() => marcarEnCurso(h)}>
                                En curso
                              </button>
                            )}
                            <button className="btn acc" onClick={() => marcarCumplido(h)}>
                              Marcar cumplido
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cons-new">
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Añadir hito"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>Departamento</span>
            <select value={dep} onChange={(e) => setDep(e.target.value)}>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Hito</span>
            <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Entrega del plan de rodaje" />
          </label>
          <label className="afield">
            <span>Descripción (opcional)</span>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Detalle del hito" />
          </label>
          <label className="afield">
            <span>Fecha prevista</span>
            <input type="date" required value={fechaPrevista} onChange={(e) => setFechaPrevista(e.target.value)} />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Guardando…" : "Añadir hito"}
          </button>
        </form>
      )}

      <div className="note">
        <b>Line-up de Producción Ejecutiva:</b> controla si cada departamento cumple sus fechas previstas. Un
        hito sin fecha real cuya fecha prevista ya pasó se marca automáticamente como <b>Retrasado</b>.
      </div>
    </div>
  );
}
