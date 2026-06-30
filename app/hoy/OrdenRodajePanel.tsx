"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GENERAL_ORDEN_RODAJE } from "../herramientas";
import { PrintHeader, EstadoSeg, CarpetaArchivos } from "./HerramientaPanel";
import Icon from "../components/Icon";

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
// Editor en-app: orden del día cinematográfico (CINEPACK). La impresión y la
// exportación siguen usando CallsheetPrint (formato estándar de la industria).
function odTono(intext: string, dn: string): "intdia" | "intnoche" | "extdia" | "extnoche" {
  const ext = /ext/i.test(intext);
  const noche = /noche|atardecer/i.test(dn);
  if (ext) return noche ? "extnoche" : "extdia";
  return noche ? "intnoche" : "intdia";
}

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
  const d = fila.datos;
  const citaciones = parseJSON<Par[]>(d.citaciones, []);
  const localizaciones = parseJSON<Par[]>(d.localizaciones, []);
  const llamadas = parseJSON<Par[]>(d.llamadas, []);
  const reparto = parseJSON<Par[]>(d.reparto_individual, []);
  const contactos = parseJSON<Par[]>(d.contactos, []);
  const escenas = parseJSON<Escena[]>(d.escenas, []);
  const climaChips = (d.clima ?? "").split("·").map((s) => s.trim()).filter(Boolean);
  // Citación general: la primera hora que aparezca en las citaciones de equipo.
  const horaGeneral = [...citaciones, ...llamadas].map((p) => p.valor).find((v) => /\d{1,2}:\d{2}/.test(v)) ?? "—";

  return (
    <>
      <div className="od-actionbar">
        <button className="cp-btn cp-btn-acc" onClick={onImprimir}><Icon name="file-text" size={13} /> {t("printView")}</button>
        <button className="cp-btn" onClick={onBorrar}><Icon name="trash" size={13} /> {t("deleteDay")}</button>
      </div>

      <div className="od-head">
        <div className="od-head-l">
          <span className="od-pill">{t("title")}</span>
          <div className="od-titlewrap">
            <input className="od-mainset" defaultValue={d.set_principal ?? ""} placeholder={t("fieldMainSet")} onBlur={(e) => onGuardar({ set_principal: e.target.value })} />
            <input className="od-prodco" defaultValue={d.productora ?? ""} placeholder={t("fieldProductionCo")} onBlur={(e) => onGuardar({ productora: e.target.value })} />
          </div>
        </div>
        <div className="od-head-r">
          <div className="od-metric"><span className="od-metric-l">{t("fieldDay")}</span><input className="od-metric-v od-day" defaultValue={d.dia ?? ""} onBlur={(e) => onGuardar({ dia: e.target.value })} /></div>
          <div className="od-metric"><span className="od-metric-l">{t("fieldDate")}</span><input className="od-metric-v od-date" type="date" defaultValue={d.fecha ?? ""} onBlur={(e) => onGuardar({ fecha: e.target.value })} /></div>
          <div className="od-metric od-metric-acc"><span className="od-metric-l">{t("generalCalls")}</span><span className="od-metric-v od-call">{horaGeneral}</span></div>
        </div>
      </div>

      <div className="od-cond">
        {climaChips.length > 0 && (
          <div className="od-cond-chips">
            <Icon name="sun" size={16} />
            {climaChips.map((c, i) => <span className="od-chip" key={i}>{c}</span>)}
          </div>
        )}
        <input className="od-cond-edit" defaultValue={d.clima ?? ""} placeholder={t("fieldWeather")} onBlur={(e) => onGuardar({ clima: e.target.value })} />
      </div>

      <div className="od-meta">
        <OdField label={t("fieldSecondarySet")} value={d.set_secundario ?? ""} onSave={(v) => onGuardar({ set_secundario: v })} />
        <OdField label={t("fieldUnit")} value={d.unidad ?? ""} onSave={(v) => onGuardar({ unidad: v })} />
        <OdField label={t("fieldSceneSummary")} value={d.escenas_resumen ?? ""} onSave={(v) => onGuardar({ escenas_resumen: v })} placeholder="6 · 9 1/8" />
      </div>

      <OdSection icon="film" title={t("dayScenes")} extra={d.escenas_resumen}>
        <EscenasStrips items={escenas} onChange={(v) => onGuardar({ escenas: JSON.stringify(v) })} />
      </OdSection>

      <OdSection icon="users" title={t("individualCast")}>
        <OdParList items={reparto} onChange={(v) => onGuardar({ reparto_individual: JSON.stringify(v) })} ph={[t("phCharActor"), t("phHourMakeup")]} />
      </OdSection>

      <div className="od-2col">
        <OdSection icon="clock" title={t("generalCalls")}>
          <OdParList items={citaciones} onChange={(v) => onGuardar({ citaciones: JSON.stringify(v) })} ph={[t("phCrew"), t("phTime")]} />
        </OdSection>
        <OdSection icon="clock" title={t("deptCalls")}>
          <OdParList items={llamadas} onChange={(v) => onGuardar({ llamadas: JSON.stringify(v) })} ph={[t("phDept"), t("phHour")]} />
        </OdSection>
      </div>

      <div className="od-2col">
        <OdSection icon="map-pin" title={t("locations")}>
          <OdParList items={localizaciones} onChange={(v) => onGuardar({ localizaciones: JSON.stringify(v) })} ph={[t("phLocName"), t("phLocNote")]} />
        </OdSection>
        <OdSection icon="phone" title={t("keyContacts")}>
          <OdParList items={contactos} onChange={(v) => onGuardar({ contactos: JSON.stringify(v) })} ph={[t("phRole"), t("phNamePhone")]} />
        </OdSection>
      </div>

      <OdSection icon="alert-triangle" title={t("productionNotes")}>
        <textarea className="od-notas" rows={3} defaultValue={d.notas ?? ""} placeholder={t("productionNotes")} onBlur={(e) => onGuardar({ notas: e.target.value })} />
      </OdSection>

      <OdSection icon="folder" title="">
        <CarpetaArchivos departamento="General" herramientaId={`${GENERAL_ORDEN_RODAJE.id}-${fila.id}`} editable />
      </OdSection>
    </>
  );
}

