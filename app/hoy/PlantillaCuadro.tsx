"use client";

// Cuadros de plantilla con vista propia (no una grilla genérica): kanban,
// línea de tiempo, mosaico, checklist y storyboard. Todas leen y escriben
// sobre la misma tabla herramienta_filas (cada fila = una tarjeta/ítem,
// con su contenido en `datos`), así que comparten un único motor de datos.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Icon from "../components/Icon";

type Row = { id: string; datos: Record<string, string>; orden: number };

// Miembro del equipo del proyecto, para asignar a tarjetas del kanban (mismo
// origen que useEquipoProyecto: project_members × profiles). Color estable por
// posición para el avatar.
export type KMiembro = { id: string; nombre: string; color: string };
const AV_COLORS = ["#C98AF2", "#19CBE6", "#9EEE6A", "#F07A7A", "#F18E80", "#5F70ED", "#F5E26A", "#E8A330"];

const PALETA = ["#1F7DE2", "#9EEE6A", "#F37FB5", "#19CBE6", "#C98AF2", "#E6B019", "#F07A7A", "#5BEDD6"];

export default function PlantillaCuadro({
  herramientaId,
  plantillaId,
  departamento,
  fullName,
  editable,
}: {
  herramientaId: string;
  plantillaId: string;
  departamento: string;
  fullName: string;
  editable: boolean;
}) {
  const tc = useTranslations("cuadro");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [miembros, setMiembros] = useState<KMiembro[]>([]);
  const projectIdRef = useRef<string | null>(null);
  // Siempre la última versión de rows, para que patch/add no usen un closure
  // viejo entre dos ediciones rápidas (perdería campos).
  const rowsRef = useRef<Row[]>(rows);
  rowsRef.current = rows;

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    projectIdRef.current = projectId;
    if (!projectId) { setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("herramienta_filas")
      .select("id, datos, orden")
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .eq("herramienta_id", herramientaId)
      .order("orden", { ascending: true });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [departamento, herramientaId]);

  useEffect(() => { load(); }, [load]);

  // Equipo del proyecto para asignar miembros a las tarjetas (solo el kanban
  // lo usa; se carga una vez). Mismo origen que useEquipoProyecto.
  useEffect(() => {
    if (plantillaId !== "kanban") return;
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("project_members")
        .select("user_id, profiles(full_name)")
        .eq("project_id", projectId);
      const lista: KMiembro[] = (data ?? []).map((r, i) => {
        const p = r.profiles as unknown as { full_name: string } | null;
        return { id: r.user_id as string, nombre: p?.full_name ?? "—", color: AV_COLORS[i % AV_COLORS.length] };
      }).filter((m) => m.nombre !== "—");
      setMiembros(lista);
    })();
  }, [plantillaId]);

  async function addRow(datos: Record<string, string>) {
    const projectId = projectIdRef.current;
    if (!projectId) return;
    const supabase = createClient();
    const actuales = rowsRef.current;
    const orden = actuales.length ? Math.max(...actuales.map((r) => r.orden)) + 1 : 0;
    const { data } = await supabase.from("herramienta_filas").insert({
      project_id: projectId, departamento, herramienta_id: herramientaId,
      datos, orden, registro: [], visionado_por: [], autor_nombre: fullName, editor_nombre: fullName,
    }).select("id, datos, orden").single();
    if (data) setRows((prev) => [...prev, data as Row]);
  }

  function patchRow(id: string, parcial: Record<string, string>) {
    const row = rowsRef.current.find((r) => r.id === id);
    const datos = { ...(row?.datos ?? {}), ...parcial };
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, datos } : r)));
    const supabase = createClient();
    supabase.from("herramienta_filas").update({ datos, editor_nombre: fullName }).eq("id", id).then(() => {});
  }

  async function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const supabase = createClient();
    await supabase.from("herramienta_filas").delete().eq("id", id);
  }

  if (loading) return <div className="pq-loading">{tc("loading")}</div>;

  return (
    <div className="pq-wrap">
      <PlantillaCuadroView plantillaId={plantillaId} rows={rows} editable={editable}
        addRow={addRow} patchRow={patchRow} removeRow={removeRow} miembros={miembros} />
    </div>
  );
}

