"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Herramienta, Columna } from "../herramientas";
import GestionAccesosPanel from "./GestionAccesosPanel";

type Intervencion = { accion: string; usuario: string; fecha: string };
type Visionado = { usuario: string; fecha: string };

type HistEntry =
  | { id: string; tipo: "crea"; filaId: string; esMeta: boolean }
  | { id: string; tipo: "edita"; filaId: string; datosAntes: Record<string, string>; esMeta: boolean }
  | { id: string; tipo: "borra"; fila: Fila };

type Fila = {
  id: string;
  datos: Record<string, string>;
  orden: number;
  registro: Intervencion[];
  visionado_por: Visionado[];
  autor_nombre: string | null;
  editor_nombre: string | null;
  updated_at: string;
};

// Tono visual para valores de tipo "estado" (Pendiente, Firmado, Descartado, etc).
function estadoTono(valor: string): "ok" | "warn" | "bad" | "info" | "neutral" {
  const v = valor.trim().toLowerCase();
  if (!v) return "neutral";
  if (/(descartad|rechazad|cancelad|vencid|atrasad|urgente|sobrepasad|denegad|^no$|^ng$|falsa|empeora|roto|^baja$)/.test(v)) return "bad";
  if (/(hecho|firmad|aprobad|elegid|confirmad|pagad|entregad|complet|cerrad|finalizad|list[oa]|cobrad|conseguid|montada$|etalonad|publicad|integrad|recogid|rendid|seleccionad|en presupuesto|vigente|acordad|concedid|^s[ií]$|^ok$|picture lock|^alta$)/.test(v)) return "ok";
  if (/(pendiente|envi|revisi|borrador|propuest|esperando|en curso|en proceso|programad|en construcci|en negociaci|en gesti|en mezcla|en edici|en diseñ|en riesgo|por conseguir|por cubrir|por rodar|por etalonar|contactad|frí|^idea$|objetivo|prospecto|preparando|solicitad|inscrit|audici|callback|tramitando|reservado|sin montar|sin respuesta|^abiert)/.test(v)) return "warn";
  return "info";
}

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

// Las celdas de tipo "largo" guardan HTML (rich text). Para que búsqueda,
// filtros y orden sigan comparando texto y no los tags, se normaliza a texto
// plano. Fast-path: si no hay "<", se devuelve tal cual (celdas de texto plano).
function stripHtml(s: string): string {
  if (!s || s.indexOf("<") === -1) return s;
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = s;
    return tmp.textContent || "";
  }
  return s.replace(/<[^>]*>/g, "");
}

// Fuentes ofrecidas en el selector de fuente de las celdas de texto largo.
const CELL_FONTS: { label: string; value: string }[] = [
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Times", value: "'Times New Roman', serif" },
];
const CELL_TEXT_COLORS = ["#111111", "#F4F4F6", "#9FE870", "#11C2DC", "#F5A623", "#FF6B6B", "#C084FC"];

// Encabezado de marca, sólo visible al exportar/imprimir en PDF.
export function PrintHeader({ herramientaNombre, departamento }: { herramientaNombre: string; departamento: string }) {
  const proyecto = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto") : null;
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="cp-print-header">
      <div className="cp-print-brand"><span className="hex"></span> CINE PACK</div>
      <div className="cp-print-meta">
        <h3>{herramientaNombre}</h3>
        <span>{proyecto ?? "Proyecto"} · {departamento} · {fecha}</span>
      </div>
    </div>
  );
}

export default function HerramientaPanel({
  departamento,
  herramienta,
  fullName,
  editable = true,
}: {
  departamento: string;
  herramienta: Herramienta;
  fullName: string;
  editable?: boolean;
}) {
  if (herramienta.tipo === "accesos") {
    return <GestionAccesosPanel departamento={departamento} scope="departamento" />;
  }
  return (
    <HerramientaData
      departamento={departamento}
      herramienta={herramienta}
      fullName={fullName}
      editable={editable}
    />
  );
}