function OdSection({ icon, title, extra, children }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; extra?: string; children: React.ReactNode }) {
  return (
    <div className="od-sec-wrap">
      {title && (
        <div className="od-sec"><span className="od-sec-ico"><Icon name={icon} size={14} /></span><span className="od-sec-t">{title}</span>{extra && <span className="od-sec-x">{extra}</span>}</div>
      )}
      {children}
    </div>
  );
}

function OdField({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) {
  return (
    <label className="od-field">
      <span>{label}</span>
      <input defaultValue={value} placeholder={placeholder} onBlur={(e) => onSave(e.target.value)} />
    </label>
  );
}

function OdParList({ items, onChange, ph }: { items: Par[]; onChange: (v: Par[]) => void; ph: [string, string] }) {
  const t = useTranslations("orden");
  function set(i: number, key: keyof Par, v: string) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  }
  return (
    <div className="od-list">
      {items.map((it, i) => (
        <div className="od-list-row" key={i}>
          <input className="od-list-label" defaultValue={it.label} placeholder={ph[0]} onBlur={(e) => set(i, "label", e.target.value)} />
          <input className="od-list-val" defaultValue={it.valor} placeholder={ph[1]} onBlur={(e) => set(i, "valor", e.target.value)} />
          <button className="od-x" onClick={() => onChange(items.filter((_, idx) => idx !== i))} title={t("deleteDay")}><Icon name="x" size={12} /></button>
        </div>
      ))}
      <button className="cp-btn od-add" onClick={() => onChange([...items, { label: "", valor: "" }])}><Icon name="plus" size={12} /> {t("add")}</button>
    </div>
  );
}

function EscenasStrips({ items, onChange }: { items: Escena[]; onChange: (v: Escena[]) => void }) {
  const t = useTranslations("orden");
  function set(i: number, key: keyof Escena, v: string) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  }
  const vacia: Escena = { hora: "", esc: "", intext: "", dianoche: "", set: "", personajes: "", paginas: "" };
  return (
    <div className="od-plan">
      {items.map((it, i) => (
        <div className={`od-strip od-${odTono(it.intext, it.dianoche)}`} key={i}>
          <div className="od-strip-r1">
            <input className="od-strip-hora" defaultValue={it.hora} placeholder={t("colTime")} onBlur={(e) => set(i, "hora", e.target.value)} />
            <input className="od-strip-esc" defaultValue={it.esc} placeholder="#" onBlur={(e) => set(i, "esc", e.target.value)} />
            <EstadoSeg valor={it.intext} opciones={["INT", "EXT", "INT/EXT"]} onPick={(v) => set(i, "intext", v)} editable />
            <EstadoSeg valor={it.dianoche} opciones={["Día", "Noche", "Amanecer", "Atardecer"]} onPick={(v) => set(i, "dianoche", v)} editable />
            <input className="od-strip-pag" defaultValue={it.paginas} placeholder="0/8" onBlur={(e) => set(i, "paginas", e.target.value)} />
            <button className="od-x" onClick={() => onChange(items.filter((_, idx) => idx !== i))}><Icon name="x" size={13} /></button>
          </div>
          <div className="od-strip-r2">
            <input className="od-strip-set" defaultValue={it.set} placeholder={t("colSetDesc")} onBlur={(e) => set(i, "set", e.target.value)} />
            <input className="od-strip-chars" defaultValue={it.personajes} placeholder={t("colChars")} onBlur={(e) => set(i, "personajes", e.target.value)} />
          </div>
        </div>
      ))}
      <button className="cp-btn cp-btn-acc od-add" onClick={() => onChange([...items, vacia])}><Icon name="plus" size={13} /> {t("addScene")}</button>
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
