"use client";

// Cuadros de plantilla con vista propia (no una grilla genérica): kanban,
// línea de tiempo, mosaico, checklist y storyboard. Todas leen y escriben
// sobre la misma tabla herramienta_filas (cada fila = una tarjeta/ítem,
// con su contenido en `datos`), así que comparten un único motor de datos.

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Icon from "../components/Icon";

type Row = { id: string; datos: Record<string, string>; orden: number };

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
        addRow={addRow} patchRow={patchRow} removeRow={removeRow} />
    </div>
  );
}

type ViewProps = {
  rows: Row[];
  editable: boolean;
  addRow: (datos: Record<string, string>) => void;
  patchRow: (id: string, parcial: Record<string, string>) => void;
  removeRow: (id: string) => void;
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

// ── Kanban ──────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { key: "0", labelKey: "kanbanTodo", color: "#1F7DE2" },
  { key: "1", labelKey: "kanbanDoing", color: "#9EEE6A" },
  { key: "2", labelKey: "kanbanDone", color: "#F37FB5" },
] as const;
function KanbanView({ rows, editable, addRow, patchRow, removeRow }: ViewProps) {
  const t = useTranslations("cuadro");
  return (
    <div className="pq-kanban">
      {KANBAN_COLS.map((col) => {
        const cards = rows.filter((r) => (r.datos.col ?? "0") === col.key);
        return (
          <div className="pq-kcol" key={col.key}>
            <div className="pq-kcol-head" style={{ borderColor: col.color }}>
              <span className="pq-kcol-dot" style={{ background: col.color }} />
              {t(col.labelKey)}
              <span className="pq-kcol-count">{cards.length}</span>
            </div>
            <div className="pq-kcol-body">
              {cards.map((c) => (
                <div className="pq-kcard" key={c.id} style={{ borderLeftColor: col.color }}>
                  <AutoTextarea
                    value={c.datos.texto ?? ""}
                    placeholder={t("cardPlaceholder")}
                    readOnly={!editable}
                    onCommit={(v) => patchRow(c.id, { texto: v })}
                  />
                  {editable && (
                    <div className="pq-kcard-actions">
                      <button title={t("moveLeft")} disabled={col.key === "0"}
                        onClick={() => patchRow(c.id, { col: String(Number(col.key) - 1) })}><Icon name="arrow-left" size={13} /></button>
                      <button title={t("moveRight")} disabled={col.key === "2"}
                        onClick={() => patchRow(c.id, { col: String(Number(col.key) + 1) })}><Icon name="arrow-right" size={13} /></button>
                      <button title={t("delete")} className="pq-del" onClick={() => removeRow(c.id)}><Icon name="trash" size={13} /></button>
                    </div>
                  )}
                </div>
              ))}
              {editable && (
                <button className="pq-add" onClick={() => addRow({ col: col.key, texto: "" })}>{t("addCard")}</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
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
