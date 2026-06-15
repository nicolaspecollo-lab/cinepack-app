"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS } from "../constants";

const HERRAMIENTAS = ["Documentos", "Consultas", "Comunicados", "Guion", "Guion Técnico", "Escenas"];

type Solicitud = {
  id: string;
  solicitante_id: string;
  solicitante_nombre: string;
  de_departamento: string;
  para_departamento: string;
  herramienta: string;
  tipo_acceso: "visionado" | "edicion";
  motivo: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  resuelto_por: string | null;
  created_at: string;
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

export default function AccesosPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [paraDepartamento, setParaDepartamento] = useState("");
  const [herramienta, setHerramienta] = useState(HERRAMIENTAS[0]);
  const [tipoAcceso, setTipoAcceso] = useState<"visionado" | "edicion">("visionado");
  const [motivo, setMotivo] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data } = await supabase
      .from("acceso_solicitudes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setSolicitudes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
      return;
    }
    if (!paraDepartamento) {
      setMsg({ type: "err", text: "Selecciona el departamento al que pides acceso." });
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

    const { error } = await supabase.from("acceso_solicitudes").insert({
      project_id: projectId,
      solicitante_id: user.id,
      solicitante_nombre: fullName,
      de_departamento: deDepartamento,
      para_departamento: paraDepartamento,
      herramienta,
      tipo_acceso: tipoAcceso,
      motivo: motivo || null,
    });

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setParaDepartamento("");
    setHerramienta(HERRAMIENTAS[0]);
    setTipoAcceso("visionado");
    setMotivo("");
    setShowForm(false);
    await load();
  }

  async function resolver(id: string, estado: "aprobada" | "rechazada") {
    const supabase = createClient();
    await supabase
      .from("acceso_solicitudes")
      .update({ estado, resuelto_por: fullName, resolved_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  }

  const esEjecutivo = deDepartamento === "Ejecutivo";

  return (
    <>
      <div className="cons-list">
        {loading && <p className="cons-text">Cargando solicitudes…</p>}
        {!loading && solicitudes.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>Sin solicitudes de acceso</h4>
            <p>Pide a otro departamento acceso de visionado o edición a una de sus herramientas, o gestiona las que recibas.</p>
          </div>
        )}
        {solicitudes.map((s) => {
          const esMia = s.solicitante_id === userId;
          const puedeResolver =
            s.estado === "pendiente" && (esEjecutivo || s.para_departamento === deDepartamento) && !esMia;
          const pillClass =
            s.estado === "aprobada" ? "p-ok" : s.estado === "rechazada" ? "p-bad" : "p-warn";
          const pillLabel =
            s.estado === "aprobada" ? "Aprobada" : s.estado === "rechazada" ? "Rechazada" : "Pendiente";
          return (
            <div className="cons" key={s.id}>
              <div className="cons-top">
                <div>
                  <div className="cons-title">
                    {s.de_departamento} → {s.para_departamento} · {s.herramienta}{" "}
                    <span className={`pill ${s.tipo_acceso === "edicion" ? "tag-con" : "tag-info"}`}>
                      {s.tipo_acceso === "edicion" ? "Edición" : "Visionado"}
                    </span>
                  </div>
                  <span className="cons-meta">
                    {s.solicitante_nombre} · {timeAgo(s.created_at)}
                    {s.resuelto_por ? ` · ${pillLabel.toLowerCase()} por ${s.resuelto_por}` : ""}
                  </span>
                </div>
                <span className={`pill ${pillClass}`}>
                  {s.estado === "pendiente" && <span className="pulse"></span>}
                  {pillLabel}
                </span>
              </div>
              {s.motivo && <div className="cons-text">{s.motivo}</div>}

              {puedeResolver && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button className="btn acc" onClick={() => resolver(s.id, "aprobada")}>
                    Aprobar
                  </button>
                  <button className="btn" onClick={() => resolver(s.id, "rechazada")}>
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cons-new">
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Solicitar acceso"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>Solicitar a (departamento)</span>
            <select value={paraDepartamento} onChange={(e) => setParaDepartamento(e.target.value)}>
              <option value="">Selecciona un departamento…</option>
              {DEPARTAMENTOS.filter((d) => d !== deDepartamento).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Herramienta</span>
            <select value={herramienta} onChange={(e) => setHerramienta(e.target.value)}>
              {HERRAMIENTAS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Tipo de acceso</span>
            <select value={tipoAcceso} onChange={(e) => setTipoAcceso(e.target.value as "visionado" | "edicion")}>
              <option value="visionado">Visionado (solo ver)</option>
              <option value="edicion">Edición (ver y editar)</option>
            </select>
          </label>
          <label className="afield">
            <span>Motivo (opcional)</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="¿Para qué necesitas este acceso?"
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </form>
      )}
    </>
  );
}
