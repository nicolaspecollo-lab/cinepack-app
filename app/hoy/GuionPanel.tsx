"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type GuionEstado = "procesando" | "listo" | "error";

type Guion = {
  id: string;
  nombre: string;
  archivo_path: string;
  estado: GuionEstado;
  error_msg: string | null;
  created_at: string;
};

type DialogoLinea = {
  personaje: string;
  parentetico: string | null;
  texto: string;
};

// La secuencia REAL de la escena, en el orden en que aparece en el guion
// (acción → diálogo → acción → diálogo…). "descripcion"/"dialogo" siguen
// existiendo (se derivan de esto al parsear) porque otras pantallas
// (Escenas, Plan de rodaje) los leen así y no necesitan el orden exacto,
// pero acá — edición y vista de guion — la fuente de verdad es "elementos".
type ElementoAccion = { tipo: "accion"; texto: string };
type ElementoDialogo = { tipo: "dialogo"; personaje: string; parentetico: string | null; texto: string };
type ElementoGuion = ElementoAccion | ElementoDialogo;

type EscenaEstado = "borrador" | "confirmada";

type Escena = {
  id: string;
  guion_id: string;
  numero: number;
  int_ext: string | null;
  lugar: string | null;
  dia_noche: string | null;
  encabezado: string;
  descripcion: string | null;
  personajes: string[];
  dialogo: DialogoLinea[];
  elementos: ElementoGuion[];
  pagina_pdf: number | null;
  orden: number;
  estado: EscenaEstado;
};

// Compatibilidad: escenas parseadas ANTES de este cambio no tienen
// "elementos" (columna nueva, default '[]'). Se reconstruye una secuencia
// razonable (acción primero, diálogo después) para que se sigan viendo
// bien — no se puede recuperar el orden real perdido en el parseo viejo,
// pero al menos no rompe nada ni queda vacío.
function elementosDe(e: Pick<Escena, "elementos" | "descripcion" | "dialogo">): ElementoGuion[] {
  if (e.elementos && e.elementos.length > 0) return e.elementos;
  const out: ElementoGuion[] = [];
  if (e.descripcion) out.push({ tipo: "accion", texto: e.descripcion });
  for (const d of e.dialogo ?? []) out.push({ tipo: "dialogo", ...d });
  return out;
}

type ViewTab = "revision" | "guion";

