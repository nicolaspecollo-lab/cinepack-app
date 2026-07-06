"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { CarpetaArchivos } from "./HerramientaPanel";
import DossierConvocatoria from "./DossierConvocatoria";
import {
  CAMPOS_POR_TIPO,
  CAMPO_TITULAR,
  COLOR_ETAPA,
  TIPOS_EVENTO,
  DEPTOS_EDITORES_CALENDARIO,
  type EventoProyecto,
  type EventoTipo,
} from "./eventosCalendario";

type Jornada = { fecha: string; dia_numero: number; dia_total: number; ubicacion: string | null; escenas_dia: string | null; citacion: string | null };

type ChipEvento =
  | { kind: "evento"; ev: EventoProyecto }
  | { kind: "jornada"; j: Jornada };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function CalendarioProyecto({
  departamento,
  cargo,
  isAdmin,
  fullName,
}: {
  departamento: string;
  cargo?: string | null;
  isAdmin?: boolean;
  fullName: string;
}) {
  const t = useTranslations("ciclo");
  const tEt = useTranslations("etapas");
  const locale = useLocale();
  const hoy = new Date();
  const [cursor, setCursor] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [eventos, setEventos] = useState<EventoProyecto[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [selDia, setSelDia] = useState<string | null>(iso(hoy));
  const [edit, setEdit] = useState<EventoProyecto | "nuevo" | null>(null);
  const [dossier, setDossier] = useState<EventoProyecto | null>(null);
  const [editablesDeptos, setEditablesDeptos] = useState<string[]>([]);

  const jefeCargo = JERARQUIA_POR_DEPARTAMENTO[departamento]?.[0];
  const esJefe = !!cargo && cargo === jefeCargo;
  const puedeEditar =
    !!isAdmin ||
    (departamento === "Ejecutivo" && esJefe) ||
    (DEPTOS_EDITORES_CALENDARIO.includes(departamento) && esJefe && editablesDeptos.includes(departamento));

  const load = useCallback(async () => {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
    if (!projectId) return;
    const supabase = createClient();
    const [{ data: evs }, { data: jor }, { data: eds }] = await Promise.all([
      supabase.from("eventos_proyecto").select("*").eq("project_id", projectId).order("fecha", { ascending: true }),
      supabase.from("jornadas").select("fecha, dia_numero, dia_total, ubicacion, escenas_dia, citacion").eq("project_id", projectId).not("fecha", "is", null),
      supabase.from("calendario_editores").select("departamento, habilitado").eq("project_id", projectId),
    ]);
    setEventos((evs ?? []) as EventoProyecto[]);
    setJornadas((jor ?? []) as Jornada[]);
    setEditablesDeptos(((eds ?? []) as { departamento: string; habilitado: boolean }[]).filter((e) => e.habilitado).map((e) => e.departamento));
  }, []);

  useEffect(() => { load(); }, [load]);

  // La línea de tiempo puede pedir abrir un día concreto.
  useEffect(() => {
    const h = (e: Event) => {
      const fecha = (e as CustomEvent<{ fecha: string }>).detail?.fecha;
      if (!fecha) return;
      const d = new Date(`${fecha}T00:00:00`);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
      setSelDia(fecha);
      setEdit(null);
    };
    window.addEventListener("cp-cal-open", h);
    return () => window.removeEventListener("cp-cal-open", h);
  }, []);

  // La línea de tiempo puede pedir abrir el dossier de un evento por id.
  useEffect(() => {
    const h = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      const ev = eventos.find((x) => x.id === id);
      if (ev) setDossier(ev);
    };
    window.addEventListener("cp-dossier-open", h);
    return () => window.removeEventListener("cp-dossier-open", h);
  }, [eventos]);

  const porDia = useMemo(() => {
    const map = new Map<string, ChipEvento[]>();
    for (const ev of eventos) {
      const arr = map.get(ev.fecha) ?? [];
      arr.push({ kind: "evento", ev });
      map.set(ev.fecha, arr);
    }
    for (const j of jornadas) {
      if (!j.fecha) continue;
      const arr = map.get(j.fecha) ?? [];
      arr.push({ kind: "jornada", j });
      map.set(j.fecha, arr);
    }
    return map;
  }, [eventos, jornadas]);

  const semanas = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);
  const mesLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(cursor.y, cursor.m, 1)),
    [cursor, locale]
  );
  const diasSemana = useMemo(() => {
    const base = new Date(2024, 0, 1); // lunes
    return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
  }, [locale]);

  function mover(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  async function guardar(ev: { id?: string; fecha: string; tipo: EventoTipo; datos: Record<string, string>; aviso_dias: number }) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const titulo = ev.datos[CAMPO_TITULAR[ev.tipo]] ?? "";
    if (ev.id) {
      await supabase.from("eventos_proyecto").update({ fecha: ev.fecha, tipo: ev.tipo, titulo, datos: ev.datos, aviso_dias: ev.aviso_dias, updated_at: new Date().toISOString() }).eq("id", ev.id);
    } else {
      await supabase.from("eventos_proyecto").insert({ project_id: projectId, fecha: ev.fecha, tipo: ev.tipo, titulo, datos: ev.datos, aviso_dias: ev.aviso_dias, creado_por: fullName, creado_por_id: auth.user?.id ?? null });
    }
    setEdit(null);
    await load();
    window.dispatchEvent(new CustomEvent("cp-cal-changed"));
  }

  async function borrar(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    const supabase = createClient();
    await supabase.from("eventos_proyecto").delete().eq("id", id);
    setEdit(null);
    await load();
    window.dispatchEvent(new CustomEvent("cp-cal-changed"));
  }

  const chipsDelDia = selDia ? porDia.get(selDia) ?? [] : [];

  return (
    <div className="cal-wrap" id="cp-calendario">
      <div className="cal-head">
        <span className="cal-title"><span className="hex" /> {t("calendarTitle")}</span>
        <span className="cal-sub">{t("calendarSub")}</span>
      </div>

      <div className="cal-nav">
        <button className="cal-navbtn" onClick={() => mover(-1)} aria-label={t("prevMonth")}>‹</button>
        <span className="cal-month">{mesLabel}</span>
        <button className="cal-navbtn" onClick={() => mover(1)} aria-label={t("nextMonth")}>›</button>
        <span className="cal-spacer" />
        {puedeEditar && <button className="cp-btn cp-btn-acc" onClick={() => { setEdit("nuevo"); }}>{t("newEvent")}</button>}
      </div>

      <div className="cal-grid">
        {diasSemana.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
        {semanas.map((cell, i) => {
          if (!cell) return <div key={i} className="cal-cell cal-cell-empty" />;
          const chips = porDia.get(cell) ?? [];
          const esHoy = cell === iso(hoy);
          const esSel = cell === selDia;
          const dnum = Number(cell.slice(8, 10));
          return (
            <div key={i} className={`cal-cell ${esSel ? "sel" : ""} ${esHoy ? "hoy" : ""}`} onClick={() => { setSelDia(cell); setEdit(null); }}>
              <div className="cal-daynum">{dnum}</div>
              <div className="cal-chips">
                {chips.slice(0, 3).map((c, k) => {
                  const color = c.kind === "evento" ? COLOR_ETAPA[c.ev.tipo] : COLOR_ETAPA.rodaje;
                  const label = c.kind === "evento" ? (c.ev.titulo || tEt(c.ev.tipo)) : `D${c.j.dia_numero}`;
                  return <span key={k} className="cal-chip" style={{ background: color }}>{label}</span>;
                })}
                {chips.length > 3 && <span className="cal-more">+{chips.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {edit ? (
        <EventoForm
          inicial={edit === "nuevo" ? null : edit}
          fechaDefecto={selDia ?? iso(hoy)}
          departamento={departamento}
          onGuardar={guardar}
          onBorrar={borrar}
          onCancelar={() => setEdit(null)}
        />
      ) : selDia ? (
        <div className="cal-prev">
          <div className="cal-prev-head">
            <span className="cal-prev-fecha">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${selDia}T00:00:00`))}</span>
          </div>
          {chipsDelDia.length === 0 ? (
            <p className="cal-prev-empty">{t("noEvents")}</p>
          ) : (
            <div className="cal-prev-list">
              {chipsDelDia.map((c, k) => c.kind === "evento" ? (
                <div key={k} className="cal-prev-item" style={{ borderLeftColor: COLOR_ETAPA[c.ev.tipo] }}>
                  <div className="cal-prev-item-head">
                    <span className="cal-prev-item-tipo" style={{ color: COLOR_ETAPA[c.ev.tipo] }}>{tEt(c.ev.tipo)}</span>
                    <span className="cal-prev-item-title">{c.ev.titulo || tEt(c.ev.tipo)}</span>
                    <span className="cal-prev-item-actions">
                      <button className="cp-btn cp-btn-acc" onClick={() => setDossier(c.ev)}>{t("openDossier")}</button>
                      {puedeEditar && <button className="cp-btn" onClick={() => setEdit(c.ev)}>{t("edit")}</button>}
                      {puedeEditar && <button className="cp-btn" onClick={() => borrar(c.ev.id)}>{t("delete")}</button>}
                    </span>
                  </div>
                  <div className="cal-prev-fields">
                    {CAMPOS_POR_TIPO[c.ev.tipo].filter((f) => c.ev.datos?.[f.key]).map((f) => (
                      <div key={f.key} className="cal-prev-field"><span>{f.label}</span><b>{c.ev.datos[f.key]}</b></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={k} className="cal-prev-item" style={{ borderLeftColor: COLOR_ETAPA.rodaje }}>
                  <div className="cal-prev-item-head">
                    <span className="cal-prev-item-tipo" style={{ color: COLOR_ETAPA.rodaje }}>{tEt("rodaje")}</span>
                    <span className="cal-prev-item-title">{t("shootDay", { n: c.j.dia_numero, total: c.j.dia_total })}</span>
                    <span className="cal-prev-item-badge">{t("fromShootPlan")}</span>
                  </div>
                  <div className="cal-prev-fields">
                    {c.j.escenas_dia && <div className="cal-prev-field"><span>{t("fScenes")}</span><b>{c.j.escenas_dia}</b></div>}
                    {c.j.ubicacion && <div className="cal-prev-field"><span>{t("fLocation")}</span><b>{c.j.ubicacion}</b></div>}
                    {c.j.citacion && <div className="cal-prev-field"><span>{t("fCall")}</span><b>{c.j.citacion}</b></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {dossier && <DossierConvocatoria evento={dossier} editable={puedeEditar} onClose={() => setDossier(null)} />}
    </div>
  );
}

function EventoForm({
  inicial,
  fechaDefecto,
  departamento,
  onGuardar,
  onBorrar,
  onCancelar,
}: {
  inicial: EventoProyecto | null;
  fechaDefecto: string;
  departamento: string;
  onGuardar: (ev: { id?: string; fecha: string; tipo: EventoTipo; datos: Record<string, string>; aviso_dias: number }) => void;
  onBorrar: (id: string) => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("ciclo");
  const tEt = useTranslations("etapas");
  const [tipo, setTipo] = useState<EventoTipo>(inicial?.tipo ?? "financiacion");
  const [fecha, setFecha] = useState(inicial?.fecha ?? fechaDefecto);
  const [datos, setDatos] = useState<Record<string, string>>(inicial?.datos ?? {});
  const [aviso, setAviso] = useState(inicial?.aviso_dias ?? 7);

  const campos = CAMPOS_POR_TIPO[tipo];

  return (
    <div className="cal-form" style={{ borderTopColor: COLOR_ETAPA[tipo] }}>
      <div className="cal-form-head">
        <span className="cal-form-title">{inicial ? t("editEvent") : t("newEventOn", { fecha })}</span>
        <span className="cal-form-tlabel">{t("eventType")}</span>
      </div>

      <div className="cal-seg">
        {TIPOS_EVENTO.map((tp) => (
          <button
            key={tp}
            className={`cal-seg-btn ${tp === tipo ? "on" : ""}`}
            style={tp === tipo ? { background: COLOR_ETAPA[tp], borderColor: COLOR_ETAPA[tp], color: "#0D0D12" } : undefined}
            onClick={() => setTipo(tp)}
          >
            {tEt(tp)}
          </button>
        ))}
      </div>

      <div className="cal-form-grid">
        <label className="cal-field">
          <span>{t("fDate")}</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        {campos.map((c) => (
          <label key={c.key} className={`cal-field ${c.tipo === "largo" ? "wide" : ""}`}>
            <span>{c.label}</span>
            {c.tipo === "largo" ? (
              <textarea rows={2} value={datos[c.key] ?? ""} onChange={(e) => setDatos((d) => ({ ...d, [c.key]: e.target.value }))} />
            ) : (
              <input
                type={c.tipo === "money" ? "number" : "text"}
                value={datos[c.key] ?? ""}
                onChange={(e) => setDatos((d) => ({ ...d, [c.key]: e.target.value }))}
              />
            )}
          </label>
        ))}
        <label className="cal-field">
          <span>{t("fAlert")}</span>
          <input type="number" min={0} value={aviso} onChange={(e) => setAviso(Number(e.target.value))} />
        </label>
      </div>

      {inicial && (
        <div className="cal-form-files">
          <CarpetaArchivos departamento={departamento} herramientaId={`evento-${inicial.id}`} editable={true} />
        </div>
      )}

      <div className="cal-form-actions">
        <button className="cp-btn cp-btn-acc" onClick={() => onGuardar({ id: inicial?.id, fecha, tipo, datos, aviso_dias: aviso })}>{t("save")}</button>
        <button className="cp-btn" onClick={onCancelar}>{t("cancel")}</button>
        {inicial && <button className="cp-btn cal-del" onClick={() => onBorrar(inicial.id)}>{t("delete")}</button>}
      </div>
    </div>
  );
}

// Devuelve celdas del mes (lunes-primero); null = relleno.
function buildMonth(y: number, m: number): (string | null)[] {
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const dias = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dias; d++) cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