function HerramientaData({
  departamento,
  herramienta,
  fullName,
  editable,
}: {
  departamento: string;
  herramienta: Herramienta;
  fullName: string;
  editable: boolean;
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [meta, setMeta] = useState<Fila | null>(null);
  const filasRef = useRef<Fila[]>(filas);
  const metaRef = useRef<Fila | null>(meta);
  filasRef.current = filas;
  metaRef.current = meta;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historial, setHistorial] = useState<HistEntry[]>([]);

  function pushHistorial(entry: HistEntry) {
    setHistorial((prev) => [entry, ...prev].slice(0, 8));
  }
  const esMulti = herramienta.tipo === "tabla" || herramienta.tipo === "galeria";
  const esSingle = herramienta.tipo === "nota" || herramienta.tipo === "checklist" || herramienta.tipo === "ficha";

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError("No hay proyecto activo (localStorage cinepack-proyecto-id). Volvé a iniciar sesión.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .select("*")
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .eq("herramienta_id", herramienta.id)
      .order("orden", { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Fila[];
    if (esMulti) {
      setMeta(rows.find((r) => r.orden === -1) ?? null);
      setFilas(rows.filter((r) => r.orden !== -1));
    } else {
      setFilas(rows);
    }
    setLoading(false);
  }, [departamento, herramienta.id, esMulti]);

  useEffect(() => {
    load();
  }, [load]);

  async function crearFila(datosIniciales: Record<string, string>, ordenForzado?: number) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError("No hay proyecto activo (localStorage cinepack-proyecto-id). Volvé a iniciar sesión.");
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orden = ordenForzado ?? (filas.length ? Math.max(...filas.map((f) => f.orden)) + 1 : 0);
    const registro: Intervencion[] = [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }];
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento,
        herramienta_id: herramienta.id,
        datos: datosIniciales,
        orden,
        registro,
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("*")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (!data) return;
    if (orden === -1) {
      setMeta(data as Fila);
    } else {
      setFilas((prev) => [...prev, data as Fila]);
      pushHistorial({ id: crypto.randomUUID(), tipo: "crea", filaId: data.id, esMeta: false });
    }
    return data as Fila;
  }

  async function guardarFila(id: string, cambios: Record<string, string>, filaActual?: Fila) {
    const fila = filasRef.current.find((f) => f.id === id) ?? (metaRef.current?.id === id ? metaRef.current : undefined) ?? filaActual;
    if (!fila) return;
    const datosAntes = fila.datos;
    const cambio = Object.entries(cambios).some(([k, v]) => (datosAntes[k] ?? "") !== v);
    const datos = { ...fila.datos, ...cambios };
    const registro = [...(fila.registro ?? []), { accion: "edita", usuario: fullName, fecha: new Date().toISOString() }].slice(-30);
    const updated_at = new Date().toISOString();
    const updatedFila = { ...fila, datos, registro, editor_nombre: fullName, updated_at };
    const esMeta = metaRef.current?.id === id;
    if (esMeta) {
      metaRef.current = updatedFila;
      setMeta(metaRef.current);
    } else if (filasRef.current.some((f) => f.id === id)) {
      filasRef.current = filasRef.current.map((f) => (f.id === id ? updatedFila : f));
      setFilas(filasRef.current);
    } else {
      filasRef.current = [...filasRef.current, updatedFila];
      setFilas(filasRef.current);
    }
    if (cambio && !esMeta) {
      pushHistorial({ id: crypto.randomUUID(), tipo: "edita", filaId: id, datosAntes, esMeta });
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, registro, editor_nombre: fullName, updated_at })
      .eq("id", id);
    if (err) {
      setError(err.message);
      setSaveState("idle");
      return;
    }
    setSaveState("saved");
    saveTimer.current = setTimeout(() => setSaveState("idle"), 1800);
  }

  async function borrarFila(id: string) {
    const fila = filasRef.current.find((f) => f.id === id);
    setFilas((prev) => prev.filter((f) => f.id !== id));
    const supabase = createClient();
    const { error: err } = await supabase.from("herramienta_filas").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    if (fila) pushHistorial({ id: crypto.randomUUID(), tipo: "borra", fila });
    setHistorial((prev) => prev.filter((h) => !(h.tipo !== "borra" && h.filaId === id)));
  }

  async function deshacer(entry: HistEntry) {
    const supabase = createClient();
    if (entry.tipo === "crea") {
      setFilas((prev) => prev.filter((f) => f.id !== entry.filaId));
      const { error: err } = await supabase.from("herramienta_filas").delete().eq("id", entry.filaId);
      if (err) {
        setError(err.message);
        return;
      }
    } else if (entry.tipo === "edita") {
      const updated_at = new Date().toISOString();
      if (entry.esMeta && metaRef.current?.id === entry.filaId) {
        metaRef.current = { ...metaRef.current, datos: entry.datosAntes, updated_at };
        setMeta(metaRef.current);
      } else {
        filasRef.current = filasRef.current.map((f) => (f.id === entry.filaId ? { ...f, datos: entry.datosAntes, updated_at } : f));
        setFilas(filasRef.current);
      }
      const { error: err } = await supabase
        .from("herramienta_filas")
        .update({ datos: entry.datosAntes, editor_nombre: fullName, updated_at })
        .eq("id", entry.filaId);
      if (err) {
        setError(err.message);
        return;
      }
    } else if (entry.tipo === "borra") {
      const { id, project_id: _projectId, created_at: _createdAt, ...rest } = entry.fila as unknown as Record<string, unknown>;
      const { data, error: err } = await supabase
        .from("herramienta_filas")
        .insert({ id, project_id: localStorage.getItem("cinepack-proyecto-id"), ...rest })
        .select("*")
        .single();
      if (err) {
        setError(err.message);
        return;
      }
      if (data) setFilas((prev) => [...prev, data as Fila].sort((a, b) => a.orden - b.orden));
    }
    setHistorial((prev) => prev.filter((h) => h.id !== entry.id));
  }

  function describirHistorial(entry: HistEntry): string {
    if (entry.tipo === "crea") return "Fila creada";
    if (entry.tipo === "borra") return "Fila eliminada";
    return "Edición";
  }

  async function visionar(id: string) {
    const fila = filas.find((f) => f.id === id);
    if (!fila) return;
    const yaVisto = (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
    const visionado_por = yaVisto
      ? (fila.visionado_por ?? []).filter((v) => v.usuario !== fullName)
      : [...(fila.visionado_por ?? []), { usuario: fullName, fecha: new Date().toISOString() }];
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, visionado_por } : f)));
    const supabase = createClient();
    const { error: err } = await supabase.from("herramienta_filas").update({ visionado_por }).eq("id", id);
    if (err) setError(err.message);
  }

  // Single-instance tools: ensure one fila exists, lazily.
  async function asegurarSingle(): Promise<Fila> {
    if (filas.length > 0) return filas[0];
    const inicial: Record<string, string> =
      herramienta.tipo === "nota" ? { texto: "" } :
      herramienta.tipo === "checklist" ? { items: "[]" } :
      {};
    const f = await crearFila(inicial);
    return f as Fila;
  }

  function slugCampo(label: string) {
    const base = label
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "")
      .slice(0, 24) || "campo";
    return `x_${base}_${Date.now().toString(36).slice(-4)}`;
  }

  // Columnas/campos extra definidas por el usuario (libres, se guardan en datos._extra)
  async function agregarColumnaExtra(label: string) {
    const actuales: Columna[] = JSON.parse(meta?.datos?._extra ?? "[]");
    const next = [...actuales, { key: slugCampo(label), label } as Columna];
    if (meta) await guardarFila(meta.id, { ...meta.datos, _extra: JSON.stringify(next) });
    else await crearFila({ _extra: JSON.stringify(next) }, -1);
  }

  async function agregarCampoExtra(label: string) {
    const f = filas[0] ?? (await asegurarSingle());
    if (!f) return;
    const actuales: Columna[] = JSON.parse(f.datos?._extra ?? "[]");
    const next = [...actuales, { key: slugCampo(label), label } as Columna];
    await guardarFila(f.id, { ...f.datos, _extra: JSON.stringify(next) }, f);
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando {herramienta.nombre.toLowerCase()}…</h4>
      </div>
    );
  }

  const extraCols: Columna[] = meta?.datos?._extra ? JSON.parse(meta.datos._extra) : [];
  const extraCampos: Columna[] = filas[0]?.datos?._extra ? JSON.parse(filas[0].datos._extra) : [];

  return (
    <div className="hp">
      {saveState !== "idle" && (
        <div className={`hp-savebadge ${saveState}`}>
          {saveState === "saving" ? "Guardando…" : "✓ Guardado"}
        </div>
      )}
      {error && (
        <div className="hp-error">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {herramienta.hint && <p className="hp-hint">{herramienta.hint}</p>}

      {herramienta.tipo === "tabla" && (
        <TablaTool
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          fullName={fullName}
          departamento={departamento}
          herramientaId={herramienta.id}
          herramientaNombre={herramienta.nombre}
          onCrear={() => crearFila({})}
          onDuplicar={(f) => crearFila({ ...f.datos })}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
          onVisionar={visionar}
          onAgregarColumna={agregarColumnaExtra}
          onImportarCSV={async (rows) => {
            for (const datos of rows) await crearFila(datos);
          }}
        />
      )}

      {herramienta.tipo === "galeria" && (
        <GaleriaTool
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          fullName={fullName}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
          onVisionar={visionar}
          onAgregarColumna={agregarColumnaExtra}
        />
      )}

      {herramienta.tipo === "ficha" && (
        <FichaTool
          campos={[...(herramienta.campos ?? []), ...extraCampos]}
          fila={filas[0]}
          editable={editable}
          fullName={fullName}
          departamento={departamento}
          herramientaId={herramienta.id}
          herramientaNombre={herramienta.nombre}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
          onVisionar={visionar}
          onAgregarCampo={agregarCampoExtra}
        />
      )}

      {herramienta.tipo === "nota" && (
        <NotaTool
          fila={filas[0]}
          editable={editable}
          fullName={fullName}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
          onVisionar={visionar}
        />
      )}

      {herramienta.tipo === "checklist" && (
        <ChecklistTool
          fila={filas[0]}
          editable={editable}
          fullName={fullName}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
          onVisionar={visionar}
        />
      )}

      {esMulti && filas.length === 0 && (
        <div className="soon-box" style={{ marginTop: 0 }}>
          <span className="hex"></span>
          <h4>Aún no hay registros</h4>
          <p>{editable ? "Agregá la primera fila para empezar." : "Cuando el departamento cargue datos, aparecerán aquí."}</p>
        </div>
      )}

      {esSingle && filas[0] && (
        <div className="hp-thread-section">
          <Firma fila={filas[0]} />
        </div>
      )}

      {editable && historial.length > 0 && (
        <div className="hp-historial">
          <span className="hp-historial-label">Cambios recientes</span>
          <ul>
            {historial.map((h) => (
              <li key={h.id}>
                <span>{describirHistorial(h)}</span>
                <button className="btn" onClick={() => deshacer(h)}>Deshacer</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Archivo (subida a Supabase Storage, bucket "documentos") ----
function ImgPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    createClient().storage.from("documentos").createSignedUrl(path, 3600).then(({ data }) => {
      if (activo) setUrl(data?.signedUrl ?? null);
    });
    return () => { activo = false; };
  }, [path]);
  if (!url) return null;
  return <img src={url} alt="" className="hp-archivo-img-thumb" />;
}

function ArchivoCell({
  path,
  editable,
  departamento,
  herramientaId,
  filaId,
  colKey,
  onSave,
}: {
  path: string;
  editable: boolean;
  departamento: string;
  herramientaId: string;
  filaId: string;
  colKey: string;
  onSave: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileName = path ? path.split("/").pop()?.replace(/^\d+-/, "") ?? path : "";

  async function subir(file: File) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setBusy(true);
    const supabase = createClient();
    const p = `${projectId}/${departamento}/herramientas/${herramientaId}/${filaId}/${colKey}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(p, file);
    setBusy(false);
    if (!error) onSave(p);
  }

  async function ver() {
    const supabase = createClient();
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(fileName);

  return (
    <div className="hp-archivo">
      {path ? (
        <div className="hp-archivo-preview-wrap">
          {isImage && <ImgPreview path={path} />}
          <button className="hp-archivo-link" onClick={ver} title={fileName}>📎 {fileName}</button>
        </div>
      ) : (
        <span className="hp-archivo-empty">—</span>
      )}
      {editable && (
        <label className="hp-archivo-up">
          {busy ? "…" : path ? "Cambiar" : "Subir"}
          <input
            type="file"
            style={{ display: "none" }}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subir(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

// ---- Link externo ----
function LinkCell({
  valor,
  editable,
  onSave,
}: {
  valor: string;
  editable: boolean;
  onSave: (v: string) => void;
}) {
  if (!editable) {
    return valor ? (
      <a className="hp-link-ext" href={valor} target="_blank" rel="noopener noreferrer">Abrir ↗</a>
    ) : (
      <span className="hp-archivo-empty">—</span>
    );
  }
  return (
    <div className="hp-link-edit">
      <input
        className="hp-cell-input"
        type="text"
        placeholder="https://…"
        defaultValue={valor}
        onBlur={(e) => onSave(e.target.value)}
      />
      {valor && (
        <a className="hp-link-ext" href={valor} target="_blank" rel="noopener noreferrer">↗</a>
      )}
    </div>
  );
}

// ---- Celda editable ----
function Celda({
  col,
  valor,
  editable,
  onChange,
  onCommit,
  onSave,
  departamento,
  herramientaId,
  filaId,
}: {
  col: Columna;
  valor: string;
  editable: boolean;
  onChange: (v: string) => void;
  onCommit: () => void;
  onSave?: (v: string) => void;
  departamento?: string;
  herramientaId?: string;
  filaId?: string;
}) {
  if (col.tipo === "archivo") {
    return (
      <ArchivoCell
        path={valor}
        editable={editable}
        departamento={departamento ?? ""}
        herramientaId={herramientaId ?? ""}
        filaId={filaId ?? ""}
        colKey={col.key}
        onSave={onSave ?? (() => {})}
      />
    );
  }
  if (col.tipo === "link") {
    return <LinkCell valor={valor} editable={editable} onSave={onSave ?? (() => {})} />;
  }
  if (col.tipo === "estado") {
    return (
      <select
        className={`hp-cell-select tono-${estadoTono(valor)}`}
        value={valor}
        disabled={!editable}
        onChange={(e) => { onChange(e.target.value); }}
        onBlur={onCommit}
      >
        <option value="">—</option>
        {(col.opciones ?? []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (!col.tipo || col.tipo === "largo" || col.tipo === "texto") {
    return <RichCell valor={valor} editable={editable} onChange={onChange} onCommit={onCommit} />;
  }
  if (col.tipo === "money") {
    return (
      <div className="hp-money-wrap">
        <input
          className="hp-cell-input hp-cell-money"
          type="number"
          value={valor}
          readOnly={!editable}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
        />
        <span className="hp-money-suffix">€</span>
      </div>
    );
  }
  return (
    <input
      className="hp-cell-input"
      type={col.tipo === "num" ? "number" : col.tipo === "fecha" ? "date" : "text"}
      value={valor}
      readOnly={!editable}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
    />
  );
}

// Celda/campo de texto con rich text (HTML). El formato se aplica desde la
// RichToolbar (execCommand sobre el elemento enfocado). No reescribe su
// innerHTML mientras está enfocado, para no romper el cursor al teclear.
function RichCell({
  valor,
  editable,
  onChange,
  onCommit,
  className = "hp-cell-area hp-cell-rich",
}: {
  valor: string;
  editable: boolean;
  onChange?: (v: string) => void;
  onCommit: (html: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (ref.current && !focused.current && ref.current.innerHTML !== (valor ?? "")) {
      ref.current.innerHTML = valor ?? "";
    }
  }, [valor]);

  return (
    <div
      ref={ref}
      className={`${className} ${!editable ? "readonly" : ""}`}
      contentEditable={editable}
      suppressContentEditableWarning
      data-rich-cell="1"
      onFocus={() => { focused.current = true; }}
      onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
      onBlur={(e) => { focused.current = false; onCommit(e.currentTarget.innerHTML); }}
    />
  );
}

// Barra de formato reutilizable (mismo aspecto que la de Nota). Actúa sobre el
// elemento contentEditable que tenga el foco. Los controles son BOTONES con
// preventDefault: así el foco no sale de la celda y no se dispara el commit.
function RichToolbar({ className = "", inline = false }: { className?: string; inline?: boolean }) {
  const cmd = (c: string, v?: string) => document.execCommand(c, false, v);
  const btncls = inline ? "hp-rich-btn" : "";
  const content = (
    <>
      <button type="button" className={btncls} title="Negrita" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }}><b>B</b></button>
      <button type="button" className={btncls} title="Cursiva" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }}><i>I</i></button>
      <button type="button" className={btncls} title="Subrayado" onMouseDown={(e) => { e.preventDefault(); cmd("underline"); }}><u>U</u></button>
      <span className="hp-nota-sep" />
      <span className="hp-nota-colors">
        {CELL_TEXT_COLORS.map((c) => (
          <button key={c} type="button" title={`Color ${c}`} style={{ background: c }}
            onMouseDown={(e) => { e.preventDefault(); cmd("foreColor", c); }} />
        ))}
      </span>
      <span className="hp-nota-sep" />
      {([["2", "S"], ["3", "M"], ["4", "L"], ["5", "XL"]] as const).map(([size, label]) => (
        <button key={size} type="button" className={btncls} title={`Tamaño ${label}`}
          onMouseDown={(e) => { e.preventDefault(); cmd("fontSize", size); }}>{label}</button>
      ))}
      <span className="hp-nota-sep" />
      {CELL_FONTS.map((f) => (
        <button key={f.label} type="button" className={btncls} title={`Fuente ${f.label}`} style={{ fontFamily: f.value, fontSize: 11 }}
          onMouseDown={(e) => { e.preventDefault(); cmd("fontName", f.value); }}>{f.label}</button>
      ))}
    </>
  );
  if (inline) return content;
  return <div className={`hp-nota-toolbar hp-richbar ${className}`}>{content}</div>;
}

// Celda con soporte de autocomplete via datalist
function CeldaConAutocomp({
  col, valor, editable, onChange, onCommit, onSave, departamento, herramientaId, filaId,
}: {
  col: Columna; valor: string; editable: boolean; onChange: (v: string) => void;
  onCommit: () => void; onSave?: (v: string) => void; departamento?: string;
  herramientaId?: string; filaId?: string; listId?: string;
}) {
  // texto y largo son rich text (RichCell); ya no hay autocomplete por datalist
  // (incompatible con contentEditable). El formato prima sobre la sugerencia.
  return (
    <Celda col={col} valor={valor} editable={editable} onChange={onChange}
      onCommit={onCommit} onSave={onSave} departamento={departamento}
      herramientaId={herramientaId} filaId={filaId} />
  );
}

// ---- Tabla con registro de intervenciones ----
const ITEMS_POR_PAG = 50;

function TablaTool({
  columnas,
  filas,
  editable,
  fullName,
  departamento,
  herramientaId,
  herramientaNombre,
  onCrear,
  onDuplicar,
  onGuardar,
  onBorrar,
  onVisionar,
  onAgregarColumna,
  onImportarCSV,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  fullName: string;
  departamento: string;
  herramientaId: string;
  herramientaNombre: string;
  onCrear: () => void;
  onDuplicar?: (fila: Fila) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
  onVisionar: (id: string) => void;
  onAgregarColumna: (label: string) => void;
  onImportarCSV?: (rows: Record<string, string>[]) => Promise<void>;
}) {
  // ── Estados existentes ──────────────────────────────────────────────────
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [abierta, setAbierta] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [expandida, setExpandida] = useState(false);
  // ── Estados nuevos (20 funciones Excel) ────────────────────────────────
  const [sortKey2, setSortKey2] = useState<string | null>(null);
  const [sortDir2, setSortDir2] = useState<"asc" | "desc">("asc");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [compacto, setCompacto] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findBuscar, setFindBuscar] = useState("");
  const [findReemplazar, setFindReemplazar] = useState("");
  const [condRules, setCondRules] = useState<Array<{id: string; colKey: string; op: string; value: string; color: string}>>([]);
  const [condOpen, setCondOpen] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [batchCol, setBatchCol] = useState("");
  const [batchVal, setBatchVal] = useState("");
  const [showExtStats, setShowExtStats] = useState(false);
  const [colHeaderFilter, setColHeaderFilter] = useState<Record<string, string>>({});
  const [importando, setImportando] = useState(false);
  const [showLastEdit, setShowLastEdit] = useState(false);

  const tableRef = useRef<HTMLTableElement>(null);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef<{key: string; startX: number; startW: number} | null>(null);

  // Cierre col menu y pdf menu al hacer click fuera
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) setPdfMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Columnas visibles (sin ocultas)
  const visibleCols = useMemo(() => columnas.filter(c => !hiddenCols.has(c.key)), [columnas, hiddenCols]);

  // Valores únicos por columna (autocomplete)
  // texto y largo ahora son rich text (HTML) → sin autocomplete por datalist.
  const autocomplete = useMemo<Record<string, string[]>>(() => ({}), []);

  // Máximo por columna numérica (data bars)
  const maxVals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const col of columnas) {
      if (col.tipo === "num" || col.tipo === "money") {
        const max = Math.max(0, ...filas.map(f => parseFloat(f.datos?.[col.key] || "0") || 0));
        if (max > 0) map[col.key] = max;
      }
    }
    return map;
  }, [filas, columnas]);

  const filasFiltradas = useMemo(() => {
    let res = localOrder
      ? [...filas].sort((a, b) => {
          const ia = localOrder.indexOf(a.id);
          const ib = localOrder.indexOf(b.id);
          return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
        })
      : [...filas];
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      res = res.filter(f => columnas.some(c => stripHtml(f.datos?.[c.key] ?? "").toLowerCase().includes(q)));
    }
    for (const [k, v] of Object.entries(filtros)) {
      if (v) res = res.filter(f => (f.datos?.[k] ?? "") === v);
    }
    for (const [k, v] of Object.entries(colHeaderFilter)) {
      if (v) res = res.filter(f => stripHtml(f.datos?.[k] ?? "").toLowerCase().includes(v.toLowerCase()));
    }
    if (sortKey) {
      const col = columnas.find(c => c.key === sortKey);
      const col2 = sortKey2 ? columnas.find(c => c.key === sortKey2) : null;
      res = [...res].sort((a, b) => {
        const va = stripHtml(a.datos?.[sortKey] ?? "");
        const vb = stripHtml(b.datos?.[sortKey] ?? "");
        let cmp = 0;
        if (col?.tipo === "num" || col?.tipo === "money") {
          cmp = (parseFloat(va || "0") || 0) - (parseFloat(vb || "0") || 0);
        } else {
          cmp = va.localeCompare(vb, "es");
        }
        if (cmp === 0 && sortKey2 && col2) {
          const va2 = stripHtml(a.datos?.[sortKey2] ?? "");
          const vb2 = stripHtml(b.datos?.[sortKey2] ?? "");
          let cmp2 = 0;
          if (col2.tipo === "num" || col2.tipo === "money") {
            cmp2 = (parseFloat(va2 || "0") || 0) - (parseFloat(vb2 || "0") || 0);
          } else {
            cmp2 = va2.localeCompare(vb2, "es");
          }
          return sortDir2 === "asc" ? cmp2 : -cmp2;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return res;
  }, [filas, busqueda, filtros, colHeaderFilter, sortKey, sortDir, sortKey2, sortDir2, columnas, localOrder]);

  const totalPaginas = Math.ceil(filasFiltradas.length / ITEMS_POR_PAG);
  const filasPagina = filasFiltradas.length > ITEMS_POR_PAG
    ? filasFiltradas.slice(pagina * ITEMS_POR_PAG, (pagina + 1) * ITEMS_POR_PAG)
    : filasFiltradas;

  const todosSeleccionados = seleccionadas.size > 0 && seleccionadas.size === filasFiltradas.length;

  function val(f: Fila, key: string) {
    return draft[f.id]?.[key] ?? f.datos?.[key] ?? "";
  }
  function setVal(f: Fila, key: string, v: string) {
    setDraft((d) => ({ ...d, [f.id]: { ...f.datos, ...d[f.id], [key]: v } }));
  }
  function commit(f: Fila) {
    if (draft[f.id]) {
      onGuardar(f.id, { ...f.datos, ...draft[f.id] });
      setDraft((d) => { const n = { ...d }; delete n[f.id]; return n; });
    }
  }
  function pedirColumna() {
    const label = window.prompt("Título de la nueva columna:");
    if (label && label.trim()) onAgregarColumna(label.trim());
  }
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  function toggleFila(id: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleTodos() {
    if (todosSeleccionados) setSeleccionadas(new Set());
    else setSeleccionadas(new Set(filasFiltradas.map(f => f.id)));
  }
  function borrarSeleccionadas() {
    if (!window.confirm(`¿Eliminar ${seleccionadas.size} fila${seleccionadas.size !== 1 ? "s" : ""}?`)) return;
    for (const id of seleccionadas) onBorrar(id);
    setSeleccionadas(new Set());
  }
  function cambiarColorFila(f: Fila, color: string) {
    onGuardar(f.id, { ...f.datos, ...draft[f.id], _rowColor: color });
  }
  function limpiarColorFila(f: Fila) {
    const datos = { ...f.datos, ...draft[f.id] };
    delete datos._rowColor;
    onGuardar(f.id, datos);
  }
  function exportarCSV() {
    const cols = columnas.filter((c) => c.tipo !== "archivo");
    const header = cols.map((c) => c.label);
    const lines = [header, ...filasFiltradas.map((f) => cols.map((c) => stripHtml(f.datos?.[c.key] ?? "").replace(/\n/g, " ")))];
    const csv = lines
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${herramientaNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const cols = columnas.filter((c) => c.tipo !== "archivo");
    const proyectoNombre = localStorage.getItem("cinepack-proyecto") ?? "";
    doc.setFontSize(13);
    doc.text(proyectoNombre ? `${herramientaNombre} · ${proyectoNombre}` : herramientaNombre, 14, 14);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`CINE PACK · ${new Date().toLocaleDateString("es-ES")}`, 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [cols.map((c) => c.label)],
      body: filasFiltradas.map((f) => cols.map((c) => stripHtml(f.datos?.[c.key] ?? ""))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [159, 232, 112], textColor: [13, 13, 18], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save(`${herramientaNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  }

  // ── Funciones nuevas ────────────────────────────────────────────────────

  // Resize de columnas
  function startResize(e: React.MouseEvent, key: string) {
    e.preventDefault();
    const th = (e.target as HTMLElement).closest("th");
    const startW = th?.getBoundingClientRect().width ?? 120;
    resizingRef.current = { key, startX: e.clientX, startW };
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const newW = Math.max(60, resizingRef.current.startW + ev.clientX - resizingRef.current.startX);
      setColWidths(w => ({ ...w, [resizingRef.current!.key]: newW }));
    }
    function onUp() {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Formato condicional: devuelve color si la celda cumple alguna regla
  function getCondColor(colKey: string, value: string): string | null {
    for (const rule of condRules) {
      if (rule.colKey !== colKey) continue;
      const nv = parseFloat(value), nr = parseFloat(rule.value);
      if (rule.op === ">" && !isNaN(nv) && !isNaN(nr) && nv > nr) return rule.color;
      if (rule.op === "<" && !isNaN(nv) && !isNaN(nr) && nv < nr) return rule.color;
      if (rule.op === "=" && value === rule.value) return rule.color;
      if (rule.op === "contiene" && value.toLowerCase().includes(rule.value.toLowerCase())) return rule.color;
    }
    return null;
  }

  // Import CSV
  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
        if (lines.length < 2) return;
        function parseCSVLine(line: string): string[] {
          const result: string[] = []; let cur = ""; let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) { if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
            else { if (ch === '"') inQ = true; else if (ch === ',') { result.push(cur); cur = ""; } else cur += ch; }
          }
          result.push(cur); return result;
        }
        const headers = parseCSVLine(lines[0]);
        const colMap: Record<string, string> = {};
        for (const h of headers) {
          const col = columnas.find(c => c.label.toLowerCase() === h.toLowerCase() || c.key === h);
          if (col) colMap[h] = col.key;
        }
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const datos: Record<string, string> = {};
          headers.forEach((h, idx) => { if (colMap[h]) datos[colMap[h]] = vals[idx] ?? ""; });
          if (Object.keys(datos).length > 0) rows.push(datos);
        }
        if (onImportarCSV) await onImportarCSV(rows);
      } finally {
        setImportando(false);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  // Copiar fila al portapapeles
  function copiarFila(f: Fila) {
    const text = columnas.map(c => `${c.label}: ${stripHtml(f.datos?.[c.key] ?? "")}`).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // Buscar y reemplazar en toda la tabla
  function reemplazarTodo() {
    if (!findBuscar) return;
    for (const f of filasFiltradas) {
      const nuevosDatos: Record<string, string> = { ...f.datos };
      let changed = false;
      for (const col of columnas) {
        const v = f.datos?.[col.key] ?? "";
        if (v.includes(findBuscar)) { nuevosDatos[col.key] = v.replaceAll(findBuscar, findReemplazar); changed = true; }
      }
      if (changed) onGuardar(f.id, nuevosDatos, f);
    }
  }

  // Edición en batch sobre filas seleccionadas
  function aplicarBatchEdit() {
    if (!batchCol) return;
    for (const id of seleccionadas) {
      const f = filas.find(x => x.id === id);
      if (f) onGuardar(f.id, { ...f.datos, [batchCol]: batchVal }, f);
    }
    setBatchVal("");
  }

  // Auto-fill: copiar valores de la primera fila seleccionada a las demás
  function autoFillDown() {
    const ids = filasFiltradas.filter(f => seleccionadas.has(f.id)).map(f => f.id);
    if (ids.length < 2) return;
    const primero = filas.find(f => f.id === ids[0]);
    if (!primero) return;
    for (let i = 1; i < ids.length; i++) {
      const f = filas.find(x => x.id === ids[i]);
      if (f) onGuardar(f.id, { ...f.datos, ...primero.datos }, f);
    }
  }

  // Drag & drop para reordenar filas
  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id); e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault(); setDragOverId(id);
  }
  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const order = localOrder ?? filasFiltradas.map(f => f.id);
    const from = order.indexOf(draggingId), to = order.indexOf(targetId);
    const next = [...order]; next.splice(from, 1); next.splice(to, 0, draggingId);
    setLocalOrder(next); setDraggingId(null); setDragOverId(null);
  }

  // Navegación de teclado entre celdas
  function handleCellKeyDown(e: React.KeyboardEvent, rowIdx: number, colIdx: number) {
    if (!tableRef.current || (e.key !== "Tab" && e.key !== "Enter")) return;
    e.preventDefault();
    const nr = e.key === "Enter" ? rowIdx + 1 : rowIdx;
    const nc = e.key === "Tab" ? (e.shiftKey ? colIdx - 1 : colIdx + 1) : colIdx;
    const offset = editable ? 2 : 1;
    const sel = `tbody tr:nth-child(${nr + 1}) td:nth-child(${nc + offset}) input, tbody tr:nth-child(${nr + 1}) td:nth-child(${nc + offset}) textarea, tbody tr:nth-child(${rowIdx + 1}) td:nth-child(${nc + offset}) input, tbody tr:nth-child(${rowIdx + 1}) td:nth-child(${nc + offset}) textarea`;
    const el = tableRef.current.querySelector<HTMLElement>(sel);
    if (el) el.focus();
  }

  const fmtMon = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const fmtNum = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);

  const hayFiltroActivo = busqueda.trim() || Object.values(filtros).some(Boolean) || Object.values(colHeaderFilter).some(Boolean);
  const colsEstado = columnas.filter(c => c.tipo === "estado").slice(0, 4);
  const colEstado = columnas.find((c) => c.tipo === "estado");
  const tieneTotales = columnas.some(c => c.tipo === "money" || c.tipo === "num");

  const statsBar = (() => {
    const entries = colEstado
      ? Object.entries(
          filasFiltradas.reduce<Record<string, number>>((acc, f) => {
            const v = (f.datos?.[colEstado.key] ?? "").trim() || "Sin estado";
            acc[v] = (acc[v] ?? 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 6)
      : [];
    return (
      <div className="hp-stats-bar">
        <span className="hp-stats-total">
          {hayFiltroActivo
            ? `${filasFiltradas.length} / ${filas.length} registros`
            : `${filas.length} ${filas.length === 1 ? "registro" : "registros"}`}
        </span>
        {entries.map(([v, n]) => (
          <span key={v} className={`hp-stats-pill tono-${estadoTono(v)}`}>{v} <b>{n}</b></span>
        ))}
        {hayFiltroActivo && (
          <button className="hp-stats-clear" onClick={() => { setBusqueda(""); setFiltros({}); setColHeaderFilter({}); }}>✕ Limpiar</button>
        )}
      </div>
    );
  })();

  if (filas.length === 0) {
    return (
      <div className="hp-tabla-empty">
        <span className="hex"></span>
        <p>Esta tabla está vacía</p>
        {herramientaNombre && <p className="hp-tabla-empty-hint">Usá "{herramientaNombre}" para registrar la info de tu departamento. Cada fila es una entrada con los campos definidos.</p>}
        {editable && (
          <div className="hp-actions">
            <button className="btn acc" onClick={onCrear}>+ Agregar primera fila</button>
            <button className="btn" onClick={pedirColumna}>+ Agregar columna</button>
            {onImportarCSV && (
              <>
                <button className="btn" onClick={() => importInputRef.current?.click()} disabled={importando}>
                  {importando ? "Importando…" : "⬆ Importar CSV"}
                </button>
                <input ref={importInputRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleImportCSV} />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const contenido = (
    <>
      {/* ── Datalists para autocomplete ──────────────────────────────── */}
      {Object.entries(autocomplete).map(([key, vals]) => (
        <datalist key={key} id={`dl-${herramientaId}-${key}`}>
          {vals.map(v => <option key={v} value={v} />)}
        </datalist>
      ))}

      {/* ── Toolbar principal ────────────────────────────────────────── */}
      <div className="hp-tabla-toolbar">
        <input
          className="hp-tabla-search"
          type="search"
          placeholder="Buscar…"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(0); }}
        />
        {colsEstado.map(c => (
          <select
            key={c.key}
            className="hp-tabla-filter"
            value={filtros[c.key] ?? ""}
            onChange={e => { setFiltros(f => ({ ...f, [c.key]: e.target.value })); setPagina(0); }}
          >
            <option value="">— {c.label}</option>
            {(c.opciones ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        <div className="hp-tabla-toolbar-spacer" />

        {/* Seleccionadas: acciones en batch */}
        {seleccionadas.size > 0 && (
          <>
            <span className="hp-sel-label">{seleccionadas.size} sel.</span>
            <button className="btn" onClick={autoFillDown} title="Copiar valores de la primera fila seleccionada al resto">↓ Fill</button>
            {onDuplicar && (
              <button className="btn" onClick={() => { for (const id of seleccionadas) { const f = filas.find(x => x.id === id); if (f) onDuplicar(f); } setSeleccionadas(new Set()); }}>⧉ Dup.</button>
            )}
            <button className="btn hp-btn-danger" onClick={borrarSeleccionadas}>✕ Elim.</button>
          </>
        )}

        {/* Botones de función */}
        {editable && <button className="btn" onClick={pedirColumna} title="Añadir columna">+ Col</button>}
        <button className={`btn${findOpen ? " active" : ""}`} onClick={() => setFindOpen(v => !v)} title="Buscar y reemplazar">⌦ F&R</button>
        <button className={`btn${condOpen ? " active" : ""}`} onClick={() => setCondOpen(v => !v)} title="Formato condicional">◈ Cond.</button>
        <button className={`btn${showExtStats ? " active" : ""}`} onClick={() => setShowExtStats(v => !v)} title="Estadísticas extendidas">∑ Stats</button>
        <button className={`btn${compacto ? " active" : ""}`} onClick={() => setCompacto(v => !v)} title="Altura de fila compacta">≡ Compact</button>
        <button className={`btn${showLastEdit ? " active" : ""}`} onClick={() => setShowLastEdit(v => !v)} title="Mostrar última edición">⏱</button>

        {/* Columnas visibles */}
        <div className="hp-col-menu-wrap" ref={colMenuRef}>
          <button className="btn" onClick={() => setColMenuOpen(v => !v)} title="Mostrar/ocultar columnas">⊞ Cols</button>
          {colMenuOpen && (
            <div className="hp-col-menu-drop">
              {columnas.map(c => (
                <label key={c.key} className="hp-col-menu-item">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(c.key)}
                    onChange={() => setHiddenCols(prev => {
                      const next = new Set(prev);
                      if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                      return next;
                    })}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Orden secundario */}
        <select
          className="hp-tabla-filter"
          value={sortKey2 ?? ""}
          onChange={e => setSortKey2(e.target.value || null)}
          title="Orden secundario"
        >
          <option value="">2° orden…</option>
          {columnas.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        {sortKey2 && (
          <button className="btn" onClick={() => setSortDir2(d => d === "asc" ? "desc" : "asc")}>
            {sortDir2 === "asc" ? "↑" : "↓"}
          </button>
        )}

        <button className="btn" onClick={exportarCSV} title="Exportar CSV">CSV</button>
        <div className="hp-pdf-menu-wrap" ref={pdfMenuRef}>
          <button className="btn" onClick={() => setPdfMenuOpen(v => !v)} title="PDF">PDF ▾</button>
          {pdfMenuOpen && (
            <div className="hp-pdf-menu-drop">
              <button onClick={() => { exportarPDF(); setPdfMenuOpen(false); }}>⬇ Descargar PDF</button>
              <button onClick={() => { window.print(); setPdfMenuOpen(false); }}>🖨 Imprimir</button>
            </div>
          )}
        </div>
        {onImportarCSV && (
          <>
            <button className="btn" onClick={() => importInputRef.current?.click()} disabled={importando} title="Importar CSV">
              {importando ? "…" : "⬆ CSV"}
            </button>
            <input ref={importInputRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleImportCSV} />
          </>
        )}
        {columnas.some((c) => !c.tipo || c.tipo === "largo" || c.tipo === "texto") && (
          <>
            <span className="hp-nota-sep" />
            <RichToolbar inline />
          </>
        )}
        <button
          className="hp-expand-btn"
          onClick={() => setExpandida(v => !v)}
          title={expandida ? "Reducir" : "Pantalla completa"}
        >
          {expandida ? "⊡" : "⤢"}
        </button>
      </div>

      {/* ── Batch edit bar ───────────────────────────────────────────── */}
      {seleccionadas.size > 0 && (
        <div className="hp-batch-bar">
          <span>Editar {seleccionadas.size} filas:</span>
          <select className="hp-tabla-filter" value={batchCol} onChange={e => setBatchCol(e.target.value)}>
            <option value="">Seleccionar campo…</option>
            {columnas.filter(c => c.tipo !== "archivo").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input
            className="hp-tabla-search"
            placeholder="Nuevo valor…"
            value={batchVal}
            onChange={e => setBatchVal(e.target.value)}
          />
          <button className="btn acc" onClick={aplicarBatchEdit} disabled={!batchCol}>Aplicar</button>
        </div>
      )}

      {/* ── Find & Replace ───────────────────────────────────────────── */}
      {findOpen && (
        <div className="hp-find-bar">
          <input className="hp-tabla-search" placeholder="Buscar…" value={findBuscar} onChange={e => setFindBuscar(e.target.value)} />
          <span>→</span>
          <input className="hp-tabla-search" placeholder="Reemplazar…" value={findReemplazar} onChange={e => setFindReemplazar(e.target.value)} />
          <button className="btn acc" onClick={reemplazarTodo} disabled={!findBuscar}>Reemplazar todo</button>
          <button className="btn" onClick={() => setFindOpen(false)}>✕</button>
        </div>
      )}

      {/* ── Formato condicional ──────────────────────────────────────── */}
      {condOpen && (
        <div className="hp-cond-panel">
          <div className="hp-cond-add">
            <span>Nueva regla:</span>
            <select className="hp-tabla-filter" id="cp-cond-col">
              <option value="">Columna…</option>
              {columnas.filter(c => c.tipo !== "archivo" && c.tipo !== "link").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select className="hp-tabla-filter" id="cp-cond-op">
              <option value=">">es mayor que</option>
              <option value="<">es menor que</option>
              <option value="=">es igual a</option>
              <option value="contiene">contiene</option>
            </select>
            <input className="hp-tabla-search" placeholder="Valor…" id="cp-cond-val" style={{width:80}} />
            <input type="color" id="cp-cond-color" defaultValue="#ffd600" style={{width:36,height:30,border:"none",cursor:"pointer"}} />
            <button className="btn acc" onClick={() => {
              const col = (document.getElementById("cp-cond-col") as HTMLSelectElement)?.value;
              const op = (document.getElementById("cp-cond-op") as HTMLSelectElement)?.value;
              const val2 = (document.getElementById("cp-cond-val") as HTMLInputElement)?.value;
              const color = (document.getElementById("cp-cond-color") as HTMLInputElement)?.value;
              if (col && op && val2) setCondRules(r => [...r, {id: crypto.randomUUID(), colKey: col, op, value: val2, color}]);
            }}>+ Agregar</button>
          </div>
          {condRules.map(r => {
            const colName = columnas.find(c => c.key === r.colKey)?.label ?? r.colKey;
            return (
              <div key={r.id} className="hp-cond-rule">
                <span style={{width:14,height:14,borderRadius:2,background:r.color,display:"inline-block",marginRight:6}} />
                <span>{colName} {r.op} "{r.value}"</span>
                <button className="btn" onClick={() => setCondRules(rules => rules.filter(x => x.id !== r.id))}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="hp-print-area">
        <PrintHeader herramientaNombre={herramientaNombre} departamento={departamento} />
        <div className="hp-table-wrap">
          <table className={`hp-table${compacto ? " hp-tabla-compacta" : ""}`} ref={tableRef}>
            <colgroup>
              {editable && <col style={{width:36}} />}
              {visibleCols.map(c => (
                <col key={c.key} style={colWidths[c.key] ? {width: colWidths[c.key]} : undefined} />
              ))}
              <col style={{width:54}} />
              {editable && <col style={{width:40}} />}
              {editable && <col style={{width:70}} />}
              {showLastEdit && <col style={{width:90}} />}
            </colgroup>
            <thead>
              <tr>
                {editable && (
                  <th className="hp-th-check">
                    <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} title="Seleccionar todo" />
                  </th>
                )}
                {visibleCols.map((c, ci) => (
                  <th
                    key={c.key}
                    className={`hp-th-sortable${sortKey === c.key ? " hp-th-sorted" : ""}${ci === 0 ? " hp-th-frozen" : ""}`}
                    style={colWidths[c.key] ? {width: colWidths[c.key], minWidth: colWidths[c.key]} : undefined}
                  >
                    <div className="hp-th-inner">
                      <span onClick={() => toggleSort(c.key)} style={{cursor:"pointer",flex:1}}>
                        {c.label}
                        {sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        {sortKey2 === c.key ? (sortDir2 === "asc" ? " ↑²" : " ↓²") : ""}
                      </span>
                      <span className="hp-col-resizer" onMouseDown={e => startResize(e, c.key)} />
                    </div>
                    {/* Filtro por columna */}
                    <input
                      className="hp-col-filter-input"
                      placeholder="Filtrar…"
                      value={colHeaderFilter[c.key] ?? ""}
                      onChange={e => { setColHeaderFilter(f => ({ ...f, [c.key]: e.target.value })); setPagina(0); }}
                      onClick={e => e.stopPropagation()}
                    />
                  </th>
                ))}
                <th className="hp-th-reg">Reg.</th>
                {editable && <th className="hp-th-color" title="Color de fila"></th>}
                {editable && <th></th>}
                {showLastEdit && <th className="hp-th-edit">Editado</th>}
              </tr>
            </thead>
            <tbody>
              {filasPagina.map((f, rowIdx) => {
                const rowColor = f.datos?._rowColor || "";
                const isSelected = seleccionadas.has(f.id);
                const visto = (f.visionado_por ?? []).length > 0;
                const yoVi = (f.visionado_por ?? []).some((v) => v.usuario === fullName);
                const isDragOver = dragOverId === f.id;
                return (
                  <RowGroup key={f.id} abierta={abierta === f.id}>
                    <tr
                      draggable={editable}
                      onDragStart={e => onDragStart(e, f.id)}
                      onDragOver={e => onDragOver(e, f.id)}
                      onDrop={e => onDrop(e, f.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                      style={rowColor ? { borderLeft: `3px solid ${rowColor}`, background: rowColor + "18" } : undefined}
                      className={[
                        isSelected ? "hp-row-selected" : "",
                        isDragOver ? "hp-row-drag-over" : "",
                        draggingId === f.id ? "hp-row-dragging" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      {editable && (
                        <td className="hp-td-check">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleFila(f.id)} />
                        </td>
                      )}
                      {visibleCols.map((c, colIdx) => {
                        const cellVal = val(f, c.key);
                        const condColor = getCondColor(c.key, cellVal);
                        const isNum = c.tipo === "num" || c.tipo === "money";
                        const dataBarPct = isNum && maxVals[c.key]
                          ? Math.min(100, (parseFloat(cellVal || "0") || 0) / maxVals[c.key] * 100)
                          : 0;
                        return (
                          <td
                            key={c.key}
                            className={[
                              c.tipo === "largo" ? "hp-td-largo" : "",
                              colIdx === 0 ? "hp-td-frozen" : "",
                            ].filter(Boolean).join(" ")}
                            style={condColor ? {background: condColor + "44"} : undefined}
                            onKeyDown={e => handleCellKeyDown(e, rowIdx, colIdx)}
                          >
                            {isNum && dataBarPct > 0 && (
                              <div className="hp-databar" style={{width: `${dataBarPct}%`}} />
                            )}
                            <CeldaConAutocomp
                              col={c}
                              valor={cellVal}
                              editable={editable}
                              onChange={(v) => setVal(f, c.key, v)}
                              onCommit={() => commit(f)}
                              onSave={(v) => onGuardar(f.id, { ...f.datos, ...draft[f.id], [c.key]: v })}
                              departamento={departamento}
                              herramientaId={herramientaId}
                              filaId={f.id}
                              listId={autocomplete[c.key] ? `dl-${herramientaId}-${c.key}` : undefined}
                            />
                          </td>
                        );
                      })}
                      <td className="hp-td-reg">
                        <button
                          className={`hp-reg-btn ${visto ? "visto" : ""}`}
                          onClick={() => setAbierta(abierta === f.id ? null : f.id)}
                          title="Ver registro de intervenciones"
                        >
                          <span className="hex"></span>
                          {visto ? `${(f.visionado_por ?? []).length}✓` : "ver"}
                        </button>
                      </td>
                      {editable && (
                        <td className="hp-td-color">
                          <div className="hp-color-wrap">
                            <input
                              type="color"
                              className="hp-row-color-picker"
                              value={rowColor || "#9fe870"}
                              onChange={(e) => cambiarColorFila(f, e.target.value)}
                              title="Color de fila"
                            />
                            {rowColor && (
                              <button className="hp-color-clear" onClick={() => limpiarColorFila(f)} title="Quitar color">✕</button>
                            )}
                          </div>
                        </td>
                      )}
                      {editable && (
                        <td className="hp-td-acciones">
                          <button className="hp-dup" onClick={() => copiarFila(f)} title="Copiar al portapapeles">⎘</button>
                          {onDuplicar && (
                            <button className="hp-dup" onClick={() => onDuplicar(f)} title="Duplicar fila">⧉</button>
                          )}
                          <button className="hp-del" onClick={() => onBorrar(f.id)} title="Eliminar fila">✕</button>
                        </td>
                      )}
                      {showLastEdit && (
                        <td className="hp-td-edit" title={f.updated_at ? new Date(f.updated_at).toLocaleString("es-ES") : ""}>
                          {f.updated_at ? timeAgo(f.updated_at) : "—"}
                        </td>
                      )}
                    </tr>
                    {abierta === f.id && (
                      <tr className="hp-detail-row">
                        <td colSpan={visibleCols.length + (editable ? 4 : 2) + (showLastEdit ? 1 : 0)}>
                          <RegistroDetalle
                            fila={f}
                            yoVi={yoVi}
                            onVisionar={() => onVisionar(f.id)}
                            departamento={departamento}
                            herramientaNombre={herramientaNombre}
                            fullName={fullName}
                            onGuardar={onGuardar}
                          />
                        </td>
                      </tr>
                    )}
                  </RowGroup>
                );
              })}
            </tbody>
            {tieneTotales && (
              <tfoot>
                <tr className="hp-total-row">
                  {editable && <td></td>}
                  {visibleCols.map((c, i) => {
                    if (c.tipo === "money") {
                      const nums = filasFiltradas.map(f => parseFloat(f.datos?.[c.key] || "0") || 0);
                      const suma = nums.reduce((a, b) => a + b, 0);
                      const avg = nums.length ? suma / nums.length : 0;
                      const min = nums.length ? Math.min(...nums) : 0;
                      const max2 = nums.length ? Math.max(...nums) : 0;
                      return (
                        <td key={c.key} className="hp-total-money">
                          <div>∑ {fmtMon(suma)} €</div>
                          {showExtStats && <div className="hp-ext-stats">⌀ {fmtMon(avg)} · ↓ {fmtMon(min)} · ↑ {fmtMon(max2)}</div>}
                        </td>
                      );
                    }
                    if (c.tipo === "num") {
                      const nums = filasFiltradas.map(f => parseFloat(f.datos?.[c.key] || "0") || 0);
                      const suma = nums.reduce((a, b) => a + b, 0);
                      const avg = nums.length ? suma / nums.length : 0;
                      const min = nums.length ? Math.min(...nums) : 0;
                      const max2 = nums.length ? Math.max(...nums) : 0;
                      return (
                        <td key={c.key} className="hp-total-num">
                          <div>∑ {fmtNum(suma)}</div>
                          {showExtStats && <div className="hp-ext-stats">⌀ {fmtNum(avg)} · ↓ {fmtNum(min)} · ↑ {fmtNum(max2)}</div>}
                        </td>
                      );
                    }
                    return <td key={c.key}>{i === 0 ? `Total (${filasFiltradas.length})` : ""}</td>;
                  })}
                  <td></td>
                  {editable && <td></td>}
                  {editable && <td></td>}
                  {showLastEdit && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Paginación ───────────────────────────────────────────────── */}
      {filasFiltradas.length > ITEMS_POR_PAG && (
        <div className="hp-paginacion">
          <button className="btn" disabled={pagina === 0} onClick={() => setPagina(0)}>«</button>
          <button className="btn" disabled={pagina === 0} onClick={() => setPagina(p => Math.max(0, p - 1))}>‹</button>
          <span>Pág. {pagina + 1} / {totalPaginas} ({filasFiltradas.length} registros)</span>
          <button className="btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}>›</button>
          <button className="btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(totalPaginas - 1)}>»</button>
        </div>
      )}

      <div className="hp-actions">
        {editable && <button className="btn acc" onClick={onCrear}>+ Agregar fila</button>}
        {editable && <button className="btn" onClick={pedirColumna}>+ Agregar columna</button>}
        {localOrder && <button className="btn" onClick={() => setLocalOrder(null)}>↺ Restablecer orden</button>}
      </div>
    </>
  );

  return expandida ? (
    <div className="hp-tabla-fullscreen">
      <div className="hp-fullscreen-header">
        <span className="hex"></span>
        <span className="hp-fullscreen-title">{herramientaNombre}</span>
        <button className="hp-fullscreen-close btn" onClick={() => setExpandida(false)}>⊡ Cerrar</button>
      </div>
      {contenido}
    </div>
  ) : contenido;
}

function RowGroup({ children }: { children: React.ReactNode; abierta: boolean }) {
  return <>{children}</>;
}

function RegistroDetalle({
  fila,
  yoVi,
  onVisionar,
  departamento,
  herramientaNombre,
  fullName,
  onGuardar,
}: {
  fila: Fila;
  yoVi: boolean;
  onVisionar: () => void;
  departamento: string;
  herramientaNombre: string;
  fullName: string;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
}) {
  const reg = [...(fila.registro ?? [])].reverse().slice(0, 8);
  const vis = fila.visionado_por ?? [];
  return (
    <div className="hp-detail">
      <div className="hp-detail-col">
        <h6><span className="hex"></span> Registro de intervenciones</h6>
        {reg.length === 0 && <p className="hp-empty">Sin intervenciones.</p>}
        <ul className="hp-timeline">
          {reg.map((r, i) => (
            <li key={i}>
              <b>{r.accion === "crea" ? "Creó" : "Editó"}</b> {r.usuario} · {timeAgo(r.fecha)}
            </li>
          ))}
        </ul>
      </div>
      <div className="hp-detail-col">
        <h6><span className="hex"></span> Visionado por</h6>
        {vis.length === 0 && <p className="hp-empty">Nadie aún.</p>}
        <div className="hp-vis-chips">
          {vis.map((v, i) => (
            <span className="hp-vis-chip" key={i}>{v.usuario}</span>
          ))}
        </div>
        <button className={`btn ${yoVi ? "" : "acc"}`} style={{ marginTop: 8 }} onClick={onVisionar}>
          {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
        </button>
      </div>
    </div>
  );
}


// ---- Imagen de galería (subida real al bucket "documentos") ----
function GaleriaImg({
  path,
  editable,
  departamento,
  herramientaId,
  filaId,
  onSave,
}: {
  path: string;
  editable: boolean;
  departamento: string;
  herramientaId: string;
  filaId: string;
  onSave: (v: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let activo = true;
    if (!path) { setUrl(null); return; }
    const supabase = createClient();
    supabase.storage.from("documentos").createSignedUrl(path, 3600).then(({ data }) => {
      if (activo) setUrl(data?.signedUrl ?? null);
    });
    return () => { activo = false; };
  }, [path]);

  async function subir(file: File) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setBusy(true);
    const supabase = createClient();
    const p = `${projectId}/${departamento}/herramientas/${herramientaId}/${filaId}/img/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(p, file);
    setBusy(false);
    if (!error) onSave(p);
  }

  return (
    <>
      <div className="hp-gimg">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        ) : (
          <span className="hp-gimg-empty"><span className="hex"></span></span>
        )}
      </div>
      {editable && (
        <label className="hp-archivo-up hp-gimg-up">
          {busy ? "Subiendo…" : path ? "Cambiar imagen" : "Subir imagen"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subir(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </>
  );
}

// ---- Galería ----
function GaleriaTool({
  columnas,
  filas,
  editable,
  fullName,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
  onVisionar,
  onAgregarColumna,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  fullName: string;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>) => void;
  onBorrar: (id: string) => void;
  onVisionar: (id: string) => void;
  onAgregarColumna: (label: string) => void;
}) {
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v });
  }
  function pedirColumna() {
    const label = window.prompt("Título del nuevo campo:");
    if (label && label.trim()) onAgregarColumna(label.trim());
  }
  return (
    <>
      {editable && columnas.some((c) => !c.tipo || c.tipo === "largo" || c.tipo === "texto") && (
        <RichToolbar className="hp-tabla-richbar" />
      )}
      <div className="hp-galeria">
        {filas.map((f) => {
          const yoVi = (f.visionado_por ?? []).some((v) => v.usuario === fullName);
          const path = f.datos?.img ?? "";
          return (
            <div className="hp-gcard" key={f.id}>
              <GaleriaImg
                path={path}
                editable={editable}
                departamento={departamento}
                herramientaId={herramientaId}
                filaId={f.id}
                onSave={(v) => set(f, "img", v)}
              />
              {columnas.map((c) => (
                <label className="hp-gfield" key={c.key}>
                  <span>{c.label}</span>
                  {c.tipo === "archivo" ? (
                    <ArchivoCell
                      path={f.datos?.[c.key] ?? ""}
                      editable={editable}
                      departamento={departamento}
                      herramientaId={herramientaId}
                      filaId={f.id}
                      colKey={c.key}
                      onSave={(v) => set(f, c.key, v)}
                    />
                  ) : c.tipo === "link" ? (
                    <LinkCell valor={f.datos?.[c.key] ?? ""} editable={editable} onSave={(v) => set(f, c.key, v)} />
                  ) : !c.tipo || c.tipo === "largo" || c.tipo === "texto" ? (
                    <RichCell
                      valor={f.datos?.[c.key] ?? ""}
                      editable={editable}
                      onCommit={(html) => set(f, c.key, html)}
                      className="hp-gfield-rich hp-cell-rich"
                    />
                  ) : (
                    <input defaultValue={f.datos?.[c.key] ?? ""} readOnly={!editable} onBlur={(e) => set(f, c.key, e.target.value)} />
                  )}
                </label>
              ))}
              <div className="hp-gfoot">
                <button className={`hp-vis-mini ${yoVi ? "visto" : ""}`} onClick={() => onVisionar(f.id)}>
                  {yoVi ? "Visionado ✓" : "Visionar"}
                </button>
                {editable && <button className="hp-del" onClick={() => onBorrar(f.id)}>✕</button>}
              </div>
            </div>
          );
        })}
      </div>
      {editable && (
        <div className="hp-actions">
          <button className="btn acc" onClick={onCrear}>+ Agregar tarjeta</button>
          <button className="btn" onClick={pedirColumna}>+ Agregar campo</button>
        </div>
      )}
    </>
  );
}

// ---- Ficha ----
function FichaTool({
  campos,
  fila,
  editable,
  fullName,
  departamento,
  herramientaId,
  herramientaNombre,
  asegurar,
  onGuardar,
  onVisionar,
  onAgregarCampo,
}: {
  campos: Columna[];
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  departamento: string;
  herramientaId: string;
  herramientaNombre: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onVisionar: (id: string) => void;
  onAgregarCampo: (label: string) => void;
}) {
  async function set(key: string, v: string) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }
  function pedirCampo() {
    const label = window.prompt("Título del nuevo campo:");
    if (label && label.trim()) onAgregarCampo(label.trim());
  }
  const yoVi = !!fila && (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
  return (
    <div className="hp-print-area">
    <PrintHeader herramientaNombre={herramientaNombre} departamento={departamento} />
    {editable && campos.some((c) => !c.tipo || c.tipo === "largo" || c.tipo === "texto") && (
      <RichToolbar className="hp-ficha-richbar" />
    )}
    <div className="hp-ficha">
      {campos.map((c) => (
        <label className="hp-ficha-field" key={c.key}>
          <span>{c.label}</span>
          {c.tipo === "archivo" ? (
            fila ? (
              <ArchivoCell
                path={fila.datos?.[c.key] ?? ""}
                editable={editable}
                departamento={departamento}
                herramientaId={herramientaId}
                filaId={fila.id}
                colKey={c.key}
                onSave={(v) => set(c.key, v)}
              />
            ) : (
              <span className="hp-archivo-empty">—</span>
            )
          ) : c.tipo === "link" ? (
            <LinkCell
              valor={fila?.datos?.[c.key] ?? ""}
              editable={editable}
              onSave={(v) => set(c.key, v)}
            />
          ) : !c.tipo || c.tipo === "largo" || c.tipo === "texto" ? (
            <RichCell
              valor={fila?.datos?.[c.key] ?? ""}
              editable={editable}
              onCommit={(html) => set(c.key, html)}
              className="hp-ficha-rich hp-cell-rich"
            />
          ) : c.tipo === "estado" ? (
            <select
              className={`tono-${estadoTono(fila?.datos?.[c.key] ?? "")}`}
              defaultValue={fila?.datos?.[c.key] ?? ""}
              disabled={!editable}
              onChange={(e) => set(c.key, e.target.value)}
            >
              <option value="">—</option>
              {(c.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : c.tipo === "money" ? (
            <div className="hp-money-wrap">
              <input
                type="number"
                className="hp-cell-money"
                defaultValue={fila?.datos?.[c.key] ?? ""}
                readOnly={!editable}
                onBlur={(e) => set(c.key, e.target.value)}
              />
              <span className="hp-money-suffix">€</span>
            </div>
          ) : (
            <input
              type={c.tipo === "fecha" ? "date" : c.tipo === "num" ? "number" : "text"}
              defaultValue={fila?.datos?.[c.key] ?? ""}
              readOnly={!editable}
              onBlur={(e) => set(c.key, e.target.value)}
            />
          )}
        </label>
      ))}
      {editable && (
        <div className="hp-ficha-add">
          <button className="btn" onClick={pedirCampo}>+ Agregar campo</button>
        </div>
      )}
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
          </button>
        </div>
      )}
    </div>
    {fila && (
      <div className="hp-actions">
        <button className="btn" onClick={() => window.print()}>📄 Exportar PDF</button>
      </div>
    )}
    </div>
  );
}

// ---- Nota ----
const NOTA_COLORS = ["#111111","#F4F4F6","#9FE870","#11C2DC","#F5A623","#FF6B6B","#C084FC","#60A5FA","#FCD34D"];
const NOTA_HIGHLIGHT = ["#FCD34D","#86EFAC","#93C5FD","#F9A8D4","#FCA5A5","transparent"];

function NotaTool({
  fila,
  editable,
  fullName,
  asegurar,
  onGuardar,
  onVisionar,
}: {
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onVisionar: (id: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (editorRef.current && (!initialised.current || fila?.id)) {
      editorRef.current.innerHTML = fila?.datos?.texto ?? "";
      initialised.current = true;
    }
  }, [fila?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function commit() {
    const html = editorRef.current?.innerHTML ?? "";
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, texto: html }, f);
  }

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }

  function highlight(color: string) {
    // hiliteColor = only selected text; backColor = whole block. Try hiliteColor first (Firefox/Chrome).
    const cmd = document.queryCommandSupported("hiliteColor") ? "hiliteColor" : "backColor";
    exec(cmd, color === "transparent" ? "transparent" : color);
  }

  const yoVi = !!fila && (fila.visionado_por ?? []).some((v) => v.usuario === fullName);

  return (
    <div className="hp-nota-wrap">
      {editable && (
        <div className="hp-nota-toolbar">
          {/* Formato inline */}
          <button type="button" title="Negrita (Ctrl+B)" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}><b>B</b></button>
          <button type="button" title="Cursiva (Ctrl+I)" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}><i>I</i></button>
          <button type="button" title="Subrayado (Ctrl+U)" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}><u>U</u></button>
          <button type="button" title="Tachado" onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }}><s>S</s></button>
          <span className="hp-nota-sep"></span>
          {/* Bloques */}
          <button type="button" title="Título" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "H3"); }}>H</button>
          <button type="button" title="Texto normal" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "DIV"); }}>¶</button>
          <button type="button" title="Lista viñetas" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}>•</button>
          <button type="button" title="Lista numerada" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}>1.</button>
          <span className="hp-nota-sep"></span>
          {/* Alineación */}
          <button type="button" title="Alinear izquierda" onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }}>⬅</button>
          <button type="button" title="Centrar" onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }}>≡</button>
          <button type="button" title="Alinear derecha" onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }}>➡</button>
          <span className="hp-nota-sep"></span>
          {/* Color de texto */}
          <span className="hp-nota-colors">
            {NOTA_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={`Color texto ${c}`}
                style={{ background: c }}
                onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c); }}
              />
            ))}
          </span>
          <span className="hp-nota-sep"></span>
          {/* Resaltado */}
          <span className="hp-nota-colors hp-nota-highlights">
            {NOTA_HIGHLIGHT.map((c) => (
              <button
                key={c}
                type="button"
                title={c === "transparent" ? "Quitar resaltado" : `Resaltar ${c}`}
                style={{ background: c === "transparent" ? "var(--hl1)" : c, border: c === "transparent" ? "1px dashed var(--muted)" : "2px solid transparent" }}
                onMouseDown={(e) => { e.preventDefault(); highlight(c); }}
              >
                {c === "transparent" ? "✕" : ""}
              </button>
            ))}
          </span>
          <span className="hp-nota-sep"></span>
          {/* Tamaño */}
          <select
            title="Tamaño de letra"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { exec("fontSize", e.target.value); e.target.value = ""; }}
            defaultValue=""
          >
            <option value="" disabled>Tamaño</option>
            <option value="2">Pequeño</option>
            <option value="3">Normal</option>
            <option value="4">Grande</option>
            <option value="5">Muy grande</option>
          </select>
        </div>
      )}
      <div
        ref={editorRef}
        className={`hp-nota hp-nota-editor ${!editable ? "readonly" : ""}`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={commit}
        data-placeholder="Escribí aquí…"
      />
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Checklist ----
type Item = { texto: string; hecho: boolean };
function ChecklistTool({
  fila,
  editable,
  fullName,
  asegurar,
  onGuardar,
  onVisionar,
}: {
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onVisionar: (id: string) => void;
}) {
  const items: Item[] = (() => {
    try { return JSON.parse(fila?.datos?.items ?? "[]"); } catch { return []; }
  })();
  const [nuevo, setNuevo] = useState("");

  async function persist(next: Item[]) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, items: JSON.stringify(next) }, f);
  }
  const yoVi = !!fila && (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
  const hechas = items.filter((i) => i.hecho).length;

  return (
    <div className="hp-checklist">
      {items.length > 0 && (
        <div className="hp-check-progress">
          <div className="hp-check-bar"><span style={{ width: `${(hechas / items.length) * 100}%` }}></span></div>
          <span>{hechas}/{items.length}</span>
        </div>
      )}
      {items.map((it, idx) => (
        <label key={idx} className={`hp-check-row ${it.hecho ? "done" : ""}`}>
          <input
            type="checkbox"
            checked={it.hecho}
            disabled={!editable}
            onChange={() => persist(items.map((x, i) => (i === idx ? { ...x, hecho: !x.hecho } : x)))}
          />
          <span>{it.texto}</span>
          {editable && <button className="hp-del" onClick={() => persist(items.filter((_, i) => i !== idx))}>✕</button>}
        </label>
      ))}
      {editable && (
        <div className="hp-check-add">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nuevo.trim()) { e.preventDefault(); persist([...items, { texto: nuevo.trim(), hecho: false }]); setNuevo(""); } }}
            placeholder="Nuevo punto…"
          />
          <button className="btn" onClick={() => { if (nuevo.trim()) { persist([...items, { texto: nuevo.trim(), hecho: false }]); setNuevo(""); } }}>Añadir</button>
        </div>
      )}
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
          </button>
        </div>
      )}
    </div>
  );
}

function Firma({ fila }: { fila: Fila }) {
  const vis = fila.visionado_por ?? [];
  return (
    <span className="hp-firma">
      ✎ {fila.editor_nombre ?? fila.autor_nombre ?? "—"} · {timeAgo(fila.updated_at)}
      {vis.length > 0 && <> · 👁 {vis.map((v) => v.usuario).join(", ")}</>}
    </span>
  );
}
