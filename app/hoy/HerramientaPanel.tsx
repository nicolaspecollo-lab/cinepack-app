"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";
import type { Herramienta, Columna } from "../herramientas";
import GestionAccesosPanel from "./GestionAccesosPanel";
import Icon from "../components/Icon";
import ToolMenu from "../components/ToolMenu";

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
const CELL_TEXT_COLORS = ["#111111", "#F4F4F6", "#9EEE6A", "#19CBE6", "#E8A330", "#F07A7A", "#C084FC"];

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

// ¿Esta herramienta tipo "tabla" tiene una vista a medida? Si no, cae al
// TablaTool genérico. Centralizado acá para no arrastrar una cadena de
// negaciones en el render (cada patrón nuevo se suma a esta lista).
// Referencia sets/constantes definidos más abajo: es seguro porque solo se
// invoca en tiempo de render, cuando el módulo ya está inicializado.
function tablaTieneVistaBespoke(id: string): boolean {
  return (
    id === "foto-marcas-foco" ||
    id === "luz-generador" ||
    id === "arte-timeline-decorados" ||
    id === "maq-efectos-especiales-maq" ||
    PLANO_BOARD_IDS.has(id) ||
    PENDIENTES_BOARD_IDS.has(id) ||
    FICHA_EQUIPO_IDS.has(id) ||
    AGENDA_DIA_IDS.has(id) ||
    CONTINUIDAD_PERSONAJE_IDS.has(id) ||
    PRESUPUESTO_BOARD_IDS.has(id) ||
    CASHFLOW_IDS.has(id) ||
    FINANCIACION_PIPELINE_IDS.has(id) ||
    DOC_STATUS_IDS.has(id) ||
    id === "ej-modelo-financiero" ||
    id === "prod-stripboard"
  );
}

