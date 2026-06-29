"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const TIPO_LABEL_KEY: Record<Tipo, string> = {
  info: "tipoInfo",
  sugerencia: "tipoSugerencia",
  consulta: "tipoConsulta",
};

const TIPO_CLASS: Record<Tipo, string> = {
  info: "tag-info",
  sugerencia: "tag-sug",
  consulta: "tag-con",
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

export default function ComunicadosPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const t = useTranslations("comunicados");
  const tHp = useTranslations("hp");
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
    for (const id of ids) grouped[id] = []; // limpia solo los ids que se están refrescando
    for (const row of data ?? []) {
      grouped[row.comunicado_id] = grouped[row.comunicado_id] ?? [];
      grouped[row.comunicado_id].push(row as Acuse);
    }
    // Fusiona con lo ya cargado: no pisa el estado de comunicados no incluidos en `ids`.
    setAcuses((prev) => ({ ...prev, ...grouped }));
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

  // Un departamento se considera "acusado" cuando TODOS sus integrantes
  // confirmaron el acuse EN ese departamento (deDepartamento). Esto permite
  // que un mismo usuario con varios cargos (Punto 8) o en "Modo de prueba"
  // acuse de forma independiente por cada departamento en el que actúa.
  function deptStatus(comunicadoId: string) {
    const porDepto: Record<string, string[]> = {};
    for (const m of miembros) {
      porDepto[m.departamento] = porDepto[m.departamento] ?? [];
      porDepto[m.departamento].push(m.user_id);
    }
    const ackedPairs = new Set(
      (acuses[comunicadoId] ?? [])
        .filter((a) => a.acked_at)
        .map((a) => `${a.user_id}__${a.department_id}`)
    );

    const visualizado: string[] = [];
    const pendiente: string[] = [];
    for (const [depto, userIds] of Object.entries(porDepto)) {
      const completo = userIds.length > 0 && userIds.every((uid) => ackedPairs.has(`${uid}__${depto}`));
      (completo ? visualizado : pendiente).push(depto);
    }

    return { visualizado, pendiente };
  }

  function miAcuse(c: Comunicado) {
    return (acuses[c.id] ?? []).find((a) => a.user_id === userId && a.department_id === deDepartamento);
  }

  async function handleExpand(c: Comunicado) {
    const opening = expandedId !== c.id;
    setExpandedId(opening ? c.id : null);
    if (!opening || !userId) return;

    if (miAcuse(c)) return;

    const supabase = createClient();
    await supabase.from("comunicado_acuse").insert({
      comunicado_id: c.id,
      user_id: userId,
      department_id: deDepartamento,
      opened_at: new Date().toISOString(),
    });
    await loadAcuses([c.id]);
  }

  async function handleAcuse(c: Comunicado) {
    if (!userId) return;
    const supabase = createClient();
    const existing = miAcuse(c);

    if (existing) {
      await supabase
        .from("comunicado_acuse")
        .update({ acked_at: new Date().toISOString() })
        .eq("comunicado_id", c.id)
        .eq("user_id", userId)
        .eq("department_id", deDepartamento);
    } else {
      await supabase.from("comunicado_acuse").insert({
        comunicado_id: c.id,
        user_id: userId,
        department_id: deDepartamento,
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
      setMsg({ type: "err", text: t("noProject") });
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
        {loading && <p className="com-text">{t("loading")}</p>}
        {!loading && comunicados.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>{t("emptyTitle")}</h4>
            <p>{t("emptyDesc")}</p>
          </div>
        )}
        {comunicados.map((c) => {
          const expanded = expandedId === c.id;
          const { visualizado, pendiente } = deptStatus(c.id);
          const yaAcuso = !!miAcuse(c)?.acked_at;
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
                    {c.de_departamento} · {c.autor_nombre} · {timeAgo(c.created_at, tHp)}
                  </span>
                </div>
                <span className={`pill ${TIPO_CLASS[c.tipo]}`}>{t(TIPO_LABEL_KEY[c.tipo])}</span>
              </div>
              <div
                className="com-text"
                style={
                  !expanded
                    ? {
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }
                    : { whiteSpace: "pre-wrap" }
                }
              >
                {c.texto}
              </div>
              {!expanded && c.texto.length > 180 && (
                <span style={{ fontSize: "11px", color: "var(--cyan)" }}>{t("seeMore")}</span>
              )}

              {expanded && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <span className="afield" style={{ display: "block", marginBottom: "4px" }}>{t("viewedBy")}</span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {visualizado.length === 0 && <span className="com-text">{t("noneViewedYet")}</span>}
                      {visualizado.map((d) => (
                        <span
                          key={d}
                          className="hex"
                          title={d}
                          style={{ background: `var(--${ACCENTS[d] ?? "lime"})`, width: "18px", height: "15px" }}
                        ></span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="afield" style={{ display: "block", marginBottom: "4px" }}>{t("pendingView")}</span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {pendiente.length === 0 && <span className="com-text">{t("allAcked")}</span>}
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
                    {yaAcuso ? t("alreadyAcked") : t("ackButton")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button className="btn acc" style={{ "--acc": "var(--cyan)" } as React.CSSProperties} onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("newComunicado")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>{t("typeLabel")}</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              <option value="info">{t("tipoInfo")}</option>
              <option value="sugerencia">{t("tipoSugerencia")}</option>
              <option value="consulta">{t("tipoConsulta")}</option>
            </select>
          </label>
          <label className="afield">
            <span>{t("titleLabel")}</span>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </label>
          <label className="afield">
            <span>{t("messageLabel")}</span>
            <textarea
              required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder={t("messagePlaceholder")}
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? t("publishing") : t("publish")}
          </button>
        </form>
      )}
    </>
  );
}
