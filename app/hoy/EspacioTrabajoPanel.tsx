"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tipo = "nota" | "checklist" | "tabla" | "kanban";
type Visibilidad = "privado" | "departamento" | "proyecto";

type ChecklistItem = { texto: string; hecho: boolean };
type TablaContenido = { headers: string[]; rows: string[][] };
type KanbanContenido = { pendiente: string[]; en_curso: string[]; hecho: string[] };

type Block = {
  id: string;
  owner_id: string;
  owner_name: string;
  titulo: string;
  tipo: Tipo;
  contenido: Record<string, unknown>;
  visibilidad: Visibilidad;
  updated_at: string;
};

const TIPO_LABEL: Record<Tipo, string> = {
  nota: "Nota",
  checklist: "Checklist",
  tabla: "Tabla",
  kanban: "Kanban",
};

const TIPO_HINT: Record<Tipo, string> = {
  nota: "Texto libre: ideas, briefs, apuntes de reunión.",
  checklist: "Lista de tareas con check, para seguir pendientes propios o del equipo.",
  tabla: "Filas y columnas editables: listados, comparativas, registros.",
  kanban: "Tres columnas — Por hacer / En curso / Hecho — para mover tarjetas.",
};

const VIS_LABEL: Record<Visibilidad, string> = {
  privado: "Privado (solo yo)",
  departamento: "Departamento",
  proyecto: "Todo el proyecto",
};

function vacioPara(tipo: Tipo): Record<string, unknown> {
  switch (tipo) {
    case "nota":
      return { texto: "" };
    case "checklist":
      return { items: [] as ChecklistItem[] };
    case "tabla":
      return { headers: ["Columna 1", "Columna 2"], rows: [["", ""]] } as TablaContenido;
    case "kanban":
      return { pendiente: [], en_curso: [], hecho: [] } as KanbanContenido;
  }
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

export default function EspacioTrabajoPanel({
  departamento,
  fullName,
}: {
  departamento: string;
  fullName: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Tipo>("nota");
  const [visibilidad, setVisibilidad] = useState<Visibilidad>("privado");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
      .from("workspace_blocks")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    setBlocks((data ?? []) as Block[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
      return;
    }
    if (!titulo.trim()) {
      setMsg({ type: "err", text: "Ponle un título al espacio de trabajo." });
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

    const { error } = await supabase.from("workspace_blocks").insert({
      project_id: projectId,
      departamento,
      owner_id: user.id,
      owner_name: fullName,
      titulo: titulo.trim(),
      tipo,
      contenido: vacioPara(tipo),
      visibilidad,
    });

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setTitulo("");
    setTipo("nota");
    setVisibilidad("privado");
    setShowForm(false);
    await load();
  }

  async function guardar(id: string, contenido: Record<string, unknown>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, contenido, updated_at: new Date().toISOString() } : b))
    );
    const supabase = createClient();
    await supabase
      .from("workspace_blocks")
      .update({ contenido, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function eliminar(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    const supabase = createClient();
    await supabase.from("workspace_blocks").delete().eq("id", id);
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando espacio de trabajo…</h4>
      </div>
    );
  }

  return (
    <>
      {blocks.length === 0 && (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>Tu espacio de trabajo está vacío</h4>
          <p>
            Crea bloques de nota, checklist, tabla o kanban para organizar tu trabajo. Podés dejarlos
            privados, compartirlos con {departamento} o con todo el proyecto.
          </p>
        </div>
      )}

      <div className="esp-grid">
        {blocks.map((b) => (
          <EspacioBlock
            key={b.id}
            block={b}
            esPropio={b.owner_id === userId}
            onGuardar={(c) => guardar(b.id, c)}
            onEliminar={() => eliminar(b.id)}
          />
        ))}
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nuevo espacio de trabajo"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>Título</span>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Ideas para la escena 14, Lista de props, Seguimiento VFX…"
            />
          </label>
          <label className="afield">
            <span>Tipo de bloque</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => (
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>
              ))}
            </select>
          </label>
          <p className="cons-text" style={{ margin: 0 }}>{TIPO_HINT[tipo]}</p>
          <label className="afield">
            <span>Visibilidad</span>
            <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value as Visibilidad)}>
              {(Object.keys(VIS_LABEL) as Visibilidad[]).map((v) => (
                <option key={v} value={v}>{VIS_LABEL[v]}</option>
              ))}
            </select>
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Creando…" : "Crear espacio de trabajo"}
          </button>
        </form>
      )}
    </>
  );
}

