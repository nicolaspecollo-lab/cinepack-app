"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type GTEstado = "procesando" | "listo" | "error";

type GuionTecnico = {
  id: string;
  nombre: string;
  archivo_path: string;
  estado: GTEstado;
  error_msg: string | null;
  created_at: string;
};

type PlanoEstado = "borrador" | "confirmado";

type Plano = {
  id: string;
  guion_tecnico_id: string | null;
  escena: string;
  plano: string;
  tipo: string | null;
  eje: string | null;
  mov_camara: string | null;
  lente: string | null;
  descripcion: string;
  personajes: string[];
  notas: string | null;
  duracion_seg: number | null;
  pagina_pdf: number | null;
  orden: number;
  estado: PlanoEstado;
  autor_id: string;
};

type ViewTab = "revision" | "guion" | "manual";

const TIPO_OPCIONES = ["PG", "PA", "PE", "PM", "PMC", "PP", "PPP", "DET", "PC", "INSERT"];
const MOV_OPCIONES = [
  "Fijo", "Panorámica H", "Panorámica V",
  "Travelling in", "Travelling out", "Travelling lateral",
  "Steadicam", "Handheld", "Grúa", "Drone", "Zoom in", "Zoom out",
];

export default function GuionTecnicoPanel({ fullName, canEdit = true }: { fullName?: string; canEdit?: boolean }) {
  const t = useTranslations("guiontec");
  const [guiones, setGuiones] = useState<GuionTecnico[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [edits, setEdits] = useState<Record<string, Plano>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tab, setTab] = useState<ViewTab>("revision");
  const [userId, setUserId] = useState<string | null>(null);

  // Manual entry form
  const [showForm, setShowForm] = useState(false);
  const [mEscena, setMEscena] = useState("");
  const [mPlano, setMPlano] = useState("");
  const [mTipo, setMTipo] = useState("");
  const [mEje, setMEje] = useState("");
  const [mMov, setMMov] = useState("");
  const [mLente, setMLente] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mPersonajes, setMPersonajes] = useState("");
  const [mNotas, setMNotas] = useState("");
  const [mDuracion, setMDuracion] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setLoading(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const [{ data: gts }, { data: ps }] = await Promise.all([
      supabase.from("guiones_tecnicos").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("planos").select("*").eq("project_id", projectId).order("orden", { ascending: true }),
    ]);

    setGuiones(gts ?? []);
    setPlanos(ps ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const p of planos) {
        if (p.estado === "borrador" && !next[p.id]) {
          next[p.id] = JSON.parse(JSON.stringify(p));
        }
      }
      return next;
    });
  }, [planos]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setMsg({ type: "err", text: t("noProject") }); return; }

    setUploading(true);
    setMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const safeName = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${projectId}/tecnico/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("guiones").upload(path, file);
    if (uploadError) {
      setUploading(false);
      setMsg({ type: "err", text: uploadError.message });
      return;
    }

    const { data: gt, error: insertError } = await supabase
      .from("guiones_tecnicos")
      .insert({
        project_id: projectId,
        nombre: file.name,
        archivo_path: path,
        estado: "procesando",
        autor_id: user.id,
        autor_nombre: fullName ?? null,
      })
      .select()
      .single();

    if (insertError || !gt) {
      setUploading(false);
      setMsg({ type: "err", text: insertError?.message ?? t("couldNotRegister") });
      return;
    }

    await load();

    const res = await fetch("/api/guion-tecnico/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guionTecnicoId: gt.id }),
    });
    const result = await res.json();
    setUploading(false);

    if (!res.ok) {
      setMsg({ type: "err", text: result.error ?? t("aiError") });
    } else {
      setMsg({ type: "ok", text: t("aiDetected", { count: result.count }) });
      setFile(null);
      setTab("revision");
    }
    await load();
  }

  function updateField<K extends keyof Plano>(id: string, field: K, value: Plano[K]) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function persistPlano(id: string, estado: PlanoEstado) {
    const p = edits[id];
    if (!p) return;
    const supabase = createClient();
    const { error } = await supabase.from("planos").update({
      escena: p.escena, plano: p.plano, tipo: p.tipo, eje: p.eje,
      mov_camara: p.mov_camara, lente: p.lente, descripcion: p.descripcion,
      personajes: p.personajes, notas: p.notas, duracion_seg: p.duracion_seg, estado,
    }).eq("id", id);
    if (error) { setMsg({ type: "err", text: error.message }); return; }
    await load();
  }

  async function deletePlano(id: string) {
    const supabase = createClient();
    await supabase.from("planos").delete().eq("id", id);
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
    await load();
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setMsg({ type: "err", text: t("noProject") }); return; }
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const { error } = await supabase.from("planos").insert({
      project_id: projectId,
      guion_tecnico_id: null,
      escena: mEscena, plano: mPlano,
      tipo: mTipo || null, eje: mEje || null,
      mov_camara: mMov || null, lente: mLente || null,
      descripcion: mDesc,
      personajes: mPersonajes.split(",").map((s) => s.trim()).filter(Boolean),
      notas: mNotas || null,
      duracion_seg: mDuracion ? Number(mDuracion) : null,
      orden: planos.length, estado: "confirmado", autor_id: user.id,
    });
    setSending(false);
    if (error) { setMsg({ type: "err", text: error.message }); return; }
    setMEscena(""); setMPlano(""); setMTipo(""); setMEje(""); setMMov(""); setMLente("");
    setMDesc(""); setMPersonajes(""); setMNotas(""); setMDuracion("");
    setShowForm(false);
    await load();
  }

  const borradores = planos.filter((p) => p.estado === "borrador");
  const confirmados = planos.filter((p) => p.estado === "confirmado").sort((a, b) => {
    if (a.escena !== b.escena) return a.escena.localeCompare(b.escena, undefined, { numeric: true });
    return a.plano.localeCompare(b.plano, undefined, { numeric: true });
  });
  const procesando = guiones.some((g) => g.estado === "procesando");

  return (
    <>
      {!canEdit && (
        <div className="gen-readonly-banner">
          <span className="hex"></span>
          {t("readonlyBanner", { d1: "Dirección", d2: "Guion" })}
        </div>
      )}
      {/* Upload */}
      <form onSubmit={handleUpload} className="gup" style={!canEdit ? { pointerEvents: "none", opacity: 0.45 } : undefined}>
        <div className="gup-row">
          <label className="gfile">
            {file ? file.name : t("choosePdf")}
            <input type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button type="submit" className="abtn" disabled={!file || uploading} style={{ width: "auto" }}>
            {uploading ? t("processing") : t("upload")}
          </button>
        </div>
        {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}
      </form>

      {/* Lista de guiones subidos */}
      {guiones.length > 0 && (
        <div className="glist">
          {guiones.map((g) => (
            <div className="gitem" key={g.id}>
              <span className="name">{g.nombre}</span>
              {g.estado === "procesando" && <span className="pill p-warn">{t("statusProcessing")}</span>}
              {g.estado === "listo" && <span className="pill p-ok">{t("statusReady")}</span>}
              {g.estado === "error" && <span className="pill p-bad" title={g.error_msg ?? ""}>{t("statusError")}</span>}
              <span className="meta">{new Date(g.created_at).toLocaleString("es-AR")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="gtabs">
        <button className={`gtab ${tab === "revision" ? "active" : ""}`} onClick={() => setTab("revision")}>
          {t("tabRevision")} {borradores.length > 0 ? `(${borradores.length})` : ""}
        </button>
        <button className={`gtab ${tab === "guion" ? "active" : ""}`} onClick={() => setTab("guion")}>
          {t("tabBreakdown")} {confirmados.length > 0 ? `(${confirmados.length})` : ""}
        </button>
        <button className={`gtab ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}>
          {t("tabManual")}
        </button>
      </div>

      {/* Tab: Revisión */}
      {tab === "revision" && (
        <div className="gcards">
          {loading && <p style={{ fontSize: 12, color: "var(--muted)" }}>{t("loading")}</p>}
          {!loading && procesando && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {t("aiReading")}
            </p>
          )}
          {!loading && !procesando && borradores.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {t("noPendingShots")}
            </p>
          )}
          {borradores.map((p) => {
            const ed = edits[p.id] ?? p;
            return (
              <div className="gcard" key={p.id}>
                <div className="gcard-top">
                  <span className="num">{t("sceneShot", { esc: ed.escena, plano: ed.plano })}</span>
                  {ed.pagina_pdf && <span className="pag">{t("pdfPage", { n: ed.pagina_pdf })}</span>}
                </div>

                <div className="gfields">
                  <label className="afield">
                    <span>{t("scene")}</span>
                    <input type="text" value={ed.escena}
                      onChange={(ev) => updateField(p.id, "escena", ev.target.value)} />
                  </label>
                  <label className="afield">
                    <span>{t("shot")}</span>
                    <input type="text" value={ed.plano}
                      onChange={(ev) => updateField(p.id, "plano", ev.target.value)} />
                  </label>
                  <label className="afield">
                    <span>{t("type")}</span>
                    <select value={ed.tipo ?? ""} onChange={(ev) => updateField(p.id, "tipo", ev.target.value || null)}>
                      <option value="">—</option>
                      {TIPO_OPCIONES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                    </select>
                  </label>
                  <label className="afield">
                    <span>{t("camMove")}</span>
                    <select value={ed.mov_camara ?? ""} onChange={(ev) => updateField(p.id, "mov_camara", ev.target.value || null)}>
                      <option value="">—</option>
                      {MOV_OPCIONES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className="afield">
                    <span>{t("lens")}</span>
                    <input type="text" value={ed.lente ?? ""}
                      onChange={(ev) => updateField(p.id, "lente", ev.target.value || null)}
                      placeholder="35mm, 50mm…" />
                  </label>
                  <label className="afield">
                    <span>{t("axis")}</span>
                    <input type="text" value={ed.eje ?? ""}
                      onChange={(ev) => updateField(p.id, "eje", ev.target.value || null)}
                      placeholder="frontal, picado…" />
                  </label>
                </div>

                <label className="afield">
                  <span>{t("frameDesc")}</span>
                  <textarea rows={3} value={ed.descripcion}
                    onChange={(ev) => updateField(p.id, "descripcion", ev.target.value)} />
                </label>

                <div className="gfields">
                  <label className="afield">
                    <span>{t("characters")}</span>
                    <input type="text"
                      value={ed.personajes.join(", ")}
                      onChange={(ev) => updateField(p.id, "personajes", ev.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                      placeholder="ELENA, MARCOS" />
                  </label>
                  <label className="afield">
                    <span>{t("estDuration")}</span>
                    <input type="number" value={ed.duracion_seg ?? ""}
                      onChange={(ev) => updateField(p.id, "duracion_seg", ev.target.value ? Number(ev.target.value) : null)}
                      placeholder="ej: 8" />
                  </label>
                </div>

                <label className="afield">
                  <span>{t("techNotes")}</span>
                  <input type="text" value={ed.notas ?? ""}
                    onChange={(ev) => updateField(p.id, "notas", ev.target.value || null)}
                    placeholder="Iluminación, VFX, audio especial…" />
                </label>

                <div className="gcard-actions">
                  <button type="button" className="btn acc" onClick={() => persistPlano(p.id, "confirmado")}>
                    {t("confirmShot")}
                  </button>
                  <button type="button" className="btn" onClick={() => persistPlano(p.id, "borrador")}>
                    {t("saveChanges")}
                  </button>
                  <button type="button" className="btn" onClick={() => deletePlano(p.id)}>
                    {t("discard")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Desglose técnico confirmado */}
      {tab === "guion" && (
        <div className="gt-desglose">
          {confirmados.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)", padding: "20px 30px" }}>
              {t("noConfirmedShots")}
            </p>
          )}
          {confirmados.length > 0 && (
            <div className="twrap" style={{ padding: "16px 30px 36px" }}>
              <table className="t gt-tabla">
                <thead>
                  <tr>
                    <th>{t("colScene")}</th>
                    <th>{t("colShot")}</th>
                    <th>{t("colType")}</th>
                    <th>{t("colMove")}</th>
                    <th>{t("colLens")}</th>
                    <th>{t("colAxis")}</th>
                    <th>{t("colDesc")}</th>
                    <th>{t("colChars")}</th>
                    <th>{t("colDur")}</th>
                    <th>{t("colNotes")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {confirmados.map((p) => (
                    <tr key={p.id} className="gt-row">
                      <td className="mono"><b>{p.escena}</b></td>
                      <td className="mono">{p.plano}</td>
                      <td><span className="gt-tipo">{p.tipo || "—"}</span></td>
                      <td style={{ fontSize: 11 }}>{p.mov_camara || "—"}</td>
                      <td className="mono">{p.lente || "—"}</td>
                      <td style={{ fontSize: 11 }}>{p.eje || "—"}</td>
                      <td style={{ maxWidth: 260, fontSize: 12 }}>{p.descripcion}</td>
                      <td style={{ fontSize: 11 }}>{p.personajes.join(", ") || "—"}</td>
                      <td style={{ fontSize: 11 }}>{p.duracion_seg != null ? `${p.duracion_seg}s` : "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--muted)" }}>{p.notas || "—"}</td>
                      <td>
                        {p.autor_id === userId && (
                          <button className="btn" style={{ fontSize: 10, padding: "3px 8px" }}
                            onClick={() => deletePlano(p.id)}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Manual */}
      {tab === "manual" && (
        <div className="gcards">
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            {t("addManualHint")}
          </p>
          <button className="btn acc" style={{ alignSelf: "flex-start" }} onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("cancel") : t("addShot")}
          </button>
          {showForm && (
            <form onSubmit={handleManual} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
              <div className="gfields">
                <label className="afield"><span>{t("sceneReq")}</span>
                  <input required value={mEscena} onChange={(e) => setMEscena(e.target.value)} placeholder="1" />
                </label>
                <label className="afield"><span>{t("shotReq")}</span>
                  <input required value={mPlano} onChange={(e) => setMPlano(e.target.value)} placeholder="1A" />
                </label>
                <label className="afield"><span>{t("type")}</span>
                  <select value={mTipo} onChange={(e) => setMTipo(e.target.value)}>
                    <option value="">—</option>
                    {TIPO_OPCIONES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </label>
                <label className="afield"><span>{t("camMove")}</span>
                  <select value={mMov} onChange={(e) => setMMov(e.target.value)}>
                    <option value="">—</option>
                    {MOV_OPCIONES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="afield"><span>{t("lens")}</span>
                  <input value={mLente} onChange={(e) => setMLente(e.target.value)} placeholder="35mm" />
                </label>
                <label className="afield"><span>{t("axis")}</span>
                  <input value={mEje} onChange={(e) => setMEje(e.target.value)} placeholder="frontal, picado…" />
                </label>
              </div>
              <label className="afield"><span>{t("frameDescReq")}</span>
                <textarea required rows={2} value={mDesc} onChange={(e) => setMDesc(e.target.value)} />
              </label>
              <div className="gfields">
                <label className="afield"><span>{t("characters")}</span>
                  <input value={mPersonajes} onChange={(e) => setMPersonajes(e.target.value)} placeholder="ELENA, MARCOS" />
                </label>
                <label className="afield"><span>{t("duration")}</span>
                  <input type="number" value={mDuracion} onChange={(e) => setMDuracion(e.target.value)} placeholder="8" />
                </label>
              </div>
              <label className="afield"><span>{t("techNotes")}</span>
                <input value={mNotas} onChange={(e) => setMNotas(e.target.value)} placeholder="VFX, audio especial…" />
              </label>
              {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}
              <button type="submit" className="abtn" disabled={sending} style={{ alignSelf: "flex-start" }}>
                {sending ? t("saving") : t("addConfirmedShot")}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
