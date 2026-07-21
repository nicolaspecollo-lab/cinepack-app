"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ACCENTS, DEPARTAMENTOS, JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import Icon from "../components/Icon";
import CpSelect from "../components/CpSelect";

type ConsFilter = "todas" | "pend" | "res";

type Respuesta = {
  departamento: string;
  autor_nombre: string;
  texto: string;
  created_at: string;
};

type Consulta = {
  id: string;
  autor_id: string;
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
  is_private: boolean;
  private_recipient_id: string | null;
  private_recipient_nombre: string | null;
};

type MiembroProyecto = {
  user_id: string;
  full_name: string;
  departamento: string;
};

function accentVar(dept: string) {
  return `var(--${ACCENTS[dept] ?? "lime"})`;
}

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} · ${hora}`;
}

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

export default function ConsultasPanel({
  deDepartamento,
  cargo,
  fullName,
}: {
  deDepartamento: string;
  cargo?: string | null;
  fullName: string;
}) {
  const t = useTranslations("consultas");
  const tHp = useTranslations("hp");
  const [consFilter, setConsFilter] = useState<ConsFilter>("todas");
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [paraDepartamentos, setParaDepartamentos] = useState<string[]>([]);
  const [destCargo, setDestCargo] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateRecipientId, setPrivateRecipientId] = useState("");
  const [miembrosProyecto, setMiembrosProyecto] = useState<MiembroProyecto[]>([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setUserId(uid);

    let query = supabase
      .from("consultas")
      .select("*")
      .eq("project_id", projectId);

    if (deDepartamento !== "Ejecutivo") {
      const visibilidad = [`de_departamento.eq.${deDepartamento}`, `para_departamentos.cs.{${deDepartamento}}`];
      if (uid) visibilidad.push(`autor_id.eq.${uid}`, `private_recipient_id.eq.${uid}`);
      query = query.or(visibilidad.join(","));
    }

    const { data } = await query.order("created_at", { ascending: false });
    setConsultas((data ?? []).filter((c) => !c.is_private || c.autor_id === uid || c.private_recipient_id === uid || deDepartamento === "Ejecutivo"));
    setLoading(false);
  }, [deDepartamento]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("project_members")
        .select("user_id, rol, profiles(full_name)")
        .eq("project_id", projectId);
      const lista = (data ?? [])
        .map((row) => {
          const p = row.profiles as unknown as { full_name: string } | null;
          if (!p) return null;
          return { user_id: row.user_id as string, full_name: p.full_name, departamento: row.rol as string };
        })
        .filter((m): m is MiembroProyecto => m !== null);
      setMiembrosProyecto(lista);
    })();
  }, []);

  function cancelarForm() {
    setTitulo("");
    setTexto("");
    setParaDepartamentos([]);
    setDestCargo("");
    setIsPrivate(false);
    setPrivateRecipientId("");
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: t("noProject") });
      return;
    }
    if (!isPrivate && paraDepartamentos.length === 0) {
      setMsg({ type: "err", text: t("selectDept") });
      return;
    }
    if (isPrivate && !privateRecipientId) {
      setMsg({ type: "err", text: t("selectRecipientErr") });
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

    const destinatario = miembrosProyecto.find((m) => m.user_id === privateRecipientId);

    const { data: nueva, error } = await supabase
      .from("consultas")
      .insert({
        project_id: projectId,
        autor_id: user.id,
        autor_nombre: fullName,
        de_departamento: deDepartamento,
        para_departamentos: paraDepartamentos,
        para_cargo: paraDepartamentos.length === 1 ? destCargo.trim() || null : null,
        titulo,
        texto,
        is_private: isPrivate,
        private_recipient_id: isPrivate ? privateRecipientId : null,
        private_recipient_nombre: isPrivate ? destinatario?.full_name ?? null : null,
      })
      .select("id")
      .single();

    setSending(false);

    if (error || !nueva) {
      setMsg({ type: "err", text: error?.message ?? t("noProject") });
      return;
    }

    setTitulo("");
    setTexto("");
    setParaDepartamentos([]);
    setDestCargo("");
    setIsPrivate(false);
    setPrivateRecipientId("");
    setShowForm(false);
    await load();

    // Aviso por mail a quien corresponda — no bloquea el flujo si falla.
    fetch("/api/consultas/notificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consulta_id: nueva.id }),
    }).catch(() => {});
  }

  function toggleParaDepartamento(d: string) {
    setParaDepartamentos((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setDestCargo("");
  }

  async function handleResponder(c: Consulta) {
    const texto = replyDraft.trim();
    if (!texto) return;

    const supabase = createClient();
    const respuestas = [
      ...c.respuestas,
      { departamento: deDepartamento, autor_nombre: fullName, texto, created_at: new Date().toISOString() },
    ];
    await supabase.from("consultas").update({ respuestas }).eq("id", c.id);

    setReplyDraft("");
    await load();
  }

  async function handleResolve(id: string) {
    const supabase = createClient();
    await supabase
      .from("consultas")
      .update({
        estado: "resuelta",
        respuesta: replyDraft.trim() || null,
        respuesta_autor: fullName,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    setReplyDraft("");
    await load();
  }

  function abrirDetalle(c: Consulta) {
    setExpandedId(c.id);
    setReplyDraft("");
  }

  const filtered = consultas.filter((c) => {
    if (consFilter === "pend") return c.estado === "pendiente";
    if (consFilter === "res") return c.estado === "resuelta";
    return true;
  });

  const expandida = expandedId ? consultas.find((c) => c.id === expandedId) : null;

  if (expandida) {
    const esAutor = expandida.de_departamento === deDepartamento;
    const esDestinatarioPrivado = expandida.is_private && expandida.private_recipient_id === userId;
    const puedeResponder = expandida.is_private
      ? esDestinatarioPrivado || expandida.autor_id === userId
      : expandida.para_departamentos.includes(deDepartamento);

    return (
      <div className="comn-detail">
        <button type="button" className="cp-btn" onClick={() => setExpandedId(null)}>
          <Icon name="arrow-left" size={13} /> {t("back")}
        </button>

        <div className="comn-card comn-detail-card" style={{ "--com-acc": accentVar(expandida.de_departamento) } as React.CSSProperties}>
          <div className="comn-hexcorner"></div>
          <div className="comn-hexfade"></div>
          <div className="comn-inner">
            <div className="comn-title comn-title-lg">{expandida.titulo}</div>
            {expandida.is_private ? (
              <div className="cq-lock">
                <Icon name="key" size={12} /> {t("privatePill")} · {expandida.autor_nombre} → @{expandida.private_recipient_nombre}
              </div>
            ) : (
              <div className="cq-flow">
                <span className="hex" style={{ width: "10px", height: "8px", background: "var(--com-acc)", flexShrink: 0 }}></span>
                <b>{expandida.de_departamento}</b> → {expandida.para_departamentos.join(", ")}
                {expandida.para_cargo ? ` (${expandida.para_cargo})` : ""}
              </div>
            )}
            <div className="comn-meta">{expandida.autor_nombre} · {formatFechaHora(expandida.created_at)}</div>
            <p className="comn-text comn-text-full">{expandida.texto}</p>
          </div>

          {expandida.respuestas.length > 0 && (
            <div className="cq-thread">
              {expandida.respuestas.map((r, i) => (
                <div className={`cq-bubble ${r.departamento === deDepartamento ? "cq-bubble-me" : ""}`} key={i}>
                  <div className="cq-bubble-head"><b>{r.departamento}</b> · {r.autor_nombre} · {timeAgo(r.created_at, tHp)}</div>
                  {r.texto}
                </div>
              ))}
            </div>
          )}

          {expandida.estado === "resuelta" && expandida.respuesta && (
            <div className="cq-bubble cq-bubble-resuelta">
              <div className="cq-bubble-head">{t("resolvedBy", { name: expandida.respuesta_autor ?? "" })}</div>
              {expandida.respuesta}
            </div>
          )}

          {expandida.estado === "pendiente" && (puedeResponder || esAutor) && (
            <div className="cq-reply-row">
              <input
                type="text"
                className="cq-reply-input"
                placeholder={t("msgPlaceholder")}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
              />
              <button type="button" className="cp-btn cp-btn-acc" onClick={() => handleResponder(expandida)}>
                {t("chatBtn")}
              </button>
              {esAutor && (
                <button type="button" className="cp-btn cp-btn-acc-fill" onClick={() => handleResolve(expandida.id)}>
                  {t("resolveBtn")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cp-seg">
        <button type="button" className={`cp-seg-cell ${consFilter === "todas" ? "cp-seg-on" : ""}`} onClick={() => setConsFilter("todas")}>
          {t("all")}
        </button>
        <button type="button" className={`cp-seg-cell ${consFilter === "pend" ? "cp-seg-on" : ""}`} onClick={() => setConsFilter("pend")}>
          {t("pending")}
        </button>
        <button type="button" className={`cp-seg-cell ${consFilter === "res" ? "cp-seg-on" : ""}`} onClick={() => setConsFilter("res")}>
          {t("resolved")}
        </button>
      </div>

      {!showForm && (
        <div className="cons-new" style={{ paddingTop: "16px" }}>
          <button type="button" className="cp-btn cp-btn-acc" onClick={() => setShowForm(true)}>
            {t("newConsulta")}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="comn-pub-card">
          <div className="comn-hexcorner"></div>
          <div className="comn-hexfade"></div>
          <div className="comn-inner">
            <div className="comn-meta" style={{ marginBottom: "16px" }}>
              <span className="hex" style={{ width: "10px", height: "8px", background: "var(--acc)", flexShrink: 0 }}></span>
              <b>{deDepartamento}</b>
              {cargo && <> · {cargo}</>}
              {" "}· {fullName} · {formatFechaHora(new Date().toISOString())}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text)", marginBottom: "16px" }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              {t("privateCheck")}
            </label>

            {isPrivate ? (
              <label className="afield" style={{ marginBottom: "16px" }}>
                <span>{t("recipientLabel")}</span>
                <CpSelect
                  value={privateRecipientId}
                  placeholder={t("selectRecipient")}
                  options={miembrosProyecto.map((m) => ({ value: m.user_id, label: `@${m.full_name} (${m.departamento})` }))}
                  onChange={setPrivateRecipientId}
                />
              </label>
            ) : (
              <>
                <p className="cq-chip-label">{t("toLabel")}</p>
                <div className="cq-chip-row">
                  {DEPARTAMENTOS.filter((d) => d !== deDepartamento).map((d) => (
                    <button
                      type="button"
                      key={d}
                      className={`cq-chip ${paraDepartamentos.includes(d) ? "cq-chip-on" : ""}`}
                      style={{ "--c-acc": accentVar(d) } as React.CSSProperties}
                      onClick={() => toggleParaDepartamento(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {paraDepartamentos.length === 1 && (JERARQUIA_POR_DEPARTAMENTO[paraDepartamentos[0]]?.length ?? 0) > 0 && (
                  <>
                    <p className="cq-chip-label">{t("roleLabel")}</p>
                    <div className="cq-chip-row">
                      {JERARQUIA_POR_DEPARTAMENTO[paraDepartamentos[0]].map((c) => (
                        <button
                          type="button"
                          key={c}
                          className={`cq-chip ${destCargo === c ? "cq-chip-on" : ""}`}
                          style={{ "--c-acc": accentVar(paraDepartamentos[0]) } as React.CSSProperties}
                          onClick={() => setDestCargo((prev) => (prev === c ? "" : c))}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <input
              type="text"
              required
              className="comn-pub-title"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
            <textarea
              required
              className="comn-pub-msg"
              style={{ minHeight: "30vh" }}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t("messagePlaceholder")}
            />
          </div>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <div className="comn-pub-actions">
            <button type="submit" className="cp-btn cp-btn-acc-fill" disabled={sending}>
              {sending ? t("sending") : t("send")}
            </button>
            <button type="button" className="cp-btn" onClick={cancelarForm} disabled={sending}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="comn-grid">
        {loading && <p className="comn-text">{t("loading")}</p>}
        {!loading && filtered.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>{t("emptyTitle")}</h4>
            <p>{t("emptyDesc")}</p>
          </div>
        )}
        {filtered.map((c) => (
          <div
            className="comn-card"
            key={c.id}
            onClick={() => abrirDetalle(c)}
            style={{ "--com-acc": accentVar(c.de_departamento), cursor: "pointer" } as React.CSSProperties}
          >
            <div className="comn-hexcorner"></div>
            <div className="comn-hexfade"></div>
            <div className="comn-inner">
              <div className="comn-title">{c.titulo}</div>
              {c.is_private ? (
                <div className="cq-lock">
                  <Icon name="key" size={11} /> {t("privatePill")} · {c.autor_nombre} → @{c.private_recipient_nombre}
                </div>
              ) : (
                <div className="cq-flow">
                  <span className="hex" style={{ width: "9px", height: "7px", background: "var(--com-acc)", flexShrink: 0 }}></span>
                  <b>{c.de_departamento}</b> → {c.para_departamentos.join(", ")}
                  {c.para_cargo ? ` (${c.para_cargo})` : ""}
                </div>
              )}
              <div className="comn-meta" style={{ marginTop: "3px" }}>{c.autor_nombre} · {timeAgo(c.created_at, tHp)}</div>
              <div className="comn-text">{c.texto}</div>
            </div>
            <div className="cq-foot">
              {c.estado === "resuelta" ? (
                <span className="cq-pill cq-pill-res">{t("resolvedPill")}</span>
              ) : (
                <span className="cq-pill cq-pill-pend">{t("pendingPill")}</span>
              )}
              <span className="cq-replies">
                {c.respuestas.length === 0 ? t("noReplies") : t("repliesCount", { n: c.respuestas.length })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