function EspacioBlock({
  block,
  esPropio,
  onGuardar,
  onEliminar,
}: {
  block: Block;
  esPropio: boolean;
  onGuardar: (contenido: Record<string, unknown>) => void;
  onEliminar: () => void;
}) {
  return (
    <div className="esp-block">
      <div className="esp-block-top">
        <span className={`pill esp-tag-${block.tipo}`}>{TIPO_LABEL[block.tipo]}</span>
        <h4>{block.titulo}</h4>
        <span className="esp-meta">
          {VIS_LABEL[block.visibilidad]}
          {!esPropio && ` · de ${block.owner_name}`}
          {" · "}
          {timeAgo(block.updated_at)}
        </span>
        {esPropio && (
          <button className="esp-del" title="Eliminar" onClick={onEliminar}>
            ✕
          </button>
        )}
      </div>

      {block.tipo === "nota" && (
        <NotaBlock contenido={block.contenido as { texto: string }} editable={esPropio} onGuardar={onGuardar} />
      )}
      {block.tipo === "checklist" && (
        <ChecklistBlock contenido={block.contenido as { items: ChecklistItem[] }} editable={esPropio} onGuardar={onGuardar} />
      )}
      {block.tipo === "tabla" && (
        <TablaBlock contenido={block.contenido as TablaContenido} editable={esPropio} onGuardar={onGuardar} />
      )}
      {block.tipo === "kanban" && (
        <KanbanBlock contenido={block.contenido as KanbanContenido} editable={esPropio} onGuardar={onGuardar} />
      )}
    </div>
  );
}

function NotaBlock({
  contenido,
  editable,
  onGuardar,
}: {
  contenido: { texto: string };
  editable: boolean;
  onGuardar: (c: Record<string, unknown>) => void;
}) {
  const [texto, setTexto] = useState(contenido.texto ?? "");

  return (
    <textarea
      className="esp-nota"
      value={texto}
      readOnly={!editable}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => editable && onGuardar({ texto })}
      rows={6}
      placeholder="Escribí aquí…"
    />
  );
}

function ChecklistBlock({
  contenido,
  editable,
  onGuardar,
}: {
  contenido: { items: ChecklistItem[] };
  editable: boolean;
  onGuardar: (c: Record<string, unknown>) => void;
}) {
  const items = contenido.items ?? [];
  const [nuevo, setNuevo] = useState("");

  function toggle(idx: number) {
    const next = items.map((it, i) => (i === idx ? { ...it, hecho: !it.hecho } : it));
    onGuardar({ items: next });
  }

  function quitar(idx: number) {
    onGuardar({ items: items.filter((_, i) => i !== idx) });
  }

  function agregar() {
    if (!nuevo.trim()) return;
    onGuardar({ items: [...items, { texto: nuevo.trim(), hecho: false }] });
    setNuevo("");
  }

  return (
    <div className="esp-checklist">
      {items.length === 0 && <p className="esp-empty">Sin tareas todavía.</p>}
      {items.map((it, idx) => (
        <label key={idx} className={`esp-check-row ${it.hecho ? "done" : ""}`}>
          <input type="checkbox" checked={it.hecho} disabled={!editable} onChange={() => toggle(idx)} />
          <span>{it.texto}</span>
          {editable && (
            <button type="button" className="esp-del" onClick={() => quitar(idx)}>✕</button>
          )}
        </label>
      ))}
      {editable && (
        <div className="esp-check-add">
          <input
            type="text"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())}
            placeholder="Nueva tarea…"
          />
          <button type="button" className="btn" onClick={agregar}>Añadir</button>
        </div>
      )}
    </div>
  );
}

