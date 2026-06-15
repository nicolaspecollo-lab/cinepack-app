"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tipo = "info" | "sugerencia" | "consulta";

type Comunicado = {
  id: string;
  autor_nombre: string;
  de_departamento: string;
  tipo: Tipo;
  titulo: string;
  texto: string;
  created_at: string;
};

const TIPO_LABEL: Record<Tipo, string> = {
  info: "Información",
  sugerencia: "Sugerencia",
  consulta: "Consulta",
};

const TIPO_CLASS: Record<Tipo, string> = {
  info: "tag-info",
  sugerencia: "tag-sug",
  consulta: "tag-con",
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

export default function ComunicadosPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<Tipo>("info");
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
      .from("comunicados")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setComunicados(data ?? []);
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

    setSending(true);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const { error } = await supabase.from("comunicados").insert({
      project_id: projectId,
      autor_id: user.id,
      autor_nombre: fullName,
      de_departamento: deDepartamento,
      tipo,
      titulo,
      texto,
    });

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setTitulo("");
    setTexto("");
    setTipo("info");
    setShowForm(false);
    await load();
  }

  return (
    <>
      <div className="com-list">
        {loading && <p className="com-text">Cargando comunicados…</p>}
        {!loading && comunicados.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>Sin comunicados</h4>
            <p>El tablón de comunicados del equipo aparecerá aquí.</p>
          </div>
        )}
        {comunicados.map((c) => (
          <div className="com" key={c.id}>
            <div className="com-top">
              <div>
                <div className="com-title">{c.titulo}</div>
                <span className="com-meta">
                  {c.de_departamento} · {c.autor_nombre} · {timeAgo(c.created_at)}
                </span>
              </div>
              <span className={`pill ${TIPO_CLASS[c.tipo]}`}>{TIPO_LABEL[c.tipo]}</span>
            </div>
            <div className="com-text">{c.texto}</div>
          </div>
        ))}
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button className="btn acc" style={{ "--acc": "var(--cyan)" } as React.CSSProperties} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nuevo comunicado"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              <option value="info">Información</option>
              <option value="sugerencia">Sugerencia</option>
              <option value="consulta">Consulta</option>
            </select>
          </label>
          <label className="afield">
            <span>Título</span>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumen breve del comunicado"
            />
          </label>
          <label className="afield">
            <span>Mensaje</span>
            <textarea
              required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder="Detalle del comunicado"
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Publicando…" : "Publicar comunicado"}
          </button>
        </form>
      )}
    </>
  );
}