// Control segmentado CINEPACK — el reemplazo universal del <select> nativo
// (que arrastra el desplegable del SO y rompe la estética). Celdas que se
// seleccionan, esquinas rectas; la activa se colorea por su tono semántico
// (verde/ámbar/rojo/cian) con texto casi-negro, o por el acento del depto.
export function EstadoSeg({
  valor,
  opciones,
  onPick,
  editable,
  chip = false,
  color = false,
}: {
  valor: string;
  opciones: string[];
  onPick: (v: string) => void;
  editable: boolean;
  chip?: boolean;
  color?: boolean;
}) {
  return (
    <div className={`cp-seg ${chip ? "cp-seg-chip" : ""}`} role="group">
      {opciones.map((op) => {
        const on = valor === op;
        return (
          <button
            key={op}
            type="button"
            disabled={!editable}
            className={`cp-seg-cell ${on ? "cp-seg-on" : ""} ${on && color ? `seg-${estadoTono(op)}` : ""}`}
            onClick={() => onPick(on ? "" : op)}
          >
            {op || "—"}
          </button>
        );
      })}
    </div>
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
  const t = useTranslations("hp");
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
  // Vista activa de una herramienta tipo tabla: el tablero a medida, la tabla
  // con todo el poder (buscar/filtrar/exportar) o la carpeta de archivos.
  // Nunca le sacamos poder al usuario: las tres conviven en un toggle.
  const [vista, setVista] = useState<"tablero" | "tabla" | "archivos">(
    herramienta.tipo === "tabla" && tablaTieneVistaBespoke(herramienta.id) ? "tablero" : "tabla"
  );
  useEffect(() => {
    setVista(herramienta.tipo === "tabla" && tablaTieneVistaBespoke(herramienta.id) ? "tablero" : "tabla");
  }, [herramienta.id, herramienta.tipo]);

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
    if (entry.tipo === "crea") return t("rowCreated");
    if (entry.tipo === "borra") return t("rowDeleted");
    return t("editAction");
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
        <h4>{t("loadingTool", { name: herramienta.nombre.toLowerCase() })}</h4>
      </div>
    );
  }

  const extraCols: Columna[] = meta?.datos?._extra ? JSON.parse(meta.datos._extra) : [];
  const extraCampos: Columna[] = filas[0]?.datos?._extra ? JSON.parse(filas[0].datos._extra) : [];
  const esTabla = herramienta.tipo === "tabla";
  const tieneTablero = esTabla && tablaTieneVistaBespoke(herramienta.id);

  return (
    <div className="hp">
      {saveState !== "idle" && (
        <div className={`hp-savebadge ${saveState}`}>
          {saveState === "saving" ? t("saving") : t("saved")}
        </div>
      )}
      {error && (
        <div className="hp-error">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {herramienta.hint && <p className="hp-hint">{herramienta.hint}</p>}

      {esTabla && (
        <div className="dsubtabs hp-view-tabs">
          {tieneTablero && (
            <button className={`dsubtab ${vista === "tablero" ? "active" : ""}`} onClick={() => setVista("tablero")}>
              <Icon name="film" size={12} /> {t("viewBoard")}
            </button>
          )}
          <button className={`dsubtab ${vista === "tabla" ? "active" : ""}`} onClick={() => setVista("tabla")}>
            <Icon name="table" size={12} /> {t("viewTable")}
          </button>
          <button className={`dsubtab ${vista === "archivos" ? "active" : ""}`} onClick={() => setVista("archivos")}>
            <Icon name="folder" size={12} /> {t("viewFiles")}
          </button>
        </div>
      )}

      {esTabla && vista === "tablero" && (
        <>
      {herramienta.tipo === "tabla" && herramienta.id === "foto-marcas-foco" && (
        <FocoCueSheet
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && PLANO_BOARD_IDS.has(herramienta.id) && (
        <PlanoBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && PENDIENTES_BOARD_IDS.has(herramienta.id) && (
        <PendientesBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "luz-generador" && (
        <ControlGenerador
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && CONTINUIDAD_PERSONAJE_IDS.has(herramienta.id) && (
        <ContinuidadPersonaje
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && AGENDA_DIA_IDS.has(herramienta.id) && (
        <AgendaDia
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && FICHA_EQUIPO_IDS.has(herramienta.id) && (
        <FichaEquipo
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "maq-efectos-especiales-maq" && (
        <FxAntesDespues
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "arte-timeline-decorados" && (
        <TimelineDecorados
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && PRESUPUESTO_BOARD_IDS.has(herramienta.id) && (
        <PresupuestoBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && CASHFLOW_IDS.has(herramienta.id) && (
        <CashflowChart
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && FINANCIACION_PIPELINE_IDS.has(herramienta.id) && (
        <FinanciacionPipeline
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && DOC_STATUS_IDS.has(herramienta.id) && (
        <DocStatusBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "ej-modelo-financiero" && (
        <ModeloFinanciero
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.id === "prod-stripboard" && (
        <StripboardTool
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}
        </>
      )}

      {esTabla && vista === "tabla" && (
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

      {esTabla && vista === "archivos" && (
        <CarpetaArchivos departamento={departamento} herramientaId={herramienta.id} editable={editable} />
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

      {herramienta.tipo === "ficha" && herramienta.id === "ej-kpis" && (
        <KpiDashboard
          campos={[...(herramienta.campos ?? []), ...extraCampos]}
          fila={filas[0]}
          editable={editable}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
        />
      )}

      {herramienta.tipo === "ficha" && herramienta.id === "prod-parte-diario" && (
        <ParteDiario
          campos={[...(herramienta.campos ?? []), ...extraCampos]}
          fila={filas[0]}
          editable={editable}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
        />
      )}

      {herramienta.tipo === "ficha" && herramienta.id !== "ej-kpis" && herramienta.id !== "prod-parte-diario" && (
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
          estiloDoc={herramienta.estiloDoc}
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

      {esSingle && filas[0] && (
        <div className="hp-thread-section">
          <Firma fila={filas[0]} />
        </div>
      )}

      {editable && historial.length > 0 && (
        <div className="hp-historial">
          <span className="hp-historial-label">{t("recentChanges")}</span>
          <ul>
            {historial.map((h) => (
              <li key={h.id}>
                <span>{describirHistorial(h)}</span>
                <button className="btn" onClick={() => deshacer(h)}>{t("undo")}</button>
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
    createClient().storage.from("documentos").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!activo) return;
      if (error) console.error("createSignedUrl falló:", path, error);
      setUrl(data?.signedUrl ?? null);
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
  const t = useTranslations("hp");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileName = path ? path.split("/").pop()?.replace(/^\d+-/, "") ?? path : "";

  async function subir(file: File) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const p = `${projectId}/${safeKey(departamento)}/herramientas/${safeKey(herramientaId)}/${filaId}/${safeKey(colKey)}/${Date.now()}-${safeKey(file.name)}`;
    const { error } = await supabase.storage.from("documentos").upload(p, file);
    setBusy(false);
    if (error) {
      setErr(t("uploadError", { msg: error.message }));
      return;
    }
    onSave(p);
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
          {busy ? "…" : path ? t("change") : t("upload")}
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
      {err && <span className="hp-archivo-err">{err}</span>}
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

// Barra de formato reutilizable (mismo patrón compacto que la de Nota: B/I/U
// + color y formato en popovers). Actúa sobre el contentEditable con foco;
// todo con preventDefault para no perder la selección de la celda.
function RichToolbar({ className = "", inline = false }: { className?: string; inline?: boolean }) {
  const t = useTranslations("hp");
  const cmd = (c: string, v?: string) => document.execCommand(c, false, v);
  const barRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<null | "color" | "format">(null);

  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) { if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const content = (
    <>
      <div className="hp-tb-group">
        <button type="button" title={t("bold")} onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }}><Icon name="bold" /></button>
        <button type="button" title={t("italic")} onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }}><Icon name="italic" /></button>
        <button type="button" title={t("underline")} onMouseDown={(e) => { e.preventDefault(); cmd("underline"); }}><Icon name="underline" /></button>
      </div>
      <div className="hp-tb-group">
        <div className="hp-tb-pop">
          <button type="button" className={`hp-tb-trigger${menu === "color" ? " open" : ""}`} title={t("textColor")}
            onMouseDown={(e) => { e.preventDefault(); setMenu(menu === "color" ? null : "color"); }}>
            <Icon name="text-color" /><Icon name="chevron-down" size={9} />
          </button>
          {menu === "color" && (
            <div className="hp-tb-menu hp-tb-swatches">
              {CELL_TEXT_COLORS.map((c) => (
                <button key={c} type="button" title={c} style={{ background: c }}
                  onMouseDown={(e) => { e.preventDefault(); cmd("foreColor", c); setMenu(null); }} />
              ))}
            </div>
          )}
        </div>
        <div className="hp-tb-pop">
          <button type="button" className={`hp-tb-trigger${menu === "format" ? " open" : ""}`} title={t("textSize")}
            onMouseDown={(e) => { e.preventDefault(); setMenu(menu === "format" ? null : "format"); }}>
            <Icon name="type" /><Icon name="chevron-down" size={9} />
          </button>
          {menu === "format" && (
            <div className="hp-tb-menu hp-tb-sizes">
              <span className="tm-section-title">{t("textSize")}</span>
              {([["2", t("sizeSmall")], ["3", t("sizeNormal")], ["4", t("sizeLarge")], ["5", t("sizeXLarge")]] as const).map(([size, label]) => (
                <button key={size} type="button" onMouseDown={(e) => { e.preventDefault(); cmd("fontSize", size); setMenu(null); }}>{label}</button>
              ))}
              <span className="tm-section-title" style={{ marginTop: 4 }}>{t("fontLabel")}</span>
              {CELL_FONTS.map((f) => (
                <button key={f.label} type="button" style={{ fontFamily: f.value }}
                  onMouseDown={(e) => { e.preventDefault(); cmd("fontName", f.value); setMenu(null); }}>{f.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
  if (inline) return <span className="hp-richbar-inline" ref={barRef}>{content}</span>;
  return <div className={`hp-nota-toolbar hp-richbar ${className}`} ref={barRef}>{content}</div>;
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

// ---- Cue sheet de foco (Foquista) ----
// Puesto de trabajo a medida para "foto-marcas-foco": un foquista no lee una
// grilla de datos en pleno rodaje, lee marcas grandes y legibles por toma.
// Reemplaza la tabla genérica solo para esta herramienta puntual.
function FocoCueSheet({
  columnas,
  filas,
  editable,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const label = (key: string) => columnas.find((c) => c.key === key)?.label ?? key;

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const ordenadas = [...filas].sort((a, b) =>
    (a.datos?.escena ?? "").localeCompare(b.datos?.escena ?? "", "es", { numeric: true })
  );

  function Marca({ f, k, tono }: { f: Fila; k: "distA" | "distB" | "distC"; tono: "a" | "b" | "c" }) {
    return (
      <div className={`hp-foco-mark hp-foco-mark-${tono}`}>
        <span className="hp-foco-mark-label">{k === "distA" ? "A" : k === "distB" ? "B" : "C"}</span>
        <input
          className="hp-foco-mark-val"
          type="number"
          step="0.1"
          inputMode="decimal"
          defaultValue={f.datos?.[k] ?? ""}
          readOnly={!editable}
          onBlur={(e) => set(f, k, e.target.value)}
          placeholder="—"
        />
        <span className="hp-foco-mark-unit">m</span>
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && (
            <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>
          )}
        </div>
      ) : (
        <div className="hp-foco-grid">
          {ordenadas.map((f) => (
            <div className="hp-foco-card" key={f.id}>
              <div className="hp-foco-head">
                <input
                  className="hp-foco-escena"
                  defaultValue={f.datos?.escena ?? ""}
                  placeholder={label("escena")}
                  readOnly={!editable}
                  onBlur={(e) => set(f, "escena", e.target.value)}
                />
                <input
                  className="hp-foco-optica"
                  defaultValue={f.datos?.optica ?? ""}
                  placeholder={label("optica")}
                  readOnly={!editable}
                  onBlur={(e) => set(f, "optica", e.target.value)}
                />
                {editable && (
                  <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>
                )}
              </div>
              <div className="hp-foco-marks">
                <Marca f={f} k="distA" tono="a" />
                <span className="hp-foco-arrow">→</span>
                <Marca f={f} k="distB" tono="b" />
                <span className="hp-foco-arrow">→</span>
                <Marca f={f} k="distC" tono="c" />
              </div>
              <textarea
                className="hp-foco-notas"
                defaultValue={f.datos?.notas ?? ""}
                placeholder={label("notas")}
                readOnly={!editable}
                onBlur={(e) => set(f, "notas", e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Tablero de planos (shot board) ----
// Plan técnico de cámara, plan de cámara por escena, guión técnico y orden
// del día comparten una misma realidad: un equipo de cámara no consulta esto
// como una tabla de datos sueltos, lo recorre como un plan de rodaje —
// plano por plano, agrupado por escena (o en orden de ejecución para la
// orden del día). Tarjetas grandes con el número de plano destacado.
const PLANO_BOARD_IDS = new Set([
  "foto-shotlist",
  "foto-plan-camara",
  "foto-guion-tecnico",
  "foto-orden-dia-camara",
  "foto-movimientos",
  "foto-plan-iluminacion",
  "luz-plan-iluminacion",
]);
// La orden del día es una secuencia de ejecución del día, no un agrupado
// por escena (un mismo set puede mezclar varias escenas en el orden real).
const PLANO_BOARD_NO_GROUP = new Set(["foto-orden-dia-camara"]);

function PlanoBoard({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colGrupo = PLANO_BOARD_NO_GROUP.has(herramientaId)
    ? undefined
    : columnas.find((c) => c.key === "escena");
  const colNum = columnas.find((c) => ["plano", "num_plano", "orden"].includes(c.key));
  const colEstado = columnas.find((c) => c.tipo === "estado" && (c.key === "estado" || c.key === "ok"));
  const colDesc = columnas.find((c) => c.key !== colGrupo?.key && /desc/.test(c.key));
  const colLink = columnas.find((c) => c.tipo === "link");
  const colArchivo = columnas.find((c) => c.tipo === "archivo");
  const usados = new Set(
    [colGrupo?.key, colNum?.key, colEstado?.key, colDesc?.key, colLink?.key, colArchivo?.key].filter(Boolean) as string[]
  );
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter(
    (c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo"
  );

  function ordenar(fs: Fila[]) {
    if (!colNum) return fs;
    return [...fs].sort((a, b) => {
      const va = a.datos?.[colNum.key] ?? "";
      const vb = b.datos?.[colNum.key] ?? "";
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return va.localeCompare(vb, "es", { numeric: true });
    });
  }

  function ChipInput({ f, c }: { f: Fila; c: Columna }) {
    const v = f.datos?.[c.key] ?? "";
    if (c.tipo === "estado") {
      return <EstadoSeg valor={v} opciones={c.opciones ?? []} onPick={(nv) => set(f, c.key, nv)} editable={editable} chip color />;
    }
    return (
      <input
        className="hp-plano-chip-input"
        type={c.tipo === "num" ? "number" : c.tipo === "fecha" ? "date" : "text"}
        defaultValue={v}
        readOnly={!editable}
        placeholder="—"
        onBlur={(e) => set(f, c.key, e.target.value)}
      />
    );
  }

  function Tarjeta(f: Fila) {
    const estadoVal = colEstado ? f.datos?.[colEstado.key] ?? "" : "";
    return (
      <div className="hp-plano-card" key={f.id}>
        <div className="hp-plano-head">
          {colNum && (
            <input
              className="hp-plano-num"
              defaultValue={f.datos?.[colNum.key] ?? ""}
              placeholder="—"
              readOnly={!editable}
              onBlur={(e) => set(f, colNum.key, e.target.value)}
            />
          )}
          {colEstado && (
            <EstadoSeg valor={estadoVal} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} color />
          )}
          <span className="hp-plano-head-spacer" />
          {editable && (
            <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>
          )}
        </div>
        {colDesc && (
          <textarea
            className="hp-plano-desc"
            defaultValue={stripHtml(f.datos?.[colDesc.key] ?? "")}
            placeholder={colDesc.label}
            readOnly={!editable}
            onBlur={(e) => set(f, colDesc.key, e.target.value)}
            rows={2}
          />
        )}
        {colsChip.length > 0 && (
          <div className="hp-plano-specs">
            {colsChip.map((c) => (
              <label className="hp-plano-chip" key={c.key}>
                <span className="hp-plano-chip-label">{c.label}</span>
                <ChipInput f={f} c={c} />
              </label>
            ))}
          </div>
        )}
        {colLink && <LinkCell valor={f.datos?.[colLink.key] ?? ""} editable={editable} onSave={(v) => set(f, colLink.key, v)} />}
        {colArchivo && (
          <ArchivoCell
            path={f.datos?.[colArchivo.key] ?? ""}
            editable={editable}
            departamento={departamento}
            herramientaId={herramientaId}
            filaId={f.id}
            colKey={colArchivo.key}
            onSave={(v) => set(f, colArchivo.key, v)}
          />
        )}
        {colsNotas.map((c) => (
          <label className="hp-plano-note" key={c.key}>
            <span>{c.label}</span>
            <textarea
              defaultValue={f.datos?.[c.key] ?? ""}
              readOnly={!editable}
              onBlur={(e) => set(f, c.key, e.target.value)}
              rows={2}
            />
          </label>
        ))}
      </div>
    );
  }

  const grupos = colGrupo
    ? Object.entries(
        filas.reduce<Record<string, Fila[]>>((acc, f) => {
          const nombre = (f.datos?.[colGrupo.key] ?? "").trim() || t("noScene");
          (acc[nombre] ??= []).push(f);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
    : null;

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : grupos ? (
        grupos.map(([nombre, fs]) => (
          <div className="hp-gal-group" key={nombre}>
            <div className="hp-gal-group-head">
              <span className="hex"></span>
              <span>{nombre}</span>
              <span className="hp-gal-group-count">{fs.length}</span>
            </div>
            <div className="hp-plano-grid">{ordenar(fs).map(Tarjeta)}</div>
          </div>
        ))
      ) : (
        <div className="hp-plano-grid">{ordenar(filas).map(Tarjeta)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Tablero de pendientes (procurement kanban) ----
// Props pendientes de conseguir, petición de equipo de iluminación: el
// trabajo real acá es "¿qué nos falta todavía y qué tan urgente es?", no
// una fila de tabla. Columnas Kanban por estado (en el orden que ya definía
// la herramienta), tarjeta con prioridad/urgencia destacada.
const PENDIENTES_BOARD_IDS = new Set([
  "arte-props-pendientes",
  "luz-peticion-equipo",
  "arte-build-sheet",
  "arte-desglose-atrezzo",
  "prod-proveedores",
]);
// arte-desglose-atrezzo empieza por "escena", pero lo que identifica la
// tarjeta es el objeto a conseguir, no la escena.
const PENDIENTES_BOARD_TITULO: Record<string, string> = { "arte-desglose-atrezzo": "objeto" };

function PendientesBoard({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colEstado = columnas.find((c) => c.tipo === "estado" && c.key === "estado");
  const tituloKey = PENDIENTES_BOARD_TITULO[herramientaId];
  const colTitulo = tituloKey ? columnas.find((c) => c.key === tituloKey) : columnas[0];
  const colPrioridad = columnas.find((c) => c.tipo === "estado" && (c.key === "prioridad" || c.key === "urgencia"));
  const colArchivo = columnas.find((c) => c.tipo === "archivo");
  const colLink = columnas.find((c) => c.tipo === "link");
  const usados = new Set(
    [colEstado?.key, colTitulo?.key, colPrioridad?.key, colArchivo?.key, colLink?.key].filter(Boolean) as string[]
  );
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  function Tarjeta(f: Fila) {
    const prioVal = colPrioridad ? f.datos?.[colPrioridad.key] ?? "" : "";
    return (
      <div className="hp-pend-card" key={f.id}>
        <div className="hp-pend-head">
          <input
            className="hp-pend-titulo"
            defaultValue={colTitulo ? f.datos?.[colTitulo.key] ?? "" : ""}
            placeholder={colTitulo?.label ?? ""}
            readOnly={!editable}
            onBlur={(e) => colTitulo && set(f, colTitulo.key, e.target.value)}
          />
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        {colPrioridad && (
          <EstadoSeg valor={prioVal} opciones={colPrioridad.opciones ?? []} onPick={(v) => set(f, colPrioridad.key, v)} editable={editable} color />
        )}
        {colsChip.length > 0 && (
          <div className="hp-pend-specs">
            {colsChip.map((c) => (
              <label className="hp-pend-chip" key={c.key}>
                <span className="hp-pend-chip-label">{c.label}</span>
                {c.tipo === "estado" ? (
                  <EstadoSeg valor={f.datos?.[c.key] ?? ""} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={editable} chip color />
                ) : (
                  <input
                    className="hp-pend-chip-input"
                    type={c.tipo === "num" ? "number" : c.tipo === "fecha" ? "date" : c.tipo === "money" ? "number" : "text"}
                    defaultValue={f.datos?.[c.key] ?? ""}
                    readOnly={!editable}
                    placeholder="—"
                    onBlur={(e) => set(f, c.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        )}
        {colsNotas.map((c) => (
          <textarea
            key={c.key}
            className="hp-pend-nota"
            defaultValue={c.key in (f.datos ?? {}) ? f.datos[c.key] : ""}
            placeholder={c.label}
            readOnly={!editable}
            onBlur={(e) => set(f, c.key, e.target.value)}
            rows={2}
          />
        ))}
        {colLink && <LinkCell valor={f.datos?.[colLink.key] ?? ""} editable={editable} onSave={(v) => set(f, colLink.key, v)} />}
        {colArchivo && (
          <ArchivoCell
            path={f.datos?.[colArchivo.key] ?? ""}
            editable={editable}
            departamento={departamento}
            herramientaId={herramientaId}
            filaId={f.id}
            colKey={colArchivo.key}
            onSave={(v) => set(f, colArchivo.key, v)}
          />
        )}
        {editable && colEstado && (
          <label className="hp-pend-mover-wrap">
            <span className="hp-pend-mover-label">{t("pendMoveTo")}</span>
            <EstadoSeg valor={f.datos?.[colEstado.key] ?? ""} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} chip color />
          </label>
        )}
      </div>
    );
  }

  if (!colEstado) return null;
  const columnasKanban = [...(colEstado.opciones ?? []), t("noStatus")];
  const porEstado = columnasKanban.map((op) => ({
    nombre: op,
    filas: filas.filter((f) => (f.datos?.[colEstado.key] ?? "") === op || (!f.datos?.[colEstado.key] && op === t("noStatus"))),
  }));

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-pend-board">
          {porEstado.map((col) => (
            <div className={`hp-pend-col tono-${estadoTono(col.nombre)}`} key={col.nombre}>
              <div className="hp-pend-col-head">
                <span>{col.nombre}</span>
                <span className="hp-pend-col-count">{col.filas.length}</span>
              </div>
              <div className="hp-pend-col-body">{col.filas.map(Tarjeta)}</div>
            </div>
          ))}
        </div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Línea de tiempo de decorados (Gantt simplificado) ----
// Construcción de decorados se planifica en paralelo: mientras un set se
// construye, otro ya se está montando y un tercero se desmonta. Eso es
// invisible en una tabla y obvio en una línea de tiempo. Una franja de
// construcción por decorado, con marcas de montaje y desmontaje.
const DECORADO_ESTADO_TONO: Record<string, "ok" | "warn" | "bad" | "info" | "neutral"> = {
  "Planificado": "neutral",
  "En construcción": "warn",
  "Montado": "ok",
  "Rodando": "info",
  "Desmontado": "neutral",
};
function decoradoTono(v: string) {
  return DECORADO_ESTADO_TONO[v] ?? "neutral";
}
const DIA_MS = 86400000;

function TimelineDecorados({
  columnas,
  filas,
  editable,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const label = (key: string) => columnas.find((c) => c.key === key)?.label ?? key;
  const colEstado = columnas.find((c) => c.key === "estado");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  function aFecha(v?: string): number | null {
    if (!v) return null;
    const ms = new Date(v).getTime();
    return isNaN(ms) ? null : ms;
  }

  const todasFechas = filas
    .flatMap((f) => [f.datos?.inicio_construccion, f.datos?.fin_construccion, f.datos?.montaje, f.datos?.desmontaje])
    .map(aFecha)
    .filter((n): n is number => n !== null);

  const hoy = Date.now();
  const minRaw = todasFechas.length ? Math.min(...todasFechas) : hoy;
  const maxRaw = todasFechas.length ? Math.max(...todasFechas) : hoy + 30 * DIA_MS;
  const padding = Math.max(3 * DIA_MS, (maxRaw - minRaw) * 0.06);
  const min = minRaw - padding;
  const max = Math.max(maxRaw + padding, min + 7 * DIA_MS);
  const span = max - min;
  const pct = (ms: number) => ((ms - min) / span) * 100;

  const meses: { label: string; left: number }[] = [];
  {
    const d = new Date(min);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= max) {
      meses.push({ label: d.toLocaleDateString("es", { month: "short", year: "2-digit" }), left: pct(d.getTime()) });
      d.setMonth(d.getMonth() + 1);
    }
  }

  function Renglon({ f }: { f: Fila }) {
    const ic = aFecha(f.datos?.inicio_construccion);
    const fc = aFecha(f.datos?.fin_construccion);
    const mo = aFecha(f.datos?.montaje);
    const de = aFecha(f.datos?.desmontaje);
    const estado = f.datos?.estado ?? "";
    const tono = decoradoTono(estado);
    return (
      <div className="hp-gantt-row">
        <div className="hp-gantt-side">
          <input
            className="hp-gantt-nombre"
            defaultValue={f.datos?.decorado ?? ""}
            placeholder={label("decorado")}
            readOnly={!editable}
            onBlur={(e) => set(f, "decorado", e.target.value)}
          />
          {colEstado && (
            <EstadoSeg valor={estado} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={editable} chip color />
          )}
          <input
            className="hp-gantt-responsable"
            defaultValue={f.datos?.responsable ?? ""}
            placeholder={label("responsable")}
            readOnly={!editable}
            onBlur={(e) => set(f, "responsable", e.target.value)}
          />
          {editable && (
            <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>
          )}
        </div>
        <div className="hp-gantt-track">
          {meses.map((m) => (
            <div className="hp-gantt-gridline" style={{ left: `${m.left}%` }} key={m.label} />
          ))}
          {ic !== null && fc !== null && (
            <div
              className={`hp-gantt-bar tono-${tono}`}
              style={{ left: `${pct(ic)}%`, width: `${Math.max(pct(fc) - pct(ic), 1.2)}%` }}
              title={`${label("inicio_construccion")}: ${f.datos?.inicio_construccion} → ${label("fin_construccion")}: ${f.datos?.fin_construccion}`}
            />
          )}
          {mo !== null && (
            <div className="hp-gantt-marker hp-gantt-marker-montaje" style={{ left: `${pct(mo)}%` }} title={`${label("montaje")}: ${f.datos?.montaje}`} />
          )}
          {de !== null && (
            <div className="hp-gantt-marker hp-gantt-marker-desmontaje" style={{ left: `${pct(de)}%` }} title={`${label("desmontaje")}: ${f.datos?.desmontaje}`} />
          )}
        </div>
        <div className="hp-gantt-fields">
          {(["inicio_construccion", "fin_construccion", "montaje", "desmontaje"] as const).map((k) => (
            <label className="hp-gantt-field" key={k}>
              <span>{label(k)}</span>
              <input
                type="date"
                defaultValue={f.datos?.[k] ?? ""}
                readOnly={!editable}
                onBlur={(e) => set(f, k, e.target.value)}
              />
            </label>
          ))}
          <label className="hp-gantt-field">
            <span>{label("rodaje")}</span>
            <input
              type="text"
              defaultValue={f.datos?.rodaje ?? ""}
              readOnly={!editable}
              onBlur={(e) => set(f, "rodaje", e.target.value)}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-gantt">
          <div className="hp-gantt-months">
            <div className="hp-gantt-side" />
            <div className="hp-gantt-track">
              {meses.map((m) => (
                <span className="hp-gantt-month-label" style={{ left: `${m.left}%` }} key={m.label}>{m.label}</span>
              ))}
            </div>
          </div>
          {filas.map((f) => <Renglon f={f} key={f.id} />)}
        </div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Efectos especiales de maquillaje: antes / después ----
// Lo que un supervisor de FX necesita ver de un vistazo es la comparación
// visual proceso → resultado, no una fila de tabla con dos columnas de
// archivo perdidas entre texto. Dos fotos lado a lado, grandes.
function FxAntesDespues({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const label = (key: string) => columnas.find((c) => c.key === key)?.label ?? key;

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colsChip = columnas.filter((c) =>
    !["escena", "tipo_efecto", "descripcion_tecnica", "materiales", "foto_proceso", "foto_resultado"].includes(c.key)
  );

  function Tarjeta(f: Fila) {
    return (
      <div className="hp-fx-card" key={f.id}>
        <div className="hp-fx-head">
          <input
            className="hp-fx-escena"
            defaultValue={f.datos?.escena ?? ""}
            placeholder={label("escena")}
            readOnly={!editable}
            onBlur={(e) => set(f, "escena", e.target.value)}
          />
          <input
            className="hp-fx-tipo"
            defaultValue={f.datos?.tipo_efecto ?? ""}
            placeholder={label("tipo_efecto")}
            readOnly={!editable}
            onBlur={(e) => set(f, "tipo_efecto", e.target.value)}
          />
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        <div className="hp-fx-photos">
          <div className="hp-fx-photo">
            <span className="hp-fx-photo-label">{label("foto_proceso")}</span>
            <ArchivoCell
              path={f.datos?.foto_proceso ?? ""}
              editable={editable}
              departamento={departamento}
              herramientaId={herramientaId}
              filaId={f.id}
              colKey="foto_proceso"
              onSave={(v) => set(f, "foto_proceso", v)}
            />
          </div>
          <span className="hp-fx-arrow">→</span>
          <div className="hp-fx-photo">
            <span className="hp-fx-photo-label">{label("foto_resultado")}</span>
            <ArchivoCell
              path={f.datos?.foto_resultado ?? ""}
              editable={editable}
              departamento={departamento}
              herramientaId={herramientaId}
              filaId={f.id}
              colKey="foto_resultado"
              onSave={(v) => set(f, "foto_resultado", v)}
            />
          </div>
        </div>
        <textarea
          className="hp-fx-desc"
          defaultValue={f.datos?.descripcion_tecnica ?? ""}
          placeholder={label("descripcion_tecnica")}
          readOnly={!editable}
          onBlur={(e) => set(f, "descripcion_tecnica", e.target.value)}
          rows={2}
        />
        {colsChip.length > 0 && (
          <div className="hp-fx-specs">
            {colsChip.map((c) => (
              <label className="hp-fx-chip" key={c.key}>
                <span className="hp-fx-chip-label">{c.label}</span>
                <input
                  className="hp-fx-chip-input"
                  type={c.tipo === "num" || c.tipo === "money" ? "number" : "text"}
                  defaultValue={f.datos?.[c.key] ?? ""}
                  readOnly={!editable}
                  placeholder="—"
                  onBlur={(e) => set(f, c.key, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
        <textarea
          className="hp-fx-materiales"
          defaultValue={f.datos?.materiales ?? ""}
          placeholder={label("materiales")}
          readOnly={!editable}
          onBlur={(e) => set(f, "materiales", e.target.value)}
          rows={2}
        />
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-fx-grid">{filas.map(Tarjeta)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Ficha de equipo (catálogo de inventario) ----
// Inventarios de cámara, luces, atrezzo, vestuario y maquillaje comparten
// la misma realidad: son un catálogo de objetos físicos, no filas de
// datos. Se hojean como un catálogo — foto grande, nombre, estado y
// specs clave de un vistazo — no se leen como una tabla contable.
const FICHA_EQUIPO_IDS = new Set([
  "foto-inventario",
  "foto-inventario-camara",
  "luz-inventario-equipo",
  "arte-inventario-atrezzo",
  "arte-tabla-vestuario",
  "maq-inventario-productos",
  "arte-armamento-especial",
  "vest-mantenimiento",
  "arte-ambientacion-ext",
  "arte-localizaciones-arte",
  "foto-electrico",
  "foto-dit-color",
  "foto-dit-log-backup",
  "arte-ficha-maquillaje",
  "prod-localizaciones-scouting",
  "prod-material-prestado",
]);
// arte-tabla-vestuario tiene "personaje" como primera columna, pero lo que
// identifica al objeto del catálogo es la prenda — el personaje pasa a
// subtítulo (qué buena pareja: "Prenda" / "de quién es").
const FICHA_EQUIPO_TITULO: Record<string, string> = { "arte-tabla-vestuario": "prenda" };

function FichaEquipo({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colFoto = columnas.find((c) => c.tipo === "archivo");
  const tituloKey = FICHA_EQUIPO_TITULO[herramientaId];
  const colTitulo = tituloKey ? columnas.find((c) => c.key === tituloKey) : columnas[0];
  const colEstado = columnas.find((c) => c.tipo === "estado" && (c.key === "estado" || c.key === "checksum"));
  const colSubtitulo = columnas.find(
    (c) => c.key !== colTitulo?.key && c.key !== colFoto?.key && c.key !== colEstado?.key && (!c.tipo || c.tipo === "texto")
  );
  const usados = new Set(
    [colFoto?.key, colTitulo?.key, colEstado?.key, colSubtitulo?.key].filter(Boolean) as string[]
  );
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  function Tarjeta(f: Fila) {
    const estadoVal = colEstado ? f.datos?.[colEstado.key] ?? "" : "";
    return (
      <div className="hp-fe-card" key={f.id}>
        <div className="hp-fe-photo">
          {colFoto ? (
            <ArchivoCell
              path={f.datos?.[colFoto.key] ?? ""}
              editable={editable}
              departamento={departamento}
              herramientaId={herramientaId}
              filaId={f.id}
              colKey={colFoto.key}
              onSave={(v) => set(f, colFoto.key, v)}
            />
          ) : (
            <span className="hp-fe-photo-placeholder hex" />
          )}
        </div>
        <div className="hp-fe-body">
          <div className="hp-fe-head">
            <input
              className="hp-fe-titulo"
              type={colTitulo?.tipo === "fecha" ? "date" : "text"}
              defaultValue={colTitulo ? f.datos?.[colTitulo.key] ?? "" : ""}
              placeholder={colTitulo?.label ?? ""}
              readOnly={!editable}
              onBlur={(e) => colTitulo && set(f, colTitulo.key, e.target.value)}
            />
            {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
          </div>
          {colSubtitulo && (
            <input
              className="hp-fe-subtitulo"
              defaultValue={f.datos?.[colSubtitulo.key] ?? ""}
              placeholder={colSubtitulo.label}
              readOnly={!editable}
              onBlur={(e) => set(f, colSubtitulo.key, e.target.value)}
            />
          )}
          {colEstado && (
            <EstadoSeg valor={estadoVal} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} color />
          )}
          {colsChip.length > 0 && (
            <div className="hp-fe-specs">
              {colsChip.map((c) =>
                c.tipo === "archivo" ? (
                  <div className="hp-fe-chip hp-fe-chip-archivo" key={c.key}>
                    <span className="hp-fe-chip-label">{c.label}</span>
                    <ArchivoCell
                      path={f.datos?.[c.key] ?? ""}
                      editable={editable}
                      departamento={departamento}
                      herramientaId={herramientaId}
                      filaId={f.id}
                      colKey={c.key}
                      onSave={(v) => set(f, c.key, v)}
                    />
                  </div>
                ) : c.tipo === "link" ? (
                  <div className="hp-fe-chip" key={c.key}>
                    <span className="hp-fe-chip-label">{c.label}</span>
                    <LinkCell valor={f.datos?.[c.key] ?? ""} editable={editable} onSave={(v) => set(f, c.key, v)} />
                  </div>
                ) : (
                  <label className="hp-fe-chip" key={c.key}>
                    <span className="hp-fe-chip-label">{c.label}</span>
                    {c.tipo === "estado" ? (
                      <EstadoSeg valor={f.datos?.[c.key] ?? ""} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={editable} chip color />
                    ) : (
                      <input
                        className="hp-fe-chip-input"
                        type={c.tipo === "num" ? "number" : c.tipo === "fecha" ? "date" : c.tipo === "money" ? "number" : "text"}
                        defaultValue={f.datos?.[c.key] ?? ""}
                        readOnly={!editable}
                        placeholder="—"
                        onBlur={(e) => set(f, c.key, e.target.value)}
                      />
                    )}
                  </label>
                )
              )}
            </div>
          )}
          {colsNotas.map((c) => (
            <textarea
              key={c.key}
              className="hp-fe-nota"
              defaultValue={c.key in (f.datos ?? {}) ? f.datos[c.key] : ""}
              placeholder={c.label}
              readOnly={!editable}
              onBlur={(e) => set(f, c.key, e.target.value)}
              rows={2}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-fe-grid">{filas.map(Tarjeta)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Agenda del día (citaciones / pruebas) ----
// Calendario de preparación de maquillaje y calendario de pruebas de
// vestuario son lo mismo en el fondo: "quién viene, a qué hora, para qué".
// Se lee como una agenda por día, no como filas sueltas — quién es la
// próxima cita importa más que cualquier otro dato.
const AGENDA_DIA_IDS = new Set(["maq-calendario-preparacion", "vest-calendario-pruebas", "ej-agenda-ejecutivo", "prod-agenda-coord"]);

function AgendaDia({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const label = (key: string) => columnas.find((c) => c.key === key)?.label ?? key;

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colFecha = columnas.find((c) => c.tipo === "fecha");
  const colHora = columnas.find((c) => /^hora/.test(c.key));
  // El titular: actor/con quién si existe; si no, la primera columna de texto
  // (ej. "tema" en una agenda de coordinación) — nunca lo dejamos sin nombre.
  const colActor =
    columnas.find((c) => c.key === "actor" || c.key === "con_quien") ??
    columnas.find((c) => (!c.tipo || c.tipo === "texto") && c.key !== (columnas.find((x) => x.tipo === "fecha")?.key) && !/^hora/.test(c.key));
  const colPersonaje = columnas.find((c) => c.key === "personaje" && c.key !== colActor?.key);
  const colResultado = columnas.find((c) => c.tipo === "estado");
  const colFoto = columnas.find((c) => c.tipo === "archivo");
  const colTPrevisto = columnas.find((c) => c.key === "tiempo_previsto");
  const colTReal = columnas.find((c) => c.key === "tiempo_real");
  // Columnas de texto largo: la primera es el "qué" prominente (asunto, looks
  // a probar…), el resto van como notas. Así sirve igual para una prueba de
  // vestuario que para un log de reuniones ejecutivas (asunto + resultado).
  const largoCols = columnas.filter((c) => c.tipo === "largo");
  const colQue = largoCols[0];
  const colsNotas = largoCols.slice(1);
  const usados = new Set(
    [
      colFecha?.key, colHora?.key, colActor?.key, colPersonaje?.key,
      colResultado?.key, colFoto?.key, colTPrevisto?.key, colTReal?.key,
      ...largoCols.map((c) => c.key),
    ].filter(Boolean) as string[]
  );
  const colsChip = columnas.filter((c) => !usados.has(c.key) && c.tipo !== "largo");

  function ordenarPorHora(fs: Fila[]) {
    if (!colHora) return fs;
    return [...fs].sort((a, b) => (a.datos?.[colHora.key] ?? "").localeCompare(b.datos?.[colHora.key] ?? ""));
  }

  function Cita(f: Fila) {
    const resultadoVal = colResultado ? f.datos?.[colResultado.key] ?? "" : "";
    return (
      <div className="hp-agenda-card" key={f.id}>
        {colFoto && (
          <ArchivoCell
            path={f.datos?.[colFoto.key] ?? ""}
            editable={editable}
            departamento={departamento}
            herramientaId={herramientaId}
            filaId={f.id}
            colKey={colFoto.key}
            onSave={(v) => set(f, colFoto.key, v)}
          />
        )}
        <div className="hp-agenda-body">
          <div className="hp-agenda-head">
            {colHora && (
              <input
                className="hp-agenda-hora"
                defaultValue={f.datos?.[colHora.key] ?? ""}
                placeholder={label(colHora.key)}
                readOnly={!editable}
                onBlur={(e) => set(f, colHora.key, e.target.value)}
              />
            )}
            {colActor && (
              <input
                className="hp-agenda-actor"
                defaultValue={f.datos?.[colActor.key] ?? ""}
                placeholder={label(colActor.key)}
                readOnly={!editable}
                onBlur={(e) => set(f, colActor.key, e.target.value)}
              />
            )}
            {colPersonaje && (
              <input
                className="hp-agenda-personaje"
                defaultValue={f.datos?.[colPersonaje.key] ?? ""}
                placeholder={label(colPersonaje.key)}
                readOnly={!editable}
                onBlur={(e) => set(f, colPersonaje.key, e.target.value)}
              />
            )}
            <span className="hp-agenda-spacer" />
            {colResultado && (
              <EstadoSeg valor={resultadoVal} opciones={colResultado.opciones ?? []} onPick={(v) => set(f, colResultado.key, v)} editable={editable} chip color />
            )}
            {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
          </div>
          {colQue && (
            <textarea
              className="hp-agenda-que"
              defaultValue={f.datos?.[colQue.key] ?? ""}
              placeholder={colQue.label}
              readOnly={!editable}
              onBlur={(e) => set(f, colQue.key, e.target.value)}
              rows={2}
            />
          )}
          {(colTPrevisto || colTReal) && (
            <div className="hp-agenda-tiempos">
              {colTPrevisto && (
                <label className="hp-agenda-chip">
                  <span>{label("tiempo_previsto")}</span>
                  <input
                    type="number"
                    defaultValue={f.datos?.tiempo_previsto ?? ""}
                    readOnly={!editable}
                    onBlur={(e) => set(f, "tiempo_previsto", e.target.value)}
                  />
                </label>
              )}
              {colTPrevisto && colTReal && <span className="hp-agenda-arrow">→</span>}
              {colTReal && (
                <label className="hp-agenda-chip">
                  <span>{label("tiempo_real")}</span>
                  <input
                    type="number"
                    defaultValue={f.datos?.tiempo_real ?? ""}
                    readOnly={!editable}
                    onBlur={(e) => set(f, "tiempo_real", e.target.value)}
                  />
                </label>
              )}
            </div>
          )}
          {colsChip.length > 0 && (
            <div className="hp-agenda-specs">
              {colsChip.map((c) => (
                <label className="hp-agenda-chip" key={c.key}>
                  <span>{c.label}</span>
                  <input
                    defaultValue={f.datos?.[c.key] ?? ""}
                    readOnly={!editable}
                    onBlur={(e) => set(f, c.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          )}
          {colsNotas.map((c) => (
            <textarea
              key={c.key}
              className="hp-agenda-notas"
              defaultValue={f.datos?.[c.key] ?? ""}
              placeholder={c.label}
              readOnly={!editable}
              onBlur={(e) => set(f, c.key, e.target.value)}
              rows={2}
            />
          ))}
        </div>
      </div>
    );
  }

  const grupos = colFecha
    ? Object.entries(
        filas.reduce<Record<string, Fila[]>>((acc, f) => {
          const fecha = (f.datos?.[colFecha.key] ?? "").trim() || t("noScene");
          (acc[fecha] ??= []).push(f);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b))
    : null;

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : grupos ? (
        grupos.map(([fecha, fs]) => (
          <div className="hp-gal-group" key={fecha}>
            <div className="hp-gal-group-head">
              <span className="hex"></span>
              <span>{fecha}</span>
              <span className="hp-gal-group-count">{fs.length}</span>
            </div>
            <div className="hp-agenda-list">{ordenarPorHora(fs).map(Cita)}</div>
          </div>
        ))
      ) : (
        <div className="hp-agenda-list">{ordenarPorHora(filas).map(Cita)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Continuidad por personaje (desglose de vestuario/maquillaje) ----
// Desglose de vestuario y de maquillaje por escena son, en el fondo, la
// misma herramienta de continuidad que ya existe como galería (que se
// agrupa sola por personaje) — solo que estas dos son tipo "tabla" con
// foto, así que no recibían ese agrupado. Mismo criterio, misma vista.
const CONTINUIDAD_PERSONAJE_IDS = new Set(["vest-desglose-escenas", "maq-desglose-escenas", "arte-desglose-vestuario"]);

function ContinuidadPersonaje({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colPersonaje = columnas.find((c) => c.key === "personaje");
  const colEscena = columnas.find((c) => c.key === "escena");
  const colFoto = columnas.find((c) => c.tipo === "archivo");
  const colEstado = columnas.find((c) => c.tipo === "estado" && c.key === "estado");
  const colDesc = columnas.find((c) => c.tipo === "largo" && /desc/.test(c.key));
  const usados = new Set(
    [colPersonaje?.key, colEscena?.key, colFoto?.key, colEstado?.key, colDesc?.key].filter(Boolean) as string[]
  );
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  function Tarjeta(f: Fila) {
    const estadoVal = colEstado ? f.datos?.[colEstado.key] ?? "" : "";
    return (
      <div className="hp-fe-card" key={f.id}>
        <div className="hp-fe-photo">
          {colFoto ? (
            <ArchivoCell
              path={f.datos?.[colFoto.key] ?? ""}
              editable={editable}
              departamento={departamento}
              herramientaId={herramientaId}
              filaId={f.id}
              colKey={colFoto.key}
              onSave={(v) => set(f, colFoto.key, v)}
            />
          ) : (
            <span className="hp-fe-photo-placeholder hex" />
          )}
        </div>
        <div className="hp-fe-body">
          <div className="hp-fe-head">
            {colEscena && (
              <input
                className="hp-fe-titulo"
                defaultValue={f.datos?.[colEscena.key] ?? ""}
                placeholder={colEscena.label}
                readOnly={!editable}
                onBlur={(e) => set(f, colEscena.key, e.target.value)}
              />
            )}
            {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
          </div>
          {colEstado && (
            <EstadoSeg valor={estadoVal} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} color />
          )}
          {colDesc && (
            <textarea
              className="hp-agenda-que"
              defaultValue={f.datos?.[colDesc.key] ?? ""}
              placeholder={colDesc.label}
              readOnly={!editable}
              onBlur={(e) => set(f, colDesc.key, e.target.value)}
              rows={2}
            />
          )}
          {colsChip.length > 0 && (
            <div className="hp-fe-specs">
              {colsChip.map((c) => (
                <label className="hp-fe-chip" key={c.key}>
                  <span className="hp-fe-chip-label">{c.label}</span>
                  {c.tipo === "estado" ? (
                    <EstadoSeg valor={f.datos?.[c.key] ?? ""} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={editable} chip color />
                  ) : (
                    <input
                      className="hp-fe-chip-input"
                      type={c.tipo === "num" ? "number" : c.tipo === "fecha" ? "date" : "text"}
                      defaultValue={f.datos?.[c.key] ?? ""}
                      readOnly={!editable}
                      placeholder="—"
                      onBlur={(e) => set(f, c.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          )}
          {colsNotas.map((c) => (
            <textarea
              key={c.key}
              className="hp-fe-nota"
              defaultValue={c.key in (f.datos ?? {}) ? f.datos[c.key] : ""}
              placeholder={c.label}
              readOnly={!editable}
              onBlur={(e) => set(f, c.key, e.target.value)}
              rows={2}
            />
          ))}
        </div>
      </div>
    );
  }

  const grupos = colPersonaje
    ? Object.entries(
        filas.reduce<Record<string, Fila[]>>((acc, f) => {
          const nombre = (f.datos?.[colPersonaje.key] ?? "").trim() || t("noCharacter");
          (acc[nombre] ??= []).push(f);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b, "es"))
    : null;

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : grupos ? (
        grupos.map(([nombre, fs]) => (
          <div className="hp-gal-group" key={nombre}>
            <div className="hp-gal-group-head">
              <span className="hex"></span>
              <span>{nombre}</span>
              <span className="hp-gal-group-count">{fs.length}</span>
            </div>
            <div className="hp-fe-grid">{fs.map(Tarjeta)}</div>
          </div>
        ))
      ) : (
        <div className="hp-fe-grid">{filas.map(Tarjeta)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Control de generador por jornada ----
// Lo que un gaffer necesita ver de un vistazo no son cuatro números de
// kW sueltos en una fila — es "¿cuánto margen me queda hoy?". Una barra
// de capacidad (consumido vs. disponible) y otra de combustible
// (inicio → fin) dicen eso en un segundo; una tabla no.
function ControlGenerador({
  filas,
  editable,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  filas: Fila[];
  editable: boolean;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  function num(f: Fila, key: string): number | null {
    const v = parseFloat(f.datos?.[key] ?? "");
    return isNaN(v) ? null : v;
  }

  const ordenadas = [...filas].sort((a, b) => (b.datos?.jornada ?? "").localeCompare(a.datos?.jornada ?? ""));

  function Tarjeta(f: Fila) {
    const disp = num(f, "kw_disponibles");
    const cons = num(f, "kw_consumidos");
    const pctKw = disp && disp > 0 ? Math.min(100, ((cons ?? 0) / disp) * 100) : null;
    const tonoKw = pctKw === null ? "neutral" : pctKw >= 90 ? "bad" : pctKw >= 70 ? "warn" : "ok";

    const ini = num(f, "combustible_inicio");
    const fin = num(f, "combustible_fin");
    const pctComb = ini && ini > 0 && fin !== null ? Math.min(100, (fin / ini) * 100) : null;
    const tonoComb = pctComb === null ? "neutral" : pctComb <= 15 ? "bad" : pctComb <= 35 ? "warn" : "ok";

    return (
      <div className="hp-gen-card" key={f.id}>
        <div className="hp-gen-head">
          <input
            type="date"
            className="hp-gen-fecha"
            defaultValue={f.datos?.jornada ?? ""}
            readOnly={!editable}
            onBlur={(e) => set(f, "jornada", e.target.value)}
          />
          <input
            className="hp-gen-loc"
            defaultValue={f.datos?.localizacion ?? ""}
            placeholder={t("noScene")}
            readOnly={!editable}
            onBlur={(e) => set(f, "localizacion", e.target.value)}
          />
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>

        <div className="hp-gen-gauge">
          <div className="hp-gen-gauge-label">
            <span>kW</span>
            <span className="hp-gen-gauge-nums">
              <input type="number" defaultValue={f.datos?.kw_consumidos ?? ""} readOnly={!editable} onBlur={(e) => set(f, "kw_consumidos", e.target.value)} />
              {" / "}
              <input type="number" defaultValue={f.datos?.kw_disponibles ?? ""} readOnly={!editable} onBlur={(e) => set(f, "kw_disponibles", e.target.value)} />
            </span>
          </div>
          <div className="hp-gen-bar">
            <div className={`hp-gen-bar-fill tono-${tonoKw}`} style={{ width: `${pctKw ?? 0}%` }} />
          </div>
        </div>

        <div className="hp-gen-gauge">
          <div className="hp-gen-gauge-label">
            <span>{t("genFuel")}</span>
            <span className="hp-gen-gauge-nums">
              <input type="number" defaultValue={f.datos?.combustible_inicio ?? ""} readOnly={!editable} onBlur={(e) => set(f, "combustible_inicio", e.target.value)} />
              {" → "}
              <input type="number" defaultValue={f.datos?.combustible_fin ?? ""} readOnly={!editable} onBlur={(e) => set(f, "combustible_fin", e.target.value)} />
            </span>
          </div>
          <div className="hp-gen-bar">
            <div className={`hp-gen-bar-fill tono-${tonoComb}`} style={{ width: `${pctComb ?? 100}%` }} />
          </div>
        </div>

        <textarea
          className="hp-gen-incidencias"
          defaultValue={f.datos?.incidencias ?? ""}
          placeholder={t("genIncidencias")}
          readOnly={!editable}
          onBlur={(e) => set(f, "incidencias", e.target.value)}
          rows={2}
        />
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-gen-grid">{ordenadas.map(Tarjeta)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ===========================================================================
// DEPARTAMENTO EJECUTIVO — vistas financieras a medida
// El ejecutivo le muestra números a inversores y superiores: lo que importa
// no es la celda suelta, es el total, el desvío y la salud de un vistazo.
// ===========================================================================
function ejNum(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function ejMoney(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(n)) + " €";
}

// ---- Tablero de presupuesto (top sheet / por depto / cost report) ----
// Header con totales y desvío + barra de ejecución por partida. Lo que un
// ejecutivo necesita ver primero: cuánto del presupuesto está consumido y
// si hay desvío, no una grilla de cifras sin sumar.
const PRESUPUESTO_BOARD_IDS = new Set([
  "ej-presupuesto-general",
  "ej-presupuesto-depto",
  "ej-control-costos",
  "prod-presup-operativo",
]);

function PresupuestoBoard({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const moneyCols = columnas.filter((c) => c.tipo === "money");
  const budgetCol =
    moneyCols.find((c) => ["presup", "presupuestado", "asignado", "presupuesto"].includes(c.key)) ?? moneyCols[0];
  const spentCol =
    moneyCols.find((c) => ["real", "gastado"].includes(c.key)) ??
    moneyCols.find((c) => c.key !== budgetCol?.key);
  const otherMoney = moneyCols.filter((c) => c.key !== budgetCol?.key && c.key !== spentCol?.key);
  const colEstado = columnas.find((c) => c.tipo === "estado");
  const colArchivo = columnas.find((c) => c.tipo === "archivo");
  const colTitulo = columnas[0];
  const colSubtitulo = columnas.find(
    (c, i) => i > 0 && (!c.tipo || c.tipo === "texto") && c.key !== colTitulo?.key
  );
  const usados = new Set(
    [budgetCol?.key, spentCol?.key, ...otherMoney.map((c) => c.key), colEstado?.key, colArchivo?.key, colTitulo?.key, colSubtitulo?.key].filter(Boolean) as string[]
  );
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  const totalBudget = budgetCol ? filas.reduce((s, f) => s + ejNum(f.datos?.[budgetCol.key]), 0) : 0;
  const totalSpent = spentCol ? filas.reduce((s, f) => s + ejNum(f.datos?.[spentCol.key]), 0) : 0;
  const pctGlobal = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const variance = totalBudget - totalSpent;
  const tonoGlobal = pctGlobal > 100 ? "bad" : pctGlobal >= 90 ? "warn" : "ok";

  function MoneyInput({ f, col }: { f: Fila; col: Columna }) {
    return (
      <span className="hp-pre-money-wrap">
        <input
          className="hp-pre-money"
          type="number"
          defaultValue={f.datos?.[col.key] ?? ""}
          readOnly={!editable}
          placeholder="0"
          onBlur={(e) => set(f, col.key, e.target.value)}
        />
        <span className="hp-pre-money-eur">€</span>
      </span>
    );
  }

  function Fila_({ f }: { f: Fila }) {
    const budget = budgetCol ? ejNum(f.datos?.[budgetCol.key]) : 0;
    const spent = spentCol ? ejNum(f.datos?.[spentCol.key]) : 0;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const tono = pct > 100 ? "bad" : pct >= 90 ? "warn" : "ok";
    const estadoVal = colEstado ? f.datos?.[colEstado.key] ?? "" : "";
    return (
      <div className="hp-pre-row">
        <div className="hp-pre-row-top">
          <div className="hp-pre-titulo-wrap">
            <input
              className="hp-pre-titulo"
              defaultValue={f.datos?.[colTitulo.key] ?? ""}
              placeholder={colTitulo.label}
              readOnly={!editable}
              onBlur={(e) => set(f, colTitulo.key, e.target.value)}
            />
            {colSubtitulo && (
              <input
                className="hp-pre-subtitulo"
                defaultValue={f.datos?.[colSubtitulo.key] ?? ""}
                placeholder={colSubtitulo.label}
                readOnly={!editable}
                onBlur={(e) => set(f, colSubtitulo.key, e.target.value)}
              />
            )}
          </div>
          {colEstado && (
            <EstadoSeg valor={estadoVal} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} color />
          )}
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        {budgetCol && spentCol && (
          <div className="hp-pre-bar-row">
            <div className="hp-pre-bar">
              <div className={`hp-pre-bar-fill tono-${tono}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className={`hp-pre-pct tono-${tono}`}>{budget > 0 ? `${Math.round(pct)}%` : "—"}</span>
          </div>
        )}
        <div className="hp-pre-figs">
          {budgetCol && (
            <span className="hp-pre-fig">
              <span className="hp-pre-fig-label">{budgetCol.label}</span>
              <MoneyInput f={f} col={budgetCol} />
            </span>
          )}
          {spentCol && (
            <span className="hp-pre-fig">
              <span className="hp-pre-fig-label">{spentCol.label}</span>
              <MoneyInput f={f} col={spentCol} />
            </span>
          )}
          {otherMoney.map((col) => (
            <span className="hp-pre-fig" key={col.key}>
              <span className="hp-pre-fig-label">{col.label}</span>
              <MoneyInput f={f} col={col} />
            </span>
          ))}
          {colsChip.map((col) => (
            <span className="hp-pre-fig" key={col.key}>
              <span className="hp-pre-fig-label">{col.label}</span>
              <input
                className="hp-pre-chip-input"
                type={col.tipo === "num" ? "number" : col.tipo === "fecha" ? "date" : "text"}
                defaultValue={f.datos?.[col.key] ?? ""}
                readOnly={!editable}
                placeholder="—"
                onBlur={(e) => set(f, col.key, e.target.value)}
              />
            </span>
          ))}
        </div>
        {colsNotas.map((col) => (
          <textarea
            key={col.key}
            className="hp-pre-nota"
            defaultValue={col.key in (f.datos ?? {}) ? f.datos[col.key] : ""}
            placeholder={col.label}
            readOnly={!editable}
            onBlur={(e) => set(f, col.key, e.target.value)}
            rows={1}
          />
        ))}
        {colArchivo && (
          <ArchivoCell
            path={f.datos?.[colArchivo.key] ?? ""}
            editable={editable}
            departamento={departamento}
            herramientaId={herramientaId}
            filaId={f.id}
            colKey={colArchivo.key}
            onSave={(v) => set(f, colArchivo.key, v)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {filas.length > 0 && budgetCol && spentCol && (
        <div className={`hp-pre-header tono-${tonoGlobal}`}>
          <div className="hp-pre-h-item">
            <span className="hp-pre-h-label">{budgetCol.label}</span>
            <span className="hp-pre-h-val">{ejMoney(totalBudget)}</span>
          </div>
          <div className="hp-pre-h-item">
            <span className="hp-pre-h-label">{spentCol.label}</span>
            <span className="hp-pre-h-val">{ejMoney(totalSpent)}</span>
          </div>
          <div className="hp-pre-h-item">
            <span className="hp-pre-h-label">{t("preVariance")}</span>
            <span className={`hp-pre-h-val tono-${variance < 0 ? "bad" : "ok"}`}>{ejMoney(variance)}</span>
          </div>
          <div className="hp-pre-h-gauge">
            <div className="hp-pre-h-bar">
              <div className={`hp-pre-bar-fill tono-${tonoGlobal}`} style={{ width: `${Math.min(100, pctGlobal)}%` }} />
            </div>
            <span className={`hp-pre-pct tono-${tonoGlobal}`}>{Math.round(pctGlobal)}%</span>
          </div>
        </div>
      )}
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-pre-list">{filas.map((f) => <Fila_ f={f} key={f.id} />)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Cashflow (flujo de caja semana a semana) ----
// "Detecta déficits antes de que ocurran" — eso pide barras de ingreso vs.
// egreso por período y el saldo coloreado, no una grilla de números.
const CASHFLOW_IDS = new Set(["ej-flujo-caja", "ej-cashflow"]);

function CashflowChart({
  columnas,
  filas,
  editable,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colPeriodo = columnas.find((c) => ["periodo", "semana"].includes(c.key)) ?? columnas[0];
  const colIn = columnas.find((c) => ["ingresos", "ingresos_reales"].includes(c.key));
  const colInPrev = columnas.find((c) => c.key === "ingresos_previstos");
  const colOut = columnas.find((c) => ["egresos", "gastos_reales"].includes(c.key));
  const colOutPrev = columnas.find((c) => c.key === "gastos_previstos");
  const colSaldo = columnas.find((c) => c.key === "saldo");
  const colEstado = columnas.find((c) => c.tipo === "estado");
  const colConcepto = columnas.find((c) => (!c.tipo || c.tipo === "texto") && c.key !== colPeriodo?.key);
  const colNotas = columnas.find((c) => c.tipo === "largo");

  const maxFlujo = Math.max(
    1,
    ...filas.map((f) => Math.max(colIn ? ejNum(f.datos?.[colIn.key]) : 0, colOut ? ejNum(f.datos?.[colOut.key]) : 0))
  );
  const totalIn = colIn ? filas.reduce((s, f) => s + ejNum(f.datos?.[colIn.key]), 0) : 0;
  const totalOut = colOut ? filas.reduce((s, f) => s + ejNum(f.datos?.[colOut.key]), 0) : 0;
  const neto = totalIn - totalOut;

  function MoneyField({ f, col }: { f: Fila; col: Columna }) {
    return (
      <label className="hp-cf-fig">
        <span>{col.label}</span>
        <span className="hp-pre-money-wrap">
          <input
            className="hp-pre-money"
            type="number"
            defaultValue={f.datos?.[col.key] ?? ""}
            readOnly={!editable}
            placeholder="0"
            onBlur={(e) => set(f, col.key, e.target.value)}
          />
          <span className="hp-pre-money-eur">€</span>
        </span>
      </label>
    );
  }

  function Periodo({ f }: { f: Fila }) {
    const inV = colIn ? ejNum(f.datos?.[colIn.key]) : 0;
    const outV = colOut ? ejNum(f.datos?.[colOut.key]) : 0;
    const saldoV = colSaldo ? ejNum(f.datos?.[colSaldo.key]) : inV - outV;
    const estadoVal = colEstado ? f.datos?.[colEstado.key] ?? "" : "";
    return (
      <div className="hp-cf-row">
        <div className="hp-cf-side">
          <input
            className="hp-cf-periodo"
            type={colPeriodo?.tipo === "fecha" ? "date" : "text"}
            defaultValue={f.datos?.[colPeriodo.key] ?? ""}
            placeholder={colPeriodo.label}
            readOnly={!editable}
            onBlur={(e) => set(f, colPeriodo.key, e.target.value)}
          />
          {colConcepto && (
            <input
              className="hp-cf-concepto"
              defaultValue={f.datos?.[colConcepto.key] ?? ""}
              placeholder={colConcepto.label}
              readOnly={!editable}
              onBlur={(e) => set(f, colConcepto.key, e.target.value)}
            />
          )}
        </div>
        <div className="hp-cf-bars">
          <div className="hp-cf-bar-track">
            <div className="hp-cf-bar-in" style={{ width: `${(inV / maxFlujo) * 100}%` }} title={`${colIn?.label}: ${ejMoney(inV)}`} />
          </div>
          <div className="hp-cf-bar-track">
            <div className="hp-cf-bar-out" style={{ width: `${(outV / maxFlujo) * 100}%` }} title={`${colOut?.label}: ${ejMoney(outV)}`} />
          </div>
        </div>
        <div className="hp-cf-saldo-wrap">
          <span className="hp-cf-saldo-label">{colSaldo?.label ?? "Saldo"}</span>
          <span className={`hp-cf-saldo tono-${saldoV < 0 ? "bad" : "ok"}`}>{ejMoney(saldoV)}</span>
          {colEstado && (
            <EstadoSeg valor={estadoVal} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} chip color />
          )}
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        <div className="hp-cf-edit">
          {colInPrev && <MoneyField f={f} col={colInPrev} />}
          {colIn && <MoneyField f={f} col={colIn} />}
          {colOutPrev && <MoneyField f={f} col={colOutPrev} />}
          {colOut && <MoneyField f={f} col={colOut} />}
          {colSaldo && <MoneyField f={f} col={colSaldo} />}
          {colNotas && (
            <label className="hp-cf-fig hp-cf-fig-nota">
              <span>{colNotas.label}</span>
              <input defaultValue={f.datos?.[colNotas.key] ?? ""} readOnly={!editable} onBlur={(e) => set(f, colNotas.key, e.target.value)} />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {filas.length > 0 && colIn && colOut && (
        <div className="hp-cf-header">
          <div className="hp-pre-h-item"><span className="hp-pre-h-label">{colIn.label}</span><span className="hp-pre-h-val tono-ok">{ejMoney(totalIn)}</span></div>
          <div className="hp-pre-h-item"><span className="hp-pre-h-label">{colOut.label}</span><span className="hp-pre-h-val tono-bad">{ejMoney(totalOut)}</span></div>
          <div className="hp-pre-h-item"><span className="hp-pre-h-label">{t("cfNet")}</span><span className={`hp-pre-h-val tono-${neto < 0 ? "bad" : "ok"}`}>{ejMoney(neto)}</span></div>
        </div>
      )}
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-cf-list">{filas.map((f) => <Periodo f={f} key={f.id} />)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Pipeline de financiación (fuentes por etapa, con € por columna) ----
// Plan de financiación, ayudas, coproducciones: la pregunta es "¿cuánto
// dinero tengo en cada etapa de estar asegurado?". Kanban por estado con
// el total € de cada columna en la cabecera.
const FINANCIACION_PIPELINE_IDS = new Set([
  "ej-plan-financiacion",
  "ej-ayudas-subvenciones",
  "ej-coproducciones",
]);

function FinanciacionPipeline({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colEstado =
    columnas.find((c) => c.tipo === "estado" && (c.key === "estado" || c.key === "estado_firma")) ??
    columnas.find((c) => c.tipo === "estado");
  const colTitulo = columnas[0];
  const moneyCols = columnas.filter((c) => c.tipo === "money");
  const colImporte =
    moneyCols.find((c) => ["importe", "aportacion", "importe_concedido", "importe_solicitado"].includes(c.key)) ?? moneyCols[0];
  const colArchivo = columnas.find((c) => c.tipo === "archivo");
  const usados = new Set([colEstado?.key, colTitulo?.key, colImporte?.key, colArchivo?.key].filter(Boolean) as string[]);
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  if (!colEstado) return null;
  const etapas = [...(colEstado.opciones ?? []), t("noStatus")];
  const porEtapa = etapas.map((op) => {
    const fs = filas.filter((f) => (f.datos?.[colEstado.key] ?? "") === op || (!f.datos?.[colEstado.key] && op === t("noStatus")));
    const total = colImporte ? fs.reduce((s, f) => s + ejNum(f.datos?.[colImporte.key]), 0) : 0;
    return { nombre: op, fs, total };
  });

  function Tarjeta(f: Fila) {
    return (
      <div className="hp-fin-card" key={f.id}>
        <div className="hp-fin-head">
          <input
            className="hp-fin-titulo"
            defaultValue={f.datos?.[colTitulo.key] ?? ""}
            placeholder={colTitulo.label}
            readOnly={!editable}
            onBlur={(e) => set(f, colTitulo.key, e.target.value)}
          />
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        {colImporte && (
          <span className="hp-pre-money-wrap hp-fin-money">
            <input
              className="hp-pre-money"
              type="number"
              defaultValue={f.datos?.[colImporte.key] ?? ""}
              readOnly={!editable}
              placeholder="0"
              onBlur={(e) => set(f, colImporte.key, e.target.value)}
            />
            <span className="hp-pre-money-eur">€</span>
          </span>
        )}
        {colsChip.length > 0 && (
          <div className="hp-fin-specs">
            {colsChip.map((c) => (
              <label className="hp-fin-chip" key={c.key}>
                <span>{c.label}</span>
                {c.tipo === "estado" ? (
                  <EstadoSeg valor={f.datos?.[c.key] ?? ""} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={editable} chip color />
                ) : (
                  <input
                    type={c.tipo === "num" ? "number" : c.tipo === "fecha" ? "date" : "text"}
                    defaultValue={f.datos?.[c.key] ?? ""}
                    readOnly={!editable}
                    placeholder="—"
                    onBlur={(e) => set(f, c.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        )}
        {colsNotas.map((c) => (
          <textarea
            key={c.key}
            className="hp-fin-nota"
            defaultValue={c.key in (f.datos ?? {}) ? f.datos[c.key] : ""}
            placeholder={c.label}
            readOnly={!editable}
            onBlur={(e) => set(f, c.key, e.target.value)}
            rows={2}
          />
        ))}
        {colArchivo && (
          <ArchivoCell
            path={f.datos?.[colArchivo.key] ?? ""}
            editable={editable}
            departamento={departamento}
            herramientaId={herramientaId}
            filaId={f.id}
            colKey={colArchivo.key}
            onSave={(v) => set(f, colArchivo.key, v)}
          />
        )}
        {editable && colEstado && (
          <label className="hp-pend-mover-wrap">
            <span className="hp-pend-mover-label">{t("pendMoveTo")}</span>
            <EstadoSeg valor={f.datos?.[colEstado.key] ?? ""} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} chip color />
          </label>
        )}
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-pend-board">
          {porEtapa.map((col) => (
            <div className={`hp-pend-col tono-${estadoTono(col.nombre)}`} key={col.nombre}>
              <div className="hp-pend-col-head">
                <span>{col.nombre}</span>
                <span className="hp-pend-col-count">{col.fs.length}</span>
              </div>
              {colImporte && <div className="hp-fin-col-total">{ejMoney(col.total)}</div>}
              <div className="hp-pend-col-body">{col.fs.map(Tarjeta)}</div>
            </div>
          ))}
        </div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Tablero de estado de documentos (contratos, NDA, pólizas, facturas…) ----
// Documentos/acuerdos con un estado y, casi siempre, una fecha de
// vencimiento. Agrupado por estado, con alerta si está vencido o por
// vencer. Lo que importa: qué falta firmar y qué caduca pronto.
const DOC_STATUS_IDS = new Set([
  "ej-contratos",
  "ej-cesion-nda",
  "ej-derechos-pi",
  "ej-polizas-permisos",
  "ej-facturas",
  "ej-deliverables",
  "ej-pagos-nominas",
  "ej-cronograma-produccion",
  "prod-permisos",
  "prod-equipo-tecnico",
]);

function DocStatusBoard({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colGrupo =
    columnas.find((c) => c.tipo === "estado" && (c.key === "estado" || c.key === "firma")) ??
    columnas.find((c) => c.tipo === "estado");
  const colTitulo = columnas[0];
  const colMoney = columnas.find((c) => c.tipo === "money");
  // Fecha a vigilar (vencimiento/caducidad) — para alertar de lo que expira.
  const colFecha = columnas.find((c) =>
    ["vence", "hasta", "caducidad", "vigencia", "fecha_entrega", "fecha_real", "fecha_prevista", "fecha"].includes(c.key) && c.tipo === "fecha"
  );
  const colsArchivo = columnas.filter((c) => c.tipo === "archivo");
  const usados = new Set(
    [colGrupo?.key, colTitulo?.key, colMoney?.key, colFecha?.key, ...colsArchivo.map((c) => c.key)].filter(Boolean) as string[]
  );
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  function diasPara(fechaStr?: string): number | null {
    if (!fechaStr) return null;
    const ms = new Date(fechaStr).getTime();
    if (isNaN(ms)) return null;
    return Math.ceil((ms - Date.now()) / DIA_MS);
  }

  function Tarjeta(f: Fila) {
    const dias = colFecha ? diasPara(f.datos?.[colFecha.key]) : null;
    const fechaTono = dias === null ? "" : dias < 0 ? "bad" : dias <= 14 ? "warn" : "ok";
    return (
      <div className="hp-doc-card" key={f.id}>
        <div className="hp-doc-head">
          <input
            className="hp-doc-titulo"
            defaultValue={f.datos?.[colTitulo.key] ?? ""}
            placeholder={colTitulo.label}
            readOnly={!editable}
            onBlur={(e) => set(f, colTitulo.key, e.target.value)}
          />
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        {colMoney && (
          <span className="hp-pre-money-wrap hp-doc-money">
            <input
              className="hp-pre-money"
              type="number"
              defaultValue={f.datos?.[colMoney.key] ?? ""}
              readOnly={!editable}
              placeholder="0"
              onBlur={(e) => set(f, colMoney.key, e.target.value)}
            />
            <span className="hp-pre-money-eur">€</span>
          </span>
        )}
        {colFecha && (
          <label className={`hp-doc-fecha tono-${fechaTono || "neutral"}`}>
            <span className="hp-doc-fecha-label">{colFecha.label}</span>
            <input
              type="date"
              defaultValue={f.datos?.[colFecha.key] ?? ""}
              readOnly={!editable}
              onBlur={(e) => set(f, colFecha.key, e.target.value)}
            />
            {dias !== null && (
              <span className="hp-doc-fecha-badge">
                {dias < 0 ? t("docExpired") : dias === 0 ? t("docToday") : t("docInDays", { n: dias })}
              </span>
            )}
          </label>
        )}
        {colsChip.length > 0 && (
          <div className="hp-doc-specs">
            {colsChip.map((c) => (
              <label className="hp-doc-chip" key={c.key}>
                <span>{c.label}</span>
                {c.tipo === "estado" ? (
                  <EstadoSeg valor={f.datos?.[c.key] ?? ""} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={editable} chip color />
                ) : (
                  <input
                    type={c.tipo === "num" ? "number" : c.tipo === "fecha" ? "date" : "text"}
                    defaultValue={f.datos?.[c.key] ?? ""}
                    readOnly={!editable}
                    placeholder="—"
                    onBlur={(e) => set(f, c.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        )}
        {colsNotas.map((c) => (
          <textarea
            key={c.key}
            className="hp-doc-nota"
            defaultValue={c.key in (f.datos ?? {}) ? f.datos[c.key] : ""}
            placeholder={c.label}
            readOnly={!editable}
            onBlur={(e) => set(f, c.key, e.target.value)}
            rows={2}
          />
        ))}
        {colsArchivo.map((c) => (
          <ArchivoCell
            key={c.key}
            path={f.datos?.[c.key] ?? ""}
            editable={editable}
            departamento={departamento}
            herramientaId={herramientaId}
            filaId={f.id}
            colKey={c.key}
            onSave={(v) => set(f, c.key, v)}
          />
        ))}
        {editable && colGrupo && (
          <label className="hp-pend-mover-wrap">
            <span className="hp-pend-mover-label">{t("pendMoveTo")}</span>
            <EstadoSeg valor={f.datos?.[colGrupo.key] ?? ""} opciones={colGrupo.opciones ?? []} onPick={(v) => set(f, colGrupo.key, v)} editable={editable} chip color />
          </label>
        )}
      </div>
    );
  }

  if (!colGrupo) return null;
  const etapas = [...(colGrupo.opciones ?? []), t("noStatus")];
  const porEtapa = etapas.map((op) => ({
    nombre: op,
    fs: filas.filter((f) => (f.datos?.[colGrupo.key] ?? "") === op || (!f.datos?.[colGrupo.key] && op === t("noStatus"))),
  }));

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-pend-board">
          {porEtapa.map((col) => (
            <div className={`hp-pend-col tono-${estadoTono(col.nombre)}`} key={col.nombre}>
              <div className="hp-pend-col-head">
                <span>{col.nombre}</span>
                <span className="hp-pend-col-count">{col.fs.length}</span>
              </div>
              <div className="hp-pend-col-body">{col.fs.map(Tarjeta)}</div>
            </div>
          ))}
        </div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Modelo financiero (escenarios optimista / base / conservador) ----
// Tres escenarios lado a lado con el margen destacado — una comparación,
// no tres filas de tabla.
function ModeloFinanciero({
  columnas,
  filas,
  editable,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  const colEscenario = columnas.find((c) => c.key === "escenario") ?? columnas[0];
  const colHipotesis = columnas.find((c) => c.tipo === "largo");
  const moneyCols = columnas.filter((c) => c.tipo === "money");
  const colMargen = moneyCols.find((c) => c.key === "margen");
  const orden = colEscenario.opciones ?? [];
  const ordenadas = [...filas].sort(
    (a, b) => orden.indexOf(a.datos?.[colEscenario.key] ?? "") - orden.indexOf(b.datos?.[colEscenario.key] ?? "")
  );

  function MoneyField({ f, col, big }: { f: Fila; col: Columna; big?: boolean }) {
    const v = ejNum(f.datos?.[col.key]);
    return (
      <div className={`hp-mf-fig ${big ? "hp-mf-fig-big" : ""}`}>
        <span className="hp-mf-fig-label">{col.label}</span>
        <span className={`hp-pre-money-wrap ${big ? `hp-mf-margen tono-${v < 0 ? "bad" : "ok"}` : ""}`}>
          <input
            className="hp-pre-money"
            type="number"
            defaultValue={f.datos?.[col.key] ?? ""}
            readOnly={!editable}
            placeholder="0"
            onBlur={(e) => set(f, col.key, e.target.value)}
          />
          <span className="hp-pre-money-eur">€</span>
        </span>
      </div>
    );
  }

  function Escenario(f: Fila) {
    const esc = f.datos?.[colEscenario.key] ?? "";
    return (
      <div className={`hp-mf-card tono-${estadoTono(esc)}`} key={f.id}>
        <div className="hp-mf-head">
          {colEscenario.opciones ? (
            <EstadoSeg valor={esc} opciones={colEscenario.opciones} onPick={(v) => set(f, colEscenario.key, v)} editable={editable} color />
          ) : (
            <input className="hp-mf-escenario" defaultValue={esc} readOnly={!editable} onBlur={(e) => set(f, colEscenario.key, e.target.value)} />
          )}
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        <div className="hp-mf-figs">
          {moneyCols.filter((c) => c.key !== colMargen?.key).map((c) => <MoneyField key={c.key} f={f} col={c} />)}
          {colMargen && <MoneyField f={f} col={colMargen} big />}
        </div>
        {colHipotesis && (
          <textarea
            className="hp-mf-hipotesis"
            defaultValue={f.datos?.[colHipotesis.key] ?? ""}
            placeholder={colHipotesis.label}
            readOnly={!editable}
            onBlur={(e) => set(f, colHipotesis.key, e.target.value)}
            rows={3}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-mf-grid">{ordenadas.map(Escenario)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Panel de KPIs del proyecto ----
// Reemplaza la ficha genérica de campos por un panel: progreso de rodaje,
// presupuesto y páginas como barras, y el resto como tiles de número
// grande. Lo que un ejecutivo proyecta en una reunión.
function KpiDashboard({
  campos,
  fila,
  editable,
  asegurar,
  onGuardar,
}: {
  campos: Columna[];
  fila: Fila | undefined;
  editable: boolean;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
}) {
  const t = useTranslations("hp");
  async function set(key: string, v: string) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }
  const val = (key: string) => fila?.datos?.[key] ?? "";

  const pares: { num: string; den: string; money?: boolean }[] = [
    { num: "dias_rodados", den: "dias_rodaje_total" },
    { num: "presupuesto_ejecutado", den: "presupuesto_total", money: true },
    { num: "paginas_rodadas", den: "paginas_guion" },
  ];
  const campoDe = (key: string) => campos.find((c) => c.key === key);
  const usados = new Set<string>();
  const paresValidos = pares.filter((p) => campoDe(p.num) && campoDe(p.den));
  paresValidos.forEach((p) => { usados.add(p.num); usados.add(p.den); });
  const tiles = campos.filter((c) => !usados.has(c.key));

  function NumInput({ k, cls }: { k: string; cls: string }) {
    return (
      <input
        className={cls}
        type="number"
        defaultValue={val(k)}
        readOnly={!editable}
        placeholder="0"
        onBlur={(e) => set(k, e.target.value)}
      />
    );
  }

  return (
    <div className="hp-kpi">
      {paresValidos.length > 0 && (
        <div className="hp-kpi-progress">
          {paresValidos.map((p) => {
            const n = ejNum(val(p.num));
            const d = ejNum(val(p.den));
            const pct = d > 0 ? Math.min(100, (n / d) * 100) : 0;
            const tono = pct >= 100 ? "ok" : pct >= 60 ? "info" : "warn";
            return (
              <div className="hp-kpi-prog-card" key={p.num}>
                <span className="hp-kpi-prog-label">{campoDe(p.num)?.label}</span>
                <div className="hp-kpi-prog-nums">
                  <NumInput k={p.num} cls="hp-kpi-prog-num" />
                  <span className="hp-kpi-prog-sep">/</span>
                  <NumInput k={p.den} cls="hp-kpi-prog-den" />
                  {p.money && <span className="hp-pre-money-eur">€</span>}
                  <span className={`hp-kpi-prog-pct tono-${tono}`}>{Math.round(pct)}%</span>
                </div>
                <div className="hp-kpi-prog-bar">
                  <div className={`hp-pre-bar-fill tono-${tono}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tiles.length > 0 && (
        <div className="hp-kpi-tiles">
          {tiles.map((c) => (
            <div className="hp-kpi-tile" key={c.key}>
              <span className="hp-kpi-tile-val-wrap">
                <NumInput k={c.key} cls="hp-kpi-tile-val" />
                {c.tipo === "money" && <span className="hp-pre-money-eur">€</span>}
                {c.key.includes("pct") && <span className="hp-kpi-tile-pct">%</span>}
              </span>
              <span className="hp-kpi-tile-label">{c.label}</span>
            </div>
          ))}
        </div>
      )}
      {!fila && <p className="hp-kpi-hint">{editable ? t("startAddingRow") : t("waitForData")}</p>}
    </div>
  );
}

// ===========================================================================
// Carpeta de archivos por herramienta
// Cada herramienta tiene su propia carpeta en Storage: planos, permisos,
// referencias, PDFs. Viven con la herramienta, no sueltos en Documentos.
// ===========================================================================
function bytesLegibles(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CarpetaArchivos({
  departamento,
  herramientaId,
  editable,
}: {
  departamento: string;
  herramientaId: string;
  editable: boolean;
}) {
  const t = useTranslations("hp");
  const [archivos, setArchivos] = useState<{ name: string; size: number; created: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const prefix = useMemo(() => {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
    return projectId ? `${projectId}/${safeKey(departamento)}/herramientas/${safeKey(herramientaId)}/_carpeta` : null;
  }, [departamento, herramientaId]);

  const cargar = useCallback(async () => {
    if (!prefix) { setCargando(false); return; }
    setCargando(true);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documentos").list(prefix, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) { setErr(error.message); setCargando(false); return; }
    setArchivos(
      (data ?? [])
        .filter((o) => o.name !== ".emptyFolderPlaceholder")
        .map((o) => ({ name: o.name, size: (o.metadata?.size as number) ?? 0, created: o.created_at ?? "" }))
    );
    setCargando(false);
  }, [prefix]);

  useEffect(() => { cargar(); }, [cargar]);

  async function subir(file: File) {
    if (!prefix) return;
    setSubiendo(true); setErr(null);
    const supabase = createClient();
    const path = `${prefix}/${Date.now()}-${safeKey(file.name)}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file);
    setSubiendo(false);
    if (error) { setErr(t("uploadError", { msg: error.message })); return; }
    cargar();
  }
  async function abrir(name: string) {
    if (!prefix) return;
    const supabase = createClient();
    const { data } = await supabase.storage.from("documentos").createSignedUrl(`${prefix}/${name}`, 60);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function quitar(name: string) {
    if (!prefix || !window.confirm(t("fileConfirmDelete"))) return;
    const supabase = createClient();
    await supabase.storage.from("documentos").remove([`${prefix}/${name}`]);
    cargar();
  }

  const nombreLimpio = (n: string) => n.replace(/^\d+-/, "");

  return (
    <div className="hp-carpeta">
      <div className="hp-carpeta-head">
        <span className="hp-carpeta-title"><Icon name="folder" size={15} /> {t("filesTitle")}</span>
        <span className="hp-carpeta-count">{archivos.length}</span>
        {editable && (
          <label className="cp-btn cp-btn-acc hp-carpeta-up">
            {subiendo ? t("importing") : <><Icon name="upload" size={13} /> {t("upload")}</>}
            <input type="file" style={{ display: "none" }} disabled={subiendo} onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {err && <div className="hp-error"><span>⚠ {err}</span><button onClick={() => setErr(null)}><Icon name="x" size={12} /></button></div>}
      {cargando ? (
        <p className="hp-carpeta-empty">{t("saving")}</p>
      ) : archivos.length === 0 ? (
        <div className="hp-carpeta-vacia">
          <span className="hex"></span>
          <p>{t("filesEmpty")}</p>
          {editable && <span className="hp-carpeta-hint">{t("filesHint")}</span>}
        </div>
      ) : (
        <div className="hp-carpeta-grid">
          {archivos.map((a) => (
            <div className="hp-file" key={a.name}>
              <button className="hp-file-open" onClick={() => abrir(a.name)} title={nombreLimpio(a.name)}>
                <Icon name="file-text" size={26} />
                <span className="hp-file-name">{nombreLimpio(a.name)}</span>
                <span className="hp-file-meta">{bytesLegibles(a.size)}</span>
              </button>
              {editable && <button className="hp-file-del" onClick={() => quitar(a.name)} title={t("delete")}><Icon name="x" size={12} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// STRIPBOARD — el corazón de la planificación de rodaje
// No es una tabla: es el orden del día en tiras de colores (convención
// universal: blanco INT-día, azul INT-noche, amarillo EXT-día, verde
// EXT-noche), agrupadas por jornada, con páginas en octavos sumadas por día.
// ===========================================================================
function stripTono(intext: string, dn: string): "intdia" | "intnoche" | "extdia" | "extnoche" {
  const ext = /ext/i.test(intext);
  const noche = /noche|atardecer/i.test(dn);
  if (ext) return noche ? "extnoche" : "extdia";
  return noche ? "intnoche" : "intdia";
}
function octavosDe(paginas: string): number {
  if (!paginas) return 0;
  const m = paginas.trim().match(/^(?:(\d+)\s+)?(?:(\d+)\/8)?$/);
  if (m) return (parseInt(m[1] || "0") * 8) + parseInt(m[2] || "0");
  const soloEnt = paginas.trim().match(/^(\d+)$/);
  if (soloEnt) return parseInt(soloEnt[1]) * 8;
  const soloFrac = paginas.trim().match(/^(\d+)\/8$/);
  if (soloFrac) return parseInt(soloFrac[1]);
  return 0;
}
function octavosAPag(oct: number): string {
  const ent = Math.floor(oct / 8);
  const frac = oct % 8;
  if (ent && frac) return `${ent} ${frac}/8`;
  if (ent) return `${ent}`;
  if (frac) return `${frac}/8`;
  return "0";
}

function StripboardTool({
  columnas,
  filas,
  editable,
  departamento,
  herramientaId,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const colIntext = columnas.find((c) => c.key === "intext");
  const colDN = columnas.find((c) => c.key === "dianoche");

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  // Control segmentado propio de CINEPACK — reemplaza el <select> nativo
  // (que arrastra el desplegable del SO y rompe la estética). Celdas que se
  // seleccionan, esquinas rectas, mismo lenguaje que las pestañas de la app.
  function Seg({ valor, opciones, onPick, ariaLabel }: { valor: string; opciones: string[]; onPick: (v: string) => void; ariaLabel: string }) {
    return (
      <div className="sb-seg" role="group" aria-label={ariaLabel}>
        {opciones.map((op) => (
          <button
            key={op}
            type="button"
            className={`sb-seg-cell ${valor === op ? "sb-seg-on" : ""}`}
            disabled={!editable}
            onClick={() => onPick(valor === op ? "" : op)}
          >
            {op}
          </button>
        ))}
      </div>
    );
  }
  const ord = (f: Fila) => {
    const o = parseFloat(f.datos?._orden ?? "");
    return isNaN(o) ? (f.orden ?? 0) : o;
  };

  const ordenadas = [...filas].sort((a, b) => ord(a) - ord(b));
  const dias = Array.from(new Set(ordenadas.map((f) => (f.datos?.dia ?? "").trim()))).sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true })
  );

  function moverStrip(f: Fila, dia: string, beforeId: string | null) {
    const enDia = ordenadas.filter((x) => (x.datos?.dia ?? "").trim() === dia && x.id !== f.id);
    const idx = beforeId ? enDia.findIndex((x) => x.id === beforeId) : enDia.length;
    let prev: number, next: number;
    if (enDia.length === 0) { prev = 0; next = 2; }
    else if (idx <= 0) { next = ord(enDia[0]); prev = next - 2; }
    else if (idx >= enDia.length) { prev = ord(enDia[enDia.length - 1]); next = prev + 2; }
    else { prev = ord(enDia[idx - 1]); next = ord(enDia[idx]); }
    onGuardar(f.id, { ...f.datos, dia, _orden: String((prev + next) / 2) }, f);
  }

  function Tira({ f }: { f: Fila }) {
    const tono = stripTono(f.datos?.intext ?? "", f.datos?.dianoche ?? "");
    const elenco = (f.datos?.elenco ?? "").split(/[,\s]+/).filter(Boolean);
    return (
      <div
        className={`sb-strip sb-${tono} ${arrastrando === f.id ? "sb-dragging" : ""}`}
        draggable={editable}
        onDragStart={() => setArrastrando(f.id)}
        onDragEnd={() => setArrastrando(null)}
        onDragOver={(e) => { if (arrastrando && arrastrando !== f.id) e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          if (!arrastrando || arrastrando === f.id) return;
          const dragged = filas.find((x) => x.id === arrastrando);
          if (dragged) moverStrip(dragged, (f.datos?.dia ?? "").trim(), f.id);
          setArrastrando(null);
        }}
      >
        <div className="sb-row1">
          {editable && <span className="sb-grip"><Icon name="grip-vertical" size={16} /></span>}
          <input className="sb-escena" defaultValue={f.datos?.escena ?? ""} placeholder="—" readOnly={!editable} onBlur={(e) => set(f, "escena", e.target.value)} />
          <Seg valor={f.datos?.intext ?? ""} opciones={colIntext?.opciones ?? ["INT", "EXT", "INT/EXT"]} onPick={(v) => set(f, "intext", v)} ariaLabel={t("sbIntExt")} />
          <Seg valor={f.datos?.dianoche ?? ""} opciones={colDN?.opciones ?? ["Día", "Noche", "Amanecer", "Atardecer"]} onPick={(v) => set(f, "dianoche", v)} ariaLabel={t("sbDayNight")} />
          <input className="sb-loc" defaultValue={f.datos?.locacion ?? ""} placeholder={t("sbLocation")} readOnly={!editable} onBlur={(e) => set(f, "locacion", e.target.value)} />
          <div className="sb-pag" title={t("sbPages")}>
            <input className="sb-pag-input" defaultValue={f.datos?.paginas ?? ""} placeholder="0/8" readOnly={!editable} onBlur={(e) => set(f, "paginas", e.target.value)} />
            <span className="sb-pag-unit">pág</span>
          </div>
          <div className="sb-elenco" title={t("sbCast")}>
            {elenco.length > 0 ? elenco.map((c, i) => <span className="sb-cast" key={i}>{c}</span>) : <span className="sb-cast-empty">—</span>}
          </div>
          {editable && <button className="sb-del" onClick={() => onBorrar(f.id)} title={t("delete")}><Icon name="x" size={13} /></button>}
        </div>
        <div className="sb-row2">
          <input className="sb-sinopsis" defaultValue={f.datos?.sinopsis ?? ""} placeholder={t("sbSynopsis")} readOnly={!editable} onBlur={(e) => set(f, "sinopsis", e.target.value)} />
          <input className="sb-elenco-edit" defaultValue={f.datos?.elenco ?? ""} placeholder={t("sbCastEdit")} readOnly={!editable} onBlur={(e) => set(f, "elenco", e.target.value)} />
          <div className="sb-ref">
            <ArchivoCell path={f.datos?.ref ?? ""} editable={editable} departamento={departamento} herramientaId={herramientaId} filaId={f.id} colKey="ref" onSave={(v) => set(f, "ref", v)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-board">
      <div className="sb-legend">
        <span className="sb-leg"><span className="sb-sw sb-sw-intdia"></span>{t("sbIntDay")}</span>
        <span className="sb-leg"><span className="sb-sw sb-sw-intnoche"></span>{t("sbIntNight")}</span>
        <span className="sb-leg"><span className="sb-sw sb-sw-extdia"></span>{t("sbExtDay")}</span>
        <span className="sb-leg"><span className="sb-sw sb-sw-extnoche"></span>{t("sbExtNight")}</span>
        {editable && (
          <button className="cp-btn cp-btn-acc sb-add" onClick={() => onCrear({ dia: dias[dias.length - 1] || "1" })}>
            <Icon name="plus" size={13} /> {t("sbAddStrip")}
          </button>
        )}
      </div>

      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={() => onCrear({ dia: "1" })}>{t("sbAddStrip")}</button>}
        </div>
      ) : (
        dias.map((dia) => {
          const fs = ordenadas.filter((f) => (f.datos?.dia ?? "").trim() === dia);
          const oct = fs.reduce((s, f) => s + octavosDe(f.datos?.paginas ?? ""), 0);
          return (
            <div className="sb-day" key={dia || "_sin"}>
              <div
                className="sb-day-banner"
                onDragOver={(e) => { if (arrastrando) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (!arrastrando) return; const d = filas.find((x) => x.id === arrastrando); if (d) moverStrip(d, dia, null); setArrastrando(null); }}
              >
                <span className="sb-day-n">{dia ? t("sbDay", { n: dia }) : t("sbNoDay")}</span>
                <span className="sb-day-totals">{t("sbDayTotals", { escenas: fs.length, pag: octavosAPag(oct) })}</span>
              </div>
              {fs.map((f) => <Tira f={f} key={f.id} />)}
            </div>
          );
        })
      )}
    </div>
  );
}

// ---- Parte de producción diario — el documento maestro del día ----
// Reemplaza la ficha genérica de campos por un parte: cómo fue la jornada
// (horario + horas extra), qué se logró (escenas/páginas/figuración como
// cifras grandes), incidencias destacadas y firmas de cierre.
function ParteDiario({
  campos,
  fila,
  editable,
  asegurar,
  onGuardar,
}: {
  campos: Columna[];
  fila: Fila | undefined;
  editable: boolean;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
}) {
  const t = useTranslations("hp");
  async function set(key: string, v: string) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }
  const v = (k: string) => fila?.datos?.[k] ?? "";
  const lbl = (k: string) => campos.find((c) => c.key === k)?.label ?? k;
  const horasExtra = ejNum(v("horas_extra"));

  function Campo({ k, cls, type }: { k: string; cls: string; type?: string }) {
    return (
      <input className={cls} type={type ?? "text"} defaultValue={v(k)} readOnly={!editable} placeholder="—" onBlur={(e) => set(k, e.target.value)} />
    );
  }
  function Stat({ k }: { k: string }) {
    return (
      <div className="pd-stat">
        <Campo k={k} cls="pd-stat-v" />
        <span className="pd-stat-l">{lbl(k)}</span>
      </div>
    );
  }
  function Incidencia({ k, tono }: { k: string; tono: "bad" | "warn" }) {
    return (
      <label className={`pd-inc tono-${tono}`}>
        <span className="pd-inc-l">{lbl(k)}</span>
        <textarea defaultValue={v(k)} readOnly={!editable} rows={2} placeholder="—" onBlur={(e) => set(k, e.target.value)} />
      </label>
    );
  }

  return (
    <div className="pd">
      <div className="pd-head">
        <span className="pd-pill">{t("pdTitle")}</span>
        <div className="pd-head-row">
          <div className="pd-metric"><span className="pd-metric-l">{lbl("fecha")}</span><Campo k="fecha" cls="pd-metric-v" type="date" /></div>
          <div className="pd-metric"><span className="pd-metric-l">{lbl("dia")}</span><Campo k="dia" cls="pd-metric-v" /></div>
          <div className="pd-metric pd-metric-grow"><span className="pd-metric-l">{lbl("locacion")}</span><Campo k="locacion" cls="pd-metric-v" /></div>
        </div>
      </div>

      <div className="pd-jornada">
        <div className="pd-time"><Icon name="clock" size={15} /><Campo k="hora_inicio" cls="pd-time-v" /><span className="pd-time-arrow">→</span><Campo k="hora_fin" cls="pd-time-v" /></div>
        <label className={`pd-extra ${horasExtra > 0 ? "pd-extra-on" : ""}`}>
          <span>{lbl("horas_extra")}</span>
          <Campo k="horas_extra" cls="pd-extra-v" type="number" />
        </label>
      </div>

      <div className="pd-stats">
        <Stat k="escenas_rodadas" />
        <Stat k="paginas_rodadas" />
        <Stat k="paginas_pendientes" />
        <Stat k="extras" />
      </div>

      <div className="pd-incs">
        <Incidencia k="accidentes" tono="bad" />
        <Incidencia k="retrasos" tono="warn" />
      </div>

      <label className="pd-notas-wrap">
        <span className="pd-sec-l"><Icon name="file-text" size={13} /> {lbl("notas")}</span>
        <textarea className="pd-notas" defaultValue={v("notas")} readOnly={!editable} rows={3} placeholder="—" onBlur={(e) => set("notas", e.target.value)} />
      </label>

      <div className="pd-firmas">
        <label className="pd-firma"><span>{lbl("firma_dir")}</span><Campo k="firma_dir" cls="pd-firma-v" /></label>
        <label className="pd-firma"><span>{lbl("firma_prod")}</span><Campo k="firma_prod" cls="pd-firma-v" /></label>
      </div>

      {!fila && <p className="hp-kpi-hint">{editable ? t("startAddingRow") : t("waitForData")}</p>}
    </div>
  );
}

// ---- Tabla con registro de intervenciones ----
const ITEMS_POR_PAG = 50;

export function TablaTool({
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
  const t = useTranslations("hp");
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
  const importInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef<{key: string; startX: number; startW: number} | null>(null);

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
    const label = window.prompt(t("newColumnPrompt"));
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
    if (!window.confirm(t("confirmDeleteRows", { n: seleccionadas.size }))) return;
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
            const v = (f.datos?.[colEstado.key] ?? "").trim() || t("noStatus");
            acc[v] = (acc[v] ?? 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 6)
      : [];
    return (
      <div className="hp-stats-bar">
        <span className="hp-stats-total">
          {hayFiltroActivo
            ? t("recordsFiltered", { n: filasFiltradas.length, total: filas.length })
            : t("recordsCount", { n: filas.length })}
        </span>
        {entries.map(([v, n]) => (
          <span key={v} className={`hp-stats-pill tono-${estadoTono(v)}`}>{v} <b>{n}</b></span>
        ))}
        {hayFiltroActivo && (
          <button className="hp-stats-clear" onClick={() => { setBusqueda(""); setFiltros({}); setColHeaderFilter({}); }}>{t("clear")}</button>
        )}
      </div>
    );
  })();

  const colSpanVacio =
    (editable ? 1 : 0) + visibleCols.length + 1 + (editable ? 2 : 0) + (showLastEdit ? 1 : 0);

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
          placeholder={t("search")}
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(0); }}
        />
        {/* Filtrar (selects por columna de estado, antes sueltos en el toolbar) */}
        {colsEstado.length > 0 && (
          <ToolMenu label={t("filter")} icon="filter" width={230}
            badge={colsEstado.filter(c => filtros[c.key]).length || undefined}>
            <div className="tm-section">
              {colsEstado.map(c => (
                <label key={c.key} className="tm-field">
                  <span>{c.label}</span>
                  <select value={filtros[c.key] ?? ""}
                    onChange={e => { setFiltros(f => ({ ...f, [c.key]: e.target.value })); setPagina(0); }}>
                    <option value="">{t("all")}</option>
                    {(c.opciones ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </ToolMenu>
        )}

        {/* Ordenar (orden secundario) */}
        <ToolMenu label={t("sort")} icon="sort" width={230}>
          <div className="tm-section">
            <label className="tm-field">
              <span>{t("secondarySort")}</span>
              <select value={sortKey2 ?? ""} onChange={e => setSortKey2(e.target.value || null)}>
                <option value="">{t("none")}</option>
                {columnas.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            {sortKey2 && (
              <button className="tm-item" onClick={() => setSortDir2(d => d === "asc" ? "desc" : "asc")}>
                {sortDir2 === "asc" ? t("sortDirAsc") : t("sortDirDesc")}
              </button>
            )}
          </div>
        </ToolMenu>

        {/* Vista (toggles + columnas visibles) */}
        <ToolMenu label={t("view")} icon="sliders" width={230}>
          <div className="tm-section">
            <button className={`tm-item${compacto ? " active" : ""}`} onClick={() => setCompacto(v => !v)}>
              {compacto && <Icon name="check" size={13} />}<span>{t("compactRows")}</span>
            </button>
            <button className={`tm-item${showExtStats ? " active" : ""}`} onClick={() => setShowExtStats(v => !v)}>
              {showExtStats && <Icon name="check" size={13} />}<span>{t("extendedStats")}</span>
            </button>
            <button className={`tm-item${showLastEdit ? " active" : ""}`} onClick={() => setShowLastEdit(v => !v)}>
              {showLastEdit && <Icon name="check" size={13} />}<span>{t("showLastEdit")}</span>
            </button>
          </div>
          <div className="tm-section tm-section-bordered">
            <span className="tm-section-title">{t("visibleColumns")}</span>
            {columnas.map(c => (
              <label key={c.key} className="tm-check">
                <input type="checkbox" checked={!hiddenCols.has(c.key)}
                  onChange={() => setHiddenCols(prev => { const next = new Set(prev); if (next.has(c.key)) next.delete(c.key); else next.add(c.key); return next; })} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </ToolMenu>

        {/* Herramientas de datos */}
        <ToolMenu label={t("tools")} icon="replace" width={220}>
          {editable && (
            <button className="tm-item" onClick={pedirColumna}><Icon name="plus" size={13} /><span>{t("addColumnItem")}</span></button>
          )}
          <button className={`tm-item${findOpen ? " active" : ""}`} onClick={() => setFindOpen(v => !v)}>
            <Icon name="replace" size={13} /><span>{t("replace")}</span>
          </button>
          <button className={`tm-item${condOpen ? " active" : ""}`} onClick={() => setCondOpen(v => !v)}>
            <Icon name="filter" size={13} /><span>{t("conditionalFormat")}</span>
          </button>
        </ToolMenu>

        {/* Exportar / importar */}
        <ToolMenu label={t("export")} icon="download" align="right" width={210}>
          {(close) => (<>
            <button className="tm-item" onClick={() => { exportarCSV(); close(); }}><Icon name="download" size={13} /><span>{t("downloadCsv")}</span></button>
            <button className="tm-item" onClick={() => { exportarPDF(); close(); }}><Icon name="download" size={13} /><span>{t("downloadPdf")}</span></button>
            <button className="tm-item" onClick={() => { window.print(); close(); }}><Icon name="file-text" size={13} /><span>{t("print")}</span></button>
            {onImportarCSV && (
              <button className="tm-item" disabled={importando} onClick={() => { importInputRef.current?.click(); close(); }}>
                <Icon name="plus" size={13} /><span>{importando ? t("importing") : t("importCsvItem")}</span>
              </button>
            )}
          </>)}
        </ToolMenu>
        {onImportarCSV && <input ref={importInputRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleImportCSV} />}

        {columnas.some((c) => !c.tipo || c.tipo === "largo" || c.tipo === "texto") && (
          <>
            <span className="hp-nota-sep" />
            <RichToolbar inline />
          </>
        )}

        <div className="hp-tabla-toolbar-spacer" />

        {/* Seleccionadas: acciones en batch */}
        {seleccionadas.size > 0 && (
          <>
            <span className="hp-sel-label">{t("selected", { n: seleccionadas.size })}</span>
            <button className="btn" onClick={autoFillDown} title={t("fillDownHint")}><Icon name="sort" size={13} /> {t("fillDown")}</button>
            {onDuplicar && (
              <button className="btn" onClick={() => { for (const id of seleccionadas) { const f = filas.find(x => x.id === id); if (f) onDuplicar(f); } setSeleccionadas(new Set()); }}><Icon name="columns" size={13} /> {t("duplicate")}</button>
            )}
            <button className="btn hp-btn-danger" onClick={borrarSeleccionadas}><Icon name="trash" size={13} /> {t("delete")}</button>
          </>
        )}

        <button
          className="hp-expand-btn"
          onClick={() => setExpandida(v => !v)}
          title={expandida ? t("collapse") : t("expand")}
        >
          <Icon name={expandida ? "minimize" : "maximize"} size={15} />
        </button>
      </div>

      {/* ── Batch edit bar ───────────────────────────────────────────── */}
      {seleccionadas.size > 0 && (
        <div className="hp-batch-bar">
          <span>{t("editRows", { n: seleccionadas.size })}</span>
          <select className="hp-tabla-filter" value={batchCol} onChange={e => setBatchCol(e.target.value)}>
            <option value="">{t("selectField")}</option>
            {columnas.filter(c => c.tipo !== "archivo").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input
            className="hp-tabla-search"
            placeholder={t("newValue")}
            value={batchVal}
            onChange={e => setBatchVal(e.target.value)}
          />
          <button className="btn acc" onClick={aplicarBatchEdit} disabled={!batchCol}>{t("apply")}</button>
        </div>
      )}

      {/* ── Find & Replace ───────────────────────────────────────────── */}
      {findOpen && (
        <div className="hp-find-bar">
          <input className="hp-tabla-search" placeholder={t("search")} value={findBuscar} onChange={e => setFindBuscar(e.target.value)} />
          <span>→</span>
          <input className="hp-tabla-search" placeholder={t("replacePlaceholder")} value={findReemplazar} onChange={e => setFindReemplazar(e.target.value)} />
          <button className="btn acc" onClick={reemplazarTodo} disabled={!findBuscar}>{t("replaceAll")}</button>
          <button className="btn" onClick={() => setFindOpen(false)}>✕</button>
        </div>
      )}

      {/* ── Formato condicional ──────────────────────────────────────── */}
      {condOpen && (
        <div className="hp-cond-panel">
          <div className="hp-cond-add">
            <span>{t("newRule")}</span>
            <select className="hp-tabla-filter" id="cp-cond-col">
              <option value="">{t("column")}</option>
              {columnas.filter(c => c.tipo !== "archivo" && c.tipo !== "link").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select className="hp-tabla-filter" id="cp-cond-op">
              <option value=">">{t("opGreater")}</option>
              <option value="<">{t("opLess")}</option>
              <option value="=">{t("opEquals")}</option>
              <option value="contiene">{t("opContains")}</option>
            </select>
            <input className="hp-tabla-search" placeholder={t("value")} id="cp-cond-val" style={{width:80}} />
            <input type="color" id="cp-cond-color" defaultValue="#ffd600" style={{width:36,height:30,border:"none",cursor:"pointer"}} />
            <button className="btn acc" onClick={() => {
              const col = (document.getElementById("cp-cond-col") as HTMLSelectElement)?.value;
              const op = (document.getElementById("cp-cond-op") as HTMLSelectElement)?.value;
              const val2 = (document.getElementById("cp-cond-val") as HTMLInputElement)?.value;
              const color = (document.getElementById("cp-cond-color") as HTMLInputElement)?.value;
              if (col && op && val2) setCondRules(r => [...r, {id: crypto.randomUUID(), colKey: col, op, value: val2, color}]);
            }}>{t("addRule")}</button>
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
                    <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} title={t("selectAll")} />
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
                      placeholder={t("filterPlaceholder")}
                      value={colHeaderFilter[c.key] ?? ""}
                      onChange={e => { setColHeaderFilter(f => ({ ...f, [c.key]: e.target.value })); setPagina(0); }}
                      onClick={e => e.stopPropagation()}
                    />
                  </th>
                ))}
                <th className="hp-th-reg">{t("regCol")}</th>
                {editable && <th className="hp-th-color" title={t("rowColor")}></th>}
                {editable && <th></th>}
                {showLastEdit && <th className="hp-th-edit">{t("editedCol")}</th>}
              </tr>
            </thead>
            <tbody>
              {filasPagina.length === 0 && (
                <tr className="hp-tabla-empty-row">
                  <td colSpan={colSpanVacio}>
                    <span className="hex"></span>
                    {t("emptyTitle")}
                    {editable && (
                      <button className="btn acc" onClick={onCrear}>{t("addFirstRow")}</button>
                    )}
                  </td>
                </tr>
              )}
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
                          title={t("viewHistory")}
                        >
                          <span className="hex"></span>
                          {visto ? `${(f.visionado_por ?? []).length}✓` : t("viewShort")}
                        </button>
                      </td>
                      {editable && (
                        <td className="hp-td-color">
                          <div className="hp-color-wrap">
                            <input
                              type="color"
                              className="hp-row-color-picker"
                              value={rowColor || "#9eee6a"}
                              onChange={(e) => cambiarColorFila(f, e.target.value)}
                              title={t("rowColor")}
                            />
                            {rowColor && (
                              <button className="hp-color-clear" onClick={() => limpiarColorFila(f)} title={t("removeColor")}>✕</button>
                            )}
                          </div>
                        </td>
                      )}
                      {editable && (
                        <td className="hp-td-acciones">
                          <button className="hp-dup" onClick={() => copiarFila(f)} title={t("copyClipboard")}>⎘</button>
                          {onDuplicar && (
                            <button className="hp-dup" onClick={() => onDuplicar(f)} title={t("duplicateRow")}>⧉</button>
                          )}
                          <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("deleteRow")}>✕</button>
                        </td>
                      )}
                      {showLastEdit && (
                        <td className="hp-td-edit" title={f.updated_at ? new Date(f.updated_at).toLocaleString("es-ES") : ""}>
                          {f.updated_at ? timeAgo(f.updated_at, t) : "—"}
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
                    return <td key={c.key}>{i === 0 ? t("total", { n: filasFiltradas.length }) : ""}</td>;
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
        {editable && <button className="btn acc" onClick={onCrear}>{t("addRow")}</button>}
        {editable && <button className="btn" onClick={pedirColumna}>{t("addColumn")}</button>}
        {localOrder && <button className="btn" onClick={() => setLocalOrder(null)}>{t("resetOrder")}</button>}
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
  const t = useTranslations("hp");
  const reg = [...(fila.registro ?? [])].reverse().slice(0, 8);
  const vis = fila.visionado_por ?? [];
  return (
    <div className="hp-detail">
      <div className="hp-detail-col">
        <h6><span className="hex"></span> {t("interventionsLog")}</h6>
        {reg.length === 0 && <p className="hp-empty">{t("noInterventions")}</p>}
        <ul className="hp-timeline">
          {reg.map((r, i) => (
            <li key={i}>
              <b>{r.accion === "crea" ? t("actionCreated") : t("actionEdited")}</b> {r.usuario} · {timeAgo(r.fecha, t)}
            </li>
          ))}
        </ul>
      </div>
      <div className="hp-detail-col">
        <h6><span className="hex"></span> {t("viewedBy")}</h6>
        {vis.length === 0 && <p className="hp-empty">{t("noOneYet")}</p>}
        <div className="hp-vis-chips">
          {vis.map((v, i) => (
            <span className="hp-vis-chip" key={i}>{v.usuario}</span>
          ))}
        </div>
        <button className={`btn ${yoVi ? "" : "acc"}`} style={{ marginTop: 8 }} onClick={onVisionar}>
          {yoVi ? t("unmarkVisited") : t("markVisited")}
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
  const t = useTranslations("hp");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    if (!path) { setUrl(null); return; }
    const supabase = createClient();
    supabase.storage.from("documentos").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!activo) return;
      if (error) console.error("createSignedUrl falló:", path, error);
      setUrl(data?.signedUrl ?? null);
    });
    return () => { activo = false; };
  }, [path]);

  async function subir(file: File) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const p = `${projectId}/${safeKey(departamento)}/herramientas/${safeKey(herramientaId)}/${filaId}/img/${Date.now()}-${safeKey(file.name)}`;
    const { error } = await supabase.storage.from("documentos").upload(p, file);
    setBusy(false);
    if (error) {
      setErr(t("uploadError", { msg: error.message }));
      return;
    }
    onSave(p);
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
          {busy ? t("uploading") : path ? t("change") : t("upload")}
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
      {err && <span className="hp-archivo-err">{err}</span>}
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
  const t = useTranslations("hp");
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v });
  }
  function pedirColumna() {
    const label = window.prompt(t("newFieldPrompt"));
    if (label && label.trim()) onAgregarColumna(label.trim());
  }

  function tarjeta(f: Fila) {
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
            {yoVi ? t("visMiniDone") : t("visMini")}
          </button>
          {editable && <button className="hp-del" onClick={() => onBorrar(f.id)}>✕</button>}
        </div>
      </div>
    );
  }

  // Galerías de continuidad (vestuario/maquillaje/peinado) comparten una columna
  // "personaje" — agruparlas por personaje es cómo el equipo realmente las usa
  // (revisar la continuidad DE alguien, no mirar fotos sueltas sin orden).
  const colPersonaje = columnas.find((c) => c.key === "personaje");
  const grupos = colPersonaje
    ? Object.entries(
        filas.reduce<Record<string, Fila[]>>((acc, f) => {
          const nombre = (f.datos?.personaje ?? "").trim() || t("noCharacter");
          (acc[nombre] ??= []).push(f);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b, "es"))
    : null;

  return (
    <>
      {editable && columnas.some((c) => !c.tipo || c.tipo === "largo" || c.tipo === "texto") && (
        <RichToolbar className="hp-tabla-richbar" />
      )}
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("noRecordsYet")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addCard")}</button>}
        </div>
      ) : grupos ? (
        grupos.map(([nombre, fs]) => (
          <div className="hp-gal-group" key={nombre}>
            <div className="hp-gal-group-head">
              <span className="hex"></span>
              <span>{nombre}</span>
              <span className="hp-gal-group-count">{fs.length}</span>
            </div>
            <div className="hp-galeria">{fs.map(tarjeta)}</div>
          </div>
        ))
      ) : (
        <div className="hp-galeria">{filas.map(tarjeta)}</div>
      )}
      {editable && filas.length > 0 && (
        <div className="hp-actions">
          <button className="btn acc" onClick={onCrear}>{t("addCard")}</button>
          <button className="btn" onClick={pedirColumna}>{t("addField")}</button>
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
  const t = useTranslations("hp");
  async function set(key: string, v: string) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }
  function pedirCampo() {
    const label = window.prompt(t("newFieldPrompt"));
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
            <EstadoSeg valor={fila?.datos?.[c.key] ?? ""} opciones={c.opciones ?? []} onPick={(v) => set(c.key, v)} editable={editable} color />
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
          <button className="btn" onClick={pedirCampo}>{t("addField")}</button>
        </div>
      )}
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? t("unmarkVisited") : t("markVisited")}
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
const NOTA_COLORS = ["#111111","#F4F4F6","#9EEE6A","#19CBE6","#E8A330","#F07A7A","#C084FC","#60A5FA","#FCD34D"];
const NOTA_HIGHLIGHT = ["#FCD34D","#86EFAC","#93C5FD","#F9A8D4","#FCA5A5","transparent"];

function NotaTool({
  fila,
  editable,
  fullName,
  asegurar,
  onGuardar,
  onVisionar,
  estiloDoc,
}: {
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onVisionar: (id: string) => void;
  estiloDoc?: string;
}) {
  const t = useTranslations("hp");
  const editorRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<null | "color" | "highlight" | "size">(null);

  useEffect(() => {
    if (editorRef.current && (!initialised.current || fila?.id)) {
      editorRef.current.innerHTML = fila?.datos?.texto ?? "";
      initialised.current = true;
    }
  }, [fila?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar el popover abierto al hacer clic fuera del toolbar.
  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

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
        <div className="hp-nota-toolbar" ref={barRef}>
          {/* Formato inline */}
          <div className="hp-tb-group">
            <button type="button" title={t("bold")} onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}><Icon name="bold" /></button>
            <button type="button" title={t("italic")} onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}><Icon name="italic" /></button>
            <button type="button" title={t("underline")} onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}><Icon name="underline" /></button>
            <button type="button" title={t("strike")} onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }}><Icon name="strikethrough" /></button>
          </div>
          {/* Bloques */}
          <div className="hp-tb-group">
            <button type="button" title={t("titleBlock")} onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "H3"); }}><Icon name="heading" /></button>
            <button type="button" title={t("normalText")} onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "DIV"); }}><Icon name="paragraph" /></button>
            <button type="button" title={t("bulletList")} onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}><Icon name="list" /></button>
            <button type="button" title={t("numberList")} onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}><Icon name="list-ordered" /></button>
          </div>
          {/* Alineación */}
          <div className="hp-tb-group">
            <button type="button" title={t("alignLeft")} onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }}><Icon name="align-left" /></button>
            <button type="button" title={t("alignCenter")} onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }}><Icon name="align-center" /></button>
            <button type="button" title={t("alignRight")} onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }}><Icon name="align-right" /></button>
          </div>
          {/* Color, resaltado y tamaño: en popovers para no saturar el toolbar */}
          <div className="hp-tb-group">
            <div className="hp-tb-pop">
              <button type="button" className={`hp-tb-trigger${menu === "color" ? " open" : ""}`} title={t("textColor")}
                onMouseDown={(e) => { e.preventDefault(); setMenu(menu === "color" ? null : "color"); }}>
                <Icon name="text-color" /><Icon name="chevron-down" size={9} />
              </button>
              {menu === "color" && (
                <div className="hp-tb-menu hp-tb-swatches">
                  {NOTA_COLORS.map((c) => (
                    <button key={c} type="button" title={c} style={{ background: c }}
                      onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c); setMenu(null); }} />
                  ))}
                </div>
              )}
            </div>
            <div className="hp-tb-pop">
              <button type="button" className={`hp-tb-trigger${menu === "highlight" ? " open" : ""}`} title={t("highlight")}
                onMouseDown={(e) => { e.preventDefault(); setMenu(menu === "highlight" ? null : "highlight"); }}>
                <Icon name="highlighter" /><Icon name="chevron-down" size={9} />
              </button>
              {menu === "highlight" && (
                <div className="hp-tb-menu hp-tb-swatches">
                  {NOTA_HIGHLIGHT.map((c) => (
                    <button key={c} type="button" title={c === "transparent" ? t("noHighlight") : c}
                      className={c === "transparent" ? "hp-tb-swatch-none" : ""}
                      style={{ background: c === "transparent" ? "transparent" : c }}
                      onMouseDown={(e) => { e.preventDefault(); highlight(c); setMenu(null); }}>
                      {c === "transparent" ? <Icon name="x" size={12} /> : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hp-tb-pop">
              <button type="button" className={`hp-tb-trigger${menu === "size" ? " open" : ""}`} title={t("textSize")}
                onMouseDown={(e) => { e.preventDefault(); setMenu(menu === "size" ? null : "size"); }}>
                <Icon name="type" /><Icon name="chevron-down" size={9} />
              </button>
              {menu === "size" && (
                <div className="hp-tb-menu hp-tb-sizes">
                  {([["2", t("sizeSmall")], ["3", t("sizeNormal")], ["4", t("sizeLarge")], ["5", t("sizeXLarge")]] as const).map(([v, label]) => (
                    <button key={v} type="button"
                      onMouseDown={(e) => { e.preventDefault(); exec("fontSize", v); setMenu(null); }}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div
        ref={editorRef}
        className={`hp-nota hp-nota-editor ${estiloDoc ?? ""} ${!editable ? "readonly" : ""}`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={commit}
        data-placeholder={t("writeHere")}
      />
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? t("unmarkVisited") : t("markVisited")}
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
  const t = useTranslations("hp");
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
            placeholder={t("newPoint")}
          />
          <button className="btn" onClick={() => { if (nuevo.trim()) { persist([...items, { texto: nuevo.trim(), hecho: false }]); setNuevo(""); } }}>{t("add")}</button>
        </div>
      )}
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? t("unmarkVisited") : t("markVisited")}
          </button>
        </div>
      )}
    </div>
  );
}

function Firma({ fila }: { fila: Fila }) {
  const t = useTranslations("hp");
  const vis = fila.visionado_por ?? [];
  return (
    <span className="hp-firma">
      <Icon name="pencil" size={12} /> {fila.editor_nombre ?? fila.autor_nombre ?? "—"} · {timeAgo(fila.updated_at, t)}
      {vis.length > 0 && <> · <Icon name="eye" size={12} /> {vis.map((v) => v.usuario).join(", ")}</>}
    </span>
  );
}
