"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const CAMPOS_TEXTO: { key: string; labelKey: string; placeholder?: string }[] = [
  { key: "dia", labelKey: "fieldDay", placeholder: "1/18" },
  { key: "set_principal", labelKey: "fieldMainSet" },
  { key: "set_secundario", labelKey: "fieldSecondarySet" },
  { key: "productora", labelKey: "fieldProductionCo" },
  { key: "unidad", labelKey: "fieldUnit" },
  { key: "clima", labelKey: "fieldWeather", placeholder: "☀️ 18°/27° · 🌅 06:48 · 🌇 21:42 · 💨 12 km/h" },
  { key: "escenas_resumen", labelKey: "fieldSceneSummary", placeholder: "6 · 9 1/8" },
];

export default function OrdenRodajePanel({ fullName, canEdit = true }: { fullName: string; canEdit?: boolean }) {
  const t = useTranslations("orden");
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
    if (!window.confirm(t("confirmDeleteDay"))) return;
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
        <h4>{t("loading")}</h4>
      </div>
    );
  }

  const f = filas.find((x) => x.id === activa);

  return (
    <div className="hp-open">
      {!canEdit && (
        <div className="gen-readonly-banner">
          <span className="hex"></span>
          {t("readonlyBanner", { d1: "Dirección", d2: "Producción" })}
        </div>
      )}
      <div className="hp-open-head"><h3><span className="hex"></span> {t("title")}</h3></div>
      <p className="hp-hint">{GENERAL_ORDEN_RODAJE.hint}</p>

      <div className="dsubtabs" style={{ padding: "0 30px" }}>
        {filas.map((row) => (
          <button
            key={row.id}
            className={`dsubtab ${activa === row.id && modo === "editar" ? "active" : ""}`}
            onClick={() => { setActiva(row.id); setModo("editar"); }}
          >
            {t("dayTab", { n: row.datos.dia || "—" })}
          </button>
        ))}
        {canEdit && <button className="dsubtab" onClick={nuevaJornada}>{t("newDay")}</button>}
      </div>

      {!f && (
        <div className="soon-box" style={{ marginTop: 0 }}>
          <span className="hex"></span>
          <h4>{t("noDaysYet")}</h4>
          <p>{t("noDaysDesc")}</p>
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
  const t = useTranslations("orden");
  const citaciones = parseJSON<Par[]>(fila.datos.citaciones, []);
  const localizaciones = parseJSON<Par[]>(fila.datos.localizaciones, []);
  const llamadas = parseJSON<Par[]>(fila.datos.llamadas, []);
  const reparto = parseJSON<Par[]>(fila.datos.reparto_individual, []);
  const contactos = parseJSON<Par[]>(fila.datos.contactos, []);
  const escenas = parseJSON<Escena[]>(fila.datos.escenas, []);

  return (
    <>
      <div className="hp-actions" style={{ paddingBottom: 0 }}>
        <button className="btn acc" onClick={onImprimir}>{t("printView")}</button>
        <button className="hp-del" onClick={onBorrar}>{t("deleteDay")}</button>
      </div>

      <div className="hp-ficha" style={{ padding: "16px 30px" }}>
        {CAMPOS_TEXTO.map((c) => (
          <label className="hp-ficha-field" key={c.key}>
            <span>{t(c.labelKey)}</span>
            <input
              type={c.key === "fecha" ? "date" : "text"}
              defaultValue={fila.datos[c.key] ?? ""}
              placeholder={c.placeholder}
              onBlur={(e) => onGuardar({ [c.key]: e.target.value })}
            />
          </label>
        ))}
        <label className="hp-ficha-field" key="fecha">
          <span>{t("fieldDate")}</span>
          <input type="date" defaultValue={fila.datos.fecha ?? ""} onBlur={(e) => onGuardar({ fecha: e.target.value })} />
        </label>
      </div>

      <div className="grid2" style={{ padding: "0 30px 22px" }}>
        <ParListEditor titulo={t("generalCalls")} items={citaciones} onChange={(v) => onGuardar({ citaciones: JSON.stringify(v) })} placeholders={[t("phCrew"), t("phTime")]} />
        <ParListEditor titulo={t("locations")} items={localizaciones} onChange={(v) => onGuardar({ localizaciones: JSON.stringify(v) })} placeholders={[t("phLocName"), t("phLocNote")]} />
        <ParListEditor titulo={t("deptCalls")} items={llamadas} onChange={(v) => onGuardar({ llamadas: JSON.stringify(v) })} placeholders={[t("phDept"), t("phHour")]} />
        <ParListEditor titulo={t("individualCast")} items={reparto} onChange={(v) => onGuardar({ reparto_individual: JSON.stringify(v) })} placeholders={[t("phCharActor"), t("phHourMakeup")]} />
        <ParListEditor titulo={t("keyContacts")} items={contactos} onChange={(v) => onGuardar({ contactos: JSON.stringify(v) })} placeholders={[t("phRole"), t("phNamePhone")]} />
      </div>

      <div className="tool" style={{ margin: "0 30px 22px" }}>
        <div className="tool-head"><span className="hex"></span><h3>{t("dayScenes")}</h3></div>
        <div style={{ padding: "14px 18px" }}>
          <EscenasEditor items={escenas} onChange={(v) => onGuardar({ escenas: JSON.stringify(v) })} />
        </div>
      </div>

      <label className="hp-ficha-field" style={{ padding: "0 30px 30px", display: "block" }}>
        <span>{t("productionNotes")}</span>
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
  const t = useTranslations("orden");
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
      <button className="btn" onClick={() => onChange([...items, { label: "", valor: "" }])}>{t("add")}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
const ESC_COLS: { key: keyof Escena; labelKey: string; w?: number }[] = [
  { key: "hora", labelKey: "colTime", w: 70 },
  { key: "esc", labelKey: "colScene", w: 50 },
  { key: "intext", labelKey: "colIntExt", w: 70 },
  { key: "dianoche", labelKey: "colDayNight", w: 90 },
  { key: "set", labelKey: "colSetDesc" },
  { key: "personajes", labelKey: "colChars" },
  { key: "paginas", labelKey: "colPages", w: 60 },
];

function EscenasEditor({ items, onChange }: { items: Escena[]; onChange: (v: Escena[]) => void }) {
  const t = useTranslations("orden");
  function set(i: number, key: keyof Escena, v: string) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  }
  const vacia: Escena = { hora: "", esc: "", intext: "", dianoche: "", set: "", personajes: "", paginas: "" };
  return (
    <div className="hp-table-wrap">
      <table className="hp-table">
        <thead>
          <tr>
            {ESC_COLS.map((c) => <th key={c.key} style={{ width: c.w }}>{t(c.labelKey)}</th>)}
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
        <button className="btn acc" onClick={() => onChange([...items, vacia])}>{t("addScene")}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CallsheetPrint({ fila, onVolver }: { fila: Fila; onVolver: () => void }) {
  const t = useTranslations("orden");
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
        <button className="btn" onClick={onVolver}>{t("backToEdit")}</button>
        <button className="print-btn" onClick={() => window.print()}>{t("exportPrint")}</button>
      </div>

      <PrintHeader herramientaNombre={t("printDocTitle")} departamento="Producción" />

      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>{t("callsheetTitle")}</h3>
          <span className="tag">{t("dayTab", { n: d.dia || "—" })}</span>
          <div className="right">{fecha}</div>
        </div>
        <p className="tool-sub">
          {t("mainLocLabel")} <b style={{ color: "var(--text)" }}>{d.set_principal || "—"}</b>
          {d.set_secundario && <>{t("secondaryLabel")}<b style={{ color: "var(--text)" }}>{d.set_secundario}</b></>}
          {d.productora && <>{t("prodCoLabel")}{d.productora}</>}
          {d.unidad && <>{t("unitLabel")}{d.unidad}</>}
        </p>
        {d.clima && (
          <div className="chips" style={{ padding: "0 18px 14px" }}>
            {d.clima.split("·").map((c, i) => <span className="chip" key={i}>{c.trim()}</span>)}
          </div>
        )}
      </div>

      <div className="grid2">
        <ParListPrint titulo={t("generalCalls")} items={citaciones} />
        <ParListPrint titulo={t("locations")} items={localizaciones} />
        <ParListPrint titulo={t("deptCalls")} items={llamadas} />
      </div>

      <div className="tool">
        <div className="tool-head"><span className="hex"></span><h3>{t("dayScenes")}</h3><div className="right">{d.escenas_resumen || t("scenesFallback", { n: escenas.length })}</div></div>
        <div className="twrap">
          <table className="t">
            <tr><th>{t("colTime")}</th><th>{t("colScene")}</th><th>{t("colIntExt")}</th><th>{t("colDayNight")}</th><th>{t("colSetDesc")}</th><th>{t("colChars")}</th><th>{t("colPages")}</th></tr>
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
        <ParListPrint titulo={t("individualCast")} items={reparto} />
        <ParListPrint titulo={t("keyContacts")} items={contactos} />
      </div>

      {d.notas && (
        <div className="note"><b>{t("prodNotesLabel")}</b> {d.notas}</div>
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
