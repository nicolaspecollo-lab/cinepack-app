"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GENERAL_ORDEN_RODAJE } from "../herramientas";
import { PrintHeader } from "./HerramientaPanel";

type Par = { label: string; valor: string };
type Escena = { hora: string; esc: string; intext: string; dianoche: string; set: string; personajes: string; paginas: string };

type Fila = {
  id: string;
  datos: Record<string, string>;
  orden: number;
};

function parseJSON<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

const CAMPOS_TEXTO: { key: string; label: string; placeholder?: string }[] = [
  { key: "dia", label: "Día", placeholder: "1/18" },
  { key: "set_principal", label: "Localización principal" },
  { key: "set_secundario", label: "Localización secundaria" },
  { key: "productora", label: "Productora" },
  { key: "unidad", label: "Unidad" },
  { key: "clima", label: "Clima / Amanecer / Anochecer", placeholder: "☀️ Soleado · 🌡 18°/27° · 🌅 06:48 · 🌇 21:42 · 💨 12 km/h" },
  { key: "escenas_resumen", label: "Resumen de escenas", placeholder: "6 escenas · 9 1/8 págs" },
];

export default function OrdenRodajePanel({ fullName, canEdit = true }: { fullName: string; canEdit?: boolean }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(true);
  const [activa, setActiva] = useState<string | null>(null);
  const [modo, setModo] = useState<"editar" | "imprimir">("editar");

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("herramienta_filas")
      .select("id, datos, orden")
      .eq("project_id", projectId)
      .eq("departamento", "General")
      .eq("herramienta_id", GENERAL_ORDEN_RODAJE.id)
      .order("orden", { ascending: true });
    const rows = (data ?? []) as Fila[];
    setFilas(rows);
    if (rows.length > 0) setActiva((cur) => cur ?? rows[0].id);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function nuevaJornada() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orden = filas.length ? Math.max(...filas.map((f) => f.orden)) + 1 : 0;
    const datos = { dia: `${orden + 1}`, fecha: "", set_principal: "", set_secundario: "", productora: "", unidad: "", clima: "", citaciones: "[]", localizaciones: "[]", llamadas: "[]", escenas_resumen: "", escenas: "[]", reparto_individual: "[]", contactos: "[]", notas: "" };
    const { data, error } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: "General",
        herramienta_id: GENERAL_ORDEN_RODAJE.id,
        datos,
        orden,
        registro: [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }],
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("id, datos, orden")
      .single();
    if (error || !data) return;
    setFilas((prev) => [...prev, data as Fila]);
    setActiva(data.id);
  }

  async function borrarJornada(id: string) {
    if (!window.confirm("¿Eliminar esta jornada de la orden de rodaje?")) return;
    setFilas((prev) => prev.filter((f) => f.id !== id));
    if (activa === id) setActiva(null);
    const supabase = createClient();
    await supabase.from("herramienta_filas").delete().eq("id", id);
  }

  async function guardar(id: string, cambios: Record<string, string>) {
    const fila = filas.find((f) => f.id === id);
    if (!fila) return;
    const datos = { ...fila.datos, ...cambios };
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, datos } : f)));
    const supabase = createClient();
    await supabase.from("herramienta_filas").update({ datos, editor_nombre: fullName, updated_at: new Date().toISOString() }).eq("id", id);
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando orden de rodaje…</h4>
      </div>
    );
  }

  const f = filas.find((x) => x.id === activa);

  return (
    <div className="hp-open">
      {!canEdit && (
        <div className="gen-readonly-banner">
          <span className="hex"></span>
          Solo visionado — solo <strong>Dirección</strong> y <strong>Producción</strong> pueden editar la orden de rodaje. Solicitá cambios a través de Producción Ejecutiva.
        </div>
      )}
      <div className="hp-open-head"><h3><span className="hex"></span> Orden de rodaje (callsheet)</h3></div>
      <p className="hp-hint">{GENERAL_ORDEN_RODAJE.hint}</p>

      <div className="dsubtabs" style={{ padding: "0 30px" }}>
        {filas.map((row) => (
          <button
            key={row.id}
            className={`dsubtab ${activa === row.id && modo === "editar" ? "active" : ""}`}
            onClick={() => { setActiva(row.id); setModo("editar"); }}
          >
            Día {row.datos.dia || "—"}
          </button>
        ))}
        {canEdit && <button className="dsubtab" onClick={nuevaJornada}>+ Nueva jornada</button>}
      </div>

      {!f && (
        <div className="soon-box" style={{ marginTop: 0 }}>
          <span className="hex"></span>
          <h4>Sin jornadas todavía</h4>
          <p>Creá la primera jornada para empezar a armar la callsheet.</p>
        </div>
      )}

      {f && modo === "editar" && (
        canEdit
          ? <CallsheetEditor fila={f} onGuardar={(c) => guardar(f.id, c)} onBorrar={() => borrarJornada(f.id)} onImprimir={() => setModo("imprimir")} />
          : <CallsheetPrint fila={f} onVolver={() => {}} />
      )}

      {f && modo === "imprimir" && (
        <CallsheetPrint fila={f} onVolver={() => setModo("editar")} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function CallsheetEditor({
  fila,
  onGuardar,
  onBorrar,
  onImprimir,
}: {
  fila: Fila;
  onGuardar: (cambios: Record<string, string>) => void;
  onBorrar: () => void;
  onImprimir: () => void;
}) {
  const citaciones = parseJSON<Par[]>(fila.datos.citaciones, []);
  const localizaciones = parseJSON<Par[]>(fila.datos.localizaciones, []);
  const llamadas = parseJSON<Par[]>(fila.datos.llamadas, []);
  const reparto = parseJSON<Par[]>(fila.datos.reparto_individual, []);
  const contactos = parseJSON<Par[]>(fila.datos.contactos, []);
  const escenas = parseJSON<Escena[]>(fila.datos.escenas, []);

  return (
    <>
      <div className="hp-actions" style={{ paddingBottom: 0 }}>
        <button className="btn acc" onClick={onImprimir}>🖨 Vista de impresión</button>
        <button className="hp-del" onClick={onBorrar}>✕ Eliminar jornada</button>
      </div>

      <div className="hp-ficha" style={{ padding: "16px 30px" }}>
        {CAMPOS_TEXTO.map((c) => (
          <label className="hp-ficha-field" key={c.key}>
            <span>{c.label}</span>
            <input
              type={c.key === "fecha" ? "date" : "text"}
              defaultValue={fila.datos[c.key] ?? ""}
              placeholder={c.placeholder}
              onBlur={(e) => onGuardar({ [c.key]: e.target.value })}
            />
          </label>
        ))}
        <label className="hp-ficha-field" key="fecha">
          <span>Fecha</span>
          <input type="date" defaultValue={fila.datos.fecha ?? ""} onBlur={(e) => onGuardar({ fecha: e.target.value })} />
        </label>
      </div>

      <div className="grid2" style={{ padding: "0 30px 22px" }}>
        <ParListEditor titulo="Citaciones generales" items={citaciones} onChange={(v) => onGuardar({ citaciones: JSON.stringify(v) })} placeholders={["Equipo técnico", "06:00"]} />
        <ParListEditor titulo="Localizaciones" items={localizaciones} onChange={(v) => onGuardar({ localizaciones: JSON.stringify(v) })} placeholders={["Nombre de la localización", "Acceso / nota"]} />
        <ParListEditor titulo="Llamadas por departamento" items={llamadas} onChange={(v) => onGuardar({ llamadas: JSON.stringify(v) })} placeholders={["Departamento", "Hora"]} />
        <ParListEditor titulo="Reparto — citación individual" items={reparto} onChange={(v) => onGuardar({ reparto_individual: JSON.stringify(v) })} placeholders={["Personaje / actor", "Hora → maquillaje"]} />
        <ParListEditor titulo="Contactos clave" items={contactos} onChange={(v) => onGuardar({ contactos: JSON.stringify(v) })} placeholders={["Rol", "Nombre / teléfono"]} />
      </div>

      <div className="tool" style={{ margin: "0 30px 22px" }}>
        <div className="tool-head"><span className="hex"></span><h3>Escenas del día</h3></div>
        <div style={{ padding: "14px 18px" }}>
          <EscenasEditor items={escenas} onChange={(v) => onGuardar({ escenas: JSON.stringify(v) })} />
        </div>
      </div>

      <label className="hp-ficha-field" style={{ padding: "0 30px 30px", display: "block" }}>
        <span>Notas de producción</span>
        <textarea
          rows={3}
          defaultValue={fila.datos.notas ?? ""}
          onBlur={(e) => onGuardar({ notas: e.target.value })}
        />
      </label>
    </>
  );
}

// ---------------------------------------------------------------------------
function ParListEditor({
  titulo,
  items,
  onChange,
  placeholders,
}: {
  titulo: string;
  items: Par[];
  onChange: (v: Par[]) => void;
  placeholders: [string, string];
}) {
  function set(i: number, key: keyof Par, v: string) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  }
  return (
    <div className="mini">
      <h4><span className="hex"></span>{titulo}</h4>
      <ul style={{ gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{ gap: 6 }}>
            <input className="hp-cell-input" defaultValue={it.label} placeholder={placeholders[0]} onBlur={(e) => set(i, "label", e.target.value)} />
            <input className="hp-cell-input" style={{ maxWidth: 130 }} defaultValue={it.valor} placeholder={placeholders[1]} onBlur={(e) => set(i, "valor", e.target.value)} />
            <button className="hp-del" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>✕</button>
          </li>
        ))}
      </ul>
      <button className="btn" onClick={() => onChange([...items, { label: "", valor: "" }])}>+ Agregar</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
const ESC_COLS: { key: keyof Escena; label: string; w?: number }[] = [
  { key: "hora", label: "Hora", w: 70 },
  { key: "esc", label: "Esc.", w: 50 },
  { key: "intext", label: "Int/Ext", w: 70 },
  { key: "dianoche", label: "Día/Noche", w: 90 },
  { key: "set", label: "Set / Descripción" },
  { key: "personajes", label: "Personajes" },
  { key: "paginas", label: "Págs.", w: 60 },
];

function EscenasEditor({ items, onChange }: { items: Escena[]; onChange: (v: Escena[]) => void }) {
  function set(i: number, key: keyof Escena, v: string) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  }
  const vacia: Escena = { hora: "", esc: "", intext: "", dianoche: "", set: "", personajes: "", paginas: "" };
  return (
    <div className="hp-table-wrap">
      <table className="hp-table">
        <thead>
          <tr>
            {ESC_COLS.map((c) => <th key={c.key} style={{ width: c.w }}>{c.label}</th>)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              {ESC_COLS.map((c) => (
                <td key={c.key}>
                  <input className="hp-cell-input" defaultValue={it[c.key]} onBlur={(e) => set(i, c.key, e.target.value)} />
                </td>
              ))}
              <td><button className="hp-del" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hp-actions">
        <button className="btn acc" onClick={() => onChange([...items, vacia])}>+ Agregar escena</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CallsheetPrint({ fila, onVolver }: { fila: Fila; onVolver: () => void }) {
  const d = fila.datos;
  const citaciones = parseJSON<Par[]>(d.citaciones, []);
  const localizaciones = parseJSON<Par[]>(d.localizaciones, []);
  const llamadas = parseJSON<Par[]>(d.llamadas, []);
  const reparto = parseJSON<Par[]>(d.reparto_individual, []);
  const contactos = parseJSON<Par[]>(d.contactos, []);
  const escenas = parseJSON<Escena[]>(d.escenas, []);
  const fecha = d.fecha ? new Date(d.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="cs-print">
      <div className="printbar">
        <button className="btn" onClick={onVolver}>← Volver a edición</button>
        <button className="print-btn" onClick={() => window.print()}>📄 Exportar PDF / Imprimir</button>
      </div>

      <PrintHeader herramientaNombre="Orden de rodaje — Callsheet" departamento="Producción" />

      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>Orden de Rodaje — Callsheet</h3>
          <span className="tag">Día {d.dia || "—"}</span>
          <div className="right">{fecha}</div>
        </div>
        <p className="tool-sub">
          Localización principal: <b style={{ color: "var(--text)" }}>{d.set_principal || "—"}</b>
          {d.set_secundario && <> · secundaria: <b style={{ color: "var(--text)" }}>{d.set_secundario}</b></>}
          {d.productora && <> · Productora: {d.productora}</>}
          {d.unidad && <> · Unidad: {d.unidad}</>}
        </p>
        {d.clima && (
          <div className="chips" style={{ padding: "0 18px 14px" }}>
            {d.clima.split("·").map((c, i) => <span className="chip" key={i}>{c.trim()}</span>)}
          </div>
        )}
      </div>

      <div className="grid2">
        <ParListPrint titulo="Citaciones generales" items={citaciones} />
        <ParListPrint titulo="Localizaciones" items={localizaciones} />
        <ParListPrint titulo="Llamadas por departamento" items={llamadas} />
      </div>

      <div className="tool">
        <div className="tool-head"><span className="hex"></span><h3>Escenas del día</h3><div className="right">{d.escenas_resumen || `${escenas.length} escenas`}</div></div>
        <div className="twrap">
          <table className="t">
            <tr><th>Hora</th><th>Esc.</th><th>Int/Ext</th><th>Día/Noche</th><th>Set / Descripción</th><th>Personajes</th><th>Págs.</th></tr>
            {escenas.map((e, i) => (
              <tr key={i}>
                <td className="mono">{e.hora}</td>
                <td className="mono"><b>{e.esc}</b></td>
                <td>{e.intext}</td>
                <td>{e.dianoche}</td>
                <td>{e.set}</td>
                <td>{e.personajes}</td>
                <td>{e.paginas}</td>
              </tr>
            ))}
          </table>
        </div>
      </div>

      <div className="grid2">
        <ParListPrint titulo="Reparto — citación individual" items={reparto} />
        <ParListPrint titulo="Contactos clave" items={contactos} />
      </div>

      {d.notas && (
        <div className="note"><b>Notas de producción:</b> {d.notas}</div>
      )}
    </div>
  );
}

function ParListPrint({ titulo, items }: { titulo: string; items: Par[] }) {
  return (
    <div className="mini">
      <h4><span className="hex"></span>{titulo}</h4>
      {items.length === 0 ? <p>—</p> : (
        <ul>
          {items.map((it, i) => (
            <li key={i}><span>{it.label}</span><span>{it.valor}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