type ViewProps = {
  rows: Row[];
  editable: boolean;
  addRow: (datos: Record<string, string>) => void;
  patchRow: (id: string, parcial: Record<string, string>) => void;
  removeRow: (id: string) => void;
  miembros?: KMiembro[];
};

export function PlantillaCuadroView({ plantillaId, ...common }: ViewProps & { plantillaId: string }) {
  return (
    <>
      {plantillaId === "kanban" && <KanbanView {...common} />}
      {plantillaId === "timeline" && <TimelineView {...common} />}
      {plantillaId === "mosaico" && <MosaicoView {...common} />}
      {plantillaId === "checklist-tabla" && <ChecklistView {...common} />}
      {plantillaId === "storyboard" && <StoryboardView {...common} />}
    </>
  );
}

// ── Kanban (tablero tipo Trello) ─────────────────────────────────────────
// Las 3 columnas col="0"/"1"/"2" (Por hacer / En curso / Hecho) NO cambian:
// el Pulso lee datos.col con esa semántica para su desglose de "Tareas
// Pendientes" (ver ProyectoPulsoPanel). Todo lo demás (etiquetas, carátula,
// fecha, checklist, descripción, miembros) vive en el jsonb `datos` como
// claves extra, sin migración.
const KANBAN_COLS = [
  { key: "0", labelKey: "kanbanTodo", color: "var(--cyan)" },
  { key: "1", labelKey: "kanbanDoing", color: "var(--lime)" },
  { key: "2", labelKey: "kanbanDone", color: "var(--rose)" },
] as const;

// Etiquetas = las 6 fases del proyecto (mismas que etapas/COLOR_ETAPA, para
// que el tablero hable el mismo idioma que Pulso y la línea de tiempo) + 2
// extras de prioridad. Color distinto por fase para poder distinguirlas.
const KLABELS = [
  { id: "desarrollo", etapa: true, color: "var(--indigo)" },
  { id: "financiacion", etapa: true, color: "var(--violet)" },
  { id: "preproduccion", etapa: true, color: "var(--cyan)" },
  { id: "rodaje", etapa: true, color: "var(--lime)" },
  { id: "postproduccion", etapa: true, color: "var(--rose)" },
  { id: "distribucion", etapa: true, color: "var(--coral)" },
  { id: "prioridad", etapa: false, color: "var(--amber)" },
  { id: "urgente", etapa: false, color: "var(--yellow)" },
] as const;
const KCOVERS = ["var(--violet)", "var(--cyan)", "var(--lime)", "var(--rose)", "var(--coral)", "var(--indigo)", "var(--yellow)"];

type Chk = { t: string; d: boolean };
type Due = { date: string; done: boolean };
function parseArr<T>(s: string | undefined): T[] { if (!s) return []; try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } }
function parseDue(s: string | undefined): Due | null { if (!s) return null; try { const v = JSON.parse(s); return v && v.date ? v : null; } catch { return null; } }
function ordenEf(r: Row): number { const o = parseFloat(r.datos._orden ?? ""); return Number.isFinite(o) ? o : r.orden; }
function initials(n: string): string { const p = n.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "—"; }
function dueEstado(d: Due | null): "over" | "soon" | "done" | "ok" | null {
  if (!d || !d.date) return null;
  if (d.done) return "done";
  const dias = (new Date(d.date + "T23:59:59").getTime() - Date.now()) / 864e5;
  if (dias < 0) return "over";
  if (dias <= 2) return "soon";
  return "ok";
}