function TablaBlock({
  contenido,
  editable,
  onGuardar,
}: {
  contenido: TablaContenido;
  editable: boolean;
  onGuardar: (c: Record<string, unknown>) => void;
}) {
  const headers = contenido.headers ?? ["Columna 1"];
  const rows = contenido.rows ?? [];

  function setHeader(idx: number, value: string) {
    const next = headers.map((h, i) => (i === idx ? value : h));
    onGuardar({ headers: next, rows });
  }

  function setCell(r: number, c: number, value: string) {
    const next = rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row));
    onGuardar({ headers, rows: next });
  }

  function addRow() {
    onGuardar({ headers, rows: [...rows, headers.map(() => "")] });
  }

  function addCol() {
    const nextHeaders = [...headers, `Columna ${headers.length + 1}`];
    const nextRows = rows.map((row) => [...row, ""]);
    onGuardar({ headers: nextHeaders, rows: nextRows });
  }

  function removeRow(idx: number) {
    onGuardar({ headers, rows: rows.filter((_, i) => i !== idx) });
  }

  return (
    <div className="esp-tabla-wrap">
      <table className="esp-tabla">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>
                <input value={h} readOnly={!editable} onChange={(e) => setHeader(i, e.target.value)} />
              </th>
            ))}
            {editable && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  <input value={cell} readOnly={!editable} onChange={(e) => setCell(ri, ci, e.target.value)} />
                </td>
              ))}
              {editable && (
                <td>
                  <button type="button" className="esp-del" onClick={() => removeRow(ri)}>✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="esp-tabla-actions">
          <button type="button" className="btn" onClick={addRow}>+ Fila</button>
          <button type="button" className="btn" onClick={addCol}>+ Columna</button>
        </div>
      )}
    </div>
  );
}

const KANBAN_COLS: { key: keyof KanbanContenido; label: string }[] = [
  { key: "pendiente", label: "Por hacer" },
  { key: "en_curso", label: "En curso" },
  { key: "hecho", label: "Hecho" },
];

function KanbanBlock({
  contenido,
  editable,
  onGuardar,
}: {
  contenido: KanbanContenido;
  editable: boolean;
  onGuardar: (c: Record<string, unknown>) => void;
}) {
  const cols: KanbanContenido = {
    pendiente: contenido.pendiente ?? [],
    en_curso: contenido.en_curso ?? [],
    hecho: contenido.hecho ?? [],
  };
  const [nuevo, setNuevo] = useState("");

  function agregar() {
    if (!nuevo.trim()) return;
    onGuardar({ ...cols, pendiente: [...cols.pendiente, nuevo.trim()] });
    setNuevo("");
  }

  function mover(key: keyof KanbanContenido, idx: number, dir: 1 | -1) {
    const order = KANBAN_COLS.map((c) => c.key);
    const fromI = order.indexOf(key);
    const toI = fromI + dir;
    if (toI < 0 || toI >= order.length) return;
    const card = cols[key][idx];
    const next: KanbanContenido = {
      pendiente: [...cols.pendiente],
      en_curso: [...cols.en_curso],
      hecho: [...cols.hecho],
    };
    next[key] = next[key].filter((_, i) => i !== idx);
    next[order[toI]] = [...next[order[toI]], card];
    onGuardar(next);
  }

  function quitar(key: keyof KanbanContenido, idx: number) {
    onGuardar({ ...cols, [key]: cols[key].filter((_, i) => i !== idx) });
  }

  return (
    <div className="esp-kanban">
      <div className="esp-kanban-cols">
        {KANBAN_COLS.map(({ key, label }, colIdx) => (
          <div className="esp-kanban-col" key={key}>
            <h5>{label}</h5>
            {cols[key].length === 0 && <p className="esp-empty">—</p>}
            {cols[key].map((card, idx) => (
              <div className="esp-kanban-card" key={idx}>
                <span>{card}</span>
                {editable && (
                  <div className="esp-kanban-card-actions">
                    {colIdx > 0 && (
                      <button type="button" onClick={() => mover(key, idx, -1)} title="Mover a la izquierda">←</button>
                    )}
                    {colIdx < KANBAN_COLS.length - 1 && (
                      <button type="button" onClick={() => mover(key, idx, 1)} title="Mover a la derecha">→</button>
                    )}
                    <button type="button" onClick={() => quitar(key, idx)} title="Eliminar">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {editable && (
        <div className="esp-check-add">
          <input
            type="text"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())}
            placeholder="Nueva tarjeta en 'Por hacer'…"
          />
          <button type="button" className="btn" onClick={agregar}>Añadir</button>
        </div>
      )}
    </div>
  );
}
