"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";
import type { Herramienta, Columna, ColTipo } from "../herramientas";
import GestionAccesosPanel from "./GestionAccesosPanel";
import Icon from "../components/Icon";
import ToolMenu from "../components/ToolMenu";
import CpSelect from "../components/CpSelect";

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

// Compara dos celdas de tipo "fecha". Usa Date.parse (no localeCompare) porque
// datos reales a veces llegan sin cero-relleno ("2026-7-1"), donde comparar
// como texto da un orden cronológicamente incorrecto. Las filas sin fecha
// SIEMPRE van al final, sea cual sea la dirección (asc o desc) — nunca se
// deben mezclar entre las que sí tienen fecha.
function compararFecha(va: string, vb: string, dir: "asc" | "desc"): number {
  const ta = va ? Date.parse(va) : NaN;
  const tb = vb ? Date.parse(vb) : NaN;
  const aValida = !isNaN(ta), bValida = !isNaN(tb);
  if (!aValida && !bValida) return 0;
  if (!aValida) return 1;
  if (!bValida) return -1;
  return dir === "asc" ? ta - tb : tb - ta;
}

// Orden manual efectivo de una fila: si el usuario ya la arrastró alguna vez
// hay un valor fraccional en datos._orden (mismo patrón que el Stripboard);
// si no, se usa la columna real "orden" (orden de creación). Se guarda en
// datos (jsonb) y no en la columna "orden" para no reescribir esa columna
// entera en cada drag — solo la fila movida cambia.
function efOrden(f: Fila): number {
  const o = parseFloat(f.datos?._orden ?? "");
  return isNaN(o) ? (f.orden ?? 0) : o;
}

// Campos de una convocatoria de Plan de financiación que, al cambiar, deben
// re-sincronizar sus hitos en Pulso (vía /api/plan-financiacion/sincronizar-hito).
const CAMPOS_SYNC_PULSO = new Set(["presentacion", "resolucion", "fuente", "tipo", "organismo", "premio", "importe", "estado", "condiciones"]);

// Fuentes ofrecidas en el selector de fuente de las celdas de texto largo.
const CELL_FONTS: { label: string; value: string }[] = [
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Times", value: "'Times New Roman', serif" },
];
const CELL_TEXT_COLORS = ["#111111", "#F4F4F6", "#9EEE6A", "#19CBE6", "#E8A330", "#F07A7A", "#C084FC"];

