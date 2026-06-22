"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACCENTS, DEPARTAMENTOS, JERARQUIA_POR_DEPARTAMENTO } from "../constants";

type ConsFilter = "todas" | "pend" | "res";

type Respuesta = {
  departamento: string;
  autor_nombre: string;
  texto: string;
  created_at: string;
};

type Consulta = {
  id: string;
  autor_nombre: string;
  de_departamento: string;
  para_departamentos: string[];
  para_cargo: string | null;
  titulo: string;
  texto: string;
  estado: "pendiente" | "resuelta";
  respuesta: string | null;
  respuesta_autor: string | null;
  respuestas: Respuesta[];
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

export default function ConsultasPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const [consFilter, setConsFilter] = useState<ConsFilter>("todas");
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [paraDepartamentos, setParaDepartamentos] = useState<string[]>([]);
  const [cargo, setCargo] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [respuestaDrafts, setRespuestaDrafts] = useState<Record<string, string>>({});
  const [resolverDrafts, setResolverDrafts] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState<Record<string, boolean>>({});
  const [resolveOpen, setResolveOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("consultas")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setConsultas(data ?? []);
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
    if (paraDepartamentos.length === 0) {
      setMsg({ type: "err", text: "Selecciona al menos un departamento." });
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

    const { error } = await supabase.from("consultas").insert({
      project_id: projectId,
      autor_id: user.id,
      autor_nombre: fullName,
      de_departamento: deDepartamento,
      para_departamentos: paraDepartamentos,
      para_cargo: paraDepartamentos.length === 1 ? cargo.trim() || null : null,
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
    setParaDepartamentos([]);
    setCargo("");
    setShowForm(false);
    await load();
  }

  function toggleParaDepartamento(d: string) {
    setParaDepartamentos((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setCargo("");
  }

  async function handleResponder(c: Consulta) {
    const texto = respuestaDrafts[c.id]?.trim();
    if (!texto) return;

    const supabase = createClient();
    const respuestas = [
      ...c.respuestas,
      { departamento: deDepartamento, autor_nombre: fullName, texto, created_at: new Date().toISOString() },
    ];
    await supabase.from("consultas").update({ respuestas }).eq("id", c.id);

    setRespuestaDrafts((prev) => {
      const next = { ...prev };
      delete next[c.id];
      return next;
    });
    await load();
  }

  async function handleResolve(id: string) {
    const supabase = createClient();
    await supabase
      .from("consultas")
      .update({
        estado: "resuelta",
        respuesta: resolverDrafts[id]?.trim() || null,
        respuesta_autor: fullName,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    setResolverDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
  }

  const filtered = consultas.filter((c) => {
    if (consFilter === "pend") return c.estado === "pendiente";
    if (consFilter === "res") return c.estado === "resuelta";
    return true;
  });

  return (
    <>
      <div className="cons-filters">
        <button className={`cfilter ${consFilter === "todas" ? "active" : ""}`} onClick={() => setConsFilter("todas")}>
          Todas
        </button>
        <button className={`cfilter ${consFilter === "pend" ? "active" : ""}`} onClick={() => setConsFilter("pend")}>
          Pendientes
        </button>
        <button className={`cfilter ${consFilter === "res" ? "active" : ""}`} onClick={() => setConsFilter("res")}>
          Resueltas
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nueva consulta"}
        </button>
      </div>

      <div className="cons-list">
        {loading && <p className="cons-text">Cargando consultas…</p>}
        {!loading && filtered.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>Sin consultas</h4>
            <p>Las consultas entre departamentos aparecerán aquí, con su estado y respuestas.</p>
          </div>
        )}
        {filtered.map((c) => {
          const esAutor = c.de_departamento === deDepartamento;
          const puedeResponder = c.para_departamentos.includes(deDepartamento);
          return (
            <div className="cons" key={c.id} style={c.estado === "resuelta" ? { borderLeftColor: "var(--line)" } : undefined}>
              <div className="cons-top">
                <div>
                  <div className="cons-title">{c.titulo}</div>
                  <span className="cons-meta">
                    {c.de_departamento} → {c.para_departamentos.join(", ")}
                    {c.para_cargo && ` (${c.para_cargo})`} · {c.autor_nombre} · {timeAgo(c.created_at)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  {c.estado === "resuelta" ? (
                    <span className="pill p-ok">Resuelta</span>
                  ) : (
                    <span className="pill p-warn">
                      <span className="pulse"></span>Pendiente
                    </span>
                  )}
                  {c.respuestas.length > 0 && <span className="pill cons-chat-badge">💬 Conversación</span>}
                </div>
              </div>
              <div className="cons-text">{c.texto}</div>

              {c.respuestas.map((r, i) => (
                <div className="cons-text" key={i}>
                  <b>{r.departamento} ({r.autor_nombre}):</b> {r.texto}
                </div>
              ))}

              {c.estado === "resuelta" && c.respuesta && (
                <div className="cons-text">
                  <b>Resuelta por {c.respuesta_autor}:</b> {c.respuesta}
                </div>
              )}

              {c.estado === "pendiente" && (puedeResponder || esAutor) && (
                <div className="cons-actions">
                  <button
                    type="button"
                    className={`btn ${chatOpen[c.id] ? "acc" : ""}`}
                    onClick={() => setChatOpen((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                  >
                    💬 Chat
                  </button>
                  {esAutor && (
                    <button
                      type="button"
                      className="btn acc"
                      onClick={() => setResolveOpen((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                    >
                      Resolver
                    </button>
                  )}
                </div>
              )}

              {c.estado === "pendiente" && chatOpen[c.id] && (puedeResponder || esAutor) && (
                <div className="cons-actions">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje…"
                    value={respuestaDrafts[c.id] ?? ""}
                    onChange={(e) => setRespuestaDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="cons-chat-input"
                  />
                  <button className="btn" onClick={() => handleResponder(c)}>
                    Enviar
                  </button>
                </div>
              )}

              {c.estado === "pendiente" && esAutor && resolveOpen[c.id] && (
                <div className="cons-actions">
                  <input
                    type="text"
                    placeholder="Nota de cierre (opcional)…"
                    value={resolverDrafts[c.id] ?? ""}
                    onChange={(e) => setResolverDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="cons-chat-input"
                  />
                  <button className="btn acc" onClick={() => handleResolve(c.id)}>
                    Confirmar resolución
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new cons-form">
          <label className="afield">
            <span>Para (uno o más departamentos)</span>
            <div className="chip-group">
              {DEPARTAMENTOS.filter((d) => d !== deDepartamento).map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`dept-chip ${paraDepartamentos.includes(d) ? "active" : ""}`}
                  style={{ "--chip-acc": `var(--${ACCENTS[d] ?? "lime"})` } as React.CSSProperties}
                  onClick={() => toggleParaDepartamento(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </label>
          {paraDepartamentos.length === 1 && (JERARQUIA_POR_DEPARTAMENTO[paraDepartamentos[0]]?.length ?? 0) > 0 && (
            <label className="afield">
              <span>Cargo al que se dirige (opcional)</span>
              <div className="chip-group">
                {JERARQUIA_POR_DEPARTAMENTO[paraDepartamentos[0]].map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`dept-chip ${cargo === c ? "active" : ""}`}
                    style={{ "--chip-acc": `var(--${ACCENTS[paraDepartamentos[0]] ?? "lime"})` } as React.CSSProperties}
                    onClick={() => setCargo((prev) => (prev === c ? "" : c))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </label>
          )}
          <label className="afield">
            <span>Título</span>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumen breve de la consulta"
            />
          </label>
          <label className="afield">
            <span>Mensaje</span>
            <textarea
              required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder="Detalle de la consulta"
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Enviando…" : "Enviar consulta"}
          </button>
        </form>
      )}
    </>
  );
}