function KanbanView({ rows, editable, addRow, patchRow, removeRow, miembros = [] }: ViewProps) {
  const t = useTranslations("cuadro");
  const tEt = useTranslations("etapas");
  const locale = "es-ES";
  const [abierta, setAbierta] = useState<string | null>(null);
  const [componiendo, setComponiendo] = useState<string | null>(null);
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const bodiesRef = useRef<Record<string, HTMLDivElement | null>>({});

  const nombreLabel = (id: string) => { const l = KLABELS.find((x) => x.id === id); if (!l) return id; return l.etapa ? tEt(id) : t(`lbl_${id}`); };
  const colorLabel = (id: string) => KLABELS.find((x) => x.id === id)?.color ?? "var(--muted)";
  const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });

  function cardsDe(col: string) {
    return rows.filter((r) => (r.datos.col ?? "0") === col).sort((a, b) => ordenEf(a) - ordenEf(b));
  }

  function onDrop(col: string, clientY: number) {
    const id = dragIdRef.current;
    if (!id) return;
    const destino = cardsDe(col).filter((c) => c.id !== id);
    const body = bodiesRef.current[col];
    let idx = destino.length;
    if (body) {
      const els = Array.from(body.querySelectorAll<HTMLElement>(".pqk-card[data-id]")).filter((e) => e.dataset.id !== id);
      for (let i = 0; i < els.length; i++) {
        const box = els[i].getBoundingClientRect();
        if (clientY < box.top + box.height / 2) { idx = i; break; }
      }
    }
    const antes = destino[idx - 1] ? ordenEf(destino[idx - 1]) : (destino[0] ? ordenEf(destino[0]) - 2 : 0);
    const desp = destino[idx] ? ordenEf(destino[idx]) : (destino.length ? ordenEf(destino[destino.length - 1]) + 2 : 2);
    patchRow(id, { col, _orden: String((antes + desp) / 2) });
    setDragId(null); dragIdRef.current = null;
  }

  function crearEn(col: string) {
    const v = nuevoTexto.trim();
    if (v) { const orden = cardsDe(col).reduce((m, c) => Math.max(m, ordenEf(c)), 0) + 2; addRow({ col, texto: v, _orden: String(orden) }); }
    setNuevoTexto(""); setComponiendo(null);
  }

  const cardAbierta = abierta ? rows.find((r) => r.id === abierta) : null;

  return (
    <div className={`pqk-board${dragId ? " pqk-dragging" : ""}`}>
      {KANBAN_COLS.map((col) => {
        const cards = cardsDe(col.key);
        return (
          <div className="pqk-col" key={col.key} style={{ ["--cc" as string]: col.color }}>
            <div className="pqk-col-h">
              <span className="pqk-dot" />
              <span className="pqk-col-name">{t(col.labelKey)}</span>
              <span className="pqk-count">{cards.length}</span>
            </div>
            <div
              className="pqk-cards"
              ref={(el) => { bodiesRef.current[col.key] = el; }}
              onDragOver={editable ? (e) => { if (dragIdRef.current) { e.preventDefault(); } } : undefined}
              onDrop={editable ? (e) => { e.preventDefault(); onDrop(col.key, e.clientY); } : undefined}
            >
              {cards.map((c) => (
                <KCard key={c.id} row={c} colColor={col.color} editable={editable}
                  labels={parseArr<string>(c.datos.labels)} nombreLabel={nombreLabel} colorLabel={colorLabel}
                  due={parseDue(c.datos.due)} dueEstado={dueEstado} fmtDate={fmtDate}
                  checklist={parseArr<Chk>(c.datos.checklist)} miembros={miembros}
                  memberIds={parseArr<string>(c.datos.members)}
                  onOpen={() => setAbierta(c.id)}
                  onDragStart={() => { setDragId(c.id); dragIdRef.current = c.id; }}
                  onDragEnd={() => { setDragId(null); dragIdRef.current = null; }}
                />
              ))}
              {editable && componiendo === col.key && (
                <div className="pqk-composer">
                  <textarea autoFocus rows={2} value={nuevoTexto} placeholder={t("cardPlaceholder")}
                    onChange={(e) => setNuevoTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); crearEn(col.key); } if (e.key === "Escape") { setComponiendo(null); setNuevoTexto(""); } }} />
                  <div className="pqk-composer-a">
                    <button className="cp-btn cp-btn-acc" onClick={() => crearEn(col.key)}>{t("add")}</button>
                    <button className="cp-btn" onClick={() => { setComponiendo(null); setNuevoTexto(""); }}>{t("cancel")}</button>
                  </div>
                </div>
              )}
              {editable && componiendo !== col.key && (
                <button className="pqk-add" onClick={() => { setComponiendo(col.key); setNuevoTexto(""); }}>
                  <Icon name="plus" size={13} /> {t("addCardShort")}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {cardAbierta && (
        <KModal row={cardAbierta} editable={editable} cols={KANBAN_COLS} colLabel={(k) => t(k)}
          labelsCat={KLABELS} covers={KCOVERS}
          miembros={miembros} tEt={tEt}
          onClose={() => setAbierta(null)}
          onPatch={(p) => patchRow(cardAbierta.id, p)}
          onDelete={() => { removeRow(cardAbierta.id); setAbierta(null); }} />
      )}
    </div>
  );
}

// ── Cara de la tarjeta ───────────────────────────────────────────────────
function KCard({ row, colColor, editable, labels, nombreLabel, colorLabel, due, dueEstado, fmtDate, checklist, miembros, memberIds, onOpen, onDragStart, onDragEnd }: {
  row: Row; colColor: string; editable: boolean; labels: string[]; nombreLabel: (id: string) => string; colorLabel: (id: string) => string;
  due: Due | null; dueEstado: (d: Due | null) => string | null; fmtDate: (iso: string) => string; checklist: Chk[];
  miembros: KMiembro[]; memberIds: string[]; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void;
}) {
  const d = row.datos;
  const ds = dueEstado(due);
  const chkDone = checklist.filter((i) => i.d).length;
  const mem = memberIds.map((id) => miembros.find((m) => m.id === id)).filter(Boolean) as KMiembro[];
  return (
    <div className="pqk-card" data-id={row.id} draggable={editable}
      style={{ ["--cc" as string]: colColor }}
      onClick={onOpen}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}>
      <span className="pqk-card-corner" />
      {d.cover && <div className="pqk-cover" style={{ background: d.cover }} />}
      <div className="pqk-card-body">
        {labels.length > 0 && (
          <div className="pqk-labels">
            {labels.map((id) => <span key={id} className="pqk-label" style={{ background: colorLabel(id) }}>{nombreLabel(id)}</span>)}
          </div>
        )}
        <div className="pqk-card-title">{d.texto || <span className="pqk-card-empty">—</span>}</div>
        <div className="pqk-badges">
          {ds && (
            <span className={`pqk-badge pqk-due pqk-due-${ds}`}>
              <Icon name={ds === "done" ? "check" : "clock"} size={12} /> {fmtDate(due!.date)}
            </span>
          )}
          {d.desc && <span className="pqk-badge"><Icon name="paragraph" size={12} /></span>}
          {checklist.length > 0 && (
            <span className={`pqk-badge${chkDone === checklist.length ? " pqk-chk-done" : ""}`}><Icon name="checklist" size={12} /> {chkDone}/{checklist.length}</span>
          )}
          {mem.length > 0 && (
            <span className="pqk-members">
              {mem.map((m) => <span key={m.id} className="pqk-av" style={{ background: m.color }} title={m.nombre}>{initials(m.nombre)}</span>)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detalle de la tarjeta (modal a pantalla) ─────────────────────────────
function KModal({ row, editable, cols, colLabel, labelsCat, covers, miembros, tEt, onClose, onPatch, onDelete }: {
  row: Row; editable: boolean; cols: readonly { key: string; labelKey: string; color: string }[]; colLabel: (k: string) => string;
  labelsCat: readonly { id: string; etapa: boolean; color: string }[];
  covers: string[]; miembros: KMiembro[]; tEt: (k: string) => string;
  onClose: () => void; onPatch: (p: Record<string, string>) => void; onDelete: () => void;
}) {
  const t = useTranslations("cuadro");
  const tNav = useTranslations("nav");
  const d = row.datos;
  const col = cols.find((c) => c.key === (d.col ?? "0")) ?? cols[0];
  const labels = parseArr<string>(d.labels);
  const checklist = parseArr<Chk>(d.checklist);
  const due = parseDue(d.due);
  const members = parseArr<string>(d.members);
  const [nuevoChk, setNuevoChk] = useState("");
  const chkDone = checklist.filter((i) => i.d).length;
  const pct = checklist.length ? Math.round((chkDone / checklist.length) * 100) : 0;

  const toggleLabel = (id: string) => { const n = labels.includes(id) ? labels.filter((x) => x !== id) : [...labels, id]; onPatch({ labels: JSON.stringify(n) }); };
  const toggleMember = (id: string) => { const n = members.includes(id) ? members.filter((x) => x !== id) : [...members, id]; onPatch({ members: JSON.stringify(n) }); };
  const setChk = (next: Chk[]) => onPatch({ checklist: JSON.stringify(next) });

  const host = typeof document !== "undefined" ? document.querySelector(".cp-dash") ?? document.body : null;
  if (!host) return null;

  return createPortal(
    <div className="pqk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pqk-modal" style={{ ["--cc" as string]: col.color }}>
        <span className="pqk-modal-corner" />
        <button className="pqk-close" onClick={onClose} title={tNav("back")}><Icon name="x" size={14} /></button>
        <div className="pqk-m-main">
          <div className="pqk-m-eyebrow"><Icon name="columns" size={13} /> {t("inColumn")} <b style={{ color: col.color }}>{colLabel(col.labelKey)}</b></div>
          <textarea className="pqk-m-title" rows={1} defaultValue={d.texto ?? ""} readOnly={!editable}
            onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }}
            onBlur={(e) => onPatch({ texto: e.target.value })} />

          <div className="pqk-sec-h"><span className="hex" /> {t("labels")}</div>
          <div className="pqk-chip-row">
            {labelsCat.map((l) => (
              <button key={l.id} className={`pqk-mlabel${labels.includes(l.id) ? "" : " off"}`} style={{ background: l.color }}
                disabled={!editable} onClick={() => toggleLabel(l.id)}>{l.etapa ? tEt(l.id) : t(`lbl_${l.id}`)}</button>
            ))}
          </div>

          <div className="pqk-sec-h"><span className="hex" /> {t("description")}</div>
          <textarea className="pqk-desc" defaultValue={d.desc ?? ""} placeholder={t("descPlaceholder")} readOnly={!editable}
            onBlur={(e) => onPatch({ desc: e.target.value })} />

          <div className="pqk-sec-h"><span className="hex" /> {t("checklist")} <span className="pqk-sec-pct">{pct}%</span></div>
          <div className="pqk-prog"><span style={{ width: `${pct}%` }} /></div>
          <div>
            {checklist.map((it, i) => (
              <div className="pqk-chk-item" key={i}>
                <button className={`pqk-chk-box${it.d ? " on" : ""}`} disabled={!editable}
                  onClick={() => setChk(checklist.map((x, j) => j === i ? { ...x, d: !x.d } : x))}>{it.d && <Icon name="check" size={12} />}</button>
                <span className={`pqk-chk-txt${it.d ? " done" : ""}`}>{it.t}</span>
                {editable && <button className="pqk-chk-del" onClick={() => setChk(checklist.filter((_, j) => j !== i))}><Icon name="x" size={12} /></button>}
              </div>
            ))}
          </div>
          {editable && (
            <input className="pqk-mini-in" value={nuevoChk} placeholder={t("addChkItem")}
              onChange={(e) => setNuevoChk(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nuevoChk.trim()) { setChk([...checklist, { t: nuevoChk.trim(), d: false }]); setNuevoChk(""); } }} />
          )}
        </div>

        <div className="pqk-m-side">
          <div className="pqk-side-h">{t("moveTo")}</div>
          {cols.map((c) => (
            <button key={c.key} className="pqk-side-btn" style={c.key === col.key ? { borderColor: c.color } : undefined}
              disabled={!editable} onClick={() => onPatch({ col: c.key })}>
              <span className="pqk-dot2" style={{ background: c.color }} /> {colLabel(c.labelKey)}
            </button>
          ))}

          <div className="pqk-side-h">{t("dueDate")}</div>
          <input type="date" className="pqk-mini-in" defaultValue={due?.date ?? ""} disabled={!editable}
            onChange={(e) => onPatch({ due: e.target.value ? JSON.stringify({ date: e.target.value, done: due?.done ?? false }) : "" })} />
          {due && (
            <button className="pqk-side-btn" disabled={!editable}
              onClick={() => onPatch({ due: JSON.stringify({ date: due.date, done: !due.done }) })}>
              <span style={due.done ? { color: "var(--lime)", display: "inline-flex" } : { display: "inline-flex" }}><Icon name="check" size={14} /></span> {due.done ? t("dueDone") : t("markDoneDue")}
            </button>
          )}

          <div className="pqk-side-h">{t("members")}</div>
          {miembros.length === 0 ? <p className="pqk-empty">{t("noTeam")}</p> : (
            <div className="pqk-mem-row">
              {miembros.map((m) => (
                <button key={m.id} className={`pqk-mem${members.includes(m.id) ? "" : " off"}`} disabled={!editable} onClick={() => toggleMember(m.id)}>
                  <span className="pqk-av" style={{ background: m.color }}>{initials(m.nombre)}</span><span>{m.nombre}</span>
                </button>
              ))}
            </div>
          )}

          <div className="pqk-side-h">{t("cover")}</div>
          <div className="pqk-cover-row">
            <button className={`pqk-cov-none${!d.cover ? " on" : ""}`} disabled={!editable} onClick={() => onPatch({ cover: "" })}><Icon name="x" size={12} /></button>
            {covers.map((cv) => (
              <button key={cv} className={`pqk-cov-sw${d.cover === cv ? " on" : ""}`} style={{ background: cv }} disabled={!editable} onClick={() => onPatch({ cover: cv })} />
            ))}
          </div>

          {editable && (
            <button className="pqk-side-btn pqk-del-btn" onClick={onDelete}><Icon name="trash" size={14} /> {t("deleteCard")}</button>
          )}
        </div>
      </div>
    </div>,
    host
  );
}

// ── Línea de tiempo ─────────────────────────────────────────────────────
function TimelineView({ rows, editable, addRow, patchRow, removeRow }: ViewProps) {
  const t = useTranslations("cuadro");
  return (
    <div className="pq-timeline">
      {rows.map((r) => (
        <div className="pq-tl-row" key={r.id}>
          <div className="pq-tl-rail"><span className="pq-tl-dot" /></div>
          <div className="pq-tl-card">
            <div className="pq-tl-top">
              <input className="pq-tl-fecha" placeholder={t("date")} defaultValue={r.datos.fecha ?? ""} readOnly={!editable}
                onBlur={(e) => patchRow(r.id, { fecha: e.target.value })} />
              <input className="pq-tl-hito" placeholder={t("milestone")} defaultValue={r.datos.hito ?? ""} readOnly={!editable}
                onBlur={(e) => patchRow(r.id, { hito: e.target.value })} />
              {editable && <button className="pq-del" title={t("delete")} onClick={() => removeRow(r.id)}><Icon name="trash" size={13} /></button>}
            </div>
            <AutoTextarea value={r.datos.detalle ?? ""} placeholder={t("detail")} readOnly={!editable}
              onCommit={(v) => patchRow(r.id, { detalle: v })} />
          </div>
        </div>
      ))}
      {editable && <button className="pq-add pq-add-block" onClick={() => addRow({})}>{t("addMilestone")}</button>}
    </div>
  );
}

// ── Mosaico de color ────────────────────────────────────────────────────
function MosaicoView({ rows, editable, addRow, patchRow, removeRow }: ViewProps) {
  const t = useTranslations("cuadro");
  return (
    <div className="pq-mosaico">
      {rows.map((r) => {
        const color = r.datos.color ?? PALETA[0];
        return (
          <div className="pq-tile" key={r.id} style={{ background: `${color}22`, borderColor: color }}>
            <input className="pq-tile-titulo" placeholder={t("tileTitle")} defaultValue={r.datos.titulo ?? ""} readOnly={!editable}
              onBlur={(e) => patchRow(r.id, { titulo: e.target.value })} />
            <AutoTextarea value={r.datos.nota ?? ""} placeholder={t("note")} readOnly={!editable}
              onCommit={(v) => patchRow(r.id, { nota: v })} />
            {editable && (
              <div className="pq-tile-foot">
                <div className="pq-swatches">
                  {PALETA.map((c) => (
                    <button key={c} title={c} className={c === color ? "on" : ""} style={{ background: c }}
                      onClick={() => patchRow(r.id, { color: c })} />
                  ))}
                </div>
                <button className="pq-del" title={t("delete")} onClick={() => removeRow(r.id)}><Icon name="trash" size={13} /></button>
              </div>
            )}
          </div>
        );
      })}
      {editable && <button className="pq-tile pq-tile-add" onClick={() => addRow({ color: PALETA[rows.length % PALETA.length] })}>{t("add")}</button>}
    </div>
  );
}

// ── Checklist ───────────────────────────────────────────────────────────
function ChecklistView({ rows, editable, addRow, patchRow, removeRow }: ViewProps) {
  const t = useTranslations("cuadro");
  const hechas = rows.filter((r) => r.datos.hecho === "1").length;
  return (
    <div className="pq-checklist">
      {rows.length > 0 && (
        <div className="pq-check-progress">
          <div className="pq-check-bar"><span style={{ width: `${rows.length ? (hechas / rows.length) * 100 : 0}%` }} /></div>
          <span>{hechas}/{rows.length}</span>
        </div>
      )}
      {rows.map((r) => {
        const done = r.datos.hecho === "1";
        return (
          <div className={`pq-check-row${done ? " done" : ""}`} key={r.id}>
            <button className="pq-check-box" disabled={!editable} title={done ? t("markPending") : t("markDone")}
              onClick={() => patchRow(r.id, { hecho: done ? "" : "1" })}>
              {done && <Icon name="check" size={13} />}
            </button>
            <input className="pq-check-txt" placeholder={t("newItem")} defaultValue={r.datos.texto ?? ""} readOnly={!editable}
              onBlur={(e) => patchRow(r.id, { texto: e.target.value })} />
            {editable && <button className="pq-del" title={t("delete")} onClick={() => removeRow(r.id)}><Icon name="trash" size={13} /></button>}
          </div>
        );
      })}
      {editable && <button className="pq-add pq-add-block" onClick={() => addRow({ hecho: "", texto: "" })}>{t("addItem")}</button>}
    </div>
  );
}

// ── Storyboard ──────────────────────────────────────────────────────────
function StoryboardView({ rows, editable, addRow, patchRow, removeRow }: ViewProps) {
  const t = useTranslations("cuadro");
  return (
    <div className="pq-storyboard">
      {rows.map((r, i) => (
        <div className="pq-frame" key={r.id}>
          <div className="pq-frame-img">
            <span className="pq-frame-num">{r.datos.num || String(i + 1).padStart(2, "0")}</span>
            {editable && <button className="pq-del pq-frame-del" title={t("delete")} onClick={() => removeRow(r.id)}><Icon name="trash" size={12} /></button>}
          </div>
          <AutoTextarea value={r.datos.desc ?? ""} placeholder={t("shotDesc")} readOnly={!editable}
            onCommit={(v) => patchRow(r.id, { desc: v })} />
          <input className="pq-frame-dur" placeholder={t("shotDur")} defaultValue={r.datos.dur ?? ""} readOnly={!editable}
            onBlur={(e) => patchRow(r.id, { dur: e.target.value })} />
        </div>
      ))}
      {editable && (
        <button className="pq-frame pq-frame-add" onClick={() => addRow({ num: String(rows.length + 1).padStart(2, "0") })}>
          <Icon name="arrow-right" size={18} /> {t("addShotLabel")}
        </button>
      )}
    </div>
  );
}

// ── Textarea que crece con el contenido y guarda al perder foco ─────────
function AutoTextarea({ value, placeholder, readOnly, onCommit }: {
  value: string; placeholder?: string; readOnly?: boolean; onCommit: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } };
  useEffect(() => { fit(); }, [value]);
  return (
    <textarea
      ref={ref}
      className="pq-ta"
      defaultValue={value}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={1}
      onInput={fit}
      onBlur={(e) => onCommit(e.target.value)}
    />
  );
}