export default function GuionPanel({ fullName, canEdit = true }: { fullName: string; canEdit?: boolean }) {
  const t = useTranslations("guion");
  const [guiones, setGuiones] = useState<Guion[]>([]);
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [edits, setEdits] = useState<Record<string, Escena>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tab, setTab] = useState<ViewTab>("revision");
  const [generandoPlan, setGenerandoPlan] = useState(false);
  const [msgPlan, setMsgPlan] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    const [{ data: guionesData }, { data: escenasData }] = await Promise.all([
      supabase
        .from("guiones")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("escenas")
        .select("*")
        .eq("project_id", projectId)
        .order("numero", { ascending: true }),
    ]);

    setGuiones(guionesData ?? []);
    setEscenas(escenasData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const e of escenas) {
        if (e.estado === "borrador" && !next[e.id]) {
          const copia: Escena = JSON.parse(JSON.stringify(e));
          copia.elementos = elementosDe(copia);
          next[e.id] = copia;
        }
      }
      return next;
    });
  }, [escenas]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: t("noProject") });
      return;
    }

    setUploading(true);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const safeName = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${projectId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("guiones").upload(path, file);
    if (uploadError) {
      setUploading(false);
      setMsg({ type: "err", text: uploadError.message });
      return;
    }

    const { data: guion, error: insertError } = await supabase
      .from("guiones")
      .insert({
        project_id: projectId,
        nombre: file.name,
        archivo_path: path,
        estado: "procesando",
        autor_id: user.id,
        autor_nombre: fullName,
      })
      .select()
      .single();

    if (insertError || !guion) {
      setUploading(false);
      setMsg({ type: "err", text: insertError?.message ?? t("couldNotRegister") });
      return;
    }

    await load();

    const res = await fetch("/api/guion/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guionId: guion.id }),
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

  function updateField<K extends keyof Escena>(id: string, field: K, value: Escena[K]) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function updatePersonajes(id: string, value: string) {
    const arr = value.split(",").map((s) => s.trim()).filter(Boolean);
    updateField(id, "personajes", arr);
  }

  function setElementos(id: string, next: ElementoGuion[]) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], elementos: next } }));
  }
  function updateElemento(id: string, idx: number, cambios: Partial<Omit<ElementoAccion, "tipo"> & Omit<ElementoDialogo, "tipo">>) {
    setEdits((prev) => {
      const els = [...prev[id].elementos];
      els[idx] = { ...els[idx], ...cambios } as ElementoGuion;
      return { ...prev, [id]: { ...prev[id], elementos: els } };
    });
  }
  function insertElemento(id: string, idx: number, tipo: "accion" | "dialogo") {
    setEdits((prev) => {
      const els = [...prev[id].elementos];
      const nuevo: ElementoGuion = tipo === "accion"
        ? { tipo: "accion", texto: "" }
        : { tipo: "dialogo", personaje: "", parentetico: null, texto: "" };
      els.splice(idx, 0, nuevo);
      return { ...prev, [id]: { ...prev[id], elementos: els } };
    });
  }
  function removeElemento(id: string, idx: number) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], elementos: prev[id].elementos.filter((_, i) => i !== idx) } }));
  }
  function moverElemento(id: string, idx: number, dir: -1 | 1) {
    setEdits((prev) => {
      const els = [...prev[id].elementos];
      const j = idx + dir;
      if (j < 0 || j >= els.length) return prev;
      [els[idx], els[j]] = [els[j], els[idx]];
      return { ...prev, [id]: { ...prev[id], elementos: els } };
    });
  }

  async function persistEscena(id: string, estado: EscenaEstado) {
    const esc = edits[id];
    if (!esc) return;
    const supabase = createClient();
    // descripcion/dialogo se re-derivan de elementos al guardar, así las
    // pantallas que todavía leen esas dos columnas por separado (Escenas,
    // Plan de rodaje) también reflejan lo que se acaba de editar acá.
    const descripcion = esc.elementos.filter((el): el is ElementoAccion => el.tipo === "accion").map((el) => el.texto).join("\n\n") || null;
    const dialogo = esc.elementos.filter((el): el is ElementoDialogo => el.tipo === "dialogo")
      .map(({ personaje, parentetico, texto }) => ({ personaje, parentetico, texto }));
    const { error } = await supabase
      .from("escenas")
      .update({
        numero: esc.numero,
        int_ext: esc.int_ext,
        lugar: esc.lugar,
        dia_noche: esc.dia_noche,
        encabezado: esc.encabezado,
        descripcion,
        personajes: esc.personajes,
        dialogo,
        elementos: esc.elementos,
        estado,
      })
      .eq("id", id);
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }
    if (estado === "confirmada") {
      // Dispara el desglose de escenas por IA sin bloquear la UI — el
      // usuario ya ve la escena confirmada, el desglose aparece solo
      // cuando termina de generarse (unos segundos después).
      fetch("/api/guion/desglose/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escenaId: id }),
      }).catch(() => {});
    }
    await load();
  }

  async function deleteEscena(id: string) {
    const supabase = createClient();
    await supabase.from("escenas").delete().eq("id", id);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
  }

  async function generarPlan() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setMsgPlan({ type: "err", text: t("noProject") }); return; }
    setGenerandoPlan(true);
    setMsgPlan(null);
    try {
      const res = await fetch("/api/plan-rodaje/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("planGenError"));
      setMsgPlan({ type: "ok", text: t("planGenerated", { n: data.jornadas }) });
    } catch (err) {
      setMsgPlan({ type: "err", text: err instanceof Error ? err.message : t("unknownError") });
    } finally {
      setGenerandoPlan(false);
    }
  }

  const [exportando, setExportando] = useState(false);

  async function exportarGuionPDF() {
    setExportando(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const proyectoNombre = localStorage.getItem("cinepack-proyecto") ?? "";
      const marginLeft = 25;
      const marginRight = 190;
      const dialogLeft = 55;
      const dialogRight = 165;
      const pageBottom = 280;
      let y = 20;

      doc.setFont("courier", "normal");

      function nuevaPagina() {
        doc.addPage();
        y = 20;
      }

      function asegurarEspacio(lineas: number) {
        if (y + lineas * 5 > pageBottom) nuevaPagina();
      }

      confirmadas.forEach((e) => {
        asegurarEspacio(3);
        doc.setFont("courier", "bold");
        doc.setFontSize(11);
        const slug = `${e.numero}. ${e.encabezado}`.toUpperCase();
        doc.text(slug, marginLeft, y);
        y += 7;

        elementosDe(e).forEach((el) => {
          if (el.tipo === "accion") {
            if (!el.texto) return;
            doc.setFont("courier", "normal");
            doc.setFontSize(10);
            const lineas = doc.splitTextToSize(el.texto, marginRight - marginLeft);
            asegurarEspacio(lineas.length);
            doc.text(lineas, marginLeft, y);
            y += lineas.length * 5 + 3;
            return;
          }
          asegurarEspacio(2);
          doc.setFont("courier", "bold");
          doc.setFontSize(10);
          doc.text(el.personaje.toUpperCase(), dialogLeft, y);
          y += 5;

          if (el.parentetico) {
            doc.setFont("courier", "italic");
            asegurarEspacio(1);
            doc.text(`(${el.parentetico.replace(/^\(|\)$/g, "")})`, dialogLeft + 5, y);
            y += 5;
          }

          doc.setFont("courier", "normal");
          const lineasDialogo = doc.splitTextToSize(el.texto, dialogRight - dialogLeft);
          asegurarEspacio(lineasDialogo.length);
          doc.text(lineasDialogo, dialogLeft, y);
          y += lineasDialogo.length * 5 + 3;
        });

        y += 5;
      });

      const nombreArchivo = (proyectoNombre || "guion").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      doc.save(`${nombreArchivo}.pdf`);
    } finally {
      setExportando(false);
    }
  }

  const borradores = escenas.filter((e) => e.estado === "borrador");
  const confirmadas = escenas.filter((e) => e.estado === "confirmada").sort((a, b) => a.numero - b.numero);
  const procesando = guiones.some((g) => g.estado === "procesando");

  return (
    <>
      {!canEdit && (
        <div className="gen-readonly-banner">
          <span className="hex"></span>
          {t("readonlyBanner", { dept: "Guion" })}
        </div>
      )}
      <form onSubmit={handleUpload} className="gup" style={!canEdit ? { pointerEvents: "none", opacity: 0.45 } : undefined}>
        <div className="gup-row">
          <label className="gfile">
            {file ? file.name : t("choosePdf")}
            <input
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" className="abtn" disabled={!file || uploading} style={{ width: "auto" }}>
            {uploading ? t("processing") : t("upload")}
          </button>
        </div>
        {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}
      </form>

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

      <div className="gtabs">
        {canEdit && (
          <button className={`gtab ${tab === "revision" ? "active" : ""}`} onClick={() => setTab("revision")}>
            {t("tabRevision")} {borradores.length > 0 ? `(${borradores.length})` : ""}
          </button>
        )}
        <button className={`gtab ${tab === "guion" ? "active" : ""}`} onClick={() => setTab("guion")}>
          {t("tabScript")} {confirmadas.length > 0 ? `(${confirmadas.length})` : ""}
        </button>
      </div>

      {tab === "revision" && (
        <div className="gcards">
          {loading && <p style={{ padding: "0 0 0 0", fontSize: 12, color: "var(--muted)" }}>{t("loading")}</p>}
          {!loading && procesando && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {t("aiReading")}
            </p>
          )}
          {!loading && !procesando && borradores.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {t("noPendingScenes")}
            </p>
          )}
          {borradores.map((e) => {
            const edit = edits[e.id] ?? e;
            return (
              <div className="gcard" key={e.id}>
                <div className="gcard-top">
                  <span className="num">{t("scene", { n: edit.numero })}</span>
                  {edit.pagina_pdf && <span className="pag">{t("pdfPage", { n: edit.pagina_pdf })}</span>}
                </div>

                <div className="gfields">
                  <label className="afield">
                    <span>{t("sceneNum")}</span>
                    <input
                      type="number"
                      value={edit.numero}
                      onChange={(ev) => updateField(e.id, "numero", Number(ev.target.value))}
                    />
                  </label>
                  <label className="afield">
                    <span>{t("intExt")}</span>
                    <select value={edit.int_ext ?? ""} onChange={(ev) => updateField(e.id, "int_ext", ev.target.value || null)}>
                      <option value="">—</option>
                      <option value="INT">INT</option>
                      <option value="EXT">EXT</option>
                      <option value="INT/EXT">INT/EXT</option>
                    </select>
                  </label>
                  <label className="afield">
                    <span>{t("place")}</span>
                    <input
                      type="text"
                      value={edit.lugar ?? ""}
                      onChange={(ev) => updateField(e.id, "lugar", ev.target.value || null)}
                    />
                  </label>
                  <label className="afield">
                    <span>{t("dayNight")}</span>
                    <input
                      type="text"
                      value={edit.dia_noche ?? ""}
                      onChange={(ev) => updateField(e.id, "dia_noche", ev.target.value || null)}
                    />
                  </label>
                </div>

                <label className="afield">
                  <span>{t("heading")}</span>
                  <input type="text" value={edit.encabezado} onChange={(ev) => updateField(e.id, "encabezado", ev.target.value)} />
                </label>

                <label className="afield">
                  <span>{t("characters")}</span>
                  <input type="text" value={edit.personajes.join(", ")} onChange={(ev) => updatePersonajes(e.id, ev.target.value)} />
                </label>

                <div className="gdialog">
                  <h5>{t("sceneContent")}</h5>
                  {edit.elementos.map((el, idx) =>
                    el.tipo === "accion" ? (
                      <div className="gdrow gdrow-accion" key={idx}>
                        <textarea
                          rows={2}
                          placeholder={t("description")}
                          value={el.texto}
                          onChange={(ev) => updateElemento(e.id, idx, { texto: ev.target.value })}
                        />
                        <div className="gdrow-actions">
                          <button type="button" className="mv" disabled={idx === 0} onClick={() => moverElemento(e.id, idx, -1)}>↑</button>
                          <button type="button" className="mv" disabled={idx === edit.elementos.length - 1} onClick={() => moverElemento(e.id, idx, 1)}>↓</button>
                          <button type="button" className="rm" onClick={() => removeElemento(e.id, idx)}>{t("remove")}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="gdrow" key={idx}>
                        <input
                          type="text"
                          placeholder={t("character")}
                          value={el.personaje}
                          onChange={(ev) => updateElemento(e.id, idx, { personaje: ev.target.value })}
                        />
                        <input
                          type="text"
                          placeholder={t("parenthetical")}
                          value={el.parentetico ?? ""}
                          onChange={(ev) => updateElemento(e.id, idx, { parentetico: ev.target.value || null })}
                        />
                        <textarea
                          rows={1}
                          placeholder={t("dialogueText")}
                          value={el.texto}
                          onChange={(ev) => updateElemento(e.id, idx, { texto: ev.target.value })}
                        />
                        <div className="gdrow-actions">
                          <button type="button" className="mv" disabled={idx === 0} onClick={() => moverElemento(e.id, idx, -1)}>↑</button>
                          <button type="button" className="mv" disabled={idx === edit.elementos.length - 1} onClick={() => moverElemento(e.id, idx, 1)}>↓</button>
                          <button type="button" className="rm" onClick={() => removeElemento(e.id, idx)}>{t("remove")}</button>
                        </div>
                      </div>
                    )
                  )}
                  <div className="gdialog-add">
                    <button type="button" className="btn" onClick={() => insertElemento(e.id, edit.elementos.length, "accion")}>
                      {t("addDescription")}
                    </button>
                    <button type="button" className="btn" onClick={() => insertElemento(e.id, edit.elementos.length, "dialogo")}>
                      {t("addDialogueLine")}
                    </button>
                  </div>
                </div>

                <div className="gcard-actions">
                  <button type="button" className="btn acc" onClick={() => persistEscena(e.id, "confirmada")}>
                    {t("confirmScene")}
                  </button>
                  <button type="button" className="btn" onClick={() => persistEscena(e.id, "borrador")}>
                    {t("saveChanges")}
                  </button>
                  <button type="button" className="btn" onClick={() => deleteEscena(e.id)}>
                    {t("discard")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "guion" && (
        <>
          {confirmadas.length > 0 && (
            <div className="gup" style={{ paddingBottom: 0 }}>
              <div className="gup-row">
                <button
                  type="button"
                  className="abtn"
                  style={{ width: "auto", display: "flex", alignItems: "center", gap: 8 }}
                  onClick={generarPlan}
                  disabled={generandoPlan}
                >
                  <span className="hex"></span>
                  {generandoPlan ? t("generatingPlan") : t("generatePlan")}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ width: "auto", display: "flex", alignItems: "center", gap: 8 }}
                  onClick={exportarGuionPDF}
                  disabled={exportando}
                >
                  {exportando ? t("exportingPdf") : t("exportPdf")}
                </button>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {t("confirmedCount", { n: confirmadas.length })}
                </span>
              </div>
              {msgPlan && (
                <p className={`amsg ${msgPlan.type === "err" ? "err" : "ok"}`}>{msgPlan.text}</p>
              )}
            </div>
          )}
        <div className="script">
          {confirmadas.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {t("noConfirmedScenes")}
            </p>
          )}
          {confirmadas.map((e, i) => (
            <div className="script-page" key={e.id}>
              <span className="pgnum">{t("pdfPageShort", { n: i + 1 })}</span>
              <div className="script-scene">
                <div className="script-slug">
                  <span className="script-num">{e.numero}</span>
                  {e.encabezado}
                </div>
                {elementosDe(e).map((el, idx) =>
                  el.tipo === "accion" ? (
                    el.texto ? <div className="script-desc" key={idx}>{el.texto}</div> : null
                  ) : (
                    <div key={idx}>
                      <div className="script-char">{el.personaje}</div>
                      {el.parentetico && <div className="script-paren">({el.parentetico.replace(/^\(|\)$/g, "")})</div>}
                      <div className="script-line">{el.texto}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </>
  );
}
