"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ACCENTS } from "../constants";
import { safeKey } from "../lib/storageKey";
import Icon from "../components/Icon";

const BUCKET = "documentos";
const ACEPTA_ADJUNTOS = ".pdf,.jpg,.jpeg,.png";
const MIME_ACEPTADOS = ["application/pdf", "image/jpeg", "image/png"];

type Comunicado = {
  id: string;
  autor_id: string;
  autor_nombre: string;
  autor_cargo: string | null;
  de_departamento: string;
  titulo: string;
  texto: string;
  created_at: string;
};

type Adjunto = {
  id: string;
  comunicado_id: string;
  nombre: string;
  path: string;
  mime: string | null;
  size: number | null;
};

type Acuse = {
  comunicado_id: string;
  user_id: string;
  department_id: string;
  opened_at: string | null;
  acked_at: string | null;
};

type MiembroDept = { user_id: string; departamento: string; full_name: string };

function accentVar(dept: string) {
  return `var(--${ACCENTS[dept] ?? "lime"})`;
}

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} · ${hora}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ComunicadosPanel({
  deDepartamento,
  cargo,
  fullName,
}: {
  deDepartamento: string;
  cargo?: string | null;
  fullName: string;
}) {
  const t = useTranslations("comunicados");
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [miembros, setMiembros] = useState<MiembroDept[]>([]);
  const [acuses, setAcuses] = useState<Record<string, Acuse[]>>({});
  const [adjuntos, setAdjuntos] = useState<Record<string, Adjunto[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAcuses = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { data } = await supabase.from("comunicado_acuse").select("*").in("comunicado_id", ids);
    const grouped: Record<string, Acuse[]> = {};
    for (const id of ids) grouped[id] = [];
    for (const row of data ?? []) {
      grouped[row.comunicado_id] = grouped[row.comunicado_id] ?? [];
      grouped[row.comunicado_id].push(row as Acuse);
    }
    setAcuses((prev) => ({ ...prev, ...grouped }));
  }, []);

  const loadAdjuntos = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { data } = await supabase.from("comunicado_adjuntos").select("*").in("comunicado_id", ids);
    const grouped: Record<string, Adjunto[]> = {};
    for (const id of ids) grouped[id] = [];
    for (const row of data ?? []) {
      grouped[row.comunicado_id] = grouped[row.comunicado_id] ?? [];
      grouped[row.comunicado_id].push(row as Adjunto);
    }
    setAdjuntos((prev) => ({ ...prev, ...grouped }));
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
      .select("id, autor_id, autor_nombre, autor_cargo, de_departamento, titulo, texto, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setComunicados(data ?? []);
    setLoading(false);
    const ids = (data ?? []).map((c) => c.id);
    await Promise.all([loadAcuses(ids), loadAdjuntos(ids)]);

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
  }, [loadAcuses, loadAdjuntos]);

  useEffect(() => {
    load();
  }, [load]);

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

    const recibido: string[] = [];
    const pendiente: string[] = [];
    for (const [depto, userIds] of Object.entries(porDepto)) {
      const completo = userIds.length > 0 && userIds.every((uid) => ackedPairs.has(`${uid}__${depto}`));
      (completo ? recibido : pendiente).push(depto);
    }

    return { recibido, pendiente };
  }

  function miAcuse(c: Comunicado) {
    return (acuses[c.id] ?? []).find((a) => a.user_id === userId && a.department_id === deDepartamento);
  }

  async function handleExpand(c: Comunicado) {
    setExpandedId(c.id);
    if (!userId || miAcuse(c)) return;

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

  function agregarArchivos(files: FileList | null) {
    if (!files) return;
    const validos = Array.from(files).filter((f) => MIME_ACEPTADOS.includes(f.type));
    setArchivos((prev) => [...prev, ...validos]);
  }

  function quitarArchivo(idx: number) {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
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

    const { data: nuevo, error } = await supabase
      .from("comunicados")
      .insert({
        project_id: projectId,
        autor_id: user.id,
        autor_nombre: fullName,
        autor_cargo: cargo ?? null,
        de_departamento: deDepartamento,
        titulo,
        texto,
      })
      .select("id")
      .single();

    if (error || !nuevo) {
      setSending(false);
      setMsg({ type: "err", text: error?.message ?? t("noProject") });
      return;
    }

    for (const file of archivos) {
      const path = `${projectId}/${safeKey(deDepartamento)}/_comunicados/${nuevo.id}/${Date.now()}-${safeKey(file.name)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) continue;
      await supabase.from("comunicado_adjuntos").insert({
        comunicado_id: nuevo.id,
        nombre: file.name,
        path,
        mime: file.type,
        size: file.size,
      });
    }

    setSending(false);
    setTitulo("");
    setTexto("");
    setArchivos([]);
    setShowForm(false);
    await load();
  }

  async function descargarAdjunto(a: Adjunto) {
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 120, { download: a.nombre });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function verAdjunto(a: Adjunto) {
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const expandido = expandedId ? comunicados.find((c) => c.id === expandedId) : null;

  if (expandido) {
    const { recibido, pendiente } = deptStatus(expandido.id);
    const yaAcuso = !!miAcuse(expandido)?.acked_at;
    const misAdjuntos = adjuntos[expandido.id] ?? [];
    return (
      <div className="comn-detail">
        <button type="button" className="cp-btn" onClick={() => setExpandedId(null)}>
          <Icon name="arrow-left" size={13} /> {t("back")}
        </button>

        <div className="comn-card comn-detail-card" style={{ "--com-acc": accentVar(expandido.de_departamento) } as React.CSSProperties}>
          <div className="comn-hexcorner"></div>
          <div className="comn-hexfade"></div>
          <div className="comn-inner">
            <div className="comn-title comn-title-lg">{expandido.titulo}</div>
            <div className="comn-meta">
              <span className="hex" style={{ width: "10px", height: "8px", background: "var(--com-acc)", flexShrink: 0 }}></span>
              <b>{expandido.de_departamento}</b>
              {expandido.autor_cargo && <> · {expandido.autor_cargo}</>}
              {" "}· {expandido.autor_nombre} · {formatFechaHora(expandido.created_at)}
            </div>
            <p className="comn-text comn-text-full">{expandido.texto}</p>
          </div>

          <div className="comn-foot">
            <div className="comn-foot-row">
              <span className="comn-foot-label">{t("recibido")}</span>
              {recibido.length === 0 && <span className="comn-empty">{t("nadie")}</span>}
              {recibido.map((d) => (
                <span key={d} className="hex comn-dept-hex" title={d} style={{ background: accentVar(d) }}></span>
              ))}
            </div>
            <div className="comn-foot-row">
              <span className="comn-foot-label">{t("pendiente")}</span>
              {pendiente.length === 0 && <span className="comn-empty">{t("nadie")}</span>}
              {pendiente.map((d) => (
                <span key={d} className="hex comn-dept-hex comn-dept-hex-latido" title={d} style={{ background: accentVar(d) }}></span>
              ))}
            </div>
          </div>

          {misAdjuntos.length > 0 && (
            <div className="comn-attach-block">
              {misAdjuntos.map((a) => {
                const esImagen = (a.mime ?? "").startsWith("image/");
                return (
                  <div className="comn-attach-item" key={a.id}>
                    {esImagen ? (
                      <div className="comn-attach-img"><Icon name="image" size={20} /><span>{a.nombre}</span></div>
                    ) : (
                      <div className="comn-attach-pdf">
                        <Icon name="file-text" size={18} />
                        <div>
                          <div className="comn-attach-name">{a.nombre}</div>
                          <div className="comn-attach-size">{formatSize(a.size)}</div>
                        </div>
                      </div>
                    )}
                    <div className="comn-attach-actions">
                      <button type="button" className="cp-btn cp-btn-acc" onClick={() => verAdjunto(a)}>
                        <Icon name="eye" size={12} /> {esImagen ? t("ver") : t("vistaPrevia")}
                      </button>
                      <button type="button" className="cp-btn cp-btn-acc" onClick={() => descargarAdjunto(a)}>
                        <Icon name="download" size={12} /> {t("descargar")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="comn-ack-row">
            <button type="button" className="cp-btn cp-btn-acc" disabled={yaAcuso} onClick={() => handleAcuse(expandido)}>
              {yaAcuso ? t("alreadyAcked") : t("ackButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="comn-grid">
        {loading && <p className="comn-text">{t("loading")}</p>}
        {!loading && comunicados.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>{t("emptyTitle")}</h4>
            <p>{t("emptyDesc")}</p>
          </div>
        )}
        {comunicados.map((c) => {
          const { recibido, pendiente } = deptStatus(c.id);
          const misAdjuntos = adjuntos[c.id] ?? [];
          return (
            <div
              className="comn-card"
              key={c.id}
              onClick={() => handleExpand(c)}
              style={{ "--com-acc": accentVar(c.de_departamento), cursor: "pointer" } as React.CSSProperties}
            >
              <div className="comn-hexcorner"></div>
              <div className="comn-hexfade"></div>
              <div className="comn-inner">
                <div className="comn-title">{c.titulo}</div>
                <div className="comn-meta">
                  <span className="hex" style={{ width: "10px", height: "8px", background: "var(--com-acc)", flexShrink: 0 }}></span>
                  <b>{c.de_departamento}</b>
                  {c.autor_cargo && <> · {c.autor_cargo}</>}
                  {" "}· {c.autor_nombre} · {formatFechaHora(c.created_at)}
                </div>
                <div className="comn-text">{c.texto}</div>
                {misAdjuntos.length > 0 && (
                  <div className="comn-adjunto">
                    <Icon name="paperclip" size={11} /> {t("adjuntosCount", { n: misAdjuntos.length })}
                  </div>
                )}
              </div>
              <div className="comn-foot">
                <div className="comn-foot-row">
                  <span className="comn-foot-label">{t("recibido")}</span>
                  {recibido.length === 0 && <span className="comn-empty">{t("nadie")}</span>}
                  {recibido.map((d) => (
                    <span key={d} className="hex comn-dept-hex" title={d} style={{ background: accentVar(d) }}></span>
                  ))}
                </div>
                <div className="comn-foot-row">
                  <span className="comn-foot-label">{t("pendiente")}</span>
                  {pendiente.length === 0 && <span className="comn-empty">{t("nadie")}</span>}
                  {pendiente.map((d) => (
                    <span key={d} className="hex comn-dept-hex comn-dept-hex-latido" title={d} style={{ background: accentVar(d) }}></span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button type="button" className="cp-btn cp-btn-acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("newComunicado")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="comn-pub-card">
          <div className="comn-hexcorner"></div>
          <div className="comn-hexfade"></div>
          <div className="comn-inner">
            <div className="comn-meta">
              <span className="hex" style={{ width: "10px", height: "8px", background: "var(--acc)", flexShrink: 0 }}></span>
              <b>{deDepartamento}</b>
              {cargo && <> · {cargo}</>}
              {" "}· {fullName} · {formatFechaHora(new Date().toISOString())}
            </div>
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
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t("messagePlaceholder")}
            />
          </div>

          <label className="comn-dropzone">
            <span className="hex comn-dropzone-hex">+</span>
            <div className="comn-dropzone-text">
              <b>{t("adjuntarLabel")}</b>
              <span>{t("adjuntarHint")}</span>
            </div>
            <input
              type="file"
              accept={ACEPTA_ADJUNTOS}
              multiple
              style={{ display: "none" }}
              onChange={(e) => agregarArchivos(e.target.files)}
            />
          </label>

          {archivos.length > 0 && (
            <div className="comn-chip-row">
              {archivos.map((f, i) => (
                <div className="comn-file-chip" key={`${f.name}-${i}`}>
                  <Icon name={f.type.startsWith("image/") ? "image" : "file-text"} size={16} />
                  <div style={{ minWidth: 0 }}>
                    <div className="comn-file-name">{f.name}</div>
                    <div className="comn-file-size">{formatSize(f.size)}</div>
                  </div>
                  <span className="comn-file-close" onClick={() => quitarArchivo(i)}>
                    <Icon name="x" size={13} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <div className="comn-pub-actions">
            <button type="submit" className="cp-btn cp-btn-acc-fill" disabled={sending}>
              {sending ? t("publishing") : t("publish")}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