// Moneda de las columnas tipo "money" de una tabla — configurable por
// herramienta (se guarda en la fila meta, orden:-1, misma convención que las
// columnas extra en datos._extra). "eur" es el default histórico (antes el
// símbolo € estaba hardcodeado).
const MONEDAS: { value: string; label: string; symbol: string }[] = [
  { value: "eur", label: "Euros", symbol: "€" },
  { value: "gbp", label: "Libras", symbol: "£" },
  { value: "usd", label: "Dólares", symbol: "US$" },
  { value: "ars", label: "Pesos", symbol: "$" },
  { value: "none", label: "Ninguno", symbol: "" },
];
function simboloMoneda(valor: string | undefined): string {
  return MONEDAS.find((m) => m.value === (valor ?? "eur"))?.symbol ?? "€";
}

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
    id === "prod-stripboard" ||
    id === "prod-transporte" ||
    id === "prod-hojas-ruta" ||
    id === "prod-plan-semana" ||
    id === "prod-plan-locaciones-jornada" ||
    CATERING_IDS.has(id) ||
    DESGLOSE_DIR_IDS.has(id) ||
    PLAN_FIGURACION_IDS.has(id) ||
    id === "dir-partes-script" ||
    id === "dir-script-log" ||
    id === "dir-cambios-guion" ||
    id === "guion-sinopsis-escaleta" ||
    id === "guion-historial" ||
    id === "guion-desglose-escenas" ||
    id === "guion-comentarios" ||
    id === "cast-candidatos" ||
    id === "cast-breakdown-actores" ||
    id === "cast-tabla-disponibilidad" ||
    CAST_EVAL_IDS.has(id) ||
    id === "rep-notas-escenas-detalle" ||
    id === "rep-vest-maq" ||
    id === "rep-pronunciacion" ||
    SON_MIC_IDS.has(id) ||
    id === "son-plan-directo" ||
    id === "son-control-baterias" ||
    id === "son-playlist-musica-temp" ||
    id === "post-versiones-corte" ||
    id === "post-guia-color" ||
    id === "rrhh-descansos" ||
    id === "sost-indicadores" ||
    id === "mkt-plan" ||
    id === "dif-medios" ||
    id === "dist-festivales" ||
    id === "mo-cal-publicaciones"
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
      // Fila duplicada con fechas ya cargadas (Vista Tabla → "Duplicar fila"):
      // genera su propio hito en Pulso en vez de esperar a la próxima edición.
      if (herramienta.id === "ej-plan-financiacion" && (datosIniciales.presentacion || datosIniciales.resolucion)) {
        sincronizarPulsoFinanciacion(data.id);
      }
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
    if (herramienta.id === "ej-plan-financiacion" && Object.keys(cambios).some((k) => CAMPOS_SYNC_PULSO.has(k))) {
      sincronizarPulsoFinanciacion(id);
    }
  }

  // Crea/actualiza/borra los hitos en Pulso (eventos_proyecto) ligados a una
  // convocatoria de Plan de financiación. Ver /api/plan-financiacion/sincronizar-hito
  // para el porqué de pasar por un endpoint (RLS de eventos_proyecto es más
  // estricta que la de herramienta_filas). Best-effort: si Pulso falla, no
  // bloquea el guardado principal de la convocatoria, ya hecho antes de esto.
  async function sincronizarPulsoFinanciacion(filaId: string, eliminar = false) {
    try {
      const res = await fetch("/api/plan-financiacion/sincronizar-hito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fila_id: filaId, eliminar }),
      });
      const json = await res.json().catch(() => null);
      if (json?.datos) {
        filasRef.current = filasRef.current.map((f) => (f.id === filaId ? { ...f, datos: { ...f.datos, ...json.datos } } : f));
        setFilas(filasRef.current);
      }
    } catch {
      // silencioso: ver comentario arriba
    }
  }

  async function borrarFila(id: string) {
    const fila = filasRef.current.find((f) => f.id === id);
    if (herramienta.id === "ej-plan-financiacion") {
      await sincronizarPulsoFinanciacion(id, true);
    }
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
  async function agregarColumnaExtra(label: string, tipo: ColTipo = "texto") {
    const actuales: Columna[] = JSON.parse(meta?.datos?._extra ?? "[]");
    const next = [...actuales, { key: slugCampo(label), label, tipo } as Columna];
    if (meta) await guardarFila(meta.id, { ...meta.datos, _extra: JSON.stringify(next) });
    else await crearFila({ _extra: JSON.stringify(next) }, -1);
  }

  // Moneda de las columnas "money" de esta tabla — compartida por todo el
  // equipo (vive en la fila meta, misma convención que _extra).
  async function cambiarMoneda(v: string) {
    if (meta) await guardarFila(meta.id, { ...meta.datos, _moneda: v });
    else await crearFila({ _moneda: v }, -1);
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

      {esTabla && (() => {
        const tabs = (
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
        );
        // Se porta a la cabecera "← Volver / Título" (HerramientasPanel.tsx),
        // que vive fuera de este árbol — antes quedaba en su propia fila
        // debajo, dejando todo el lado derecho de la cabecera vacío. Se
        // resuelve el nodo en cada render (sin estado/efecto extra): la
        // primera vez que no exista todavía cae al fallback inline, y con
        // cualquier re-render posterior (esta herramienta ya tiene varios
        // por la carga de datos) queda portado correctamente.
        const slot = typeof document !== "undefined" ? document.getElementById("hp-open-head-tabs") : null;
        return slot ? createPortal(tabs, slot) : tabs;
      })()}

      {esTabla && vista === "tablero" && (
        <>
      {herramienta.tipo === "tabla" && herramienta.id === "foto-marcas-foco" && (
        <VistaConEjemplos ejemplos={EJ_FOCO} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <FocoCueSheet
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && PLANO_BOARD_IDS.has(herramienta.id) && (
        <VistaConEjemplos ejemplos={EJ_PLANO} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <PlanoBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && PENDIENTES_BOARD_IDS.has(herramienta.id) && (
        <VistaConEjemplos ejemplos={EJ_PENDIENTES} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <PendientesBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "luz-generador" && (
        <VistaConEjemplos ejemplos={EJ_GENERADOR} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <ControlGenerador
          filas={fs}
          editable={ed}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && CONTINUIDAD_PERSONAJE_IDS.has(herramienta.id) && (
        <VistaConEjemplos ejemplos={EJ_CONTINUIDAD_G} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <ContinuidadPersonaje
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && AGENDA_DIA_IDS.has(herramienta.id) && (
        <AgendaDia
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          ejemplos={EJEMPLOS_POR_ID[herramienta.id]}
          onCrear={(datos) => crearFila(datos ?? {})}
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
          ejemplos={EJEMPLOS_POR_ID[herramienta.id]}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "maq-efectos-especiales-maq" && (
        <VistaConEjemplos ejemplos={EJ_FX} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <FxAntesDespues
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "arte-timeline-decorados" && (
        <VistaConEjemplos ejemplos={EJ_TIMELINE_DEC} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <TimelineDecorados
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && PRESUPUESTO_BOARD_IDS.has(herramienta.id) && (
        <VistaConEjemplos ejemplos={EJ_PRESUP} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <PresupuestoBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && CASHFLOW_IDS.has(herramienta.id) && (
        <VistaConEjemplos ejemplos={EJ_CASHFLOW} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <CashflowChart
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && FINANCIACION_PIPELINE_IDS.has(herramienta.id) && (
        <VistaConEjemplos ejemplos={EJ_PIPELINE} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <FinanciacionPipeline
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          departamento={departamento}
          herramientaId={herramienta.id}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
      )}

      {herramienta.tipo === "tabla" && ENTIDAD_TABS_IDS.has(herramienta.id) && (
        <EntidadTabsBoard
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

      {herramienta.tipo === "tabla" && DOC_STATUS_IDS.has(herramienta.id) && (
        <DocStatusBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          departamento={departamento}
          herramientaId={herramienta.id}
          ejemplos={EJEMPLOS_POR_ID[herramienta.id]}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "ej-modelo-financiero" && (
        <VistaConEjemplos ejemplos={EJ_MODELO} filas={filas} editable={editable} onCrear={crearFila}>{(fs, ed) => (
        <ModeloFinanciero
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={fs}
          editable={ed}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
        )}</VistaConEjemplos>
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

      {(herramienta.id === "prod-transporte" || herramienta.id === "prod-hojas-ruta") && (
        <TransporteBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {CATERING_IDS.has(herramienta.id) && (
        <CateringBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {(herramienta.id === "prod-plan-semana" || herramienta.id === "prod-plan-locaciones-jornada") && (
        <PlanSemanaBoard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && DESGLOSE_DIR_IDS.has(herramienta.id) && (
        <DesgloseDir
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "dir-partes-script" && (
        <PartesScript
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "dir-script-log" && (
        <ScriptLog
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "dir-cambios-guion" && (
        <CambiosGuion
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && PLAN_FIGURACION_IDS.has(herramienta.id) && (
        <PlanFiguracion
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "guion-sinopsis-escaleta" && (
        <EscaletaCorkboard
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "guion-historial" && (
        <HistorialVersiones
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "guion-desglose-escenas" && (
        <DesgloseGuion
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "guion-comentarios" && (
        <ComentariosGuion
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "cast-candidatos" && (
        <CastingWall
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

      {herramienta.tipo === "tabla" && herramienta.id === "cast-breakdown-actores" && (
        <BreakdownActores
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "cast-tabla-disponibilidad" && (
        <DisponibilidadMatriz
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && CAST_EVAL_IDS.has(herramienta.id) && (
        <EvaluacionCasting
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

      {herramienta.tipo === "tabla" && herramienta.id === "rep-notas-escenas-detalle" && (
        <ActorScenes
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "rep-vest-maq" && (
        <VestMaqReparto
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "rep-pronunciacion" && (
        <GuiaPronunciacion
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

      {herramienta.tipo === "tabla" && SON_MIC_IDS.has(herramienta.id) && (
        <MicMapa
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "son-plan-directo" && (
        <PlanDirecto
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "son-control-baterias" && (
        <BateriasControl
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "son-playlist-musica-temp" && (
        <PlaylistMusica
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "post-versiones-corte" && (
        <VersionesCorte
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "post-guia-color" && (
        <GuiaColorLook
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "rrhh-descansos" && (
        <DescansoLegal
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "sost-indicadores" && (
        <IndicadoresImpacto
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "mkt-plan" && (
        <CampanasMarketing
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "dif-medios" && (
        <PrensaMedios
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "dist-festivales" && (
        <Festivales
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          onCrear={(datos) => crearFila(datos ?? {})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
        />
      )}

      {herramienta.tipo === "tabla" && herramienta.id === "mo-cal-publicaciones" && (
        <CalendarioPublicaciones
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
          onDuplicar={(f) => {
            // Nunca heredar el vínculo con un hito de Pulso: si no se limpia,
            // la fila duplicada y la original pelean por el mismo evento.
            const datos = { ...f.datos };
            delete datos._pulso_evt_presentacion;
            delete datos._pulso_evt_resolucion;
            crearFila(datos);
          }}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
          onAgregarColumna={agregarColumnaExtra}
          onImportarCSV={async (rows) => {
            for (const datos of rows) await crearFila(datos);
          }}
          moneda={meta?.datos?._moneda}
          onCambiarMoneda={cambiarMoneda}
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
  const esEnlace = /^https?:\/\//i.test(path);
  const [modo, setModo] = useState<"archivo" | "enlace">(esEnlace ? "enlace" : "archivo");
  const fileName = !esEnlace && path ? path.split("/").pop()?.replace(/^\d+-/, "") ?? path : "";

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
    if (esEnlace) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const isImage = !esEnlace && /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(fileName);

  return (
    <div className="hp-archivo">
      {path ? (
        <div className="hp-archivo-preview-wrap">
          {isImage && <ImgPreview path={path} />}
          <button className="hp-archivo-link" onClick={ver} title={esEnlace ? path : fileName}>
            {esEnlace ? <>🔗 {t("openLink")}</> : <>📎 {fileName}</>}
          </button>
        </div>
      ) : (
        <span className="hp-archivo-empty">—</span>
      )}
      {editable && (
        <div className="hp-archivo-edit">
          <div className="cp-seg cp-seg-chip">
            <button type="button" className={`cp-seg-cell${modo === "archivo" ? " cp-seg-on" : ""}`} onClick={() => setModo("archivo")}>{t("uploadFile")}</button>
            <button type="button" className={`cp-seg-cell${modo === "enlace" ? " cp-seg-on" : ""}`} onClick={() => setModo("enlace")}>{t("pasteLink")}</button>
          </div>
          {modo === "archivo" ? (
            <label className="hp-archivo-up">
              {busy ? "…" : !esEnlace && path ? t("change") : t("upload")}
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
          ) : (
            <input
              className="hp-cell-input hp-archivo-link-input"
              type="text"
              placeholder="https://…"
              defaultValue={esEnlace ? path : ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) onSave(v);
              }}
            />
          )}
        </div>
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
  moneda,
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
  moneda?: string;
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
    if (!editable) {
      return <span className={`hp-cell-select-ro tono-${estadoTono(valor)}`}>{valor || "—"}</span>;
    }
    return (
      <div className={`hp-cell-cpselect tono-${estadoTono(valor)}`}>
        <CpSelect
          value={valor}
          options={col.opciones ?? []}
          placeholder="—"
          onChange={(v) => { onChange(v); onCommit(); }}
        />
      </div>
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
          type="text"
          inputMode="decimal"
          value={valor}
          readOnly={!editable}
          onChange={(e) => {
            const limpio = e.target.value.replace(/[^0-9.,]/g, "");
            onChange(limpio);
          }}
          onBlur={onCommit}
        />
        {simboloMoneda(moneda) && <span className="hp-money-suffix">{simboloMoneda(moneda)}</span>}
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
  col, valor, editable, onChange, onCommit, onSave, departamento, herramientaId, filaId, moneda,
}: {
  col: Columna; valor: string; editable: boolean; onChange: (v: string) => void;
  onCommit: () => void; onSave?: (v: string) => void; departamento?: string;
  herramientaId?: string; filaId?: string; listId?: string; moneda?: string;
}) {
  // texto y largo son rich text (RichCell); ya no hay autocomplete por datalist
  // (incompatible con contentEditable). El formato prima sobre la sugerencia.
  return (
    <Celda col={col} valor={valor} editable={editable} onChange={onChange}
      onCommit={onCommit} onSave={onSave} departamento={departamento}
      herramientaId={herramientaId} filaId={filaId} moneda={moneda} />
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
  "prod-proveedores-detalle",
  "cast-ficha-reparto",
  "cast-ficha-agencia",
  "son-inventario",
  "rrhh-listado-equipo",
  "sost-proveedores",
  "bts-contactos-prensa",
]);
// arte-tabla-vestuario tiene "personaje" como primera columna, pero lo que
// identifica al objeto del catálogo es la prenda — el personaje pasa a
// subtítulo (qué buena pareja: "Prenda" / "de quién es").
const FICHA_EQUIPO_TITULO: Record<string, string> = { "arte-tabla-vestuario": "prenda" };

function FichaEquipo({
  columnas,
  filas,
  editable: editableProp,
  departamento,
  herramientaId,
  ejemplos,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  ejemplos?: Ejemplo[];
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  // "Nunca en blanco": si no hay filas y hay ejemplos, se renderizan fantasmas
  // en solo-lectura (editable sombreado a false) + barra de adopción.
  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(ejemplos ?? []);
  const editable = editableProp && hayFilas;

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
      {!hayFilas && editableProp && (ejemplos?.length ?? 0) > 0 && <AdoptarEjemplos ejemplos={ejemplos!} onCrear={onCrear} />}
      {filasEff.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editableProp && <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className={`hp-fe-grid ${!hayFilas ? "cp-ghost-grid" : ""}`}>{filasEff.map(Tarjeta)}</div>
      )}
      {editableProp && hayFilas && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button>
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
const AGENDA_DIA_IDS = new Set(["maq-calendario-preparacion", "vest-calendario-pruebas", "prod-agenda-coord", "prod-partes-diarios", "dir-calendario-ensayos", "dir-control-llamadas", "cast-cal-audiciones", "cast-agentes", "rep-citaciones", "rep-agenda-personal", "rep-agenda-personal-principal", "rrhh-control-horas", "sost-energia", "mkt-cal-redes", "mkt-publicaciones-metricas", "mo-cal-editorial", "mo-cobertura-bts", "mo-hoja-rodaje-bts", "mo-redes-metricas", "mo-plan-rodaje-bts"]);

export function AgendaDia({
  columnas,
  filas,
  editable: editableProp,
  departamento,
  herramientaId,
  ejemplos,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  ejemplos?: Ejemplo[];
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const label = (key: string) => columnas.find((c) => c.key === key)?.label ?? key;
  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(ejemplos ?? []);
  const editable = editableProp && hayFilas;

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
        filasEff.reduce<Record<string, Fila[]>>((acc, f) => {
          const fecha = (f.datos?.[colFecha.key] ?? "").trim() || t("noScene");
          (acc[fecha] ??= []).push(f);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b))
    : null;

  return (
    <>
      {!hayFilas && editableProp && (ejemplos?.length ?? 0) > 0 && <AdoptarEjemplos ejemplos={ejemplos!} onCrear={onCrear} />}
      {filasEff.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editableProp && <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addFirstRow")}</button>}
        </div>
      ) : grupos ? (
        <div className={!hayFilas ? "cp-ghost-grid" : ""}>
          {grupos.map(([fecha, fs]) => (
            <div className="hp-gal-group" key={fecha}>
              <div className="hp-gal-group-head">
                <span className="hex"></span>
                <span>{fecha}</span>
                <span className="hp-gal-group-count">{fs.length}</span>
              </div>
              <div className="hp-agenda-list">{ordenarPorHora(fs).map(Cita)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`hp-agenda-list ${!hayFilas ? "cp-ghost-grid" : ""}`}>{ordenarPorHora(filasEff).map(Cita)}</div>
      )}
      {editableProp && hayFilas && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button>
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
]);

export function FinanciacionPipeline({
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
  const [ordenFecha, setOrdenFecha] = useState<"none" | "asc" | "desc">("asc");
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
  // Fecha de presentación: la que importa priorizar en el Tablero (plazos
  // próximos primero). Se busca por key exacta o por nombre, para que
  // funcione en cualquiera de las 3 herramientas de este pipeline.
  const colPresentacion = columnas.find((c) => c.tipo === "fecha" && /presentac/i.test(c.key));
  const usados = new Set([colEstado?.key, colTitulo?.key, colImporte?.key, colArchivo?.key].filter(Boolean) as string[]);
  const colsNotas = columnas.filter((c) => c.tipo === "largo" && !usados.has(c.key));
  const colsChip = columnas.filter((c) => !usados.has(c.key) && !colsNotas.includes(c) && c.tipo !== "largo");

  if (!colEstado) return null;
  const etapas = [...(colEstado.opciones ?? []), t("noStatus")];
  const porEtapa = etapas.map((op) => {
    let fs = filas.filter((f) => (f.datos?.[colEstado.key] ?? "") === op || (!f.datos?.[colEstado.key] && op === t("noStatus")));
    if (colPresentacion && ordenFecha !== "none") {
      fs = [...fs].sort((a, b) => compararFecha(a.datos?.[colPresentacion.key] ?? "", b.datos?.[colPresentacion.key] ?? "", ordenFecha));
    }
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
      {colPresentacion && filas.length > 0 && (
        <div className="hp-fin-sortbar">
          <span className="hp-fin-sortbar-label">{t("finSortLabel")}</span>
          <div className="cp-seg cp-seg-chip">
            <button type="button" className={`cp-seg-cell${ordenFecha === "none" ? " cp-seg-on" : ""}`} onClick={() => setOrdenFecha("none")}>{t("finSortNone")}</button>
            <button type="button" className={`cp-seg-cell${ordenFecha === "asc" ? " cp-seg-on" : ""}`} onClick={() => setOrdenFecha("asc")}>{t("finSortPresAsc")}</button>
            <button type="button" className={`cp-seg-cell${ordenFecha === "desc" ? " cp-seg-on" : ""}`} onClick={() => setOrdenFecha("desc")}>{t("finSortPresDesc")}</button>
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
  "ej-pagos-nominas",
  "ej-cronograma-produccion",
  "prod-permisos",
  "prod-equipo-tecnico",
  "prod-reporte-incidencias-loc",
  "cast-contratos-reparto",
  "son-adr",
  "son-plan-adr",
  "son-plan-mezcla",
  "son-sinc-audio",
  "son-entrega-post",
  "son-problemas-set",
  "son-reportes",
  "son-reporte-boom",
  "post-plan-montaje",
  "post-notas-visionado",
  "post-lista-vfx",
  "post-plan-entregas",
  "post-notas-corte-escena",
  "post-vfx-tracking",
  "post-dcp-deliverables",
  "post-licencias-musica",
  "post-timeline-montaje",
  "post-sesiones-etalonaje",
  "post-tracking-vfx",
  "post-cal-maestro",
  "rrhh-altas-bajas",
  "rrhh-incidencias",
  "sost-huella",
  "sost-residuos",
  "sost-registro-residuos",
  "mkt-solicitudes-piezas",
  "dif-notas-prensa",
  "dif-tracking-envios",
  "dist-plan",
  "dist-acuerdos",
  "dist-inscripciones",
  "mo-material",
  "mo-banco-cortes",
  "bts-inventario-material",
  "bts-plan-contenido",
  "mo-entrevistas",
]);

export function DocStatusBoard({
  columnas,
  filas,
  editable: editableProp,
  departamento,
  herramientaId,
  ejemplos,
  onCrear,
  onGuardar,
  onBorrar,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  departamento: string;
  herramientaId: string;
  ejemplos?: Ejemplo[];
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(ejemplos ?? []);
  const editable = editableProp && hayFilas;
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
    fs: filasEff.filter((f) => (f.datos?.[colGrupo.key] ?? "") === op || (!f.datos?.[colGrupo.key] && op === t("noStatus"))),
  }));

  return (
    <>
      {!hayFilas && editableProp && (ejemplos?.length ?? 0) > 0 && <AdoptarEjemplos ejemplos={ejemplos!} onCrear={onCrear} />}
      {filasEff.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editableProp && <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className={`hp-pend-board ${!hayFilas ? "cp-ghost-grid" : ""}`}>
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
      {editableProp && hayFilas && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button>
        </div>
      )}
    </>
  );
}

// ---- Modelo financiero (escenarios optimista / base / conservador) ----
// Tres escenarios lado a lado con el margen destacado — una comparación,
// no tres filas de tabla.
export function ModeloFinanciero({
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

// ---- Ficha con pestañas por entidad (Coproductores, Subvenciones, Agenda, ----
// ---- Deliverables, Historial de decisiones) ----
// Estas 5 herramientas comparten la misma forma: una LISTA de entidades
// (socios, expedientes, contactos, archivos, temas), donde cada fila abre
// una ficha con varias pestañas. Un mismo motor genérico, configurado por id
// (qué columna es el título, qué columnas resumir en la lista, cómo se
// agrupan las demás en pestañas) — igual de específico para cada oficio
// porque el contenido de cada pestaña sale de las columnas reales de
// herramientas.ts, no de un formulario genérico de 5 campos.
function parseArr<T>(s: string | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const ENTIDAD_TABS_IDS = new Set(["ej-coproducciones", "ej-ayudas-subvenciones", "ej-agenda-ejecutivo", "ej-deliverables", "ej-notas-ejecutivo"]);

type EntidadTab = { label: string; keys: string[] };
type EntidadConfig = {
  titleKey: string;
  subtitleKey?: string;
  listCols: string[];
  tabs: EntidadTab[];
  addLabel: string;
  special?: "waterfall" | "subvencion-risk" | "categorias-filtro" | "buscador";
};

const ENTIDAD_TABS_CONFIG: Record<string, EntidadConfig> = {
  "ej-coproducciones": {
    titleKey: "empresa",
    subtitleKey: "pais",
    listCols: ["tratado", "equity", "tier", "aportacion"],
    addLabel: "+ Agregar socio",
    special: "waterfall",
    tabs: [
      { label: "Términos", keys: ["pais", "rol", "equity", "aportacion", "tratado", "tier", "naturaleza"] },
      { label: "Territorios", keys: ["territorios"] },
      { label: "Calendario de aportes", keys: ["hitos"] },
      { label: "Documentos", keys: ["documentos"] },
      { label: "Contactos", keys: ["contactos"] },
    ],
  },
  "ej-ayudas-subvenciones": {
    titleKey: "organismo",
    subtitleKey: "expediente",
    listCols: ["concedido", "plazo_limite"],
    addLabel: "+ Agregar expediente",
    special: "subvencion-risk",
    tabs: [
      { label: "Datos de la resolución", keys: ["organismo", "expediente", "concedido", "fecha_concesion", "plazo_limite", "resolucion_doc"] },
      { label: "Partidas elegibles", keys: ["partidas"] },
      { label: "Obligaciones", keys: ["obligaciones"] },
      { label: "Documentos", keys: ["documentos"] },
      { label: "Historial", keys: ["historial"] },
    ],
  },
  "ej-agenda-ejecutivo": {
    titleKey: "nombre",
    subtitleKey: "organizacion",
    listCols: ["categorias"],
    addLabel: "+ Agregar contacto",
    special: "categorias-filtro",
    tabs: [
      { label: "Datos de contacto", keys: ["nombre", "organizacion", "pais", "cargo", "email", "telefono", "vinculo"] },
      { label: "Categorías", keys: ["categorias"] },
      { label: "Interacciones", keys: ["interacciones"] },
    ],
  },
  "ej-deliverables": {
    titleKey: "nombre_archivo",
    subtitleKey: "tipo_archivo",
    listCols: ["tipo_archivo", "fecha_recibido", "tamano"],
    addLabel: "+ Registrar archivo",
    special: "buscador",
    tabs: [
      { label: "Ficha técnica", keys: ["nombre_archivo", "tipo_archivo", "fecha_recibido", "tamano", "recibido_de", "checksum"] },
      { label: "Especificaciones", keys: ["especificaciones"] },
    ],
  },
  "ej-notas-ejecutivo": {
    titleKey: "nombre",
    subtitleKey: "area",
    listCols: ["area", "estado_tema"],
    addLabel: "+ Agregar tema",
    tabs: [
      { label: "Contexto", keys: ["nombre", "area", "estado_tema", "contexto", "vinculo"] },
      { label: "Registros de decisiones", keys: ["registros"] },
    ],
  },
};

// Campo simple (no repetible) dentro de una pestaña.
function EntidadCampo({
  col,
  valor,
  editable,
  departamento,
  herramientaId,
  filaId,
  onChange,
}: {
  col: Columna;
  valor: string;
  editable: boolean;
  departamento: string;
  herramientaId: string;
  filaId: string;
  onChange: (v: string) => void;
}) {
  if (col.tipo === "estado" && col.opciones) {
    return (
      <div className="hp-etb-field">
        <span>{col.label}</span>
        <EstadoSeg valor={valor} opciones={col.opciones} onPick={onChange} editable={editable} chip color />
      </div>
    );
  }
  if (col.tipo === "chips" && col.opciones) {
    const activos = parseArr<string>(valor);
    return (
      <div className="hp-etb-field">
        <span>{col.label}</span>
        <div className="hp-etb-chiplist">
          {col.opciones.map((op) => {
            const on = activos.includes(op);
            return (
              <button
                key={op}
                type="button"
                className={`hp-etb-chip${on ? " on" : ""}`}
                disabled={!editable}
                onClick={() => onChange(JSON.stringify(on ? activos.filter((a) => a !== op) : [...activos, op]))}
              >
                {op}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (col.tipo === "archivo") {
    return (
      <div className="hp-etb-field">
        <span>{col.label}</span>
        <ArchivoCell path={valor} editable={editable} departamento={departamento} herramientaId={herramientaId} filaId={filaId} colKey={col.key} onSave={onChange} />
      </div>
    );
  }
  if (col.tipo === "largo") {
    return (
      <div className="hp-etb-field">
        <span>{col.label}</span>
        <textarea defaultValue={valor} readOnly={!editable} rows={3} onBlur={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  return (
    <div className="hp-etb-field">
      <span>{col.label}</span>
      <input
        type={col.tipo === "num" || col.tipo === "money" ? "number" : col.tipo === "fecha" ? "date" : "text"}
        defaultValue={valor}
        readOnly={!editable}
        onBlur={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Lista repetible dentro de una pestaña (hitos, documentos, obligaciones,
// interacciones, registros de decisión...). Cada fila hija tiene su propio
// mini-esquema de columnas (col.sub).
function EntidadRepetible({
  col,
  valor,
  editable,
  departamento,
  herramientaId,
  filaId,
  onChange,
}: {
  col: Columna;
  valor: string;
  editable: boolean;
  departamento: string;
  herramientaId: string;
  filaId: string;
  onChange: (v: string) => void;
}) {
  const items = parseArr<Record<string, string>>(valor);
  const sub = col.sub ?? [];
  function setItem(i: number, key: string, v: string) {
    const next = items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it));
    onChange(JSON.stringify(next));
  }
  function addItem() {
    onChange(JSON.stringify([...items, {}]));
  }
  function delItem(i: number) {
    onChange(JSON.stringify(items.filter((_, idx) => idx !== i)));
  }
  return (
    <div className="hp-etb-repetible">
      {items.map((it, i) => (
        <div className="hp-etb-rep-row" key={i}>
          {sub.map((s) => (
            <span key={s.key} className="hp-etb-rep-cell">
              {s.tipo === "estado" && s.opciones ? (
                <EstadoSeg valor={it[s.key] ?? ""} opciones={s.opciones} onPick={(v) => setItem(i, s.key, v)} editable={editable} chip color />
              ) : s.tipo === "archivo" ? (
                <ArchivoCell path={it[s.key] ?? ""} editable={editable} departamento={departamento} herramientaId={herramientaId} filaId={`${filaId}-${col.key}-${i}`} colKey={s.key} onSave={(v) => setItem(i, s.key, v)} />
              ) : s.tipo === "largo" ? (
                <textarea defaultValue={it[s.key] ?? ""} placeholder={s.label} readOnly={!editable} rows={2} onBlur={(e) => setItem(i, s.key, e.target.value)} />
              ) : (
                <input
                  type={s.tipo === "num" || s.tipo === "money" ? "number" : s.tipo === "fecha" ? "date" : "text"}
                  defaultValue={it[s.key] ?? ""}
                  placeholder={s.label}
                  readOnly={!editable}
                  onBlur={(e) => setItem(i, s.key, e.target.value)}
                />
              )}
            </span>
          ))}
          {editable && <button className="hp-del" onClick={() => delItem(i)} title="Quitar">✕</button>}
        </div>
      ))}
      {editable && <div className="hp-etb-add-line" onClick={addItem}>+ Agregar {col.label.toLowerCase()}</div>}
    </div>
  );
}

export function EntidadTabsBoard({
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
  const cfg = ENTIDAD_TABS_CONFIG[herramientaId];
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  if (!cfg) return null;

  const colByKey = new Map(columnas.map((c) => [c.key, c]));
  const colTitle = colByKey.get(cfg.titleKey);

  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v }, f);
  }

  let visibles = filas;
  if (cfg.special === "categorias-filtro" && filtroCategoria) {
    visibles = filas.filter((f) => parseArr<string>(f.datos?.categorias).includes(filtroCategoria));
  }
  if (cfg.special === "buscador" && busqueda.trim()) {
    const q = busqueda.trim().toLowerCase();
    visibles = visibles.filter((f) => (f.datos?.[cfg.titleKey] ?? "").toLowerCase().includes(q));
  }

  const abierta = abiertoId ? filas.find((f) => f.id === abiertoId) ?? null : null;

  // Waterfall de recoupment (solo Coproductores): agrupa aportación por tier.
  const waterfall = cfg.special === "waterfall"
    ? (() => {
        const porTier = new Map<string, { total: number; nombres: string[] }>();
        for (const f of filas) {
          const tier = f.datos?.tier || "Sin tier";
          const cur = porTier.get(tier) ?? { total: 0, nombres: [] };
          cur.total += ejNum(f.datos?.aportacion);
          cur.nombres.push(f.datos?.empresa || "—");
          porTier.set(tier, cur);
        }
        return [...porTier.entries()];
      })()
    : null;

  // Riesgo de reintegro (solo Subvenciones): % justificado y días al plazo.
  function subvencionRiesgo(f: Fila) {
    const partidas = parseArr<Record<string, string>>(f.datos?.partidas);
    const presup = partidas.reduce((s, p) => s + ejNum(p.presupuesto), 0);
    const justif = partidas.reduce((s, p) => s + ejNum(p.justificado), 0);
    const pct = presup > 0 ? Math.round((justif / presup) * 100) : 0;
    const plazo = f.datos?.plazo_limite;
    const dias = plazo ? Math.ceil((new Date(plazo).getTime() - Date.now()) / 86400000) : null;
    const riesgo = dias !== null && dias >= 0 && dias < 30 && pct < 80;
    return { pct, dias, riesgo };
  }

  return (
    <>
      {cfg.special === "categorias-filtro" && (
        <div className="hp-etb-filtros">
          <button className={`hp-etb-fchip${!filtroCategoria ? " on" : ""}`} onClick={() => setFiltroCategoria(null)}>Todas</button>
          {(colByKey.get("categorias")?.opciones ?? []).map((op) => (
            <button key={op} className={`hp-etb-fchip${filtroCategoria === op ? " on" : ""}`} onClick={() => setFiltroCategoria(op)}>{op}</button>
          ))}
        </div>
      )}
      {cfg.special === "buscador" && (
        <input className="hp-etb-search" placeholder="Buscar por nombre de archivo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      )}

      {visibles.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addFirstRow")}</button>}
        </div>
      ) : (
        <div className="hp-etb-list">
          {visibles.map((f) => (
            <div className="hp-etb-row" key={f.id} onClick={() => { setAbiertoId(f.id); setTab(0); }}>
              <div className="hp-etb-row-title">
                <div className="hp-etb-row-name">{f.datos?.[cfg.titleKey] || colTitle?.label || "—"}</div>
                {cfg.subtitleKey && <div className="hp-etb-row-sub">{f.datos?.[cfg.subtitleKey] || ""}</div>}
              </div>
              {cfg.listCols.map((k) => {
                const c = colByKey.get(k);
                if (!c) return null;
                const v = f.datos?.[k] ?? "";
                if (c.tipo === "chips") {
                  const arr = parseArr<string>(v);
                  return (
                    <div className="hp-etb-row-cats" key={k}>
                      {arr.slice(0, 3).map((a) => <span className="hp-etb-cat" key={a}>{a}</span>)}
                    </div>
                  );
                }
                if (c.tipo === "money") return <div className="hp-etb-row-money" key={k}>{ejMoney(ejNum(v))}</div>;
                return <div className="hp-etb-row-cell" key={k}>{v || "—"}</div>;
              })}
              {cfg.special === "subvencion-risk" && (() => {
                const r = subvencionRiesgo(f);
                return (
                  <div className={`hp-etb-risk ${r.riesgo ? "bad" : "ok"}`}>
                    {r.pct}% justificado{r.dias !== null ? ` · ${r.dias}d` : ""}
                  </div>
                );
              })()}
              <span className="hp-etb-open">Abrir ›</span>
            </div>
          ))}
        </div>
      )}

      {waterfall && filas.length > 0 && (
        <div className="hp-etb-waterfall">
          <div className="hp-etb-wf-title">Waterfall de recoupment</div>
          {waterfall.map(([tier, info]) => (
            <div className="hp-etb-wf-row" key={tier}>
              <span className="hp-etb-wf-lbl">{tier}</span>
              <span className="hp-etb-wf-nombres">{info.nombres.join(", ")}</span>
              <span className="hp-etb-wf-total">{ejMoney(info.total)}</span>
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{cfg.addLabel}</button>
        </div>
      )}

      {abierta && createPortal(
        <div className="hp-etb-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAbiertoId(null); }}>
          <div className="hp-etb-modal">
            <button className="hp-etb-close" onClick={() => setAbiertoId(null)}>✕</button>
            <div className="hp-etb-m-head">
              <div className="hp-etb-m-name">{abierta.datos?.[cfg.titleKey] || "—"}</div>
              {editable && <button className="hp-del" onClick={() => { onBorrar(abierta.id); setAbiertoId(null); }}>Eliminar</button>}
            </div>
            <div className="hp-etb-tabs">
              {cfg.tabs.map((tb, i) => (
                <span key={tb.label} className={`hp-etb-tab${tab === i ? " on" : ""}`} onClick={() => setTab(i)}>{tb.label}</span>
              ))}
            </div>
            <div className="hp-etb-pane">
              {cfg.tabs[tab].keys.map((k) => {
                const c = colByKey.get(k);
                if (!c) return null;
                if (c.tipo === "repetible") {
                  return (
                    <div key={k} className="hp-etb-tab-repblock">
                      <span className="hp-etb-rep-label">{c.label}</span>
                      <EntidadRepetible col={c} valor={abierta.datos?.[k] ?? ""} editable={editable} departamento={departamento} herramientaId={herramientaId} filaId={abierta.id} onChange={(v) => set(abierta, k, v)} />
                    </div>
                  );
                }
                return (
                  <EntidadCampo
                    key={k}
                    col={c}
                    valor={abierta.datos?.[k] ?? ""}
                    editable={editable}
                    departamento={departamento}
                    herramientaId={herramientaId}
                    filaId={abierta.id}
                    onChange={(v) => set(abierta, k, v)}
                  />
                );
              })}
            </div>
          </div>
        </div>,
        typeof document !== "undefined" ? document.querySelector(".cp-dash") ?? document.body : (null as unknown as Element)
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

// ---- Transporte — tablero de despacho de vehículos ----
// Cada vehículo es un despacho: ruta origen→destino, conductor, pasajeros,
// salida→llegada y estado. Se lee como una hoja de movimientos, no una tabla.
function TransporteBoard({
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
  const label = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  const colEstado = columnas.find((c) => c.tipo === "estado");
  const colNotas = columnas.find((c) => c.tipo === "largo" && c.key !== "pasajeros");
  const kSalida = columnas.find((c) => c.key === "hora_salida" || c.key === "salida")?.key ?? "hora_salida";
  const kLlegada = columnas.find((c) => c.key === "hora_llegada" || c.key === "llegada")?.key ?? "hora_llegada";
  const hasConductor = columnas.some((c) => c.key === "conductor");
  function set(f: Fila, k: string, v: string) {
    onGuardar(f.id, { ...f.datos, [k]: v }, f);
  }
  const ordenadas = [...filas].sort((a, b) => (a.datos?.[kSalida] ?? "").localeCompare(b.datos?.[kSalida] ?? ""));

  function Tarjeta(f: Fila) {
    return (
      <div className="tr-card" key={f.id}>
        <div className="tr-head">
          <span className="tr-veh-ico"><Icon name="map-pin" size={15} /></span>
          <input className="tr-veh" defaultValue={f.datos?.vehiculo ?? ""} placeholder={label("vehiculo")} readOnly={!editable} onBlur={(e) => set(f, "vehiculo", e.target.value)} />
          {colEstado && <EstadoSeg valor={f.datos?.[colEstado.key] ?? ""} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} chip color />}
          {editable && <button className="od-x" onClick={() => onBorrar(f.id)} title={t("delete")}><Icon name="x" size={13} /></button>}
        </div>
        <div className="tr-route">
          <input className="tr-loc" defaultValue={f.datos?.origen ?? ""} placeholder={label("origen")} readOnly={!editable} onBlur={(e) => set(f, "origen", e.target.value)} />
          <span className="tr-arrow"><Icon name="arrow-right" size={15} /></span>
          <input className="tr-loc" defaultValue={f.datos?.destino ?? ""} placeholder={label("destino")} readOnly={!editable} onBlur={(e) => set(f, "destino", e.target.value)} />
        </div>
        <div className="tr-meta">
          <span className="tr-time"><Icon name="clock" size={13} /><input defaultValue={f.datos?.[kSalida] ?? ""} placeholder={label(kSalida)} readOnly={!editable} onBlur={(e) => set(f, kSalida, e.target.value)} /><span className="tr-time-arrow">→</span><input defaultValue={f.datos?.[kLlegada] ?? ""} placeholder={label(kLlegada)} readOnly={!editable} onBlur={(e) => set(f, kLlegada, e.target.value)} /></span>
        </div>
        <div className="tr-people">
          {hasConductor && <label className="tr-field"><span>{label("conductor")}</span><input defaultValue={f.datos?.conductor ?? ""} readOnly={!editable} onBlur={(e) => set(f, "conductor", e.target.value)} /></label>}
          <label className="tr-field"><span>{label("pasajeros")}</span><input defaultValue={f.datos?.pasajeros ?? ""} readOnly={!editable} onBlur={(e) => set(f, "pasajeros", e.target.value)} /></label>
        </div>
        {colNotas && (
          <textarea className="tr-notas" defaultValue={f.datos?.[colNotas.key] ?? ""} placeholder={colNotas.label} readOnly={!editable} rows={1} onBlur={(e) => set(f, colNotas.key, e.target.value)} />
        )}
      </div>
    );
  }

  return (
    <div className="tr-board">
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>}
        </div>
      ) : (
        <>
          <div className="tr-grid">{ordenadas.map(Tarjeta)}</div>
          {editable && <button className="cp-btn cp-btn-acc tr-add" onClick={onCrear}><Icon name="plus" size={13} /> {t("addRow")}</button>}
        </>
      )}
    </div>
  );
}

// ---- Catering — servicio de comidas por jornada ----
const CATERING_IDS = new Set(["prod-catering", "prod-catering-general"]);
function CateringBoard({
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
  const label = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  function set(f: Fila, k: string, v: string) {
    onGuardar(f.id, { ...f.datos, [k]: v }, f);
  }
  const colWhen = columnas.find((c) => c.key === "jornada" || c.key === "fecha") ?? columnas[0];
  const colServicio = columnas.find((c) => c.tipo === "estado" && c.key === "servicio");
  const colEstado = columnas.find((c) => c.tipo === "estado" && c.key === "estado");
  const colComensales = columnas.find((c) => c.key === "comensales" || c.key === "personas");
  const colMenu = columnas.find((c) => c.key === "menu");
  const colEspeciales = columnas.find((c) => c.key === "especiales");
  const colHora = columnas.find((c) => /^hora/.test(c.key));
  const colCoste = columnas.find((c) => c.tipo === "money");
  const colProveedor = columnas.find((c) => c.key === "proveedor");

  function Tarjeta(f: Fila) {
    return (
      <div className="ct-card" key={f.id}>
        <div className="ct-head">
          <input className="ct-when" type={colWhen?.tipo === "fecha" ? "date" : "text"} defaultValue={f.datos?.[colWhen.key] ?? ""} placeholder={colWhen?.label} readOnly={!editable} onBlur={(e) => set(f, colWhen.key, e.target.value)} />
          {colServicio && <EstadoSeg valor={f.datos?.[colServicio.key] ?? ""} opciones={colServicio.opciones ?? []} onPick={(v) => set(f, colServicio.key, v)} editable={editable} chip />}
          {colEstado && <EstadoSeg valor={f.datos?.[colEstado.key] ?? ""} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} chip color />}
          {editable && <button className="od-x" onClick={() => onBorrar(f.id)} title={t("delete")}><Icon name="x" size={13} /></button>}
        </div>
        <div className="ct-body">
          {colComensales && (
            <div className="ct-comensales">
              <Icon name="users" size={16} />
              <input defaultValue={f.datos?.[colComensales.key] ?? ""} type="number" readOnly={!editable} placeholder="0" onBlur={(e) => set(f, colComensales.key, e.target.value)} />
              <span>{label(colComensales.key)}</span>
            </div>
          )}
          <div className="ct-meta">
            {colHora && <span className="ct-hora"><Icon name="clock" size={13} /><input defaultValue={f.datos?.[colHora.key] ?? ""} readOnly={!editable} placeholder={label(colHora.key)} onBlur={(e) => set(f, colHora.key, e.target.value)} /></span>}
            {colCoste && <span className="ct-coste"><input type="number" defaultValue={f.datos?.[colCoste.key] ?? ""} readOnly={!editable} placeholder="0" onBlur={(e) => set(f, colCoste.key, e.target.value)} />€</span>}
          </div>
        </div>
        {colMenu && (
          <label className="ct-menu"><span>{label(colMenu.key)}</span><textarea defaultValue={f.datos?.[colMenu.key] ?? ""} readOnly={!editable} rows={2} placeholder="—" onBlur={(e) => set(f, colMenu.key, e.target.value)} /></label>
        )}
        {colEspeciales && (
          <label className="ct-esp"><span><Icon name="alert-triangle" size={12} /> {label(colEspeciales.key)}</span><textarea defaultValue={f.datos?.[colEspeciales.key] ?? ""} readOnly={!editable} rows={1} placeholder="—" onBlur={(e) => set(f, colEspeciales.key, e.target.value)} /></label>
        )}
        {colProveedor && (
          <label className="ct-prov"><span>{label(colProveedor.key)}</span><input defaultValue={f.datos?.[colProveedor.key] ?? ""} readOnly={!editable} onBlur={(e) => set(f, colProveedor.key, e.target.value)} /></label>
        )}
      </div>
    );
  }

  return (
    <div className="ct-board">
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>}
        </div>
      ) : (
        <>
          <div className="ct-grid">{filas.map(Tarjeta)}</div>
          {editable && <button className="cp-btn cp-btn-acc tr-add" onClick={onCrear}><Icon name="plus" size={13} /> {t("addRow")}</button>}
        </>
      )}
    </div>
  );
}

// ---- Plan semanal — jornadas de la semana como tarjetas ----
function PlanSemanaBoard({
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
  const label = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  const colEstado = columnas.find((c) => c.tipo === "estado");
  const colNotas = columnas.find((c) => c.tipo === "largo");
  const kLoc = columnas.find((c) => c.key === "localizacion" || c.key === "locacion")?.key ?? "localizacion";
  const kFin = columnas.find((c) => c.key === "hora_fin_estimada" || c.key === "hora_fin")?.key ?? "hora_fin_estimada";
  const hasCrew = columnas.some((c) => c.key === "crew_necesario");
  const hasExtras = columnas.some((c) => c.key === "extras_necesarios");
  function set(f: Fila, k: string, v: string) {
    onGuardar(f.id, { ...f.datos, [k]: v }, f);
  }
  const ordenadas = [...filas].sort((a, b) => (a.datos?.dia ?? "").localeCompare(b.datos?.dia ?? "", "es", { numeric: true }));

  function Tarjeta(f: Fila) {
    const estadoVal = colEstado ? f.datos?.[colEstado.key] ?? "" : "";
    return (
      <div className={`ps-card tono-${estadoTono(estadoVal)}`} key={f.id}>
        <div className="ps-head">
          <input className="ps-dia" defaultValue={f.datos?.dia ?? ""} placeholder={label("dia")} readOnly={!editable} onBlur={(e) => set(f, "dia", e.target.value)} />
          {colEstado && <EstadoSeg valor={estadoVal} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={editable} chip color />}
          {editable && <button className="od-x" onClick={() => onBorrar(f.id)} title={t("delete")}><Icon name="x" size={13} /></button>}
        </div>
        <input className="ps-loc" defaultValue={f.datos?.[kLoc] ?? ""} placeholder={label(kLoc)} readOnly={!editable} onBlur={(e) => set(f, kLoc, e.target.value)} />
        <input className="ps-esc" defaultValue={f.datos?.escenas ?? ""} placeholder={label("escenas")} readOnly={!editable} onBlur={(e) => set(f, "escenas", e.target.value)} />
        {(hasCrew || hasExtras) && (
          <div className="ps-counts">
            {hasCrew && <span className="ps-count"><Icon name="users" size={13} /><input type="number" defaultValue={f.datos?.crew_necesario ?? ""} readOnly={!editable} placeholder="0" onBlur={(e) => set(f, "crew_necesario", e.target.value)} /><span>{label("crew_necesario")}</span></span>}
            {hasExtras && <span className="ps-count"><input type="number" defaultValue={f.datos?.extras_necesarios ?? ""} readOnly={!editable} placeholder="0" onBlur={(e) => set(f, "extras_necesarios", e.target.value)} /><span>{label("extras_necesarios")}</span></span>}
          </div>
        )}
        <div className="ps-time"><Icon name="clock" size={13} /><input defaultValue={f.datos?.hora_inicio ?? ""} readOnly={!editable} placeholder={label("hora_inicio")} onBlur={(e) => set(f, "hora_inicio", e.target.value)} /><span className="tr-time-arrow">→</span><input defaultValue={f.datos?.[kFin] ?? ""} readOnly={!editable} placeholder={label(kFin)} onBlur={(e) => set(f, kFin, e.target.value)} /></div>
        {colNotas && <textarea className="ps-notas" defaultValue={f.datos?.[colNotas.key] ?? ""} placeholder={colNotas.label} readOnly={!editable} rows={1} onBlur={(e) => set(f, colNotas.key, e.target.value)} />}
      </div>
    );
  }

  return (
    <div className="ps-board">
      {filas.length === 0 ? (
        <div className="hp-tabla-empty">
          <span className="hex"></span>
          <p>{t("emptyTitle")}</p>
          {editable && <button className="cp-btn cp-btn-acc" onClick={onCrear}>{t("addRow")}</button>}
        </div>
      ) : (
        <>
          <div className="ps-grid">{ordenadas.map(Tarjeta)}</div>
          {editable && <button className="cp-btn cp-btn-acc tr-add" onClick={onCrear}><Icon name="plus" size={13} /> {t("addRow")}</button>}
        </>
      )}
    </div>
  );
}

// ---- Tabla con registro de intervenciones ----
const ITEMS_POR_PAG = 50;

// Ancho por defecto de cada columna según su tipo (px). El <col> del colgroup
// lo usa como ancho base; el usuario lo pisa arrastrando (colWidths). Con
// esto el <col> gobierna el ancho y las celdas NO llevan width inline —
// permite mover la columna en vivo tocando un solo elemento por frame.
function anchoDefectoCol(c: Columna): number {
  switch (c.tipo) {
    case "largo": return 220;
    case "num": case "money": return 110;
    case "fecha": return 130;
    case "estado": return 140;
    case "archivo": case "link": return 150;
    default: return 150;
  }
}

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
  onAgregarColumna,
  onImportarCSV,
  moneda,
  onCambiarMoneda,
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
  onAgregarColumna: (label: string, tipo?: ColTipo) => void;
  onImportarCSV?: (rows: Record<string, string>[]) => Promise<void>;
  moneda?: string;
  onCambiarMoneda?: (v: string) => void;
}) {
  const t = useTranslations("hp");
  // ── Estados existentes ──────────────────────────────────────────────────
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
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
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [compacto, setCompacto] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nuevaColOpen, setNuevaColOpen] = useState(false);
  const [nuevaColLabel, setNuevaColLabel] = useState("");
  const [nuevaColTipo, setNuevaColTipo] = useState<ColTipo>("texto");
  const [batchCol, setBatchCol] = useState("");
  const [batchVal, setBatchVal] = useState("");
  const [showExtStats, setShowExtStats] = useState(false);
  const [importando, setImportando] = useState(false);
  const [showLastEdit, setShowLastEdit] = useState(false);

  const tableRef = useRef<HTMLTableElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef<{key: string; startX: number; startW: number} | null>(null);
  const resizingRowRef = useRef<{id: string; startY: number; startH: number} | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapMaxH, setWrapMaxH] = useState(480);

  // .hp-table-wrap es su propio contenedor de scroll (ver dashboard.css) con
  // una altura acotada al espacio real que queda hasta el fondo del
  // viewport — no un valor fijo adivinado, porque cuánto "chrome" hay arriba
  // (tabs de departamento, header del panel, etc.) varía según dónde esté
  // montada la herramienta. Se mide en vivo con getBoundingClientRect y se
  // recalcula al scrollear/resize — el mismo patrón que usa un toolbar
  // sticky para "llenar el resto de la pantalla".
  useEffect(() => {
    if (expandida) return; // en pantalla completa el CSS ya lo resuelve con flex
    function recalc() {
      const el = wrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setWrapMaxH(Math.max(240, Math.floor(window.innerHeight - top - 16)));
    }
    recalc();
    const raf = requestAnimationFrame(recalc);
    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [expandida]);

  // Columnas visibles (sin ocultas)
  const visibleCols = useMemo(() => columnas.filter(c => !hiddenCols.has(c.key)), [columnas, hiddenCols]);

  // Ancho total de la tabla = suma de anchos de columna (los del usuario o el
  // default por tipo) + columnas fijas (check, acciones, editado). La tabla es
  // table-layout:fixed y se setea a este ancho: si supera el contenedor,
  // scrollea horizontal; si es menor, minWidth:100% la estira. Con layout
  // fixed una columna SÍ puede achicarse por debajo del ancho de su contenido
  // (ej. el input date, que en auto-layout tenía un mínimo intransigente).
  const totalAncho = useMemo(() => {
    let w = (editable ? 36 : 0) + (editable ? 118 : 0) + (showLastEdit ? 90 : 0);
    for (const c of visibleCols) w += colWidths[c.key] ?? anchoDefectoCol(c);
    return w;
  }, [visibleCols, colWidths, editable, showLastEdit]);

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
    // Orden base = orden manual persistido (efOrden), no el de llegada del
    // fetch. Si hay sortKey activo se re-ordena más abajo y este paso solo
    // importa como fallback.
    let res = [...filas].sort((a, b) => efOrden(a) - efOrden(b));
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      res = res.filter(f => columnas.some(c => stripHtml(f.datos?.[c.key] ?? "").toLowerCase().includes(q)));
    }
    for (const [k, v] of Object.entries(filtros)) {
      if (v) res = res.filter(f => (f.datos?.[k] ?? "") === v);
    }
    if (sortKey) {
      const col = columnas.find(c => c.key === sortKey);
      const col2 = sortKey2 ? columnas.find(c => c.key === sortKey2) : null;
      // Fecha se compara aparte (Date.parse + "sin fecha" siempre al final,
      // sea cual sea la dirección) — el resto de tipos ya trae la dirección
      // aplicada al comparar, no se vuelve a invertir después.
      res = [...res].sort((a, b) => {
        const va = stripHtml(a.datos?.[sortKey] ?? "");
        const vb = stripHtml(b.datos?.[sortKey] ?? "");
        let cmp: number;
        if (col?.tipo === "fecha") {
          cmp = compararFecha(va, vb, sortDir);
        } else if (col?.tipo === "num" || col?.tipo === "money") {
          cmp = sortDir === "asc"
            ? (parseFloat(va || "0") || 0) - (parseFloat(vb || "0") || 0)
            : (parseFloat(vb || "0") || 0) - (parseFloat(va || "0") || 0);
        } else {
          cmp = sortDir === "asc" ? va.localeCompare(vb, "es") : vb.localeCompare(va, "es");
        }
        if (cmp === 0 && sortKey2 && col2) {
          const va2 = stripHtml(a.datos?.[sortKey2] ?? "");
          const vb2 = stripHtml(b.datos?.[sortKey2] ?? "");
          if (col2.tipo === "fecha") {
            return compararFecha(va2, vb2, sortDir2);
          }
          if (col2.tipo === "num" || col2.tipo === "money") {
            return sortDir2 === "asc"
              ? (parseFloat(va2 || "0") || 0) - (parseFloat(vb2 || "0") || 0)
              : (parseFloat(vb2 || "0") || 0) - (parseFloat(va2 || "0") || 0);
          }
          return sortDir2 === "asc" ? va2.localeCompare(vb2, "es") : vb2.localeCompare(va2, "es");
        }
        return cmp;
      });
    }
    return res;
  }, [filas, busqueda, filtros, sortKey, sortDir, sortKey2, sortDir2, columnas]);

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
  function confirmarNuevaColumna() {
    if (!nuevaColLabel.trim()) return;
    onAgregarColumna(nuevaColLabel.trim(), nuevaColTipo);
    setNuevaColLabel(""); setNuevaColTipo("texto"); setNuevaColOpen(false);
  }
  function cancelarNuevaColumna() {
    setNuevaColLabel(""); setNuevaColTipo("texto"); setNuevaColOpen(false);
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

  // Resize de columnas. CLAVE: durante el arrastre se escribe el ancho
  // DIRECTO al DOM (el elemento <col> de esa columna), sin tocar el estado
  // de React. Antes cada mousemove hacía setColWidths → re-render de TODA la
  // tabla (todas las celdas rich-text/contentEditable) en cada frame; en una
  // tabla real con muchas filas eso saturaba el hilo y el navegador mataba la
  // pestaña ("This page couldn't load", reportado varias veces). Se commitea
  // al estado UNA sola vez, en mouseup. El ancho se aplica sobre el <col>
  // (colgroup), no sobre cada <td>, así que un único write por frame mueve
  // toda la columna. Sin tope alto: el usuario puede resignar el ancho del
  // label si necesita el espacio (el label se trunca con ellipsis por CSS).
  function startResize(e: React.MouseEvent, key: string) {
    e.preventDefault();
    const th = (e.target as HTMLElement).closest("th");
    const startW = th?.getBoundingClientRect().width ?? 120;
    const colEl = tableRef.current?.querySelector<HTMLElement>(`colgroup col[data-ck="${CSS.escape(key)}"]`) ?? null;
    const tableEl = tableRef.current;
    const startTableW = tableEl?.offsetWidth ?? 0;
    resizingRef.current = { key, startX: e.clientX, startW };
    let lastW = startW;
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current || !colEl) return;
      lastW = Math.max(28, startW + ev.clientX - resizingRef.current.startX);
      colEl.style.width = `${lastW}px`;
      // La tabla también crece/encoge con la columna (mismo delta): así las
      // demás columnas quedan quietas y la tabla scrollea/estira. table-layout
      // es fixed, con lo que el <col> manda el ancho exacto (ver CSS).
      if (tableEl) tableEl.style.width = `${startTableW + (lastW - startW)}px`;
    }
    function onUp() {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setColWidths(w => ({ ...w, [key]: lastW }));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Resize de filas — mismo patrón directo-al-DOM que startResize. El alto se
  // aplica sobre el wrapper .hp-cell-body de cada celda de la fila (los <td>
  // ignoran max-height, pero un div interno con maxHeight+overflow sí recorta
  // el contenido). Commit al estado solo en mouseup.
  function startResizeRow(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const tr = (e.target as HTMLElement).closest("tr");
    const startH = tr?.getBoundingClientRect().height ?? 36;
    const bodies = tr ? Array.from(tr.querySelectorAll<HTMLElement>(".hp-cell-body")) : [];
    resizingRowRef.current = { id, startY: e.clientY, startH };
    let lastH = startH;
    function onMove(ev: MouseEvent) {
      if (!resizingRowRef.current) return;
      lastH = Math.max(24, startH + ev.clientY - resizingRowRef.current.startY);
      for (const b of bodies) { b.style.height = `${lastH - 2}px`; b.style.maxHeight = `${lastH - 2}px`; }
    }
    function onUp() {
      resizingRowRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setRowHeights(h => ({ ...h, [id]: lastH }));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
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

  const tieneOrdenManual = filas.some(f => f.datos?._orden !== undefined);
  function restablecerOrden() {
    for (const f of filas) {
      if (f.datos?._orden === undefined) continue;
      const datos = { ...f.datos };
      delete datos._orden;
      onGuardar(f.id, datos, f);
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
    const dragged = filas.find(f => f.id === draggingId);
    const visibles = filasFiltradas.filter(f => f.id !== draggingId);
    const to = visibles.findIndex(f => f.id === targetId);
    if (!dragged || to === -1) { setDraggingId(null); setDragOverId(null); return; }
    // Nueva posición = promedio del orden efectivo de los vecinos en el punto
    // de destino (mismo truco que el Stripboard con _orden fraccional). Se
    // persiste en datos._orden vía onGuardar: sobrevive a recargar/cerrar la
    // pestaña, a diferencia del estado local anterior que se perdía.
    const anterior = visibles[to - 1];
    const siguiente = visibles[to];
    const ordenAntes = anterior ? efOrden(anterior) : efOrden(siguiente) - 2;
    const ordenDespues = siguiente ? efOrden(siguiente) : (anterior ? efOrden(anterior) + 2 : 2);
    onGuardar(draggingId, { ...dragged.datos, _orden: String((ordenAntes + ordenDespues) / 2) }, dragged);
    setDraggingId(null); setDragOverId(null);
  }

  // Navegación de teclado entre celdas. Excepción: en columnas "largo" (rich
  // text multi-párrafo, ej. "Condiciones") Enter tiene que insertar un salto
  // de línea dentro de la celda como espera cualquier editor de texto — no
  // saltar a la fila de abajo. Se deja pasar el evento tal cual al
  // contentEditable en ese caso (nada de preventDefault ni foco manual).
  function handleCellKeyDown(e: React.KeyboardEvent, rowIdx: number, colIdx: number) {
    if (e.key === "Enter" && visibleCols[colIdx]?.tipo === "largo") return;
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

  const hayFiltroActivo = busqueda.trim() || Object.values(filtros).some(Boolean);
  const colsEstado = columnas.filter(c => c.tipo === "estado").slice(0, 4);
  const colEstado = columnas.find((c) => c.tipo === "estado");
  const tieneTotales = columnas.some(c => c.tipo === "money" || c.tipo === "num");
  const tieneColMoney = columnas.some(c => c.tipo === "money");

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
          <button className="hp-stats-clear" onClick={() => { setBusqueda(""); setFiltros({}); }}>{t("clear")}</button>
        )}
      </div>
    );
  })();

  const colSpanVacio =
    (editable ? 1 : 0) + visibleCols.length + (editable ? 1 : 0) + (showLastEdit ? 1 : 0);

  const contenido = (
    <>
      {/* ── Datalists para autocomplete ──────────────────────────────── */}
      {Object.entries(autocomplete).map(([key, vals]) => (
        <datalist key={key} id={`dl-${herramientaId}-${key}`}>
          {vals.map(v => <option key={v} value={v} />)}
        </datalist>
      ))}

      {/* ── Toolbar principal ────────────────────────────────────────── */}
      <div className="hp-tabla-toolbar" ref={toolbarRef}>
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
                  <CpSelect
                    value={filtros[c.key] ?? ""}
                    options={c.opciones ?? []}
                    placeholder={t("all")}
                    onChange={v => { setFiltros(f => ({ ...f, [c.key]: v })); setPagina(0); }}
                  />
                </label>
              ))}
            </div>
          </ToolMenu>
        )}

        {/* Ordenar (primario, sincronizado con el clic en el encabezado + secundario de desempate) */}
        <ToolMenu label={t("sort")} icon="sort" width={260} badge={sortKey ? 1 : undefined}>
          <div className="tm-section">
            <label className="tm-field">
              <span>{t("sortBy")}</span>
              <CpSelect
                value={sortKey ?? ""}
                options={columnas.map(c => ({ value: c.key, label: c.label }))}
                placeholder={t("none")}
                onChange={v => { setSortKey(v || null); if (v) setSortDir("asc"); }}
              />
            </label>
            {sortKey && (
              <div className="cp-seg cp-seg-chip hp-sort-dirseg">
                <button type="button" className={`cp-seg-cell${sortDir === "asc" ? " cp-seg-on" : ""}`} onClick={() => setSortDir("asc")}>
                  <Icon name="chevron-up" size={11} /> {t("ascShort")}
                </button>
                <button type="button" className={`cp-seg-cell${sortDir === "desc" ? " cp-seg-on" : ""}`} onClick={() => setSortDir("desc")}>
                  <Icon name="chevron-down" size={11} /> {t("descShort")}
                </button>
              </div>
            )}
          </div>
          <div className="tm-section tm-section-bordered">
            <label className="tm-field">
              <span>{t("secondarySort")}</span>
              <CpSelect
                value={sortKey2 ?? ""}
                options={columnas.map(c => ({ value: c.key, label: c.label }))}
                placeholder={t("none")}
                onChange={v => setSortKey2(v || null)}
              />
            </label>
            {sortKey2 && (
              <div className="cp-seg cp-seg-chip hp-sort-dirseg">
                <button type="button" className={`cp-seg-cell${sortDir2 === "asc" ? " cp-seg-on" : ""}`} onClick={() => setSortDir2("asc")}>
                  <Icon name="chevron-up" size={11} /> {t("ascShort")}
                </button>
                <button type="button" className={`cp-seg-cell${sortDir2 === "desc" ? " cp-seg-on" : ""}`} onClick={() => setSortDir2("desc")}>
                  <Icon name="chevron-down" size={11} /> {t("descShort")}
                </button>
              </div>
            )}
          </div>
          {sortKey && (
            <div className="tm-section tm-section-bordered">
              <button className="tm-item" onClick={() => { setSortKey(null); setSortKey2(null); }}>
                <Icon name="x" size={13} /><span>{t("clearSort")}</span>
              </button>
            </div>
          )}
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

        {/* Moneda de las columnas tipo "money" (Importe, Cuota, etc.) — solo
            si la tabla tiene alguna. Se guarda en la fila meta (orden:-1),
            compartida por todo el equipo, no por navegador. */}
        {tieneColMoney && onCambiarMoneda && (
          <ToolMenu label={t("currency")} width={170}>
            <div className="tm-section">
              {MONEDAS.map((m) => (
                <button key={m.value} className={`tm-item${(moneda ?? "eur") === m.value ? " active" : ""}`} onClick={() => onCambiarMoneda(m.value)}>
                  {(moneda ?? "eur") === m.value && <Icon name="check" size={13} />}
                  <span>{m.label}{m.symbol ? ` (${m.symbol})` : ""}</span>
                </button>
              ))}
            </div>
          </ToolMenu>
        )}

        {/* Agregar fila / columna — antes vivían sueltos debajo de la tabla,
            sin relación visual con el resto de los controles. El menú
            "Herramientas" que agrupaba esto + buscar/reemplazar + formato
            condicional se sacó (agregaba un clic sin aportar nada); esas dos
            últimas quedan como íconos sueltos, sin perder la función. */}
        {editable && <button className="btn acc" onClick={onCrear}><Icon name="plus" size={13} /> {t("addRow")}</button>}
        {editable && !nuevaColOpen && (
          <button className="btn" onClick={() => setNuevaColOpen(true)}><Icon name="columns" size={13} /> {t("addColumn")}</button>
        )}
        {editable && nuevaColOpen && (
          <div className="hp-newcol">
            <input
              className="hp-cell-input"
              type="text"
              placeholder={t("newColumnPrompt")}
              value={nuevaColLabel}
              onChange={(e) => setNuevaColLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmarNuevaColumna(); if (e.key === "Escape") cancelarNuevaColumna(); }}
              autoFocus
            />
            <div className="cp-seg cp-seg-chip">
              {(["texto", "fecha", "num"] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`cp-seg-cell${nuevaColTipo === tp ? " cp-seg-on" : ""}`}
                  onClick={() => setNuevaColTipo(tp)}
                >
                  {t(`colType${tp === "texto" ? "Texto" : tp === "fecha" ? "Fecha" : "Num"}`)}
                </button>
              ))}
            </div>
            <button className="cp-btn cp-btn-acc" onClick={confirmarNuevaColumna}>{t("addColumnConfirm")}</button>
            <button className="cp-btn" onClick={cancelarNuevaColumna}>{t("cancel")}</button>
          </div>
        )}

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

      <div className="hp-print-area">
        <PrintHeader herramientaNombre={herramientaNombre} departamento={departamento} />
        <div className="hp-table-wrap" ref={wrapRef} style={expandida ? undefined : { maxHeight: wrapMaxH }}>
          <table className={`hp-table${compacto ? " hp-tabla-compacta" : ""}`} ref={tableRef} style={{ width: totalAncho, minWidth: "100%" }}>
            <colgroup>
              {editable && <col style={{width:36}} />}
              {visibleCols.map(c => (
                <col key={c.key} data-ck={c.key} style={{width: colWidths[c.key] ?? anchoDefectoCol(c)}} />
              ))}
              {editable && <col style={{width:118}} />}
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
                  >
                    <div className="hp-th-inner">
                      <span className="hp-th-label" onClick={() => toggleSort(c.key)} style={{cursor:"pointer",flex:1}}>
                        {c.label}
                        {sortKey === c.key && (
                          <Icon name={sortDir === "asc" ? "chevron-up" : "chevron-down"} size={12} className="hp-th-sort-icon" />
                        )}
                        {sortKey2 === c.key && (
                          <Icon name={sortDir2 === "asc" ? "chevron-up" : "chevron-down"} size={10} className="hp-th-sort-icon hp-th-sort-icon-2" />
                        )}
                      </span>
                      <span className="hp-col-resizer" onMouseDown={e => startResize(e, c.key)} />
                    </div>
                  </th>
                ))}
                {editable && <th className="hp-th-acciones">{t("rowActions")}</th>}
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
                const isDragOver = dragOverId === f.id;
                const rowH = rowHeights[f.id];
                return (
                    <tr
                      key={f.id}
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
                        const isNum = c.tipo === "num" || c.tipo === "money";
                        const dataBarPct = isNum && maxVals[c.key]
                          ? Math.min(100, (parseFloat(cellVal || "0") || 0) / maxVals[c.key] * 100)
                          : 0;
                        const esFrozen = colIdx === 0;
                        // La celda congelada tiene que quedar SIEMPRE opaca (si no, se
                        // transparenta y deja ver las columnas que scrollean por detrás
                        // — ver dashboard.css). El tinte de color de fila se pinta con
                        // box-shadow inset sobre ese fondo opaco en vez de reemplazar el
                        // background.
                        return (
                          <td
                            key={c.key}
                            className={[
                              "hp-td-cell",
                              c.tipo === "largo" ? "hp-td-largo" : "",
                              (c.tipo === "num" || c.tipo === "money") ? "hp-td-num" : "",
                              esFrozen ? "hp-td-frozen" : "",
                            ].filter(Boolean).join(" ")}
                            style={esFrozen && rowColor
                              ? {boxShadow: [`inset 0 0 0 999px ${rowColor}18`, "2px 0 4px rgba(0,0,0,0.15)"].join(", ")}
                              : undefined}
                            onKeyDown={e => handleCellKeyDown(e, rowIdx, colIdx)}
                          >
                            {esFrozen && (
                              <span className="hp-row-resizer" onMouseDown={e => startResizeRow(e, f.id)} title={t("dragToResizeRow")} />
                            )}
                            {isNum && dataBarPct > 0 && (
                              <div className="hp-databar" style={{width: `${dataBarPct}%`}} />
                            )}
                            <div className="hp-cell-body" style={rowH ? {height: rowH - 2, maxHeight: rowH - 2} : undefined}>
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
                                moneda={moneda}
                              />
                            </div>
                          </td>
                        );
                      })}
                      {editable && (
                        <td className="hp-td-acciones">
                          <div className="hp-row-actions">
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
                            <span className="hp-row-actions-sep" />
                            <button className="hp-row-action-btn" onClick={() => copiarFila(f)} title={t("copyClipboard")}>⎘</button>
                            {onDuplicar && (
                              <button className="hp-row-action-btn" onClick={() => onDuplicar(f)} title={t("duplicateRow")}>⧉</button>
                            )}
                            <button className="hp-row-action-btn hp-row-action-danger" onClick={() => onBorrar(f.id)} title={t("deleteRow")}><Icon name="trash" size={13} /></button>
                          </div>
                        </td>
                      )}
                      {showLastEdit && (
                        <td className="hp-td-edit" title={f.updated_at ? new Date(f.updated_at).toLocaleString("es-ES") : ""}>
                          {f.updated_at ? timeAgo(f.updated_at, t) : "—"}
                        </td>
                      )}
                    </tr>
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

      {editable && tieneOrdenManual && (
        <div className="hp-actions">
          <button className="btn" onClick={restablecerOrden}>{t("resetOrder")}</button>
        </div>
      )}
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

// ============================================================
// EJEMPLOS — "nunca en blanco". Al abrir una herramienta sin filas se muestra
// el diagrama YA planteado con tarjetas de ejemplo (fantasma): contenido
// realista que enseña QUÉ va en cada campo. El usuario decide: "Comenzar con
// este ejemplo" (los adopta como filas reales editables) o "Empezar en blanco".
// Nunca un vacío con solo "Agregar". Reusable en todos los departamentos.
// ============================================================
type Ejemplo = Record<string, string>;

function ghostFilas(ejemplos: Ejemplo[]): Fila[] {
  return ejemplos.map((datos, i) => ({
    id: `__ej_${i}`,
    datos,
    orden: i,
    registro: [],
    visionado_por: [],
    autor_nombre: null,
    editor_nombre: null,
    updated_at: "",
    _ej: true,
  } as Fila & { _ej: true }));
}
function esGhost(f: Fila): boolean {
  return (f as Fila & { _ej?: boolean })._ej === true;
}

// Barra de adopción que acompaña a las tarjetas-ejemplo cuando la herramienta
// está vacía y es editable. Siembra los ejemplos como filas reales o arranca en blanco.
function AdoptarEjemplos({
  ejemplos,
  onCrear,
}: {
  ejemplos: Ejemplo[];
  onCrear: (datos?: Record<string, string>) => void;
}) {
  const t = useTranslations("hp");
  return (
    <div className="cp-ejbar">
      <div className="cp-ejbar-txt"><b>{t("ejTitle")}</b> {t("ejDesc")}</div>
      <div className="cp-ejbar-actions">
        <button className="cp-btn cp-btn-acc" onClick={() => ejemplos.forEach((e) => onCrear(e))}>{t("ejUse")}</button>
        <button className="cp-btn" onClick={() => onCrear({})}>{t("ejBlank")}</button>
      </div>
    </div>
  );
}

// Wrapper "nunca en blanco" para vistas de 1ª generación (Foto/Arte/Ejecutivo)
// SIN tocar su interior: cuando no hay filas, inyecta filas-ejemplo (fantasma)
// en solo-lectura + barra de adopción. Render-prop: children(filasEfectivas, editableEfectivo).
function VistaConEjemplos({ ejemplos, filas, editable, onCrear, children }: {
  ejemplos: Ejemplo[]; filas: Fila[]; editable: boolean;
  onCrear: (datos: Record<string, string>) => void;
  children: (filas: Fila[], editable: boolean) => React.ReactNode;
}) {
  const hay = filas.length > 0;
  const fs = hay ? filas : ghostFilas(ejemplos);
  return (
    <>
      {!hay && editable && <AdoptarEjemplos ejemplos={ejemplos} onCrear={(d) => onCrear(d ?? {})} />}
      <div className={!hay ? "cp-ghost-grid" : ""}>{children(fs, editable && hay)}</div>
    </>
  );
}

// Ejemplos genéricos por componente 1ª gen (demuestran la estructura para
// cualquier herramienta que use ese componente — "Marea Oscura").
const EJ_FOCO: Ejemplo[] = [
  { escena: "12", a: "A — puerta del faro", b: "B — mesa de la bitácora", c: "C — ventana a la niebla", optica: "35mm", notas: "El foco sigue a Marea de A a C." },
  { escena: "8", a: "A — Marea en el muelle", b: "B — barca al fondo", c: "", optica: "50mm", notas: "Rack focus cuando llega la barca." },
];
const EJ_PLANO: Ejemplo[] = [
  { escena: "1", plano: "1A", num_plano: "1", objeto: "Plano general del faro al amanecer.", estado: "Pendiente" },
  { escena: "1", plano: "1B", num_plano: "2", objeto: "Primer plano de Marea observando la luz apagada.", estado: "Rodado" },
  { escena: "8", plano: "8A", num_plano: "1", objeto: "Travelling del muelle con figuración.", estado: "Pendiente" },
];
const EJ_PENDIENTES: Ejemplo[] = [
  { objeto: "Farol de aceite (atrezzo)", descripcion: "Se necesita para la escena 1 del faro.", estado: "Pendiente", prioridad: "Alta" },
  { objeto: "Cuaderno de bitácora", descripcion: "Con nombres tachados, encargado a utilería.", estado: "En proceso", prioridad: "Media" },
];
const EJ_TIMELINE_DEC: Ejemplo[] = [
  { decorado: "Interior del faro", inicio_construccion: "2026-06-20", fin_construccion: "2026-07-01", montaje: "2026-07-10", rodaje: "2026-07-14", desmontaje: "2026-07-16", responsable: "Dir. de arte", estado: "En construcción" },
  { decorado: "Casa de Elsa", inicio_construccion: "2026-07-02", fin_construccion: "2026-07-12", montaje: "2026-07-15", rodaje: "2026-07-16", desmontaje: "2026-07-18", responsable: "Ayudantía de arte", estado: "Pendiente" },
];
const EJ_FX: Ejemplo[] = [
  { escena: "20", personaje: "Elsa", tipo_efecto: "Herida", descripcion_tecnica: "Corte en la ceja con látex y sangre.", materiales: "Látex, sangre artificial, paleta.", foto_proceso: "", foto_resultado: "" },
  { escena: "14", personaje: "Marea", tipo_efecto: "Cansancio", descripcion_tecnica: "Ojeras y palidez para el clímax.", materiales: "Sombras, base pálida.", foto_proceso: "", foto_resultado: "" },
];
const EJ_GENERADOR: Ejemplo[] = [
  { jornada: "2026-07-14", localizacion: "Faro (exterior)", kw_consumidos: "18", kw_disponibles: "25", combustible_inicio: "100", combustible_fin: "40", incidencias: "Sin incidencias." },
  { jornada: "2026-07-15", localizacion: "Puerto", kw_consumidos: "22", kw_disponibles: "25", combustible_inicio: "80", combustible_fin: "15", incidencias: "Repostar antes de la próxima jornada." },
];
const EJ_CONTINUIDAD_G: Ejemplo[] = [
  { personaje: "Marea", escena: "1", estado: "Confirmado", fecha: "2026-07-14" },
  { personaje: "Marea", escena: "8", estado: "Pendiente", fecha: "2026-07-15" },
];
const EJ_PRESUP: Ejemplo[] = [
  { partida: "Equipo de cámara", presupuestado: "12000", real: "11200", estado: "En presupuesto" },
  { partida: "Localizaciones", presupuestado: "8000", real: "9500", estado: "Sobrepasado" },
];
const EJ_CASHFLOW: Ejemplo[] = [
  { periodo: "Semana 1", ingresos: "50000", egresos: "32000", saldo: "18000" },
  { periodo: "Semana 2", ingresos: "0", egresos: "28000", saldo: "-10000" },
];
const EJ_PIPELINE: Ejemplo[] = [
  { fuente: "ICAA (ayuda selectiva)", importe: "180000", estado: "En negociación", estado_firma: "Pendiente" },
  { fuente: "Coproducción Francia", importe: "120000", estado: "Acordado", estado_firma: "Parcial" },
];
const EJ_MODELO: Ejemplo[] = [
  { escenario: "Optimista", margen: "22", ingresos: "900000", gastos: "700000" },
  { escenario: "Base", margen: "10", ingresos: "780000", gastos: "700000" },
  { escenario: "Conservador", margen: "-4", ingresos: "670000", gastos: "700000" },
];

// Registro central de ejemplos por herramienta, para las herramientas que
// reutilizan patrones compartidos (FichaEquipo / AgendaDia / DocStatusBoard).
// Los componentes bespoke definen sus ejemplos inline; estos son para el resto.
const EJEMPLOS_POR_ID: Record<string, Ejemplo[]> = {
  "cast-cal-audiciones": [
    { fecha: "2026-07-10", hora: "10:00", candidato: "Lucía Fernández", personaje: "Marea", sala: "Sala A", tipo: "Callback", resultado: "En lista corta", notas: "Gran química en la escena del faro. Repetir con el otro Elsa." },
    { fecha: "2026-07-10", hora: "11:30", candidato: "Diego Molina", personaje: "Farero", sala: "Sala A", tipo: "Prueba cámara", resultado: "Seleccionado", notas: "Presencia física ideal. Confirmar disponibilidad de fechas." },
    { fecha: "2026-07-11", hora: "16:00", candidato: "Ana Ruiz", personaje: "Elsa", sala: "Online", tipo: "Self-tape", resultado: "Pendiente", notas: "Recibido self-tape, a revisar con dirección." },
  ],
  "cast-agentes": [
    { agente: "María Soto — Talento Sur", actor: "Lucía Fernández", fecha: "2026-07-02", asunto: "Disponibilidad para callback y rango de caché.", estado: "En conversación" },
    { agente: "Kepa Aguirre — Norte Actores", actor: "Diego Molina", fecha: "2026-06-28", asunto: "Confirmada disponibilidad todo julio. Envían contrato tipo.", estado: "Cerrado" },
  ],
  "cast-ficha-reparto": [
    { actor: "Lucía Fernández", personaje: "Marea", tipo: "Protagonista", contacto: "María Soto (agencia)", contrato: "Firmado", foto: "" },
    { actor: "Diego Molina", personaje: "Farero", tipo: "Principal", contacto: "Kepa Aguirre (agencia)", contrato: "Pendiente", foto: "" },
    { actor: "Ana Ruiz", personaje: "Elsa", tipo: "Principal", contacto: "directo", contrato: "Pendiente", foto: "" },
  ],
  "cast-ficha-agencia": [
    { agencia: "Talento Sur", pais: "España", contacto_principal: "María Soto", email: "maria@talentosur.es", telefono: "+34 600 123 456", actores_con_ellos: "Lucía Fernández, Diego Ramos", comision_pct: "10", notas: "Responden rápido. Buen catálogo de jóvenes." },
    { agencia: "Norte Actores", pais: "España", contacto_principal: "Kepa Aguirre", email: "kepa@norteactores.com", telefono: "+34 688 555 010", actores_con_ellos: "Diego Molina", comision_pct: "12", notas: "Especializados en actores de carácter." },
  ],
  "cast-contratos-reparto": [
    { actor: "Lucía Fernández", personaje: "Marea", cache: "18000", jornadas: "22", imagen: "Firmada", estado: "Firmado", adjunto: "" },
    { actor: "Diego Molina", personaje: "Farero", cache: "9000", jornadas: "10", imagen: "Pendiente", estado: "Enviado", adjunto: "" },
    { actor: "Ana Ruiz", personaje: "Elsa", cache: "9000", jornadas: "12", imagen: "Pendiente", estado: "Pendiente", adjunto: "" },
  ],
  "rep-citaciones": [
    { fecha: "2026-07-14", convocatoria: "07:30", set: "Faro (exterior)", escenas: "1, 3", myp: "06:00 maq. + pelo" },
    { fecha: "2026-07-15", convocatoria: "09:00", set: "Puerto — muelle norte", escenas: "8", myp: "07:30 solo peinado" },
  ],
  "rep-agenda-personal": [
    { fecha: "2026-07-14", hora_citacion: "06:00", localizacion: "Faro (exterior)", escenas: "1, 3", hora_fin: "18:00", estado: "Confirmada", notas: "Escena del amanecer: llegar con el texto de la 3 memorizado." },
    { fecha: "2026-07-15", hora_citacion: "07:30", localizacion: "Puerto — muelle norte", escenas: "8", hora_fin: "15:00", estado: "Pendiente", notas: "Confirmar transporte desde el hotel." },
  ],
  "rep-agenda-personal-principal": [
    { fecha: "2026-07-16", hora_citacion: "08:00", localizacion: "Casa de Elsa", escenas: "20", estado: "Confirmada", notas: "Escena de la carta. Repasar subtexto con dirección antes." },
    { fecha: "2026-07-18", hora_citacion: "10:00", localizacion: "Faro (linterna)", escenas: "14", estado: "Pendiente", notas: "Clímax. Ensayo previo el día 17." },
  ],
  "son-inventario": [
    { equipo: "Grabador Sound Devices 833", categoria: "Grabador", cantidad: "1", proveedor: "Alquiler Pro Audio", numero_serie: "SD833-2291", estado: "OK", propietario: "Alquilado", seguro: "Sí", fecha_devolucion: "2026-08-30" },
    { equipo: "Lavalier DPA 4060 (x4)", categoria: "Micrófono", cantidad: "4", proveedor: "Propio", numero_serie: "DPA-4060-A/D", estado: "OK", propietario: "Propio", seguro: "No", fecha_devolucion: "" },
  ],
  "son-adr": [
    { escena: "14", personaje: "Marea", motivo: "Ruido de viento tapa el diálogo del clímax.", prioridad: "Alta", estado: "Pendiente" },
    { escena: "8", personaje: "Farero", motivo: "Mejorar intención en la última frase.", prioridad: "Media", estado: "Grabado" },
  ],
  "son-plan-adr": [
    { escena: "14", dialogo_original: "La luz lleva tres noches apagada.", actor: "Lucía Fernández", motivo: "Ruido", fecha_sesion_adr: "2026-09-05", estudio: "Estudio Aural", estado: "Pendiente" },
    { escena: "8", dialogo_original: "Aquí ya no queda nadie.", actor: "Diego Molina", motivo: "Interpretación", fecha_sesion_adr: "2026-09-06", estudio: "Estudio Aural", estado: "Grabado" },
  ],
  "son-plan-mezcla": [
    { elemento: "Diálogos (DX)", responsable: "Mezclador jefe", formato: "Pro Tools stems", fecha: "2026-09-20", estado: "En mezcla" },
    { elemento: "Ambientes (FX)", responsable: "Editor de sonido", formato: "5.1 stems", fecha: "2026-09-22", estado: "Pendiente" },
  ],
  "son-sinc-audio": [
    { escena: "1", toma: "3", pista_video: "A001_C003.mov", pista_audio: "ZOOM0003.wav", timecode_in: "01:15:02:12", claqueta: "1/3", estado: "Sincronizado", notas: "La buena marcada por script." },
    { escena: "8", toma: "2", pista_video: "A004_C002.mov", pista_audio: "ZOOM0021.wav", timecode_in: "03:22:10:04", claqueta: "8/2", estado: "Pendiente", notas: "Revisar deriva de TC." },
  ],
  "son-entrega-post": [
    { stem: "DX — Diálogos", descripcion: "Diálogos limpios sin ambiente.", formato: "WAV 24bit", sample_rate: "48000", bit_depth: "24", archivo_final: "", fecha_entrega: "2026-09-25", estado: "En mezcla" },
    { stem: "MX — Música", descripcion: "Score final del compositor.", formato: "WAV 24bit", sample_rate: "48000", bit_depth: "24", archivo_final: "", fecha_entrega: "2026-09-28", estado: "Pendiente" },
  ],
  "son-problemas-set": [
    { dia: "2026-07-14", escena: "1", tipo: "Viento", descripcion: "Rachas fuertes en el exterior del faro.", solucion: "Zeppelin + peluche, wildtrack de ambiente.", requiere_adr: "Por confirmar" },
    { dia: "2026-07-15", escena: "8", tipo: "Ruido externo", descripcion: "Barco de pesca al fondo durante la toma.", solucion: "Esperar paso del barco, repetir.", requiere_adr: "No" },
  ],
  "son-reportes": [
    { escena: "1 / T3", archivo: "ZOOM0003 · 01:15:02", canales: "1-2 boom, 3-4 lav", ok: "OK", circunstancias_sonido: "Exterior con viento", temperatura_ambiente: "14", humedad: "80", nivel_ruido_ambiente_db: "42", observaciones_post: "Viento controlado con zeppelin.", notas: "Wildtrack de olas grabado aparte." },
    { escena: "8 / T2", archivo: "ZOOM0021 · 03:22:10", canales: "1-2 boom", ok: "NG", circunstancias_sonido: "Exterior urbano", temperatura_ambiente: "18", humedad: "65", nivel_ruido_ambiente_db: "55", observaciones_post: "Barco al fondo.", notas: "Repetida en T3." },
  ],
  "son-reporte-boom": [
    { escena: "1 / T3", angulo: "Cenital frontal", ruido_fondo: "Limpio", alternativa: "—", wildtrack: "Sí", notas: "Buena cobertura, sin sombras de boom." },
    { escena: "8 / T2", angulo: "Lateral bajo", ruido_fondo: "Ruidoso", alternativa: "Lavalier Farero", wildtrack: "No", notas: "Ciudad al fondo, se pasa a lav." },
  ],
  "post-plan-montaje": [
    { hito: "Primer ensamblado (assembly)", inicio: "2026-08-03", fin: "2026-08-20", responsable: "Montador jefe", estado: "En curso" },
    { hito: "Fine cut", inicio: "2026-08-21", fin: "2026-09-10", responsable: "Montador jefe", estado: "Pendiente" },
  ],
  "post-notas-visionado": [
    { escena: "14", tc: "01:12:04", nota: "El corte al plano de Elsa llega tarde, se pierde tensión.", autor: "Dirección", estado: "Abierta" },
    { escena: "1", tc: "00:03:20", nota: "Alargar el amanecer 2 segundos.", autor: "Montaje", estado: "Resuelta" },
  ],
  "post-lista-vfx": [
    { plano: "VFX_012", escena: "12", tipo: "Cielo", desc: "Sustituir cielo plano por cielo tormentoso.", complejidad: "Media" },
    { plano: "VFX_034", escena: "20", tipo: "Limpieza", desc: "Borrar cable de la barra de lluvia.", complejidad: "Baja" },
  ],
  "post-plan-entregas": [
    { master: "Master DCP cine", formato: "DCP JPEG2000", destino: "Distribuidora", fecha: "2026-10-15", estado: "Pendiente" },
    { master: "Master plataformas", formato: "ProRes 4444", destino: "Filmin", fecha: "2026-10-20", estado: "En proceso" },
  ],
  "post-notas-corte-escena": [
    { escena: "1", num_cortes: "8", duracion_escena: "2:15", observaciones_montaje: "Ritmo lento a propósito para el amanecer.", musica_temp: "", decision_final: "Queda", notas: "Ojo con la música temp." },
    { escena: "14", num_cortes: "22", duracion_escena: "3:40", observaciones_montaje: "Demasiados cortes en la confrontación.", musica_temp: "", decision_final: "Reducir", notas: "Bajar a ~16 cortes." },
  ],
  "post-vfx-tracking": [
    { shot_id: "VFX_012", descripcion: "Cielo tormentoso sobre el faro.", tipo_vfx: "Compositing", empresa_vfx: "Píxel Norte", complejidad: "Media", precio: "1200", fecha_entrega: "2026-09-15", link_revision: "", estado: "En proceso" },
    { shot_id: "VFX_034", descripcion: "Limpieza de cable.", tipo_vfx: "Paint", empresa_vfx: "Píxel Norte", complejidad: "Baja", precio: "300", fecha_entrega: "2026-09-05", link_revision: "", estado: "Aprobado" },
  ],
  "post-dcp-deliverables": [
    { version: "OV (original)", resolucion: "4K", ratio: "2.39", audio_config: "5.1", idioma: "Español", subtitulos: "—", encriptacion: "No", archivo_dcp: "", fecha_creacion: "2026-10-10", estado: "QC" },
    { version: "VF subtitulada", resolucion: "2K", ratio: "2.39", audio_config: "5.1", idioma: "Español", subtitulos: "Inglés", encriptacion: "Sí", archivo_dcp: "", fecha_creacion: "2026-10-12", estado: "Pendiente" },
  ],
  "post-licencias-musica": [
    { tema: "The Sea, The Sea", compositor: "Ólafur Arnalds", editorial: "Mercury KX", tipo_uso: "Sincronización", fee: "3500", territorio: "Mundial", duracion: "0:45", archivo_licencia: "", estado: "En negociación" },
    { tema: "Score original", compositor: "Compositor del film", editorial: "Propia", tipo_uso: "Master", fee: "0", territorio: "Mundial", duracion: "—", archivo_licencia: "", estado: "Aprobado" },
  ],
  "post-timeline-montaje": [
    { secuencia: "Acto I — El faro", duracion: "18:30", orden: "1", estado: "Montada" },
    { secuencia: "Acto II — El pueblo", duracion: "24:10", orden: "2", estado: "Sin montar" },
  ],
  "post-sesiones-etalonaje": [
    { escena: "1", ajustes: "Bajar temperatura, potenciar azules del amanecer.", fecha: "2026-09-18", estado: "A revisar" },
    { escena: "8", ajustes: "Contraste alto, look desaturado del puerto.", fecha: "2026-09-19", estado: "Aprobado" },
  ],
  "post-tracking-vfx": [
    { plano: "VFX_012", proveedor: "Píxel Norte", version: "v3", entrega: "2026-09-15", estado: "Review" },
    { plano: "VFX_034", proveedor: "Píxel Norte", version: "v1", entrega: "2026-09-05", estado: "Aprobado" },
  ],
  "post-cal-maestro": [
    { hito: "Picture lock", area: "Montaje", fecha: "2026-09-10", responsable: "Montaje + Dirección", estado: "Pendiente" },
    { hito: "Entrega DCP", area: "Entrega", fecha: "2026-10-15", responsable: "Coordinación post", estado: "Pendiente" },
  ],
  "rrhh-listado-equipo": [
    { nombre: "Marta Ruiz", depto: "Guion", cargo: "Guionista", tel: "+34 600 111 222", email: "marta@marea.film" },
    { nombre: "Kepa Aguirre", depto: "Fotografía", cargo: "Director de fotografía", tel: "+34 688 333 444", email: "kepa@marea.film" },
  ],
  "rrhh-control-horas": [
    { fecha: "2026-07-14", persona: "Equipo cámara", entrada: "06:00", salida: "19:30", extra: "1.5" },
    { fecha: "2026-07-14", persona: "Equipo arte", entrada: "05:30", salida: "18:00", extra: "0.5" },
  ],
  "rrhh-altas-bajas": [
    { nombre: "Ana Soler", depto: "Producción", tipo: "Alta", fecha: "2026-07-01", estado: "Hecho" },
    { nombre: "Luis Vidal", depto: "Eléctricos", tipo: "Baja", fecha: "2026-07-20", estado: "Tramitando" },
  ],
  "rrhh-incidencias": [
    { fecha: "2026-07-15", tipo: "Seguridad", desc: "Suelo resbaladizo en el muelle durante el rodaje.", estado: "En gestión" },
    { fecha: "2026-07-12", tipo: "Laboral", desc: "Reclamación de horas extra del día 10.", estado: "Resuelta" },
  ],
  // --- Sostenibilidad ---
  "sost-huella": [
    { fuente: "Transporte de equipo", categoria: "Transporte", actividad: "1.200 km en furgonetas diésel", co2: "320" },
    { fuente: "Generadores en set", categoria: "Energía", actividad: "180 L de gasoil", co2: "480" },
  ],
  "sost-energia": [
    { fecha: "2026-07-14", fuente: "Generador", consumo: "180", set: "Faro (exterior)" },
    { fecha: "2026-07-15", fuente: "Red", consumo: "95", set: "Casa de Elsa" },
  ],
  "sost-residuos": [
    { residuo: "Cartón y embalajes", gestion: "Reciclaje", responsable: "Producción", notas: "Punto limpio en base." },
    { residuo: "Restos de catering", gestion: "Compost", responsable: "Catering", notas: "Acuerdo con huerto local." },
  ],
  "sost-registro-residuos": [
    { fecha: "2026-07-14", tipo: "Plástico", cantidad: "12", destino: "Reciclaje" },
    { fecha: "2026-07-14", tipo: "Orgánico", cantidad: "8", destino: "Compost" },
  ],
  "sost-proveedores": [
    { proveedor: "EcoCatering Norte", servicio: "Catering", criterio: "Producto de km 0, sin plásticos de un solo uso.", cert: "ISO 14001" },
    { proveedor: "Alquiler Verde", servicio: "Transporte", criterio: "Flota híbrida y eléctrica.", cert: "—" },
  ],
  // --- Marketing ---
  "mkt-cal-redes": [
    { fecha: "2026-10-01", canal: "Instagram", contenido: "Teaser del primer plano del faro.", estado: "Programado" },
    { fecha: "2026-10-05", canal: "TikTok", contenido: "Clip BTS del amanecer.", estado: "Planeado" },
  ],
  "mkt-publicaciones-metricas": [
    { fecha: "2026-10-01", canal: "Instagram", pieza: "Teaser faro", alcance: "24000", interaccion: "1800" },
    { fecha: "2026-10-05", canal: "TikTok", pieza: "BTS amanecer", alcance: "51000", interaccion: "6400" },
  ],
  "mkt-solicitudes-piezas": [
    { pieza: "Póster teaser", brief: "Faro entre niebla, tono frío, título abajo.", formato: "A2 + digital", deadline: "2026-09-20", estado: "En diseño" },
    { pieza: "Banners RRSS", brief: "Set de 5 formatos para lanzamiento.", formato: "1:1, 9:16, 16:9", deadline: "2026-09-25", estado: "Solicitada" },
  ],
  // --- Difusión ---
  "dif-notas-prensa": [
    { titulo: "Marea Oscura inicia rodaje en la costa norte", fecha: "2026-07-10", angulo: "Rodaje local, empleo y paisaje.", estado: "Enviada" },
    { titulo: "El faro protagonista: localización real", fecha: "2026-08-01", angulo: "Historia del faro y su restauración.", estado: "Borrador" },
  ],
  "dif-tracking-envios": [
    { medio: "Diario de la Costa", envio: "Nota de prensa + fotos", fecha: "2026-07-10", respuesta: "Interesados en entrevista a la directora.", estado: "Interesado" },
    { medio: "Radio Norte", envio: "Nota de prensa", fecha: "2026-07-10", respuesta: "", estado: "Sin respuesta" },
  ],
  // --- Distribución ---
  "dist-plan": [
    { ventana: "Festivales (circuito A)", territorio: "Internacional", fecha: "2026-11-01", condiciones: "Estreno mundial en festival clase A.", estado: "Objetivo" },
    { ventana: "Salas España", territorio: "España", fecha: "2027-03-01", condiciones: "Estreno limitado + expansión.", estado: "En negociación" },
  ],
  "dist-acuerdos": [
    { contraparte: "Filmin", territorio: "España", ventana: "SVOD", importe: "40000", estado: "En negociación" },
    { contraparte: "Distribuidora Europa", territorio: "Francia + Benelux", ventana: "Salas", importe: "75000", estado: "Acordado" },
  ],
  "dist-inscripciones": [
    { festival: "San Sebastián", fecha: "2026-06-30", material: "Screener + prensakit + DCP de respaldo.", estado: "Inscrito" },
    { festival: "Berlinale", fecha: "2026-11-15", material: "Screener online.", estado: "Preparando" },
  ],
  // --- Making of ---
  "mo-cal-editorial": [
    { fecha: "2026-07-20", pieza: "Reel primera semana", formato: "Reel", responsable: "Community", estado: "En edición" },
    { fecha: "2026-07-25", pieza: "Entrevista a la directora", formato: "Entrevista", responsable: "Cámara BTS", estado: "En grabación" },
  ],
  "mo-cobertura-bts": [
    { jornada: "2026-07-14", momento: "Rodaje escena 1 (amanecer)", objetivo: "Capturar la niebla real y el equipo montando.", equipo: "Cámara BTS + foto fija" },
    { jornada: "2026-07-15", momento: "Escena 8 (puerto)", objetivo: "Ambiente de puerto, interacción con figurantes.", equipo: "Cámara BTS" },
  ],
  "mo-hoja-rodaje-bts": [
    { jornada: "2026-07-14", planos: "Timelapse de montaje, entrevista rápida a dirección de foto.", equipo: "1 cámara + gimbal", notas: "No molestar en tomas de sonido directo." },
    { jornada: "2026-07-15", planos: "Cobertura de figuración, detalles de atrezzo.", equipo: "1 cámara", notas: "" },
  ],
  "mo-redes-metricas": [
    { fecha: "2026-07-21", canal: "Instagram", pieza: "Reel semana 1", alcance: "32000", engagement: "2900" },
    { fecha: "2026-07-26", canal: "TikTok", pieza: "BTS niebla", alcance: "68000", engagement: "8100" },
  ],
  "mo-plan-rodaje-bts": [
    { jornada: "2026-07-14", escenas_previstas: "Escena 1 y montaje del faro.", crew_bts: "Ana (cámara)", equipo_bts: "Sony FX3 + gimbal", objetivo_contenido: "Reel de arranque de rodaje.", resultado_horas: "3", material_aprobado: "Aprobado" },
    { jornada: "2026-07-15", escenas_previstas: "Escena 8 en puerto.", crew_bts: "Ana (cámara)", equipo_bts: "Sony FX3", objetivo_contenido: "Contenido de figuración.", resultado_horas: "2", material_aprobado: "Pendiente" },
  ],
  "mo-material": [
    { fecha: "2026-07-14", clip: "BTS_D01_001.mp4", contenido: "Montaje del faro al amanecer.", ubicacion: "Disco BTS 01", estado: "Seleccionado", carpeta: "" },
    { fecha: "2026-07-15", clip: "BTS_D02_004.mp4", contenido: "Figuración en el puerto.", ubicacion: "Disco BTS 01", estado: "Crudo", carpeta: "" },
  ],
  "mo-banco-cortes": [
    { clip: "Amanecer faro (timelapse)", destino: "Reel semana 1", duracion: "0:15", estado: "Aprobado" },
    { clip: "Entrevista directora", destino: "Pieza larga YouTube", duracion: "2:30", estado: "En edición" },
  ],
  "bts-inventario-material": [
    { tipo: "Video", fecha: "2026-07-14", escena_relacionada: "1", descripcion: "Montaje del faro y niebla.", archivo_master: "", aprobado_publicacion: "Aprobado", fecha_publicacion: "2026-07-21" },
    { tipo: "Foto", fecha: "2026-07-15", escena_relacionada: "8", descripcion: "Foto fija del puerto.", archivo_master: "", aprobado_publicacion: "Pendiente", fecha_publicacion: "" },
  ],
  "bts-plan-contenido": [
    { semana: "Semana 1", plataforma: "Instagram", tipo_contenido: "Reels", descripcion: "Arranque de rodaje, teaser de localización.", recurso_necesario: "Cámara BTS + edición rápida.", responsable: "Community", estado: "En producción" },
    { semana: "Semana 2", plataforma: "TikTok", tipo_contenido: "Story", descripcion: "Día a día del equipo.", recurso_necesario: "Móvil.", responsable: "Community", estado: "Planificado" },
  ],
  "mo-entrevistas": [
    { entrevistado: "Marta Ruiz", cargo: "Directora", fecha: "2026-07-25", temas_tratados: "Origen del proyecto, el faro como personaje.", duracion_min: "35", archivo_video: "", fragmentos_usables: "El bloque sobre la niebla (min 12-15).", estado: "Grabada" },
    { entrevistado: "Kepa Aguirre", cargo: "Director de fotografía", fecha: "2026-07-26", temas_tratados: "Luz natural y el reto del amanecer.", duracion_min: "28", archivo_video: "", fragmentos_usables: "", estado: "Pendiente" },
  ],
  "bts-contactos-prensa": [
    { medio: "Fotogramas", periodista: "Elena Ríos", email: "elena@fotogramas.es", telefono: "+34 600 777 888", tipo_cobertura: "Set visit", estado_acreditacion: "Acreditado", notas: "Visita prevista semana 3." },
    { medio: "Cinemanía", periodista: "Pau Grau", email: "pau@cinemania.es", telefono: "+34 655 111 999", tipo_cobertura: "Entrevista", estado_acreditacion: "Pendiente", notas: "" },
  ],
};

// ============================================================
// DIRECCIÓN — vistas a medida. Acento: var(--lime).
// CSS: dd-* / psc-* / sclog-* / cgn-* / pfig-*
// ============================================================

// ---- Desglose técnico por escena ----
// Tarjetas ordenadas por nº de escena: número grande, decorado, actores
// como chips, alertas de FX/permisos/equipo especial, borde coloreado por estado.
const DESGLOSE_DIR_IDS = new Set(["dir-breakdown-tecnico"]);

const EJ_BREAKDOWN: Ejemplo[] = [
  { escena: "12", decorado: "Faro — base de la torre", actores_necesarios: "Marea, Elsa", efectos_especiales: "Niebla artificial en el exterior.", hora_dorada: "Sí", permisos_necesarios: "Permiso de rodaje nocturno del ayuntamiento.", equipo_especial: "Grúa pequeña para el plano cenital.", estado: "En preparación" },
  { escena: "8", decorado: "Puerto — muelle norte", actores_necesarios: "Marea, Pescadores", efectos_especiales: "", hora_dorada: "No", permisos_necesarios: "Corte de tráfico en el paseo marítimo.", equipo_especial: "", estado: "Listo" },
  { escena: "20", decorado: "Casa de Elsa — Salón", actores_necesarios: "Elsa", efectos_especiales: "Lluvia en ventana (barra de lluvia).", hora_dorada: "No", permisos_necesarios: "", equipo_especial: "Barra de lluvia + bomba de agua.", estado: "Pendiente" },
];
function DesgloseDir({
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
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const val = (f: Fila, k: string) => f.datos?.[k] ?? "";
  const lbl = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  function set(f: Fila, k: string, v: string) { onGuardar(f.id, { ...f.datos, [k]: v }, f); }

  const colEstado = columnas.find((c) => c.key === "estado");
  const colHoraDorada = columnas.find((c) => c.key === "hora_dorada");
  const largoKeys = ["efectos_especiales", "permisos_necesarios", "equipo_especial"] as const;

  function borderCls(f: Fila) {
    const e = val(f, "estado");
    if (/listo/i.test(e)) return "dd-border-ok";
    if (/preparac/i.test(e)) return "dd-border-warn";
    return "dd-border-pend";
  }

  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(EJ_BREAKDOWN);
  const edEff = editable && hayFilas;
  const sorted = [...filasEff].sort((a, b) => {
    const na = parseInt(val(a, "escena")) || 999;
    const nb = parseInt(val(b, "escena")) || 999;
    return na !== nb ? na - nb : val(a, "escena").localeCompare(val(b, "escena"), "es", { numeric: true });
  });

  return (
    <div className="dd-board">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_BREAKDOWN} onCrear={onCrear} />}
      <div className="dd-grid">
        {sorted.map((f) => {
          const actors = val(f, "actores_necesarios").split(/[,;\/]/).map((s) => s.trim()).filter(Boolean);
          return (
            <div key={f.id} className={`dd-card ${borderCls(f)} ${!hayFilas ? "cp-ghost" : ""}`}>
              {!hayFilas && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="dd-head">
                {edEff
                  ? <input className="dd-num" defaultValue={val(f, "escena")} placeholder="Esc." onBlur={(e) => set(f, "escena", e.target.value)} />
                  : <span className="dd-num">{val(f, "escena") || "?"}</span>}
                <div className="dd-head-right">
                  <input className="dd-decorado" defaultValue={val(f, "decorado")} placeholder={lbl("decorado")} readOnly={!edEff} onBlur={(e) => set(f, "decorado", e.target.value)} />
                  {!edEff && actors.length > 0 && (
                    <div className="dd-actors">{actors.map((a, i) => <span key={i} className="dd-actor">{a}</span>)}</div>
                  )}
                  {val(f, "hora_dorada") === "Sí" && <span className="dd-gold-badge">◈ {lbl("hora_dorada")}</span>}
                </div>
                {edEff && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>

              {edEff && (
                <label className="dd-field">
                  <span>{lbl("actores_necesarios")}</span>
                  <input className="dd-field-input" defaultValue={val(f, "actores_necesarios")} placeholder="Marc, Sofía…" onBlur={(e) => set(f, "actores_necesarios", e.target.value)} />
                </label>
              )}

              {largoKeys.map((k) => (edEff || val(f, k)) ? (
                <label key={k} className="dd-field">
                  <span>{lbl(k)}</span>
                  <textarea className="dd-field-ta" defaultValue={stripHtml(val(f, k))} placeholder={edEff ? "—" : ""} readOnly={!edEff} rows={2} onBlur={(e) => set(f, k, e.target.value)} />
                </label>
              ) : null)}

              {colHoraDorada && edEff && (
                <div className="dd-seg-row">
                  <span>{lbl("hora_dorada")}</span>
                  <EstadoSeg valor={val(f, "hora_dorada")} opciones={colHoraDorada.opciones ?? []} onPick={(v) => set(f, "hora_dorada", v)} editable={edEff} chip />
                </div>
              )}

              {colEstado && (
                <div className="dd-foot">
                  <EstadoSeg valor={val(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={edEff} color />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hayFilas && editable && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ---- Partes de script / continuidad por escena ----
// Raccord notes como contenido hero. Left border por estado.
// Por rodar=amber, Rodada=lime, Pendiente repetir=rose.
const EJ_PARTES: Ejemplo[] = [
  { escena: "8", toma: "3 OK · 1 NG", duracion: "0:45", raccord: "Marea entra por la izquierda con el farol en la mano derecha. La puerta queda entornada.", estado: "Rodada" },
  { escena: "12", toma: "—", duracion: "1:10", raccord: "Ojo: posición del cuaderno debe coincidir con la escena 20.", estado: "Por rodar" },
  { escena: "5", toma: "2 NG", duracion: "0:30", raccord: "El té debe estar servido antes del corte. Repetir por foco.", estado: "Pendiente repetir" },
];
function PartesScript({
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
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const val = (f: Fila, k: string) => f.datos?.[k] ?? "";
  const lbl = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  function set(f: Fila, k: string, v: string) { onGuardar(f.id, { ...f.datos, [k]: v }, f); }

  const colEstado = columnas.find((c) => c.key === "estado");

  function borderCls(f: Fila) {
    const e = val(f, "estado");
    if (/rodada/i.test(e) && !/pendiente/i.test(e)) return "psc-border-ok";
    if (/pendiente.*repetir/i.test(e)) return "psc-border-bad";
    return "psc-border-warn";
  }

  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(EJ_PARTES);
  const edEff = editable && hayFilas;
  const sorted = [...filasEff].sort((a, b) => {
    const na = parseInt(val(a, "escena")) || 999;
    const nb = parseInt(val(b, "escena")) || 999;
    return na !== nb ? na - nb : val(a, "escena").localeCompare(val(b, "escena"), "es", { numeric: true });
  });

  return (
    <div className="psc-board">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_PARTES} onCrear={onCrear} />}
      {sorted.map((f) => (
        <div key={f.id} className={`psc-card ${borderCls(f)} ${!hayFilas ? "cp-ghost" : ""}`}>
          {!hayFilas && <span className="cp-ej-chip">{t("ejChip")}</span>}
          <div className="psc-top">
            <div className="psc-left">
              {edEff
                ? <input className="psc-esc-num" defaultValue={val(f, "escena")} placeholder="Esc." onBlur={(e) => set(f, "escena", e.target.value)} />
                : <span className="psc-esc-num">{val(f, "escena") || "?"}</span>}
              <div className="psc-meta">
                {(edEff || val(f, "toma")) ? (
                  <label className="psc-row">
                    <span>{lbl("toma")}</span>
                    <input className="psc-toma" defaultValue={val(f, "toma")} placeholder="3 OK / 2 NG" readOnly={!edEff} onBlur={(e) => set(f, "toma", e.target.value)} />
                  </label>
                ) : null}
                {(edEff || val(f, "duracion")) ? (
                  <label className="psc-row">
                    <span>{lbl("duracion")}</span>
                    <input className="psc-duracion" defaultValue={val(f, "duracion")} placeholder="0:45" readOnly={!edEff} onBlur={(e) => set(f, "duracion", e.target.value)} />
                  </label>
                ) : null}
              </div>
            </div>
            <div className="psc-raccord">
              <span className="psc-raccord-label">{lbl("raccord")}</span>
              <textarea
                className="psc-raccord-ta"
                defaultValue={stripHtml(val(f, "raccord"))}
                placeholder={edEff ? "Notas de raccord y continuidad…" : ""}
                readOnly={!edEff}
                rows={3}
                onBlur={(e) => set(f, "raccord", e.target.value)}
              />
            </div>
            {edEff && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
          </div>
          {colEstado && (
            <div className="psc-foot">
              <EstadoSeg valor={val(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={edEff} color />
            </div>
          )}
        </div>
      ))}
      {hayFilas && editable && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ---- Log de tomas (Script supervisor) ----
// Filas compactas agrupadas por escena. Resultado coloreado:
// OK=lime / NG=rose / HOLD=amber / Print=cyan / Falsa=muted.
const EJ_SCRIPTLOG: Ejemplo[] = [
  { escena: "8", toma: "1", resultado: "OK", timecode: "01:12:04:10", duracion: "0:45", observaciones: "Buena toma, foco perfecto." },
  { escena: "8", toma: "2", resultado: "NG", timecode: "01:13:20:00", duracion: "0:42", observaciones: "Sombra de micro en el plano." },
  { escena: "8", toma: "3", resultado: "Print", timecode: "01:15:02:12", duracion: "0:46", observaciones: "La buena. Marcada para montaje." },
  { escena: "12", toma: "1", resultado: "HOLD", timecode: "02:04:00:00", duracion: "1:05", observaciones: "A la espera de decisión de dirección." },
];
function ScriptLog({
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
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const val = (f: Fila, k: string) => f.datos?.[k] ?? "";
  const lbl = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  function set(f: Fila, k: string, v: string) { onGuardar(f.id, { ...f.datos, [k]: v }, f); }

  const colResultado = columnas.find((c) => c.key === "resultado");

  function resultadoCls(r: string): string {
    const v = r.trim().toUpperCase();
    if (v === "OK") return "sclog-ok";
    if (v === "NG") return "sclog-ng";
    if (v === "HOLD") return "sclog-hold";
    if (v === "PRINT") return "sclog-print";
    return "sclog-falsa";
  }

  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(EJ_SCRIPTLOG);
  const edEff = editable && hayFilas;

  const grupos = filasEff.reduce<Record<string, Fila[]>>((acc, f) => {
    const esc = (val(f, "escena") || t("noScene")).trim();
    (acc[esc] ??= []).push(f);
    return acc;
  }, {});
  const gruposSorted = Object.entries(grupos).sort(([a], [b]) =>
    a.localeCompare(b, "es", { numeric: true })
  );

  function tomaStats(fs: Fila[]): string {
    const counts: Record<string, number> = {};
    fs.forEach((f) => {
      const r = val(f, "resultado").toUpperCase() || "—";
      counts[r] = (counts[r] ?? 0) + 1;
    });
    return Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(" · ");
  }

  return (
    <div className="sclog-board">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_SCRIPTLOG} onCrear={onCrear} />}
      {gruposSorted.map(([escena, fs]) => {
        const fsSorted = [...fs].sort((a, b) => {
          const na = parseInt(val(a, "toma")) || 0;
          const nb = parseInt(val(b, "toma")) || 0;
          return na - nb;
        });
        return (
          <div key={escena} className={`sclog-grupo ${!hayFilas ? "cp-ghost" : ""}`}>
            <div className="sclog-ghdr">
              <span className="sclog-gesc">{lbl("escena")} {escena}</span>
              <span className="sclog-gstats">{tomaStats(fs)}</span>
              {!hayFilas && <span className="cp-ej-chip">{t("ejChip")}</span>}
              {edEff && (
                <button className="cp-btn sclog-add" onClick={() => onCrear({ escena })}>
                  <Icon name="plus" size={10} /> {lbl("toma")}
                </button>
              )}
            </div>
            <div className="sclog-rows">
              {fsSorted.map((f) => (
                <div key={f.id} className={`sclog-row ${resultadoCls(val(f, "resultado"))}`}>
                  <input className="sclog-toma" type="number" defaultValue={val(f, "toma")} placeholder="T" readOnly={!edEff} onBlur={(e) => set(f, "toma", e.target.value)} />
                  {colResultado && (
                    <EstadoSeg valor={val(f, "resultado")} opciones={colResultado.opciones ?? []} onPick={(v) => set(f, "resultado", v)} editable={edEff} chip color />
                  )}
                  <input className="sclog-tc" defaultValue={val(f, "timecode")} placeholder="00:00:00:00" readOnly={!edEff} onBlur={(e) => set(f, "timecode", e.target.value)} />
                  <input className="sclog-dur" defaultValue={val(f, "duracion")} placeholder="0:00" readOnly={!edEff} onBlur={(e) => set(f, "duracion", e.target.value)} />
                  <input className="sclog-obs" defaultValue={val(f, "observaciones")} placeholder={edEff ? lbl("observaciones") : ""} readOnly={!edEff} onBlur={(e) => set(f, "observaciones", e.target.value)} />
                  {edEff && <button className="hp-del sclog-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {hayFilas && editable && (
        <div className="hp-actions">
          <button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button>
        </div>
      )}
    </div>
  );
}

// ---- Cambios de guión en set ----
// Agrupados por fecha. Vista de diff: versión anterior muted/italic,
// versión nueva con borde lime y texto prominente.
const EJ_CAMBIOS: Ejemplo[] = [
  { fecha: "2026-06-18", escena: "14", version_anterior: "MAREA: ¿Dónde está mi padre?", version_nueva: "MAREA: (sin preguntar, ya lo sabe) La luz lleva tres noches apagada.", motivo: "Ganar subtexto: que no pregunte lo que ya intuye.", aprobado_por: "Dirección" },
  { fecha: "2026-06-18", escena: "14", version_anterior: "Entran juntos a la torre.", version_nueva: "Marea sube sola; Elsa se queda abajo.", motivo: "Separar a los personajes de cara al clímax.", aprobado_por: "Dirección" },
];
function CambiosGuion({
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
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const val = (f: Fila, k: string) => f.datos?.[k] ?? "";
  const lbl = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  function set(f: Fila, k: string, v: string) { onGuardar(f.id, { ...f.datos, [k]: v }, f); }

  const colFecha = columnas.find((c) => c.tipo === "fecha");
  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(EJ_CAMBIOS);
  const edEff = editable && hayFilas;

  function CambioCard(f: Fila) {
    return (
      <div key={f.id} className={`cgn-card ${!hayFilas ? "cp-ghost" : ""}`}>
        {!hayFilas && <span className="cp-ej-chip">{t("ejChip")}</span>}
        <div className="cgn-head">
          {edEff ? (
            <>
              <input className="cgn-esc-input" defaultValue={val(f, "escena")} placeholder={lbl("escena")} onBlur={(e) => set(f, "escena", e.target.value)} />
              <input className="cgn-ap-input" defaultValue={val(f, "aprobado_por")} placeholder={lbl("aprobado_por")} onBlur={(e) => set(f, "aprobado_por", e.target.value)} />
              {colFecha && <input className="cgn-fecha-input" type="date" defaultValue={val(f, colFecha.key)} onBlur={(e) => set(f, colFecha.key, e.target.value)} />}
              <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>
            </>
          ) : (
            <>
              <span className="cgn-esc">Esc. {val(f, "escena") || "—"}</span>
              {val(f, "aprobado_por") && <span className="cgn-aprobado">{val(f, "aprobado_por")}</span>}
            </>
          )}
        </div>
        <div className="cgn-antes">
          <span className="cgn-label cgn-label-antes">{lbl("version_anterior")}</span>
          <textarea className="cgn-ta cgn-ta-antes" defaultValue={stripHtml(val(f, "version_anterior"))} placeholder={edEff ? "—" : ""} readOnly={!edEff} rows={2} onBlur={(e) => set(f, "version_anterior", e.target.value)} />
        </div>
        <div className="cgn-ahora">
          <span className="cgn-label cgn-label-ahora">{lbl("version_nueva")}</span>
          <textarea className="cgn-ta cgn-ta-ahora" defaultValue={stripHtml(val(f, "version_nueva"))} placeholder={edEff ? "—" : ""} readOnly={!edEff} rows={2} onBlur={(e) => set(f, "version_nueva", e.target.value)} />
        </div>
        {(edEff || val(f, "motivo")) ? (
          <label className="cgn-motivo">
            <span>{lbl("motivo")}</span>
            <textarea defaultValue={stripHtml(val(f, "motivo"))} placeholder={edEff ? "—" : ""} readOnly={!edEff} rows={2} onBlur={(e) => set(f, "motivo", e.target.value)} />
          </label>
        ) : null}
      </div>
    );
  }

  const grupos = colFecha
    ? Object.entries(
        filasEff.reduce<Record<string, Fila[]>>((acc, f) => {
          const fecha = val(f, colFecha.key) || t("pendMoveTo");
          (acc[fecha] ??= []).push(f);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b))
    : null;

  return (
    <div className="cgn-board">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_CAMBIOS} onCrear={onCrear} />}
      {grupos ? (
        grupos.map(([fecha, fs]) => (
          <div key={fecha} className="cgn-grupo">
            <div className="cgn-ghdr">
              <span className="hex" />
              <span>{fecha}</span>
              <span className="cgn-gcount">{fs.length}</span>
            </div>
            {fs.map(CambioCard)}
          </div>
        ))
      ) : (
        filasEff.map(CambioCard)
      )}
      {hayFilas && editable && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ---- Plan de figuración / extras ----
// Número de figurantes como dato hero (Poppins 800, coloreado por estado).
// Agrupado por fecha (dir-plan-extras) o por escena (dir-figuracion-escena).
const PLAN_FIGURACION_IDS = new Set(["dir-plan-extras", "dir-figuracion-escena"]);
const EJ_FIGURACION: Ejemplo[] = [
  { escena: "8", fecha: "2026-07-03", tipo_figurante: "Pescadores", tipo: "Pescadores", cantidad: "12", descripcion_perfil: "Hombres y mujeres 40-70, aspecto curtido de mar.", indicaciones: "Aspecto curtido de mar, ropa de faena.", que_llevan: "Ropa de faena propia (gris/azul).", hora_citacion: "06:30", estado: "Confirmado" },
  { escena: "8", fecha: "2026-07-03", tipo_figurante: "Niños del pueblo", tipo: "Niños del pueblo", cantidad: "4", descripcion_perfil: "Niños 8-11 con autorización de rodaje.", indicaciones: "Con autorización de rodaje.", que_llevan: "Ropa de calle neutra.", hora_citacion: "09:00", estado: "Por cubrir" },
  { escena: "20", fecha: "2026-07-05", tipo_figurante: "Asistentes al funeral", tipo: "Asistentes al funeral", cantidad: "25", descripcion_perfil: "Adultos de luto riguroso.", indicaciones: "Vestidos de luto riguroso.", que_llevan: "Ropa negra formal.", hora_citacion: "07:45", estado: "Convocado" },
];

function PlanFiguracion({
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
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const val = (f: Fila, k: string) => f.datos?.[k] ?? "";
  const lbl = (k: string) => columnas.find((c) => c.key === k)?.label ?? k;
  function set(f: Fila, k: string, v: string) { onGuardar(f.id, { ...f.datos, [k]: v }, f); }

  const colEstado = columnas.find((c) => c.tipo === "estado");
  const colFecha = columnas.find((c) => c.tipo === "fecha");
  const colCantidad = columnas.find((c) => c.tipo === "num" && c.key === "cantidad");
  const colTipo = columnas.find((c) => c.key === "tipo_figurante" || c.key === "tipo");
  const colHora = columnas.find((c) => c.key === "hora_citacion");
  const largos = columnas.filter((c) => c.tipo === "largo");

  const hayFilas = filas.length > 0;
  const filasEff = hayFilas ? filas : ghostFilas(EJ_FIGURACION);
  const edEff = editable && hayFilas;

  const grupoKey = colFecha ? colFecha.key : "escena";
  const grupos = Object.entries(
    filasEff.reduce<Record<string, Fila[]>>((acc, f) => {
      const g = val(f, grupoKey) || "—";
      (acc[g] ??= []).push(f);
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }));

  function cantidadTono(f: Fila): string {
    const e = val(f, colEstado?.key ?? "estado");
    if (/confirmad/i.test(e)) return "tono-ok";
    if (/convocad/i.test(e)) return "tono-info";
    if (/cancelad/i.test(e)) return "tono-bad";
    return "tono-warn";
  }

  function Tarjeta(f: Fila) {
    const cantKey = colCantidad?.key ?? "cantidad";
    const tipoKey = colTipo?.key ?? "tipo";
    return (
      <div key={f.id} className={`pfig-card ${!hayFilas ? "cp-ghost" : ""}`}>
        {!hayFilas && <span className="cp-ej-chip">{t("ejChip")}</span>}
        <div className="pfig-head">
          <div className={`pfig-count ${cantidadTono(f)}`}>
            {edEff
              ? <input className="pfig-count-input" type="number" defaultValue={val(f, cantKey)} placeholder="0" onBlur={(e) => set(f, cantKey, e.target.value)} />
              : <span className="pfig-count-num">{val(f, cantKey) || "—"}</span>}
            <span className="pfig-count-lbl">{colCantidad?.label ?? lbl(cantKey)}</span>
          </div>
          <div className="pfig-tipo-wrap">
            {edEff
              ? <input className="pfig-tipo-input" defaultValue={val(f, tipoKey)} placeholder={colTipo?.label ?? lbl(tipoKey)} onBlur={(e) => set(f, tipoKey, e.target.value)} />
              : <span className="pfig-tipo-label">{val(f, tipoKey) || "—"}</span>}
            <div className="pfig-meta">
              {colFecha && edEff && (
                <input className="pfig-fecha" type="date" defaultValue={val(f, colFecha.key)} onBlur={(e) => set(f, colFecha.key, e.target.value)} />
              )}
              {edEff
                ? <input className="pfig-esc" defaultValue={val(f, "escena")} placeholder={lbl("escena")} onBlur={(e) => set(f, "escena", e.target.value)} />
                : val(f, "escena") ? <span className="pfig-esc-badge">Esc. {val(f, "escena")}</span> : null}
              {colHora && (
                <label className="pfig-hora">
                  <span>{colHora.label}</span>
                  <input className="pfig-hora-input" defaultValue={val(f, colHora.key)} placeholder="06:30" readOnly={!edEff} onBlur={(e) => set(f, colHora.key, e.target.value)} />
                </label>
              )}
            </div>
          </div>
          {edEff && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        {largos.map((c) => (edEff || val(f, c.key)) ? (
          <label key={c.key} className="pfig-field">
            <span>{c.label}</span>
            <textarea className="pfig-field-ta" defaultValue={stripHtml(val(f, c.key))} placeholder={edEff ? "—" : ""} readOnly={!edEff} rows={2} onBlur={(e) => set(f, c.key, e.target.value)} />
          </label>
        ) : null)}
        {colEstado && (
          <div className="pfig-foot">
            <EstadoSeg valor={val(f, colEstado.key)} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, colEstado.key, v)} editable={edEff} color />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pfig-board">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_FIGURACION} onCrear={onCrear} />}
      {grupos.map(([grupo, fs]) => (
        <div key={grupo} className="pfig-grupo">
          <div className="pfig-ghdr">
            <span className="hex" />
            <span>{colFecha ? grupo : `Esc. ${grupo}`}</span>
            <span className="pfig-gcount">
              {fs.reduce((s, f) => s + (parseInt(val(f, colCantidad?.key ?? "cantidad")) || 0), 0)} fig.
            </span>
          </div>
          <div className="pfig-grid">{fs.map(Tarjeta)}</div>
        </div>
      ))}
      {hayFilas && editable && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ============================================================
// GUION — vistas a medida. Acento: var(--acc) (yellow).
// CSS: gesc-* (escaleta corcho) / ghist-* (timeline versiones) /
//      gdes-* (desglose) / gcom-* (comentarios). Todas "nunca en blanco".
// ============================================================

const gVal = (f: Fila, k: string) => f.datos?.[k] ?? "";
const gLbl = (columnas: Columna[], k: string) => columnas.find((c) => c.key === k)?.label ?? k;
const gChips = (s: string) => s.split(/[,;\/]/).map((x) => x.trim()).filter(Boolean);
const gNum = (s: string) => { const n = parseInt(s, 10); return isNaN(n) ? 9999 : n; };

// ---- Sinopsis y escaleta: fichas de corcho agrupadas por acto ----
const EJ_ESCALETA: Ejemplo[] = [
  { acto: "Acto I", num: "1", secuencia: "Amanecer en el faro", funcion: "Detonante", resumen: "Marea despierta antes del alba y descubre que la luz del faro lleva tres noches apagada. Algo no encaja." },
  { acto: "Acto I", num: "2", secuencia: "El pueblo que calla", funcion: "Presentación", resumen: "Baja al puerto. Nadie menciona al farero. Conocemos a Elsa, que sabe más de lo que dice." },
  { acto: "Acto I", num: "3", secuencia: "La carta sin remite", funcion: "Giro de acto I", resumen: "Bajo la puerta aparece una carta con la caligrafía del farero. Marea decide subir a la torre." },
  { acto: "Acto II", num: "4", secuencia: "Lo que guarda la linterna", funcion: "Punto medio", resumen: "Dentro del mecanismo, un cuaderno de bitácora con nombres tachados. El de Elsa entre ellos." },
  { acto: "Acto II", num: "5", secuencia: "Marea contra el pueblo", funcion: "Crisis", resumen: "Confronta a Elsa. La verdad parte en dos su idea de casa. La niebla cierra el único camino." },
];
const ACTO_ORDER = ["Acto I", "Acto II", "Acto III"];

function EscaletaCorkboard({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_ESCALETA);
  const actos = [...new Set(base.map((f) => gVal(f, "acto") || "—"))].sort((a, b) => {
    const ia = ACTO_ORDER.indexOf(a), ib = ACTO_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  return (
    <div className="gesc-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_ESCALETA} onCrear={onCrear} />}
      {actos.map((acto) => {
        const grupo = base.filter((f) => (gVal(f, "acto") || "—") === acto).sort((a, b) => gNum(gVal(a, "num")) - gNum(gVal(b, "num")));
        return (
          <div key={acto} className="gesc-acto">
            <div className="gesc-acto-hdr"><span>{acto === "—" ? t("noScene") : acto}</span><i /></div>
            <div className="gesc-grid">
              {grupo.map((f) => {
                const gh = esGhost(f); const ed = editable && !gh;
                return (
                  <div key={f.id} className={`gesc-card ${gh ? "cp-ghost" : ""}`}>
                    {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
                    <span className="gesc-pin" />
                    <div className="gesc-card-in">
                      <div className="gesc-top">
                        {ed
                          ? <input className="gesc-num" defaultValue={gVal(f, "num")} placeholder="1" onBlur={(e) => set(f, "num", e.target.value)} />
                          : <span className="gesc-num">{gVal(f, "num") || "•"}</span>}
                        {ed
                          ? <input className="gesc-fn" defaultValue={gVal(f, "funcion")} placeholder={gLbl(columnas, "funcion")} onBlur={(e) => set(f, "funcion", e.target.value)} />
                          : gVal(f, "funcion") ? <span className="gesc-fn">{gVal(f, "funcion")}</span> : null}
                        {ed && <button className="hp-del gesc-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                      </div>
                      {ed
                        ? <input className="gesc-seq" defaultValue={gVal(f, "secuencia")} placeholder={gLbl(columnas, "secuencia")} onBlur={(e) => set(f, "secuencia", e.target.value)} />
                        : <div className="gesc-seq">{gVal(f, "secuencia") || t("untitled")}</div>}
                      {ed
                        ? <textarea className="gesc-body" defaultValue={stripHtml(gVal(f, "resumen"))} placeholder={t("phEscaletaResumen")} rows={3} onBlur={(e) => set(f, "resumen", e.target.value)} />
                        : <div className="gesc-body">{stripHtml(gVal(f, "resumen"))}</div>}
                    </div>
                  </div>
                );
              })}
              {ed_actoAdd(acto, editable, hayFilas, onCrear, t)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
// Botón "＋ secuencia" al final de cada acto (solo con datos reales).
function ed_actoAdd(acto: string, editable: boolean, hayFilas: boolean, onCrear: (d?: Record<string, string>) => void, t: ReturnType<typeof useTranslations>) {
  if (!editable || !hayFilas) return null;
  return (
    <button className="gesc-card gesc-add" onClick={() => onCrear(acto === "—" ? {} : { acto })}>
      <span className="gesc-add-plus">+</span>
      <span className="gesc-add-lbl">{t("addSequence")}</span>
    </button>
  );
}

// ---- Historial de versiones: línea de tiempo vertical de drafts ----
const EJ_HISTORIAL: Ejemplo[] = [
  { version: "v3.0", fecha: "2026-06-20", autor: "Marta Ruiz", cambios: "Reescritura del tercer acto: nuevo clímax en la torre. Se elimina la subtrama del hermano.", estado: "Aprobado" },
  { version: "v2.1", fecha: "2026-05-08", autor: "Marta Ruiz", cambios: "Pulido de diálogos de Elsa. Ajuste de tono en secuencias 4 y 5 tras notas de dirección.", estado: "En revisión" },
  { version: "v1.0", fecha: "2026-03-15", autor: "Marta Ruiz", cambios: "Primer borrador completo a partir de la escaleta aprobada.", estado: "Borrador" },
];
function HistorialVersiones({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colEstado = columnas.find((c) => c.key === "estado");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_HISTORIAL);
  const sorted = [...base].sort((a, b) => (gVal(b, "fecha") || "").localeCompare(gVal(a, "fecha") || ""));

  return (
    <div className="ghist-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_HISTORIAL} onCrear={onCrear} />}
      <div className="ghist-line">
        {sorted.map((f, i) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`ghist-node ${gh ? "cp-ghost" : ""} ${i === 0 ? "ghist-latest" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="ghist-dot"><span /></div>
              <div className="ghist-card">
                <div className="ghist-head">
                  {ed
                    ? <input className="ghist-ver" defaultValue={gVal(f, "version")} placeholder="v1.0" onBlur={(e) => set(f, "version", e.target.value)} />
                    : <span className="ghist-ver">{gVal(f, "version") || "v—"}</span>}
                  {i === 0 && <span className="ghist-current">{t("versionCurrent")}</span>}
                  <div className="ghist-meta">
                    {ed
                      ? <input type="date" className="ghist-fecha" defaultValue={gVal(f, "fecha")} onBlur={(e) => set(f, "fecha", e.target.value)} />
                      : <span className="ghist-fecha">{gVal(f, "fecha")}</span>}
                    {ed
                      ? <input className="ghist-autor" defaultValue={gVal(f, "autor")} placeholder={gLbl(columnas, "autor")} onBlur={(e) => set(f, "autor", e.target.value)} />
                      : gVal(f, "autor") ? <span className="ghist-autor">{gVal(f, "autor")}</span> : null}
                  </div>
                  {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                </div>
                {ed
                  ? <textarea className="ghist-cambios" defaultValue={stripHtml(gVal(f, "cambios"))} placeholder={t("phHistorialCambios")} rows={2} onBlur={(e) => set(f, "cambios", e.target.value)} />
                  : <div className="ghist-cambios">{stripHtml(gVal(f, "cambios"))}</div>}
                {colEstado && (
                  <div className="ghist-foot">
                    <EstadoSeg valor={gVal(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={ed} color />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hayFilas && editable && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addVersion")}</button></div>}
    </div>
  );
}

// ---- Desglose de escenas ----
const EJ_DESGLOSE_G: Ejemplo[] = [
  { escena: "1", loc: "INT. Faro — Linterna / Noche", personajes: "Marea, Elsa", atrezzo: "Cuaderno de bitácora, farol de aceite, mecanismo de la linterna.", notas: "Luz práctica motivada por el farol. Ojo raccord del cuaderno abierto." },
  { escena: "2", loc: "EXT. Puerto / Amanecer", personajes: "Marea, Pescadores (figuración)", atrezzo: "Redes, cajas de pescado, bicicleta de Marea.", notas: "Se rueda a hora dorada. Marea llega en bici desde el faro." },
  { escena: "3", loc: "INT. Casa de Elsa — Cocina / Día", personajes: "Marea, Elsa", atrezzo: "Carta sin remite, servicio de té, fotos antiguas en la pared.", notas: "La carta debe quedar legible en primer plano." },
];
function DesgloseGuion({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_DESGLOSE_G);
  const sorted = [...base].sort((a, b) => gNum(gVal(a, "escena")) - gNum(gVal(b, "escena")));
  const largos = ["atrezzo", "notas"] as const;

  return (
    <div className="gdes-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_DESGLOSE_G} onCrear={onCrear} />}
      <div className="gdes-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          const pers = gChips(gVal(f, "personajes"));
          return (
            <div key={f.id} className={`gdes-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="gdes-head">
                {ed
                  ? <input className="gdes-esc" defaultValue={gVal(f, "escena")} placeholder="1" onBlur={(e) => set(f, "escena", e.target.value)} />
                  : <span className="gdes-esc">{gVal(f, "escena") || "•"}</span>}
                <div className="gdes-head-r">
                  {ed
                    ? <input className="gdes-loc" defaultValue={gVal(f, "loc")} placeholder={gLbl(columnas, "loc")} onBlur={(e) => set(f, "loc", e.target.value)} />
                    : <div className="gdes-loc">{gVal(f, "loc") || t("noScene")}</div>}
                </div>
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              {ed
                ? <input className="gdes-pers-in" defaultValue={gVal(f, "personajes")} placeholder={gLbl(columnas, "personajes") + " (coma)"} onBlur={(e) => set(f, "personajes", e.target.value)} />
                : pers.length > 0 ? <div className="gdes-pers">{pers.map((p, i) => <span key={i} className="gdes-chip">{p}</span>)}</div> : null}
              {largos.map((k) => (ed || gVal(f, k)) ? (
                <label key={k} className="gdes-field">
                  <span>{gLbl(columnas, k)}</span>
                  <textarea className="gdes-ta" defaultValue={stripHtml(gVal(f, k))} placeholder={k === "atrezzo" ? t("phDesgloseAtrezzo") : t("phDesgloseNotas")} readOnly={!ed} rows={2} onBlur={(e) => set(f, k, e.target.value)} />
                </label>
              ) : null)}
            </div>
          );
        })}
      </div>
      {hayFilas && editable && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addScene")}</button></div>}
    </div>
  );
}

// ---- Comentarios y sugerencias por escena: tablero por estado ----
const EJ_COMENTARIOS: Ejemplo[] = [
  { escena: "4", comentario: "El punto medio llega tarde. Adelantar el hallazgo del cuaderno para ganar tensión antes.", tipo: "Estructura", estado: "Abierto" },
  { escena: "2", comentario: "El diálogo de Elsa suena expositivo. Dejar que el subtexto haga el trabajo.", tipo: "Diálogo", estado: "Abierto" },
  { escena: "1", comentario: "Se aplicó el nuevo detonante: la luz apagada funciona mejor que el disparo original.", tipo: "Ritmo", estado: "Aplicado" },
  { escena: "3", comentario: "Se descartó el flashback: rompía el punto de vista de Marea.", tipo: "Personaje", estado: "Descartado" },
];
const GCOM_TIPO_CLS: Record<string, string> = { "Diálogo": "gcom-dialogo", "Estructura": "gcom-estructura", "Personaje": "gcom-personaje", "Ritmo": "gcom-ritmo" };
function ComentariosGuion({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colTipo = columnas.find((c) => c.key === "tipo");
  const colEstado = columnas.find((c) => c.key === "estado");
  const estados = colEstado?.opciones ?? ["Abierto", "Aplicado", "Descartado"];
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_COMENTARIOS);

  return (
    <div className="gcom-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_COMENTARIOS} onCrear={onCrear} />}
      <div className="gcom-cols">
        {estados.map((est) => {
          const grupo = base.filter((f) => (gVal(f, "estado") || estados[0]) === est);
          return (
            <div key={est} className="gcom-col">
              <div className="gcom-col-hdr"><span>{est}</span><span className="gcom-count">{grupo.length}</span></div>
              <div className="gcom-list">
                {grupo.map((f) => {
                  const gh = esGhost(f); const ed = editable && !gh;
                  const tipoCls = GCOM_TIPO_CLS[gVal(f, "tipo")] ?? "gcom-neutral";
                  return (
                    <div key={f.id} className={`gcom-card ${tipoCls} ${gh ? "cp-ghost" : ""}`}>
                      {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
                      <div className="gcom-top">
                        <span className="gcom-esc">{t("sceneShort")} {ed
                          ? <input className="gcom-esc-in" defaultValue={gVal(f, "escena")} placeholder="1" onBlur={(e) => set(f, "escena", e.target.value)} />
                          : (gVal(f, "escena") || "—")}</span>
                        {colTipo && <EstadoSeg valor={gVal(f, "tipo")} opciones={colTipo.opciones ?? []} onPick={(v) => set(f, "tipo", v)} editable={ed} chip />}
                        {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                      </div>
                      {ed
                        ? <textarea className="gcom-body" defaultValue={stripHtml(gVal(f, "comentario"))} placeholder={t("phComentario")} rows={3} onBlur={(e) => set(f, "comentario", e.target.value)} />
                        : <div className="gcom-body">{stripHtml(gVal(f, "comentario"))}</div>}
                      {colEstado && (
                        <div className="gcom-foot">
                          <EstadoSeg valor={gVal(f, "estado")} opciones={estados} onPick={(v) => set(f, "estado", v)} editable={ed} color />
                        </div>
                      )}
                    </div>
                  );
                })}
                {editable && hayFilas && (
                  <button className="gcom-add" onClick={() => onCrear({ estado: est })}><span>+</span> {t("addComment")}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CASTING — vistas a medida. Acento: var(--acc) (orange).
// CSS: cwall-* (muro de casting) / cbrk-* (breakdown de actores) /
//      cdispo-* (matriz disponibilidad) / ceval-* (evaluación). "Nunca en blanco".
// ============================================================

// ---- Muro de casting: headshots agrupados por personaje ----
const EJ_CANDIDATOS: Ejemplo[] = [
  { personaje: "Marea", candidato: "Lucía Fernández", agencia: "Talento Sur", fase: "Callback", notas: "Gran verdad en la mirada. Química con el Farero.", foto: "", reel: "" },
  { personaje: "Marea", candidato: "Nerea Gil", agencia: "Directo", fase: "1ª audición", notas: "Buena voz, algo joven para el rango del personaje.", foto: "", reel: "" },
  { personaje: "Farero", candidato: "Diego Molina", agencia: "Norte Actores", fase: "Prueba de cámara", notas: "Presencia física ideal. Confirmar disponibilidad.", foto: "", reel: "" },
  { personaje: "Elsa", candidato: "Ana Ruiz", agencia: "Directo", fase: "Propuesto", notas: "Self-tape prometedor, a ver en callback.", foto: "", reel: "" },
];
function CastingWall({ columnas, filas, editable, departamento, herramientaId, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean; departamento: string; herramientaId: string;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colFase = columnas.find((c) => c.key === "fase");
  const colFoto = columnas.find((c) => c.tipo === "archivo");
  const colReel = columnas.find((c) => c.tipo === "link");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_CANDIDATOS);
  const personajes = [...new Set(base.map((f) => gVal(f, "personaje") || "—"))];

  return (
    <div className="cwall-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_CANDIDATOS} onCrear={onCrear} />}
      {personajes.map((pers) => {
        const grupo = base.filter((f) => (gVal(f, "personaje") || "—") === pers);
        return (
          <div key={pers} className="cwall-pers">
            <div className="cwall-pers-hdr"><span>{pers === "—" ? t("noScene") : pers}</span><span className="cwall-count">{grupo.length}</span><i /></div>
            <div className="cwall-grid">
              {grupo.map((f) => {
                const gh = esGhost(f); const ed = editable && !gh;
                return (
                  <div key={f.id} className={`cwall-card ${gh ? "cp-ghost" : ""}`}>
                    {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
                    <div className="cwall-photo">
                      {colFoto && !gh ? (
                        <ArchivoCell path={gVal(f, colFoto.key)} editable={ed} departamento={departamento} herramientaId={herramientaId} filaId={f.id} colKey={colFoto.key} onSave={(v) => set(f, colFoto.key, v)} />
                      ) : <span className="cwall-photo-ph hex" />}
                    </div>
                    <div className="cwall-body">
                      {ed
                        ? <input className="cwall-name" defaultValue={gVal(f, "candidato")} placeholder={gLbl(columnas, "candidato")} onBlur={(e) => set(f, "candidato", e.target.value)} />
                        : <div className="cwall-name">{gVal(f, "candidato") || t("untitled")}</div>}
                      {ed
                        ? <input className="cwall-agencia" defaultValue={gVal(f, "agencia")} placeholder={gLbl(columnas, "agencia")} onBlur={(e) => set(f, "agencia", e.target.value)} />
                        : gVal(f, "agencia") ? <div className="cwall-agencia">{gVal(f, "agencia")}</div> : null}
                      {colFase && <EstadoSeg valor={gVal(f, "fase")} opciones={colFase.opciones ?? []} onPick={(v) => set(f, "fase", v)} editable={ed} color />}
                      {(ed || gVal(f, "notas")) ? (
                        <textarea className="cwall-notas" defaultValue={stripHtml(gVal(f, "notas"))} placeholder={t("phCastNotas")} readOnly={!ed} rows={2} onBlur={(e) => set(f, "notas", e.target.value)} />
                      ) : null}
                      {colReel && !gh && (
                        <div className="cwall-reel"><span className="cwall-reel-lbl">{colReel.label}</span><LinkCell valor={gVal(f, colReel.key)} editable={ed} onSave={(v) => set(f, colReel.key, v)} /></div>
                      )}
                      {ed && <button className="hp-del cwall-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                    </div>
                  </div>
                );
              })}
              {editable && hayFilas && (
                <button className="cwall-card cwall-add" onClick={() => onCrear(pers === "—" ? {} : { personaje: pers })}>
                  <span className="cwall-add-plus">+</span><span className="cwall-add-lbl">{t("addCandidate")}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Breakdown de actores: perfil buscado por personaje ----
const EJ_BREAKDOWN_ACT: Ejemplo[] = [
  { personaje: "Marea", genero: "M", edad_min: "22", edad_max: "30", tipo_fisico: "Complexión atlética, aspecto de quien vive junto al mar.", habilidades_especiales: "Nadar, remar. Se valora buceo.", disponibilidad_requerida: "Rodaje completo (8 semanas) + 2 de ensayos.", importancia: "Principal", estado_casting: "En proceso" },
  { personaje: "Farero", genero: "H", edad_min: "55", edad_max: "70", tipo_fisico: "Corpulento, manos grandes, rostro curtido.", habilidades_especiales: "Manejo de barca de remos.", disponibilidad_requerida: "4 semanas centrales del rodaje.", importancia: "Principal", estado_casting: "Cerrado" },
  { personaje: "Elsa", genero: "M", edad_min: "45", edad_max: "60", tipo_fisico: "Elegante, contenida.", habilidades_especiales: "Acento del norte.", disponibilidad_requerida: "6 jornadas repartidas.", importancia: "Secundario", estado_casting: "Abierto" },
];
function BreakdownActores({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colGenero = columnas.find((c) => c.key === "genero");
  const colImportancia = columnas.find((c) => c.key === "importancia");
  const colEstado = columnas.find((c) => c.key === "estado_casting");
  const largos = ["tipo_fisico", "habilidades_especiales", "disponibilidad_requerida"] as const;
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_BREAKDOWN_ACT);

  return (
    <div className="cbrk-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_BREAKDOWN_ACT} onCrear={onCrear} />}
      <div className="cbrk-grid">
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          const edadMin = gVal(f, "edad_min"), edadMax = gVal(f, "edad_max");
          return (
            <div key={f.id} className={`cbrk-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="cbrk-head">
                {ed
                  ? <input className="cbrk-pers" defaultValue={gVal(f, "personaje")} placeholder={gLbl(columnas, "personaje")} onBlur={(e) => set(f, "personaje", e.target.value)} />
                  : <span className="cbrk-pers">{gVal(f, "personaje") || t("untitled")}</span>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="cbrk-tags">
                {colGenero && <EstadoSeg valor={gVal(f, "genero")} opciones={colGenero.opciones ?? []} onPick={(v) => set(f, "genero", v)} editable={ed} chip />}
                {ed ? (
                  <span className="cbrk-edad">
                    <input className="cbrk-edad-in" type="number" defaultValue={edadMin} placeholder="edad" onBlur={(e) => set(f, "edad_min", e.target.value)} />–
                    <input className="cbrk-edad-in" type="number" defaultValue={edadMax} placeholder="edad" onBlur={(e) => set(f, "edad_max", e.target.value)} />
                  </span>
                ) : (edadMin || edadMax) ? <span className="cbrk-edad-badge">{edadMin || "?"}–{edadMax || "?"} {t("years")}</span> : null}
                {colImportancia && <EstadoSeg valor={gVal(f, "importancia")} opciones={colImportancia.opciones ?? []} onPick={(v) => set(f, "importancia", v)} editable={ed} chip color />}
              </div>
              {largos.map((k) => (ed || gVal(f, k)) ? (
                <label key={k} className="cbrk-field">
                  <span>{gLbl(columnas, k)}</span>
                  <textarea className="cbrk-ta" defaultValue={stripHtml(gVal(f, k))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, k, e.target.value)} />
                </label>
              ) : null)}
              {colEstado && <div className="cbrk-foot"><EstadoSeg valor={gVal(f, "estado_casting")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado_casting", v)} editable={ed} color /></div>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addCharacter")}</button></div>}
    </div>
  );
}

// ---- Matriz de disponibilidad: actor × semanas ----
const EJ_DISPO: Ejemplo[] = [
  { actor: "Lucía Fernández", personaje: "Marea", sem1: "Disponible", sem2: "Disponible", sem3: "Con restricción", sem4: "Disponible", restricciones: "Semana 3: teatro por las tardes.", contacto_representante: "María Soto — 600 123 456" },
  { actor: "Diego Molina", personaje: "Farero", sem1: "No disponible", sem2: "Disponible", sem3: "Disponible", sem4: "Disponible", restricciones: "Semana 1 rodando otra cosa.", contacto_representante: "Kepa Aguirre — 688 555 010" },
  { actor: "Ana Ruiz", personaje: "Elsa", sem1: "Disponible", sem2: "Disponible", sem3: "Disponible", sem4: "Con restricción", restricciones: "Semana 4: solo primeras horas.", contacto_representante: "Directo — 611 222 333" },
];
function DisponibilidadMatriz({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const semCols = columnas.filter((c) => /^sem\d+$/.test(c.key));
  const colRestr = columnas.find((c) => c.key === "restricciones");
  const colContacto = columnas.find((c) => c.key === "contacto_representante");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_DISPO);

  return (
    <div className="cdispo-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_DISPO} onCrear={onCrear} />}
      <div className={`cdispo-table ${!hayFilas ? "cp-ghost-grid" : ""}`}>
        <div className="cdispo-hrow">
          <div className="cdispo-hactor">{gLbl(columnas, "actor")}</div>
          {semCols.map((c) => <div key={c.key} className="cdispo-hsem">{c.label}</div>)}
        </div>
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`cdispo-row ${gh ? "cp-ghost" : ""}`}>
              <div className="cdispo-actor">
                {ed
                  ? <input className="cdispo-actor-in" defaultValue={gVal(f, "actor")} placeholder={gLbl(columnas, "actor")} onBlur={(e) => set(f, "actor", e.target.value)} />
                  : <span className="cdispo-actor-name">{gVal(f, "actor") || t("untitled")}</span>}
                {gVal(f, "personaje") && <span className="cdispo-pers">{gVal(f, "personaje")}</span>}
                {(ed || gVal(f, "restricciones") || gVal(f, "contacto_representante")) ? (
                  <div className="cdispo-extra">
                    {colRestr && (ed || gVal(f, "restricciones")) && (
                      <input className="cdispo-restr" defaultValue={gVal(f, "restricciones")} placeholder={colRestr.label} readOnly={!ed} onBlur={(e) => set(f, "restricciones", e.target.value)} />
                    )}
                    {colContacto && (ed || gVal(f, "contacto_representante")) && (
                      <input className="cdispo-contacto" defaultValue={gVal(f, "contacto_representante")} placeholder={colContacto.label} readOnly={!ed} onBlur={(e) => set(f, "contacto_representante", e.target.value)} />
                    )}
                  </div>
                ) : null}
              </div>
              {semCols.map((c) => (
                <div key={c.key} className={`cdispo-cell tono-${estadoTono(gVal(f, c.key))}`}>
                  <EstadoSeg valor={gVal(f, c.key)} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={ed} chip color />
                </div>
              ))}
              {ed && <button className="hp-del cdispo-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addActor")}</button></div>}
    </div>
  );
}

// ---- Evaluación de candidatos (comparativa / resultados / sesiones) ----
const CAST_EVAL_IDS = new Set(["cast-comparativa", "cast-resultados", "cast-sesiones-prueba"]);
const EJ_EVAL: Record<string, Ejemplo[]> = {
  "cast-comparativa": [
    { personaje: "Marea", candidato: "Lucía Fernández", fortaleza: "Verdad emocional, gran escucha.", debilidad: "Poca experiencia en cámara.", opinion_dir: "Mi favorita. Transmite la fragilidad justa.", estado: "Favorito", selfTape: "" },
    { personaje: "Marea", candidato: "Nerea Gil", fortaleza: "Muy técnica, versátil.", debilidad: "Le falta la crudeza del personaje.", opinion_dir: "Buena, pero más luminosa de lo que buscamos.", estado: "Reserva", selfTape: "" },
  ],
  "cast-resultados": [
    { candidato: "Lucía Fernández", personaje: "Marea", fecha: "2026-07-10", valoracion: "Callback muy sólido. Química inmediata con el Farero.", decision: "Avanza" },
    { candidato: "Diego Molina", personaje: "Farero", fecha: "2026-07-10", valoracion: "Prueba de cámara excelente. Físico y voz ideales.", decision: "Elegido" },
  ],
  "cast-sesiones-prueba": [
    { actor: "Lucía Fernández", fecha_sesion: "2026-07-10", tipo: "Presencial", escenas_leidas: "Esc. 1 (faro), Esc. 14 (confrontación).", resultado: "Avanza", notas_director: "Muy presente, decisiones valientes.", notas_casting: "Puntual, preparada, buena actitud." },
    { actor: "Ana Ruiz", fecha_sesion: "2026-07-11", tipo: "Video-llamada", escenas_leidas: "Esc. 3 (cocina).", resultado: "En lista corta", notas_director: "Interesante, verla en persona.", notas_casting: "Conexión algo justa por vídeo." },
  ],
};
function EvaluacionCasting({ columnas, filas, editable, departamento, herramientaId, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean; departamento: string; herramientaId: string;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colPersonaje = columnas.find((c) => c.key === "personaje");
  const colActor = columnas.find((c) => c.key === "candidato" || c.key === "actor");
  const groupCol = colPersonaje ?? colActor;
  const tituloCol = colActor ?? colPersonaje;
  const colFecha = columnas.find((c) => c.tipo === "fecha");
  const colArchivo = columnas.find((c) => c.tipo === "archivo");
  const decisionKeys = ["decision", "resultado", "estado"];
  const colDecision = columnas.find((c) => c.tipo === "estado" && decisionKeys.includes(c.key));
  const chipEstados = columnas.filter((c) => c.tipo === "estado" && c.key !== colDecision?.key);
  const largos = columnas.filter((c) => c.tipo === "largo");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_EVAL[herramientaId] ?? []);
  const grupos = [...new Set(base.map((f) => (groupCol ? gVal(f, groupCol.key) : "") || "—"))];

  function Card(f: Fila) {
    const gh = esGhost(f); const ed = editable && !gh;
    return (
      <div key={f.id} className={`ceval-card ${gh ? "cp-ghost" : ""}`}>
        {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
        <div className="ceval-head">
          {tituloCol && (ed
            ? <input className="ceval-name" defaultValue={gVal(f, tituloCol.key)} placeholder={tituloCol.label} onBlur={(e) => set(f, tituloCol.key, e.target.value)} />
            : <span className="ceval-name">{gVal(f, tituloCol.key) || t("untitled")}</span>)}
          {colFecha && (ed
            ? <input className="ceval-fecha" type="date" defaultValue={gVal(f, colFecha.key)} onBlur={(e) => set(f, colFecha.key, e.target.value)} />
            : gVal(f, colFecha.key) ? <span className="ceval-fecha">{gVal(f, colFecha.key)}</span> : null)}
          {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
        </div>
        {chipEstados.length > 0 && (
          <div className="ceval-chips">
            {chipEstados.map((c) => <EstadoSeg key={c.key} valor={gVal(f, c.key)} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={ed} chip />)}
          </div>
        )}
        {largos.map((c) => (ed || gVal(f, c.key)) ? (
          <label key={c.key} className="ceval-field">
            <span>{c.label}</span>
            <textarea className="ceval-ta" defaultValue={stripHtml(gVal(f, c.key))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, c.key, e.target.value)} />
          </label>
        ) : null)}
        {colArchivo && !gh && (
          <div className="ceval-file"><span className="ceval-file-lbl">{colArchivo.label}</span>
            <ArchivoCell path={gVal(f, colArchivo.key)} editable={ed} departamento={departamento} herramientaId={herramientaId} filaId={f.id} colKey={colArchivo.key} onSave={(v) => set(f, colArchivo.key, v)} />
          </div>
        )}
        {colDecision && <div className="ceval-foot"><EstadoSeg valor={gVal(f, colDecision.key)} opciones={colDecision.opciones ?? []} onPick={(v) => set(f, colDecision.key, v)} editable={ed} color /></div>}
      </div>
    );
  }

  return (
    <div className="ceval-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_EVAL[herramientaId] ?? []} onCrear={onCrear} />}
      {groupCol ? grupos.map((g) => {
        const fs = base.filter((f) => (gVal(f, groupCol.key) || "—") === g);
        return (
          <div key={g} className="ceval-grupo">
            <div className="ceval-ghdr"><span className="hex" /><span>{g === "—" ? t("noScene") : g}</span><span className="ceval-gcount">{fs.length}</span></div>
            <div className="ceval-grid">{fs.map(Card)}</div>
          </div>
        );
      }) : <div className="ceval-grid">{base.map(Card)}</div>}
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ============================================================
// REPARTO — vistas a medida. Acento: var(--acc) (white).
// CSS: rasc-* (worksheet del actor) / rvm-* (vestuario/maq) / rpron-* (pronunciación).
// El punto de vista es el del ACTOR preparando su papel. "Nunca en blanco".
// ============================================================

// ---- Worksheet del actor por escena: análisis de interpretación ----
const EJ_ACTOR_SCENES: Ejemplo[] = [
  { escena: "1", paginas_guion: "1-2", objetivo_escena: "Entender por qué la luz del faro está apagada.", emociones_personaje: "Inquietud contenida, presentimiento.", relacion_con: "Con el recuerdo del padre ausente.", obstaculos: "El pueblo evita el tema; nadie le da respuestas.", beats_clave: "Descubrir la luz apagada → decidir investigar.", notas_del_director: "Menos gesto, más mirada. Que el miedo se intuya." },
  { escena: "14", paginas_guion: "22-24", objetivo_escena: "Sacarle la verdad a Elsa aunque duela.", emociones_personaje: "Rabia que tapa el miedo a perder su hogar.", relacion_con: "Elsa — figura casi materna que la traiciona.", obstaculos: "Elsa se cierra; la niebla la aísla.", beats_clave: "Pregunta directa → silencio → estallido → quiebre.", notas_del_director: "El estallido es un instante; enseguida vuelve el niño asustado." },
];
function ActorScenes({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const otrosLargos = ["emociones_personaje", "relacion_con", "obstaculos", "beats_clave"] as const;
  const colDir = columnas.find((c) => c.key === "notas_del_director");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_ACTOR_SCENES);
  const sorted = [...base].sort((a, b) => gNum(gVal(a, "escena")) - gNum(gVal(b, "escena")));

  return (
    <div className="rasc-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_ACTOR_SCENES} onCrear={onCrear} />}
      <div className="rasc-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`rasc-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="rasc-head">
                {ed
                  ? <input className="rasc-esc" defaultValue={gVal(f, "escena")} placeholder="1" onBlur={(e) => set(f, "escena", e.target.value)} />
                  : <span className="rasc-esc">{gVal(f, "escena") || "•"}</span>}
                <label className="rasc-pags">
                  <span>{gLbl(columnas, "paginas_guion")}</span>
                  <input className="rasc-pags-in" defaultValue={gVal(f, "paginas_guion")} placeholder="1-2" readOnly={!ed} onBlur={(e) => set(f, "paginas_guion", e.target.value)} />
                </label>
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="rasc-obj">
                <span className="rasc-obj-lbl">{gLbl(columnas, "objetivo_escena")}</span>
                <textarea className="rasc-obj-ta" defaultValue={stripHtml(gVal(f, "objetivo_escena"))} placeholder={t("phActorObjetivo")} readOnly={!ed} rows={2} onBlur={(e) => set(f, "objetivo_escena", e.target.value)} />
              </div>
              <div className="rasc-fields">
                {otrosLargos.map((k) => (ed || gVal(f, k)) ? (
                  <label key={k} className="rasc-field">
                    <span>{gLbl(columnas, k)}</span>
                    <textarea className="rasc-ta" defaultValue={stripHtml(gVal(f, k))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, k, e.target.value)} />
                  </label>
                ) : null)}
              </div>
              {colDir && (ed || gVal(f, "notas_del_director")) ? (
                <div className="rasc-dir">
                  <span className="rasc-dir-lbl">{colDir.label}</span>
                  <textarea className="rasc-dir-ta" defaultValue={stripHtml(gVal(f, "notas_del_director"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "notas_del_director", e.target.value)} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addScene")}</button></div>}
    </div>
  );
}

// ---- Vestuario y maquillaje asignado por escena ----
const EJ_VESTMAQ: Ejemplo[] = [
  { escena: "1", vestuario: "Jersey de lana gastado, pantalón impermeable, botas de agua.", maquillaje: "Piel lavada, ojeras marcadas, pelo húmedo por la niebla.", notas: "Continuidad: el jersey debe verse igual de sucio que en la esc. 3." },
  { escena: "20", vestuario: "Abrigo negro de luto, guantes.", maquillaje: "Maquillaje neutro, ojos ligeramente enrojecidos.", notas: "El guante izquierdo se quita al leer la carta — ojo raccord." },
];
function VestMaqReparto({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_VESTMAQ);
  const sorted = [...base].sort((a, b) => gNum(gVal(a, "escena")) - gNum(gVal(b, "escena")));

  return (
    <div className="rvm-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_VESTMAQ} onCrear={onCrear} />}
      <div className="rvm-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`rvm-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="rvm-head">
                {ed
                  ? <input className="rvm-esc" defaultValue={gVal(f, "escena")} placeholder="1" onBlur={(e) => set(f, "escena", e.target.value)} />
                  : <span className="rvm-esc">{gVal(f, "escena") || "•"}</span>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="rvm-cols">
                <label className="rvm-col">
                  <span>{gLbl(columnas, "vestuario")}</span>
                  <textarea className="rvm-ta" defaultValue={stripHtml(gVal(f, "vestuario"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={3} onBlur={(e) => set(f, "vestuario", e.target.value)} />
                </label>
                <label className="rvm-col">
                  <span>{gLbl(columnas, "maquillaje")}</span>
                  <textarea className="rvm-ta" defaultValue={stripHtml(gVal(f, "maquillaje"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={3} onBlur={(e) => set(f, "maquillaje", e.target.value)} />
                </label>
              </div>
              {(ed || gVal(f, "notas")) ? (
                <label className="rvm-notas">
                  <span>{gLbl(columnas, "notas")}</span>
                  <textarea className="rvm-notas-ta" defaultValue={stripHtml(gVal(f, "notas"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "notas", e.target.value)} />
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addScene")}</button></div>}
    </div>
  );
}

// ---- Guía de pronunciación (dialect coach) ----
const EJ_PRONUNCIACION: Ejemplo[] = [
  { palabra_frase: "Aberri", pronunciacion_fonotica: "/aˈβe.ri/", idioma: "Acento especial", grabacion: "", aprobado: "Aprobado" },
  { palabra_frase: "The lighthouse keeper", pronunciacion_fonotica: "/ðə ˈlaɪt.haʊs ˌkiː.pər/", idioma: "Inglés", grabacion: "", aprobado: "Pendiente" },
];
function GuiaPronunciacion({ columnas, filas, editable, departamento, herramientaId, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean; departamento: string; herramientaId: string;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colIdioma = columnas.find((c) => c.key === "idioma");
  const colAprobado = columnas.find((c) => c.key === "aprobado");
  const colAudio = columnas.find((c) => c.tipo === "archivo");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_PRONUNCIACION);

  return (
    <div className="rpron-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_PRONUNCIACION} onCrear={onCrear} />}
      <div className="rpron-grid">
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`rpron-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="rpron-top">
                {ed
                  ? <input className="rpron-palabra" defaultValue={gVal(f, "palabra_frase")} placeholder={gLbl(columnas, "palabra_frase")} onBlur={(e) => set(f, "palabra_frase", e.target.value)} />
                  : <div className="rpron-palabra">{gVal(f, "palabra_frase") || t("untitled")}</div>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              {ed
                ? <input className="rpron-fon" defaultValue={gVal(f, "pronunciacion_fonotica")} placeholder="/…/" onBlur={(e) => set(f, "pronunciacion_fonotica", e.target.value)} />
                : gVal(f, "pronunciacion_fonotica") ? <div className="rpron-fon">{gVal(f, "pronunciacion_fonotica")}</div> : null}
              <div className="rpron-meta">
                {colIdioma && <EstadoSeg valor={gVal(f, "idioma")} opciones={colIdioma.opciones ?? []} onPick={(v) => set(f, "idioma", v)} editable={ed} chip />}
              </div>
              {colAudio && !gh && (
                <div className="rpron-audio"><span className="rpron-audio-lbl">{colAudio.label}</span>
                  <ArchivoCell path={gVal(f, colAudio.key)} editable={ed} departamento={departamento} herramientaId={herramientaId} filaId={f.id} colKey={colAudio.key} onSave={(v) => set(f, colAudio.key, v)} />
                </div>
              )}
              {colAprobado && <div className="rpron-foot"><EstadoSeg valor={gVal(f, "aprobado")} opciones={colAprobado.opciones ?? []} onPick={(v) => set(f, "aprobado", v)} editable={ed} color /></div>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ============================================================
// SONIDO — vistas a medida. Acento: var(--acc) (gold).
// CSS: smic-* (mapa de micros) / sdir-* (plan de directo) /
//      sbat-* (control de baterías) / splay-* (playlist temp). "Nunca en blanco".
// ============================================================

// ---- Mapa/lista de micrófonos por escena ----
const SON_MIC_IDS = new Set(["son-lista-micros", "son-mapa-micros-escena"]);
const EJ_MICROS: Ejemplo[] = [
  { escena: "1", personaje: "Marea", micro: "Lavalier", tipo_micro: "Inalámbrico", frecuencia: "606.250 MHz", canal_grabacion: "1", nivel_grabacion: "-12", notas: "Oculto bajo el jersey de lana." },
  { escena: "1", personaje: "Farero", micro: "Pértiga", tipo_micro: "Boom", frecuencia: "—", canal_grabacion: "2", nivel_grabacion: "-10", notas: "Cenital, cuidado sombra." },
  { escena: "8", personaje: "Marea", micro: "Lavalier", tipo_micro: "Inalámbrico", frecuencia: "606.250 MHz", canal_grabacion: "1", nivel_grabacion: "-14", notas: "Viento: peluche en la cápsula." },
];
function MicMapa({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colMicro = columnas.find((c) => c.key === "micro" || c.key === "tipo_micro");
  const colFreq = columnas.find((c) => c.key === "frecuencia");
  const colCanal = columnas.find((c) => c.key === "canal_grabacion");
  const colNivel = columnas.find((c) => c.key === "nivel_grabacion");
  const colNotas = columnas.find((c) => c.tipo === "largo");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_MICROS);
  const escenas = [...new Set(base.map((f) => gVal(f, "escena") || "—"))].sort((a, b) => gNum(a) - gNum(b));

  return (
    <div className="smic-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_MICROS} onCrear={onCrear} />}
      {escenas.map((esc) => {
        const grupo = base.filter((f) => (gVal(f, "escena") || "—") === esc);
        return (
          <div key={esc} className="smic-grupo">
            <div className="smic-ghdr"><span className="smic-esc">{t("sceneShort")} {esc}</span><i /><span className="smic-count">{grupo.length}</span></div>
            <div className="smic-rows">
              {grupo.map((f) => {
                const gh = esGhost(f); const ed = editable && !gh;
                return (
                  <div key={f.id} className={`smic-row ${gh ? "cp-ghost" : ""}`}>
                    {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
                    <div className="smic-pers">
                      {ed
                        ? <input className="smic-pers-in" defaultValue={gVal(f, "personaje")} placeholder={gLbl(columnas, "personaje")} onBlur={(e) => set(f, "personaje", e.target.value)} />
                        : <span className="smic-pers-name">{gVal(f, "personaje") || "—"}</span>}
                    </div>
                    {colMicro && <div className="smic-mic"><EstadoSeg valor={gVal(f, colMicro.key)} opciones={colMicro.opciones ?? []} onPick={(v) => set(f, colMicro.key, v)} editable={ed} chip color /></div>}
                    {colFreq && <label className="smic-chip"><span>{colFreq.label}</span><input className="smic-mono" defaultValue={gVal(f, "frecuencia")} placeholder="MHz" readOnly={!ed} onBlur={(e) => set(f, "frecuencia", e.target.value)} /></label>}
                    {colCanal && <label className="smic-chip smic-chip-sm"><span>CH</span><input className="smic-mono" type="number" defaultValue={gVal(f, "canal_grabacion")} readOnly={!ed} onBlur={(e) => set(f, "canal_grabacion", e.target.value)} /></label>}
                    {colNivel && <label className="smic-chip smic-chip-sm"><span>dB</span><input className="smic-mono" type="number" defaultValue={gVal(f, "nivel_grabacion")} readOnly={!ed} onBlur={(e) => set(f, "nivel_grabacion", e.target.value)} /></label>}
                    {colNotas && (ed || gVal(f, colNotas.key)) ? <input className="smic-notas" defaultValue={gVal(f, colNotas.key)} placeholder={colNotas.label} readOnly={!ed} onBlur={(e) => set(f, colNotas.key, e.target.value)} /> : null}
                    {ed && <button className="hp-del smic-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                  </div>
                );
              })}
              {editable && hayFilas && <button className="smic-add" onClick={() => onCrear(esc === "—" ? {} : { escena: esc })}><span>+</span> {gLbl(columnas, "personaje")}</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Plan de sonido directo por escena ----
const EJ_PLANDIR: Ejemplo[] = [
  { escena: "1", estrategia: "Boom cenital + lavaliers ocultos. Priorizar diálogo íntimo sobre ambiente.", retos: "Viento del mar y olas constantes. Faro con eco interior.", wildtrack: "Olas, viento, mecanismo del faro" },
  { escena: "8", estrategia: "Lavaliers por el ruido del puerto; boom de apoyo.", retos: "Barcos, gaviotas, gente al fondo.", wildtrack: "Ambiente de puerto, gaviotas" },
];
function PlanDirecto({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_PLANDIR);
  const sorted = [...base].sort((a, b) => gNum(gVal(a, "escena")) - gNum(gVal(b, "escena")));

  return (
    <div className="sdir-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_PLANDIR} onCrear={onCrear} />}
      <div className="sdir-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`sdir-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="sdir-head">
                {ed
                  ? <input className="sdir-esc" defaultValue={gVal(f, "escena")} placeholder="1" onBlur={(e) => set(f, "escena", e.target.value)} />
                  : <span className="sdir-esc">{gVal(f, "escena") || "•"}</span>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="sdir-estrat">
                <span className="sdir-lbl">{gLbl(columnas, "estrategia")}</span>
                <textarea className="sdir-estrat-ta" defaultValue={stripHtml(gVal(f, "estrategia"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "estrategia", e.target.value)} />
              </div>
              {(ed || gVal(f, "retos")) ? (
                <label className="sdir-field">
                  <span>{gLbl(columnas, "retos")}</span>
                  <textarea className="sdir-ta" defaultValue={stripHtml(gVal(f, "retos"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "retos", e.target.value)} />
                </label>
              ) : null}
              {(ed || gVal(f, "wildtrack")) ? (
                <div className="sdir-wild"><span className="sdir-wild-lbl">{gLbl(columnas, "wildtrack")}</span>
                  <input className="sdir-wild-in" defaultValue={gVal(f, "wildtrack")} placeholder={ed ? "—" : ""} readOnly={!ed} onBlur={(e) => set(f, "wildtrack", e.target.value)} /></div>
              ) : null}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addScene")}</button></div>}
    </div>
  );
}

// ---- Control de baterías por jornada (inicio → mediodía → fin) ----
const EJ_BATERIAS: Ejemplo[] = [
  { dispositivo: "TX Marea (lavalier)", tipo_pila: "AA litio", inicio: "100%", medio_dia: "50%", fin: "25%", notas: "Reemplazar en cada corte de comida." },
  { dispositivo: "TX Farero (lavalier)", tipo_pila: "AA litio", inicio: "100%", medio_dia: "75%", fin: "50%", notas: "" },
  { dispositivo: "Grabador 833", tipo_pila: "L-mount", inicio: "100%", medio_dia: "Reemplazada", fin: "75%", notas: "Batería de repuesto lista." },
];
function bateriaTono(v: string): string {
  if (/reemplazada|100|75/i.test(v)) return "tono-ok";
  if (/50/i.test(v)) return "tono-warn";
  if (/25/i.test(v)) return "tono-bad";
  return "tono-neutral";
}
function BateriasControl({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const momentos = ["inicio", "medio_dia", "fin"].map((k) => columnas.find((c) => c.key === k)).filter(Boolean) as Columna[];
  const colNotas = columnas.find((c) => c.tipo === "largo");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_BATERIAS);

  return (
    <div className="sbat-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_BATERIAS} onCrear={onCrear} />}
      <div className={`sbat-grid ${!hayFilas ? "cp-ghost-grid" : ""}`}>
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`sbat-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="sbat-head">
                {ed
                  ? <input className="sbat-disp" defaultValue={gVal(f, "dispositivo")} placeholder={gLbl(columnas, "dispositivo")} onBlur={(e) => set(f, "dispositivo", e.target.value)} />
                  : <span className="sbat-disp">{gVal(f, "dispositivo") || "—"}</span>}
                {ed
                  ? <input className="sbat-pila" defaultValue={gVal(f, "tipo_pila")} placeholder={gLbl(columnas, "tipo_pila")} onBlur={(e) => set(f, "tipo_pila", e.target.value)} />
                  : gVal(f, "tipo_pila") ? <span className="sbat-pila">{gVal(f, "tipo_pila")}</span> : null}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="sbat-timeline">
                {momentos.map((c, i) => (
                  <div key={c.key} className={`sbat-mom ${bateriaTono(gVal(f, c.key))}`}>
                    <span className="sbat-mom-lbl">{c.label}</span>
                    <EstadoSeg valor={gVal(f, c.key)} opciones={c.opciones ?? []} onPick={(v) => set(f, c.key, v)} editable={ed} chip />
                    {i < momentos.length - 1 && <span className="sbat-arrow">→</span>}
                  </div>
                ))}
              </div>
              {colNotas && (ed || gVal(f, colNotas.key)) ? (
                <input className="sbat-notas" defaultValue={gVal(f, colNotas.key)} placeholder={colNotas.label} readOnly={!ed} onBlur={(e) => set(f, colNotas.key, e.target.value)} />
              ) : null}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addDevice")}</button></div>}
    </div>
  );
}

// ---- Playlist de música temporal ----
const EJ_PLAYLIST: Ejemplo[] = [
  { escena: "1", cancion: "The Sea, The Sea", artista: "Ólafur Arnalds", sello_discografico: "Mercury KX", duracion: "3:42", uso: "Score temp", derechos_disponibles: "Por gestionar", link: "" },
  { escena: "20", cancion: "Re: Stacks", artista: "Bon Iver", sello_discografico: "Jagjaguwar", duracion: "6:40", uso: "Ambiente", derechos_disponibles: "No", link: "" },
];
function PlaylistMusica({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colUso = columnas.find((c) => c.key === "uso");
  const colDerechos = columnas.find((c) => c.key === "derechos_disponibles");
  const colLink = columnas.find((c) => c.tipo === "link");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_PLAYLIST);

  return (
    <div className="splay-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_PLAYLIST} onCrear={onCrear} />}
      <div className="splay-grid">
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`splay-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="splay-top">
                <span className="splay-play">▶</span>
                <div className="splay-title">
                  {ed
                    ? <input className="splay-cancion" defaultValue={gVal(f, "cancion")} placeholder={gLbl(columnas, "cancion")} onBlur={(e) => set(f, "cancion", e.target.value)} />
                    : <div className="splay-cancion">{gVal(f, "cancion") || t("untitled")}</div>}
                  {ed
                    ? <input className="splay-artista" defaultValue={gVal(f, "artista")} placeholder={gLbl(columnas, "artista")} onBlur={(e) => set(f, "artista", e.target.value)} />
                    : <div className="splay-artista">{gVal(f, "artista")}</div>}
                </div>
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="splay-meta">
                {(ed || gVal(f, "sello_discografico")) ? <input className="splay-sello" defaultValue={gVal(f, "sello_discografico")} placeholder={gLbl(columnas, "sello_discografico")} readOnly={!ed} onBlur={(e) => set(f, "sello_discografico", e.target.value)} /> : null}
                {(ed || gVal(f, "duracion")) ? <input className="splay-dur" defaultValue={gVal(f, "duracion")} placeholder="0:00" readOnly={!ed} onBlur={(e) => set(f, "duracion", e.target.value)} /> : null}
                {gVal(f, "escena") && !ed ? <span className="splay-esc">{t("sceneShort")} {gVal(f, "escena")}</span> : null}
              </div>
              <div className="splay-chips">
                {colUso && <EstadoSeg valor={gVal(f, "uso")} opciones={colUso.opciones ?? []} onPick={(v) => set(f, "uso", v)} editable={ed} chip />}
                {colDerechos && <EstadoSeg valor={gVal(f, "derechos_disponibles")} opciones={colDerechos.opciones ?? []} onPick={(v) => set(f, "derechos_disponibles", v)} editable={ed} chip color />}
              </div>
              {colLink && !gh && <div className="splay-link"><LinkCell valor={gVal(f, colLink.key)} editable={ed} onSave={(v) => set(f, colLink.key, v)} /></div>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addTrack")}</button></div>}
    </div>
  );
}

// ============================================================
// POSTPRODUCCIÓN — vistas a medida. Acento: var(--acc) (rose).
// CSS: pcut-* (versiones de corte) / pcol-* (guía de color). "Nunca en blanco".
// ============================================================

// ---- Versiones de corte (EDL) con doble aprobación ----
const EJ_VERSIONES: Ejemplo[] = [
  { version: "Picture Lock v1", fecha: "2026-09-10", duracion: "1:38:20", duracion_exacta: "01:38:20:04", timecode_in: "01:00:00:00", timecode_out: "02:38:20:04", cambios: "Cerrado el tercer acto. Eliminada la subtrama del hermano.", link_visionado: "", aprobado_dir: "Aprobado", aprobado_prod: "Aprobado", notas_dir: "Por fin respira el clímax.", notas_prod: "Dentro de metraje objetivo.", estado: "Picture lock" },
  { version: "Fine cut v3", fecha: "2026-08-28", duracion: "1:42:10", duracion_exacta: "01:42:10:12", timecode_in: "01:00:00:00", timecode_out: "02:42:10:12", cambios: "Ajustado ritmo del segundo acto, -2 min.", link_visionado: "", aprobado_dir: "Cambios", aprobado_prod: "Aprobado", notas_dir: "Reducir aún la escena 14.", notas_prod: "OK.", estado: "Fine cut" },
  { version: "Rough cut v1", fecha: "2026-08-05", duracion: "1:51:00", duracion_exacta: "01:51:00:00", timecode_in: "01:00:00:00", timecode_out: "02:51:00:00", cambios: "Primer ensamblado completo.", link_visionado: "", aprobado_dir: "Pendiente", aprobado_prod: "Pendiente", notas_dir: "", notas_prod: "", estado: "Rough cut" },
];
function VersionesCorte({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colEstado = columnas.find((c) => c.key === "estado");
  const colAprDir = columnas.find((c) => c.key === "aprobado_dir");
  const colAprProd = columnas.find((c) => c.key === "aprobado_prod");
  const colLink = columnas.find((c) => c.tipo === "link");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_VERSIONES);
  const sorted = [...base].sort((a, b) => (gVal(b, "fecha") || "").localeCompare(gVal(a, "fecha") || ""));

  function stageCls(f: Fila) {
    const e = gVal(f, "estado").toLowerCase();
    if (/picture lock/.test(e)) return "pcut-lock";
    if (/fine/.test(e)) return "pcut-fine";
    return "pcut-rough";
  }

  return (
    <div className="pcut-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_VERSIONES} onCrear={onCrear} />}
      <div className="pcut-line">
        {sorted.map((f, i) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`pcut-node ${gh ? "cp-ghost" : ""} ${i === 0 ? "pcut-latest" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="pcut-dot"><span /></div>
              <div className={`pcut-card ${stageCls(f)}`}>
                <div className="pcut-head">
                  {ed
                    ? <input className="pcut-ver" defaultValue={gVal(f, "version")} placeholder={gLbl(columnas, "version")} onBlur={(e) => set(f, "version", e.target.value)} />
                    : <span className="pcut-ver">{gVal(f, "version") || "—"}</span>}
                  {colEstado && <div className="pcut-stage"><EstadoSeg valor={gVal(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={ed} chip color /></div>}
                  {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                </div>
                <div className="pcut-meta">
                  {ed
                    ? <input type="date" className="pcut-fecha" defaultValue={gVal(f, "fecha")} onBlur={(e) => set(f, "fecha", e.target.value)} />
                    : gVal(f, "fecha") ? <span className="pcut-fecha">{gVal(f, "fecha")}</span> : null}
                  {(ed || gVal(f, "duracion")) ? <label className="pcut-dur"><span>{gLbl(columnas, "duracion")}</span><input defaultValue={gVal(f, "duracion")} placeholder="0:00:00" readOnly={!ed} onBlur={(e) => set(f, "duracion", e.target.value)} /></label> : null}
                  {(ed || gVal(f, "duracion_exacta")) ? <label className="pcut-tc"><span>TC</span><input defaultValue={gVal(f, "duracion_exacta")} placeholder="00:00:00:00" readOnly={!ed} onBlur={(e) => set(f, "duracion_exacta", e.target.value)} /></label> : null}
                </div>
                {(ed || gVal(f, "cambios")) ? (
                  <div className="pcut-cambios">
                    <span className="pcut-lbl">{gLbl(columnas, "cambios")}</span>
                    <textarea defaultValue={stripHtml(gVal(f, "cambios"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "cambios", e.target.value)} />
                  </div>
                ) : null}
                <div className="pcut-aprobaciones">
                  {colAprDir && <div className="pcut-apr"><span className="pcut-apr-lbl">{colAprDir.label}</span><EstadoSeg valor={gVal(f, "aprobado_dir")} opciones={colAprDir.opciones ?? []} onPick={(v) => set(f, "aprobado_dir", v)} editable={ed} chip color /></div>}
                  {colAprProd && <div className="pcut-apr"><span className="pcut-apr-lbl">{colAprProd.label}</span><EstadoSeg valor={gVal(f, "aprobado_prod")} opciones={colAprProd.opciones ?? []} onPick={(v) => set(f, "aprobado_prod", v)} editable={ed} chip color /></div>}
                </div>
                {colLink && !gh && <div className="pcut-link"><span className="pcut-apr-lbl">{colLink.label}</span><LinkCell valor={gVal(f, colLink.key)} editable={ed} onSave={(v) => set(f, colLink.key, v)} /></div>}
              </div>
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addVersion")}</button></div>}
    </div>
  );
}

// ---- Guía de color / LUT por escena ----
const EJ_GUIACOLOR: Ejemplo[] = [
  { escena: "1", look: "Frío y azulado, luz de amanecer entre niebla. Sombras densas.", lut: "LUT_Marea_Amanecer_v2", estado: "Etalonado" },
  { escena: "8", look: "Desaturado, grises del puerto. Contraste alto en las caras.", lut: "LUT_Puerto_v1", estado: "Por etalonar" },
  { escena: "20", look: "Cálido interior, contraste de la lámpara contra la lluvia fría en ventana.", lut: "LUT_Casa_Elsa", estado: "Aprobado" },
];
function GuiaColorLook({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colEstado = columnas.find((c) => c.key === "estado");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_GUIACOLOR);
  const sorted = [...base].sort((a, b) => gNum(gVal(a, "escena")) - gNum(gVal(b, "escena")));

  return (
    <div className="pcol-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_GUIACOLOR} onCrear={onCrear} />}
      <div className="pcol-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`pcol-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="pcol-head">
                {ed
                  ? <input className="pcol-esc" defaultValue={gVal(f, "escena")} placeholder="1" onBlur={(e) => set(f, "escena", e.target.value)} />
                  : <span className="pcol-esc">{gVal(f, "escena") || "•"}</span>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="pcol-look">
                <span className="pcol-lbl">{gLbl(columnas, "look")}</span>
                <textarea className="pcol-look-ta" defaultValue={stripHtml(gVal(f, "look"))} placeholder={ed ? "—" : ""} readOnly={!ed} rows={3} onBlur={(e) => set(f, "look", e.target.value)} />
              </div>
              {(ed || gVal(f, "lut")) ? (
                <div className="pcol-lut"><span className="pcol-lut-icon">◑</span>
                  <input className="pcol-lut-in" defaultValue={gVal(f, "lut")} placeholder={gLbl(columnas, "lut")} readOnly={!ed} onBlur={(e) => set(f, "lut", e.target.value)} /></div>
              ) : null}
              {colEstado && <div className="pcol-foot"><EstadoSeg valor={gVal(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={ed} color /></div>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addScene")}</button></div>}
    </div>
  );
}

// ============================================================
// RRHH — vista a medida. Acento: var(--acc) (sky).
// CSS: rdesc-* (descansos legales / turnaround). "Nunca en blanco".
// ============================================================
const EJ_DESCANSOS: Ejemplo[] = [
  { fecha: "2026-07-14", fin: "19:30", siguiente: "07:30", descanso: "12", ok: "Sí" },
  { fecha: "2026-07-15", fin: "22:00", siguiente: "08:00", descanso: "10", ok: "Revisar" },
  { fecha: "2026-07-16", fin: "23:30", siguiente: "07:00", descanso: "7.5", ok: "No" },
];
function DescansoLegal({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colOk = columnas.find((c) => c.key === "ok");
  const colFecha = columnas.find((c) => c.tipo === "fecha");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_DESCANSOS);
  const sorted = [...base].sort((a, b) => (gVal(a, colFecha?.key ?? "fecha") || "").localeCompare(gVal(b, colFecha?.key ?? "fecha") || ""));
  const okTono = (v: string) => /sí|si/i.test(v) ? "tono-ok" : /revisar/i.test(v) ? "tono-warn" : /no/i.test(v) ? "tono-bad" : "tono-neutral";

  return (
    <div className="rdesc-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_DESCANSOS} onCrear={onCrear} />}
      <div className="rdesc-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`rdesc-card ${okTono(gVal(f, "ok"))} ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="rdesc-head">
                {ed && colFecha
                  ? <input type="date" className="rdesc-fecha" defaultValue={gVal(f, colFecha.key)} onBlur={(e) => set(f, colFecha.key, e.target.value)} />
                  : <span className="rdesc-fecha">{gVal(f, colFecha?.key ?? "fecha") || "—"}</span>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="rdesc-turn">
                <label className="rdesc-t">
                  <span>{gLbl(columnas, "fin")}</span>
                  <input className="rdesc-hora" defaultValue={gVal(f, "fin")} placeholder="22:00" readOnly={!ed} onBlur={(e) => set(f, "fin", e.target.value)} />
                </label>
                <span className="rdesc-arrow">→</span>
                <label className="rdesc-t">
                  <span>{gLbl(columnas, "siguiente")}</span>
                  <input className="rdesc-hora" defaultValue={gVal(f, "siguiente")} placeholder="07:00" readOnly={!ed} onBlur={(e) => set(f, "siguiente", e.target.value)} />
                </label>
              </div>
              <div className="rdesc-gauge">
                {ed
                  ? <input className="rdesc-num" type="number" step="0.5" defaultValue={gVal(f, "descanso")} placeholder="12" onBlur={(e) => set(f, "descanso", e.target.value)} />
                  : <span className="rdesc-num">{gVal(f, "descanso") || "—"}</span>}
                <span className="rdesc-unit">h {t("rest")}</span>
              </div>
              {colOk && <div className="rdesc-foot"><EstadoSeg valor={gVal(f, "ok")} opciones={colOk.opciones ?? []} onPick={(v) => set(f, "ok", v)} editable={ed} color /></div>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ============================================================
// SOSTENIBILIDAD / MARKETING / DIFUSIÓN / DISTRIBUCIÓN / MAKING OF
// Vistas a medida (faro por depto). Acento var(--acc) por departamento.
// CSS: simp-* / mktc-* / dmed-* / fest-* / mopub-*. "Nunca en blanco".
// ============================================================
const cpMoney = (v: string) => { const n = parseFloat(String(v).replace(/[^\d.-]/g, "")); return isNaN(n) ? "" : n.toLocaleString("es-ES") + " €"; };

// ---- Sostenibilidad: panel de indicadores de impacto ----
const EJ_INDICADORES: Ejemplo[] = [
  { indicador: "Huella CO₂", valor: "18.4", unidad: "t CO₂e", objetivo: "15", tendencia: "Empeora" },
  { indicador: "Energía", valor: "3200", unidad: "kWh", objetivo: "3500", tendencia: "Mejora" },
  { indicador: "Residuos", valor: "72", unidad: "% reciclado", objetivo: "80", tendencia: "Estable" },
];
function IndicadoresImpacto({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colInd = columnas.find((c) => c.key === "indicador");
  const colTend = columnas.find((c) => c.key === "tendencia");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_INDICADORES);
  const tendData = (v: string) => /mejora/i.test(v) ? { cls: "tono-ok", ar: "↑" } : /empeora/i.test(v) ? { cls: "tono-bad", ar: "↓" } : { cls: "tono-neutral", ar: "→" };

  return (
    <div className="simp-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_INDICADORES} onCrear={onCrear} />}
      <div className="simp-grid">
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          const td = tendData(gVal(f, "tendencia"));
          return (
            <div key={f.id} className={`simp-card ${td.cls} ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="simp-head">
                {colInd && <EstadoSeg valor={gVal(f, "indicador")} opciones={colInd.opciones ?? []} onPick={(v) => set(f, "indicador", v)} editable={ed} chip />}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="simp-val">
                {ed
                  ? <input className="simp-num" type="number" defaultValue={gVal(f, "valor")} placeholder="0" onBlur={(e) => set(f, "valor", e.target.value)} />
                  : <span className="simp-num">{gVal(f, "valor") || "—"}</span>}
                {ed
                  ? <input className="simp-unit" defaultValue={gVal(f, "unidad")} placeholder={gLbl(columnas, "unidad")} onBlur={(e) => set(f, "unidad", e.target.value)} />
                  : <span className="simp-unit">{gVal(f, "unidad")}</span>}
              </div>
              <div className="simp-foot">
                <span className="simp-obj">{t("goal")}: {ed ? <input className="simp-obj-in" type="number" defaultValue={gVal(f, "objetivo")} onBlur={(e) => set(f, "objetivo", e.target.value)} /> : <b>{gVal(f, "objetivo") || "—"}</b>}</span>
                {colTend && <span className="simp-tend"><span className="simp-arrow">{td.ar}</span>{ed ? <EstadoSeg valor={gVal(f, "tendencia")} opciones={colTend.opciones ?? []} onPick={(v) => set(f, "tendencia", v)} editable chip /> : gVal(f, "tendencia")}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addRow")}</button></div>}
    </div>
  );
}

// ---- Marketing: campañas ----
const EJ_CAMPANAS: Ejemplo[] = [
  { campana: "Teaser de lanzamiento", objetivo: "Generar expectativa antes del primer tráiler.", canal: "Instagram, TikTok", inicio: "2026-10-01", presup: "8000", estado: "En curso" },
  { campana: "Campaña de festivales", objetivo: "Posicionar la película ante programadores y prensa.", canal: "Prensa, LinkedIn", inicio: "2026-11-01", presup: "5000", estado: "Idea" },
];
function CampanasMarketing({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colEstado = columnas.find((c) => c.key === "estado");
  const colInicio = columnas.find((c) => c.tipo === "fecha");
  const colPresup = columnas.find((c) => c.tipo === "money");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_CAMPANAS);

  return (
    <div className="mktc-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_CAMPANAS} onCrear={onCrear} />}
      <div className="mktc-grid">
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`mktc-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="mktc-head">
                {ed
                  ? <input className="mktc-name" defaultValue={gVal(f, "campana")} placeholder={gLbl(columnas, "campana")} onBlur={(e) => set(f, "campana", e.target.value)} />
                  : <span className="mktc-name">{gVal(f, "campana") || t("untitled")}</span>}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              {(ed || gVal(f, "objetivo")) ? (
                <textarea className="mktc-obj" defaultValue={stripHtml(gVal(f, "objetivo"))} placeholder={ed ? gLbl(columnas, "objetivo") : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "objetivo", e.target.value)} />
              ) : null}
              <div className="mktc-meta">
                {(ed || gVal(f, "canal")) ? <input className="mktc-canal" defaultValue={gVal(f, "canal")} placeholder={gLbl(columnas, "canal")} readOnly={!ed} onBlur={(e) => set(f, "canal", e.target.value)} /> : null}
                {colInicio && (ed
                  ? <input className="mktc-fecha" type="date" defaultValue={gVal(f, colInicio.key)} onBlur={(e) => set(f, colInicio.key, e.target.value)} />
                  : gVal(f, colInicio.key) ? <span className="mktc-fecha">{gVal(f, colInicio.key)}</span> : null)}
              </div>
              <div className="mktc-bottom">
                {colPresup && (ed
                  ? <span className="mktc-presup-wrap"><input className="mktc-presup-in" type="number" defaultValue={gVal(f, colPresup.key)} placeholder="0" onBlur={(e) => set(f, colPresup.key, e.target.value)} /><span>€</span></span>
                  : gVal(f, colPresup.key) ? <span className="mktc-presup">{cpMoney(gVal(f, colPresup.key))}</span> : <span />)}
                {colEstado && <EstadoSeg valor={gVal(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={ed} color />}
              </div>
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addCampaign")}</button></div>}
    </div>
  );
}

// ---- Difusión: directorio de medios con temperatura de relación ----
const EJ_MEDIOS: Ejemplo[] = [
  { medio: "Diario de la Costa", tipo: "Prensa", contacto: "Rosa Lima", email: "rosa@diariocosta.es", relacion: "Confirmado" },
  { medio: "Radio Norte", tipo: "Radio", contacto: "Jon Aranda", email: "jon@radionorte.es", relacion: "Contactado" },
  { medio: "@cinefila", tipo: "Influencer", contacto: "—", email: "dm", relacion: "Frío" },
];
function PrensaMedios({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colTipo = columnas.find((c) => c.key === "tipo");
  const colRel = columnas.find((c) => c.key === "relacion");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_MEDIOS);
  const relTono = (v: string) => /confirmad/i.test(v) ? "tono-ok" : /contactad/i.test(v) ? "tono-warn" : "tono-bad";

  return (
    <div className="dmed-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_MEDIOS} onCrear={onCrear} />}
      <div className="dmed-grid">
        {base.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`dmed-card ${colRel ? relTono(gVal(f, "relacion")) : ""} ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="dmed-head">
                {ed
                  ? <input className="dmed-medio" defaultValue={gVal(f, "medio")} placeholder={gLbl(columnas, "medio")} onBlur={(e) => set(f, "medio", e.target.value)} />
                  : <span className="dmed-medio">{gVal(f, "medio") || t("untitled")}</span>}
                {colTipo && <EstadoSeg valor={gVal(f, "tipo")} opciones={colTipo.opciones ?? []} onPick={(v) => set(f, "tipo", v)} editable={ed} chip />}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              <div className="dmed-contacto">
                {(ed || gVal(f, "contacto")) ? <input className="dmed-cont-in" defaultValue={gVal(f, "contacto")} placeholder={gLbl(columnas, "contacto")} readOnly={!ed} onBlur={(e) => set(f, "contacto", e.target.value)} /> : null}
                {(ed || gVal(f, "email")) ? <input className="dmed-email" defaultValue={gVal(f, "email")} placeholder={gLbl(columnas, "email")} readOnly={!ed} onBlur={(e) => set(f, "email", e.target.value)} /> : null}
              </div>
              {colRel && <div className="dmed-foot"><span className="dmed-rel-lbl">{colRel.label}</span><EstadoSeg valor={gVal(f, "relacion")} opciones={colRel.opciones ?? []} onPick={(v) => set(f, "relacion", v)} editable={ed} color /></div>}
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addMedia")}</button></div>}
    </div>
  );
}

// ---- Distribución: festivales con cuenta atrás de deadline ----
const EJ_FESTIVALES: Ejemplo[] = [
  { festival: "San Sebastián", categoria: "Sección oficial", deadline: "2026-06-30", cuota: "75", prioridad: "Alta", estado: "Inscrito" },
  { festival: "Berlinale", categoria: "Panorama", deadline: "2026-11-15", cuota: "60", prioridad: "Alta", estado: "Objetivo" },
  { festival: "Málaga", categoria: "Largometraje", deadline: "2026-12-01", cuota: "40", prioridad: "Media", estado: "Objetivo" },
];
function Festivales({ columnas, filas, editable, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colDeadline = columnas.find((c) => c.tipo === "fecha");
  const colCuota = columnas.find((c) => c.tipo === "money");
  const colPrioridad = columnas.find((c) => c.key === "prioridad");
  const colEstado = columnas.find((c) => c.key === "estado");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_FESTIVALES);
  const sorted = [...base].sort((a, b) => (gVal(a, colDeadline?.key ?? "deadline") || "9").localeCompare(gVal(b, colDeadline?.key ?? "deadline") || "9"));
  const dias = (d: string) => { if (!d) return null; const ms = new Date(d).getTime(); if (isNaN(ms)) return null; return Math.ceil((ms - Date.now()) / 86400000); };

  return (
    <div className="fest-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_FESTIVALES} onCrear={onCrear} />}
      <div className="fest-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          const dl = colDeadline ? gVal(f, colDeadline.key) : "";
          const d = dias(dl);
          const dcls = d == null ? "" : d < 0 ? "tono-bad" : d <= 14 ? "tono-warn" : "tono-ok";
          return (
            <div key={f.id} className={`fest-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="fest-head">
                {ed
                  ? <input className="fest-name" defaultValue={gVal(f, "festival")} placeholder={gLbl(columnas, "festival")} onBlur={(e) => set(f, "festival", e.target.value)} />
                  : <span className="fest-name">{gVal(f, "festival") || t("untitled")}</span>}
                {colPrioridad && <EstadoSeg valor={gVal(f, "prioridad")} opciones={colPrioridad.opciones ?? []} onPick={(v) => set(f, "prioridad", v)} editable={ed} chip color />}
                {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
              </div>
              {(ed || gVal(f, "categoria")) ? <input className="fest-cat" defaultValue={gVal(f, "categoria")} placeholder={gLbl(columnas, "categoria")} readOnly={!ed} onBlur={(e) => set(f, "categoria", e.target.value)} /> : null}
              <div className="fest-deadline">
                {colDeadline && (ed
                  ? <input className="fest-dl-in" type="date" defaultValue={dl} onBlur={(e) => set(f, colDeadline.key, e.target.value)} />
                  : dl ? <span className="fest-dl">{dl}</span> : null)}
                {d != null && !ed && <span className={`fest-count ${dcls}`}>{d < 0 ? t("closed") : t("inDays", { n: d })}</span>}
              </div>
              <div className="fest-bottom">
                {colCuota && (ed
                  ? <span className="fest-cuota-wrap"><input className="fest-cuota-in" type="number" defaultValue={gVal(f, colCuota.key)} placeholder="0" onBlur={(e) => set(f, colCuota.key, e.target.value)} /><span>€</span></span>
                  : gVal(f, colCuota.key) ? <span className="fest-cuota">{cpMoney(gVal(f, colCuota.key))}</span> : <span />)}
                {colEstado && <EstadoSeg valor={gVal(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={ed} color />}
              </div>
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addFestival")}</button></div>}
    </div>
  );
}

// ---- Making of: calendario de publicaciones (bilingüe) ----
const EJ_PUBLICACIONES: Ejemplo[] = [
  { fecha: "2026-10-01", canal: "Instagram", pieza: "Teaser faro", copy_es: "La luz lleva tres noches apagada. Muy pronto.", copy_en: "The light's been out for three nights. Coming soon.", imagen_principal: "", hashtags: "#MareaOscura #cine", plataforma_principal: "Instagram", resultado_alcance: "24000", estado: "Programado" },
  { fecha: "2026-10-05", canal: "TikTok", pieza: "BTS amanecer", copy_es: "Rodar el amanecer real. Sin trucos.", copy_en: "Shooting the real sunrise. No tricks.", imagen_principal: "", hashtags: "#BTS #filmmaking", plataforma_principal: "TikTok", resultado_alcance: "51000", estado: "Borrador" },
];
function CalendarioPublicaciones({ columnas, filas, editable, departamento, herramientaId, onCrear, onGuardar, onBorrar }: {
  columnas: Columna[]; filas: Fila[]; editable: boolean; departamento: string; herramientaId: string;
  onCrear: (datos?: Record<string, string>) => void;
  onGuardar: (id: string, datos: Record<string, string>, filaActual?: Fila) => void;
  onBorrar: (id: string) => void;
}) {
  const t = useTranslations("hp");
  const set = (f: Fila, k: string, v: string) => onGuardar(f.id, { ...f.datos, [k]: v }, f);
  const colFecha = columnas.find((c) => c.tipo === "fecha");
  const colFoto = columnas.find((c) => c.tipo === "archivo");
  const colPlat = columnas.find((c) => c.key === "plataforma_principal");
  const colEstado = columnas.find((c) => c.key === "estado");
  const colAlcance = columnas.find((c) => c.key === "resultado_alcance");
  const hayFilas = filas.length > 0;
  const base = hayFilas ? filas : ghostFilas(EJ_PUBLICACIONES);
  const sorted = [...base].sort((a, b) => (gVal(a, colFecha?.key ?? "fecha") || "").localeCompare(gVal(b, colFecha?.key ?? "fecha") || ""));

  return (
    <div className="mopub-wrap">
      {!hayFilas && editable && <AdoptarEjemplos ejemplos={EJ_PUBLICACIONES} onCrear={onCrear} />}
      <div className="mopub-grid">
        {sorted.map((f) => {
          const gh = esGhost(f); const ed = editable && !gh;
          return (
            <div key={f.id} className={`mopub-card ${gh ? "cp-ghost" : ""}`}>
              {gh && <span className="cp-ej-chip">{t("ejChip")}</span>}
              <div className="mopub-photo">
                {colFoto && !gh ? <ArchivoCell path={gVal(f, colFoto.key)} editable={ed} departamento={departamento} herramientaId={herramientaId} filaId={f.id} colKey={colFoto.key} onSave={(v) => set(f, colFoto.key, v)} /> : <span className="mopub-photo-ph hex" />}
              </div>
              <div className="mopub-body">
                <div className="mopub-top">
                  {colFecha && (ed ? <input className="mopub-fecha" type="date" defaultValue={gVal(f, colFecha.key)} onBlur={(e) => set(f, colFecha.key, e.target.value)} /> : <span className="mopub-fecha">{gVal(f, colFecha.key)}</span>)}
                  {colPlat && <EstadoSeg valor={gVal(f, "plataforma_principal")} opciones={colPlat.opciones ?? []} onPick={(v) => set(f, "plataforma_principal", v)} editable={ed} chip />}
                  {ed && <button className="hp-del" onClick={() => onBorrar(f.id)} title={t("delete")}>✕</button>}
                </div>
                {ed
                  ? <input className="mopub-pieza" defaultValue={gVal(f, "pieza")} placeholder={gLbl(columnas, "pieza")} onBlur={(e) => set(f, "pieza", e.target.value)} />
                  : gVal(f, "pieza") ? <div className="mopub-pieza">{gVal(f, "pieza")}</div> : null}
                <div className="mopub-copies">
                  <label className="mopub-copy"><span>ES</span><textarea defaultValue={stripHtml(gVal(f, "copy_es"))} placeholder={ed ? "Copy español…" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "copy_es", e.target.value)} /></label>
                  <label className="mopub-copy"><span>EN</span><textarea defaultValue={stripHtml(gVal(f, "copy_en"))} placeholder={ed ? "English copy…" : ""} readOnly={!ed} rows={2} onBlur={(e) => set(f, "copy_en", e.target.value)} /></label>
                </div>
                {(ed || gVal(f, "hashtags")) ? <input className="mopub-hashtags" defaultValue={gVal(f, "hashtags")} placeholder={gLbl(columnas, "hashtags")} readOnly={!ed} onBlur={(e) => set(f, "hashtags", e.target.value)} /> : null}
                <div className="mopub-foot">
                  {colAlcance && (gVal(f, "resultado_alcance") || ed) ? <span className="mopub-alcance">{gVal(f, "resultado_alcance") ? Number(gVal(f, "resultado_alcance")).toLocaleString("es-ES") : "—"} <em>{t("reach")}</em></span> : <span />}
                  {colEstado && <EstadoSeg valor={gVal(f, "estado")} opciones={colEstado.opciones ?? []} onPick={(v) => set(f, "estado", v)} editable={ed} color />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {editable && hayFilas && <div className="hp-actions"><button className="cp-btn cp-btn-acc" onClick={() => onCrear()}>{t("addPost")}</button></div>}
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
