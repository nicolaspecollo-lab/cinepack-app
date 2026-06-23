"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACCENTS } from "../constants";

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

type Acuse = {
  comunicado_id: string;
  user_id: string;
  department_id: string;
  opened_at: string | null;
  acked_at: string | null;
};

type MiembroDept = { user_id: string; departamento: string; full_name: string };

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

  const [userId, setUserId] = useState<string | null>(null);
  const [miembros, setMiembros] = useState<MiembroDept[]>([]);
  const [acuses, setAcuses] = useState<Record<string, Acuse[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAcuses = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { data } = await supabase.from("comunicado_acuse").select("*").in("comunicado_id", ids);
    const grouped: Record<string, Acuse[]> = {};
    for (const row of data ?? []) {
      grouped[row.comunicado_id] = grouped[row.comunicado_id] ?? [];
      grouped[row.comunicado_id].push(row as Acuse);
    }
    setAcuses(grouped);
  }, []);

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
      .from("comunicados")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setComunicados(data ?? []);
    setLoading(false);
    await loadAcuses((data ?? []).map((c) => c.id));

    const { data: members } = await supabase
      .from("project_members")
      .select("user_id, profiles(departamento, full_name)")
      .eq("project_id", projectId);
    const lista = (members ?? [])
      .map((row) => {
        const p = row.profiles as unknown as { departamento: string; full_name: string } | null;
        if (!p) return null;
        return { user_id: row.user_id as string, departamento: p.departamento, full_name: p.full_name };
      })
      .filter((m): m is MiembroDept => m !== null);
    setMiembros(lista);
  }, [loadAcuses]);

  useEffect(() => {
    load();
  }, [load]);

  function deptStatus(comunicadoId: string) {
    const porDepto: Record<string, string[]> = {};
    for (const m of miembros) {
      porDepto[m.departamento] = porDepto[m.departamento] ?? [];
      porDepto[m.departamento].push(m.user_id);
    }
    const ackedUserIds = new Set(
      (acuses[comunicadoId] ?? []).filter((a) => a.acked_at).map((a) => a.user_id)
    );

    // "Visualizado por": una persona por cada integrante que ya confirmó el acuse.
    const visualizado = miembros
      .filter((m) => ackedUserIds.has(m.user_id))
      .map((m) => ({ user_id: m.user_id, departamento: m.departamento, nombre: m.full_name }));

    // "Pendiente de visualización": un departamento por cada uno que tenga al
    // menos un integrante sin confirmar.
    const pendiente: string[] = [];
    for (const [depto, userIds] of Object.entries(porDepto)) {
      const completo = userIds.length > 0 && userIds.every((uid) => ackedUserIds.has(uid));
      if (!completo) pendiente.push(depto);
    }

    return { visualizado, pendiente };
  }

  async function handleExpand(c: Comunicado) {
    const opening = expandedId !== c.id;
    setExpandedId(opening ? c.id : null);
    if (!opening || !userId) return;

    const existing = (acuses[c.id] ?? []).find((a) => a.user_id === userId);
    if (existing) return;

    const supabase = createClient();
    const miDepto = miembros.find((m) => m.user_id === userId)?.departamento ?? "";
    await supabase.from("comunicado_acuse").insert({
      comunicado_id: c.id,
      user_id: userId,
      department_id: miDepto,
      opened_at: new Date().toISOString(),
    });
    await loadAcuses([c.id]);
  }

  async function handleAcuse(c: Comunicado) {
    if (!userId) return;
    const supabase = createClient();
    const existing = (acuses[c.id] ?? []).find((a) => a.user_id === userId);
    const miDepto = miembros.find((m) => m.user_id === userId)?.departamento ?? "";

    if (existing) {
      await supabase
        .from("comunicado_acuse")
        .update({ acked_at: new Date().toISOString() })
        .eq("comunicado_id", c.id)
        .eq("user_id", userId);
    } else {
      await supabase.from("comunicado_acuse").insert({
        comunicado_id: c.id,
        user_id: userId,
        department_id: miDepto,
        opened_at: new Date().toISOString(),
        acked_at: new Date().toISOString(),
      });
    }
    await loadAcuses([c.id]);
  }

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
        {comunicados.map((c) => {
          const expanded = expandedId === c.id;
          const { visualizado, pendiente } = deptStatus(c.id);
          const yaAcuso = !!(acuses[c.id] ?? []).find((a) => a.user_id === userId && a.acked_at);
          return (
            <div
              className="com"
              key={c.id}
              onClick={() => handleExpand(c)}
              style={{ cursor: "pointer", ...(expanded ? { boxShadow: "0 0 0 2px var(--lime) inset" } : {}) }}
            >
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

              {expanded && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <span className="afield" style={{ display: "block", marginBottom: "4px" }}>Visualizado por:</span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {visualizado.length === 0 && <span className="com-text">— nadie hizo el acuse aún</span>}
                      {visualizado.map((p) => (
                        <span
                          key={p.user_id}
                          className="hex"
                          title={`${p.nombre} (${p.departamento})`}
                          style={{ background: `var(--${ACCENTS[p.departamento] ?? "lime"})`, width: "18px", height: "15px" }}
                        ></span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="afield" style={{ display: "block", marginBottom: "4px" }}>Pendiente de visualización:</span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {pendiente.length === 0 && <span className="com-text">— todos los departamentos acusaron</span>}
                      {pendiente.map((d) => (
                        <span key={d} className="hex" title={d} style={{ background: `var(--${ACCENTS[d] ?? "lime"})`, opacity: 0.3, width: "18px", height: "15px" }}></span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn acc"
                    disabled={yaAcuso}
                    onClick={() => handleAcuse(c)}
                  >
                    {yaAcuso ? "Ya hiciste acuse de recibo" : "Acuse de recibo"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
