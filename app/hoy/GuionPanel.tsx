"use client";

import { useCallback, useEffect, useState } from "react";
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
  pagina_pdf: number | null;
  orden: number;
  estado: EscenaEstado;
};

type ViewTab = "revision" | "guion";

export default function GuionPanel({ fullName }: { fullName: string }) {
  const [guiones, setGuiones] = useState<Guion[]>([]);
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [edits, setEdits] = useState<Record<string, Escena>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tab, setTab] = useState<ViewTab>("revision");

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
          next[e.id] = JSON.parse(JSON.stringify(e));
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
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
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

    const path = `${projectId}/${Date.now()}_${file.name}`;
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
      setMsg({ type: "err", text: insertError?.message ?? "No se pudo registrar el guion." });
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
      setMsg({ type: "err", text: result.error ?? "Error al procesar el guion con IA." });
    } else {
      setMsg({ type: "ok", text: `La IA detectó ${result.count} escenas. Revisalas abajo y confirmalas.` });
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

  function updateDialogo(id: string, idx: number, field: keyof DialogoLinea, value: string) {
    setEdits((prev) => {
      const esc = prev[id];
      const dialogo = [...esc.dialogo];
      dialogo[idx] = {
        ...dialogo[idx],
        [field]: field === "parentetico" && value.trim() === "" ? null : value,
      };
      return { ...prev, [id]: { ...esc, dialogo } };
    });
  }

  function addDialogoRow(id: string) {
    setEdits((prev) => {
      const esc = prev[id];
      return { ...prev, [id]: { ...esc, dialogo: [...esc.dialogo, { personaje: "", parentetico: null, texto: "" }] } };
    });
  }

  function removeDialogoRow(id: string, idx: number) {
    setEdits((prev) => {
      const esc = prev[id];
      return { ...prev, [id]: { ...esc, dialogo: esc.dialogo.filter((_, i) => i !== idx) } };
    });
  }

  async function persistEscena(id: string, estado: EscenaEstado) {
    const esc = edits[id];
    if (!esc) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("escenas")
      .update({
        numero: esc.numero,
        int_ext: esc.int_ext,
        lugar: esc.lugar,
        dia_noche: esc.dia_noche,
        encabezado: esc.encabezado,
        descripcion: esc.descripcion,
        personajes: esc.personajes,
        dialogo: esc.dialogo,
        estado,
      })
      .eq("id", id);
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
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

  const borradores = escenas.filter((e) => e.estado === "borrador");
  const confirmadas = escenas.filter((e) => e.estado === "confirmada").sort((a, b) => a.numero - b.numero);
  const procesando = guiones.some((g) => g.estado === "procesando");

  return (
    <>
      <form onSubmit={handleUpload} className="gup">
        <div className="gup-row">
          <label className="gfile">
            {file ? file.name : "Elegir guion en PDF…"}
            <input
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" className="abtn" disabled={!file || uploading} style={{ width: "auto" }}>
            {uploading ? "Procesando con IA…" : "Subir y procesar"}
          </button>
        </div>
        {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}
      </form>

      {guiones.length > 0 && (
        <div className="glist">
          {guiones.map((g) => (
            <div className="gitem" key={g.id}>
              <span className="name">{g.nombre}</span>
              {g.estado === "procesando" && <span className="pill p-warn">Procesando…</span>}
              {g.estado === "listo" && <span className="pill p-ok">Listo</span>}
              {g.estado === "error" && <span className="pill p-bad" title={g.error_msg ?? ""}>Error</span>}
              <span className="meta">{new Date(g.created_at).toLocaleString("es-AR")}</span>
            </div>
          ))}
        </div>
      )}

      <div className="gtabs">
        <button className={`gtab ${tab === "revision" ? "active" : ""}`} onClick={() => setTab("revision")}>
          Revisión {borradores.length > 0 ? `(${borradores.length})` : ""}
        </button>
        <button className={`gtab ${tab === "guion" ? "active" : ""}`} onClick={() => setTab("guion")}>
          Guion {confirmadas.length > 0 ? `(${confirmadas.length})` : ""}
        </button>
      </div>

      {tab === "revision" && (
        <div className="gcards">
          {loading && <p style={{ padding: "0 0 0 0", fontSize: 12, color: "var(--muted)" }}>Cargando…</p>}
          {!loading && procesando && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              La IA está leyendo el guion y separando las escenas. Esto puede tardar un par de minutos…
            </p>
          )}
          {!loading && !procesando && borradores.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              No hay escenas pendientes de revisión. Subí un PDF para que la IA lo desglose escena por escena.
            </p>
          )}
          {borradores.map((e) => {
            const edit = edits[e.id] ?? e;
            return (
              <div className="gcard" key={e.id}>
                <div className="gcard-top">
                  <span className="num">Escena {edit.numero}</span>
                  {edit.pagina_pdf && <span className="pag">Pág. {edit.pagina_pdf} del PDF</span>}
                </div>

                <div className="gfields">
                  <label className="afield">
                    <span>Nº escena</span>
                    <input
                      type="number"
                      value={edit.numero}
                      onChange={(ev) => updateField(e.id, "numero", Number(ev.target.value))}
                    />
                  </label>
                  <label className="afield">
                    <span>Int./Ext.</span>
                    <select value={edit.int_ext ?? ""} onChange={(ev) => updateField(e.id, "int_ext", ev.target.value || null)}>
                      <option value="">—</option>
                      <option value="INT">INT</option>
                      <option value="EXT">EXT</option>
                      <option value="INT/EXT">INT/EXT</option>
                    </select>
                  </label>
                  <label className="afield">
                    <span>Lugar</span>
                    <input
                      type="text"
                      value={edit.lugar ?? ""}
                      onChange={(ev) => updateField(e.id, "lugar", ev.target.value || null)}
                    />
                  </label>
                  <label className="afield">
                    <span>Día / Noche</span>
                    <input
                      type="text"
                      value={edit.dia_noche ?? ""}
                      onChange={(ev) => updateField(e.id, "dia_noche", ev.target.value || null)}
                    />
                  </label>
                </div>

                <label className="afield">
                  <span>Encabezado</span>
                  <input type="text" value={edit.encabezado} onChange={(ev) => updateField(e.id, "encabezado", ev.target.value)} />
                </label>

                <label className="afield">
                  <span>Descripción / acción</span>
                  <textarea
                    rows={3}
                    value={edit.descripcion ?? ""}
                    onChange={(ev) => updateField(e.id, "descripcion", ev.target.value || null)}
                  />
                </label>

                <label className="afield">
                  <span>Personajes (separados por coma)</span>
                  <input type="text" value={edit.personajes.join(", ")} onChange={(ev) => updatePersonajes(e.id, ev.target.value)} />
                </label>

                <div className="gdialog">
                  <h5>Diálogo</h5>
                  {edit.dialogo.map((d, idx) => (
                    <div className="gdrow" key={idx}>
                      <input
                        type="text"
                        placeholder="Personaje"
                        value={d.personaje}
                        onChange={(ev) => updateDialogo(e.id, idx, "personaje", ev.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="(parentético)"
                        value={d.parentetico ?? ""}
                        onChange={(ev) => updateDialogo(e.id, idx, "parentetico", ev.target.value)}
                      />
                      <textarea
                        rows={1}
                        placeholder="Texto del diálogo"
                        value={d.texto}
                        onChange={(ev) => updateDialogo(e.id, idx, "texto", ev.target.value)}
                      />
                      <button type="button" className="rm" onClick={() => removeDialogoRow(e.id, idx)}>
                        Quitar
                      </button>
                    </div>
                  ))}
                  <div>
                    <button type="button" className="btn" onClick={() => addDialogoRow(e.id)}>
                      + Línea de diálogo
                    </button>
                  </div>
                </div>

                <div className="gcard-actions">
                  <button type="button" className="btn acc" onClick={() => persistEscena(e.id, "confirmada")}>
                    Confirmar escena
                  </button>
                  <button type="button" className="btn" onClick={() => persistEscena(e.id, "borrador")}>
                    Guardar cambios
                  </button>
                  <button type="button" className="btn" onClick={() => deleteEscena(e.id)}>
                    Descartar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "guion" && (
        <div className="script">
          {confirmadas.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              Todavía no hay escenas confirmadas. Confirmalas desde la pestaña Revisión para que aparezcan acá en
              formato de guion.
            </p>
          )}
          {confirmadas.map((e, i) => (
            <div className="script-page" key={e.id}>
              <span className="pgnum">Pág. {i + 1}</span>
              <div className="script-scene">
                <div className="script-slug">
                  <span className="script-num">{e.numero}</span>
                  {e.encabezado}
                </div>
                {e.descripcion && <div className="script-desc">{e.descripcion}</div>}
                {e.dialogo.map((d, idx) => (
                  <div key={idx}>
                    <div className="script-char">{d.personaje}</div>
                    {d.parentetico && <div className="script-paren">({d.parentetico.replace(/^\(|\)$/g, "")})</div>}
                    <div className="script-line">{d.texto}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
