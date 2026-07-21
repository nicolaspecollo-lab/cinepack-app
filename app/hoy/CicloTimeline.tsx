"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  CICLO_SELECT,
  ETAPAS,
  fechasCicloDesdeFila,
  resumenCiclo,
  type EtapaKey,
  type EtapaResumen,
} from "./cicloVida";
import {
  COLOR_ETAPA,
  CAMPO_TITULAR,
  CAMPOS_POR_TIPO,
  type EventoProyecto,
} from "./eventosCalendario";

type PuntoBase =
  | { kind: "hito"; etapa: EtapaKey; fecha: string; x: number }
  | { kind: "evento"; ev: EventoProyecto; fecha: string; x: number };
// `x` queda pisado por la posición visual ajustada (ver asignarCarriles);
// `xReal` conserva la posición cronológica original, sin usar por ahora pero
// disponible si hiciera falta compararla.
type Punto = PuntoBase & { carril: 0 | 1; xReal: number };

const DIA = 86400000;
const ms = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 8;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
const distTouch = (a: React.Touch | Touch, b: React.Touch | Touch) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

// Solo 2 carriles (arriba/abajo) — pedido explícito: nada de apilar más
// niveles. Cuando dos convocatorias quedan cerca en el tiempo, se separa su
// posición VISUAL en el eje horizontal lo necesario para que el texto
// entre, sin importar si en el calendario están a un día o a 15.
//
// El margen mínimo es GLOBAL entre eventos (no por carril): el símbolo (el
// rombo sobre la línea) queda siempre a la misma altura sin importar si su
// etiqueta va arriba o abajo, así que dos puntos en carriles distintos pero
// con fechas muy cercanas terminaban con los DOS símbolos en el mismo
// lugar — "un solo símbolo alojando dos hitos". Al exigir el margen contra
// el último punto puesto en CUALQUIER carril, cada símbolo queda su propio
// lugar en la línea, siempre.
//
// Los HITOS DE ETAPA (Desarrollo/Financiación/...) quedan aparte y NUNCA se
// mueven de su fecha real: marcan el borde exacto de los segmentos de color
// de fondo (`segmentos`, calculados por separado con la misma fecha) — si
// se los movía junto con las convocatorias, el rombo de una etapa terminaba
// sobre el segmento de OTRA etapa (colores mezclados) o directamente se
// perdía el marcador de inicio de una etapa. Son pocos y ya están separados
// en el tiempo por naturaleza (una fecha por etapa), así que solo alternan
// carril para la etiqueta, sin el ajuste de posición.
//
// GAP_MIN_PX = 160 porque la etiqueta (.ct-lab) mide 148px de ancho
// centrada en el punto (left:-74px).
const GAP_MIN_PX = 160;
function asignarCarriles(puntos: PuntoBase[]): Punto[] {
  const eventos = puntos.filter((p) => p.kind === "evento").sort((a, b) => a.x - b.x);
  const hitos = puntos.filter((p) => p.kind === "hito").sort((a, b) => a.x - b.x);

  let ultimoX = -Infinity;
  const eventosConCarril: Punto[] = eventos.map((p, i) => {
    const xVisual = Math.max(p.x, ultimoX + GAP_MIN_PX);
    ultimoX = xVisual;
    return { ...p, x: xVisual, xReal: p.x, carril: (i % 2 === 0 ? 0 : 1) as 0 | 1 };
  });

  const hitosConCarril: Punto[] = hitos.map((p, i) => ({
    ...p, xReal: p.x, carril: (i % 2 === 0 ? 0 : 1) as 0 | 1,
  }));

  return [...hitosConCarril, ...eventosConCarril].sort((a, b) => a.x - b.x);
}

export default function CicloTimeline() {
  const t = useTranslations("ciclo");
  const tEt = useTranslations("etapas");
  const railRef = useRef<HTMLDivElement>(null);
  const [nombre, setNombre] = useState<string>("");
  const [ciclo, setCiclo] = useState<EtapaResumen[]>([]);
  const [fechas, setFechas] = useState<Record<EtapaKey, string | null> | null>(null);
  const [eventos, setEventos] = useState<EventoProyecto[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const load = useCallback(async () => {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
    if (!projectId) { setLoading(false); return; }
    const supabase = createClient();
    const [{ data: proyecto }, { data: evs }] = await Promise.all([
      supabase.from("proyectos").select(`nombre, ${CICLO_SELECT}`).eq("id", projectId).single(),
      supabase.from("eventos_proyecto").select("*").eq("project_id", projectId).order("fecha", { ascending: true }),
    ]);
    setNombre(proyecto?.nombre ?? "");
    const f = fechasCicloDesdeFila(proyecto as Record<string, string | null> | null);
    setFechas(f);
    setCiclo(resumenCiclo(f));
    setEventos((evs ?? []) as EventoProyecto[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("cp-cal-changed", h);
    return () => window.removeEventListener("cp-cal-changed", h);
  }, [load]);

  const etapaActual = useMemo(() => {
    const enCurso = ciclo.find((e) => e.enCurso);
    if (enCurso) return enCurso;
    return ciclo.find((e) => e.estado === "pendiente" && e.inicio) ?? ciclo.find((e) => e.inicio) ?? null;
  }, [ciclo]);

  // Dominio temporal y escala.
  const { puntos, width, hoyX, segmentos } = useMemo(() => {
    const etapasDef = ETAPAS
      .map((e) => ({ key: e.key, inicio: fechas?.[e.key] ?? null }))
      .filter((e): e is { key: EtapaKey; inicio: string } => !!e.inicio)
      .sort((a, b) => ms(a.inicio) - ms(b.inicio));

    const fechasTodas = [
      ...etapasDef.map((e) => ms(e.inicio)),
      ...eventos.map((e) => ms(e.fecha)),
      Date.now(),
    ].filter((n) => !isNaN(n));

    if (fechasTodas.length === 0) {
      return { puntos: [] as Punto[], width: 700, hoyX: 60, segmentos: [] as { x1: number; x2: number; color: string }[] };
    }
    const min = Math.min(...fechasTodas) - 10 * DIA;
    const max = Math.max(...fechasTodas) + 20 * DIA;
    const dias = Math.max(1, (max - min) / DIA);
    const pad = 60;
    const pxDia = Math.min(3.4, Math.max(1.4, 1300 / dias)) * zoom;
    const anchoBase = Math.max(700, dias * pxDia + pad * 2);
    const xDe = (m: number) => pad + ((m - min) / DIA) * pxDia;

    const puntos: Punto[] = asignarCarriles([
      ...etapasDef.map((e) => ({ kind: "hito" as const, etapa: e.key, fecha: e.inicio, x: xDe(ms(e.inicio)) })),
      ...eventos.map((e) => ({ kind: "evento" as const, ev: e, fecha: e.fecha, x: xDe(ms(e.fecha)) })),
    ]);

    // Si separar convocatorias muy juntas empujó algún punto más allá del
    // ancho cronológico, la pista crece para que no queden pisados contra
    // el borde derecho.
    const maxX = puntos.reduce((m, p) => Math.max(m, p.x), 0);
    const width = Math.max(anchoBase, maxX + pad);

    const segmentos = etapasDef.map((e, i) => {
      const x1 = xDe(ms(e.inicio));
      const x2 = i + 1 < etapasDef.length ? xDe(ms(etapasDef[i + 1].inicio)) : width - pad / 2;
      return { x1, x2, color: COLOR_ETAPA[e.key] };
    });

    return { puntos, width, hoyX: xDe(Date.now()), segmentos };
  }, [fechas, eventos, zoom]);

  // Arrastre horizontal + zoom (rueda con Ctrl = pellizco de trackpad, y
  // pellizco táctil real con 2 dedos). Efecto montado una sola vez (no
  // depende de `width`, que cambia con cada paso de zoom) para no perder el
  // estado de un gesto de pellizco a mitad de camino.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let down = false, moved = false, sx = 0, sl = 0;
    const dn = (e: PointerEvent) => { down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; el.style.cursor = "grabbing"; };
    const mv = (e: PointerEvent) => { if (down) { if (Math.abs(e.clientX - sx) > 5) moved = true; el.scrollLeft = sl - (e.clientX - sx); } };
    const up = () => { down = false; el.style.cursor = "grab"; };
    el.addEventListener("pointerdown", dn);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    (el as HTMLElement & { _moved?: () => boolean })._moved = () => moved;

    // Trackpad: los navegadores emiten "wheel" con ctrlKey=true cuando el
    // usuario hace un gesto de pellizco (pinch) sobre el trackpad.
    const wh = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z * (1 - e.deltaY * 0.01)));
    };
    el.addEventListener("wheel", wh, { passive: false });

    // Táctil: pellizco real con 2 dedos (móvil/tablet).
    let pinchDist = 0;
    let pinchZoom = 1;
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchDist = distTouch(e.touches[0], e.touches[1]);
        pinchZoom = zoomRef.current;
      }
    };
    const tm = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        const d = distTouch(e.touches[0], e.touches[1]);
        setZoom(clampZoom(pinchZoom * (d / pinchDist)));
      }
    };
    const te = () => { pinchDist = 0; };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te);

    return () => {
      el.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wh);
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
    };
  }, []);

  function abrirEnCalendario(fecha: string) {
    window.dispatchEvent(new CustomEvent("cp-cal-open", { detail: { fecha } }));
    document.getElementById("cp-calendario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function abrirDossier(id: string) {
    window.dispatchEvent(new CustomEvent("cp-dossier-open", { detail: { id } }));
  }

  if (loading) return null;
  if (!etapaActual && puntos.length === 0) {
    return (
      <div className="ct-wrap">
        <div className="ct-empty">
          <span className="hex" />
          <p>{t("emptyTitle")}</p>
          <span className="ct-empty-hint">{t("emptyHint")}</span>
        </div>
      </div>
    );
  }

  const selPunto = puntos.find((p) => (p.kind === "hito" ? `h-${p.etapa}` : `e-${p.ev.id}`) === sel) ?? null;

  return (
    <div className="ct-wrap">
      <div className="ct-head">
        <div className="ct-head-etapa">
          <div className="ct-eyebrow"><span className="hex" /> {t("stageLabel")}</div>
          {etapaActual ? (
            <div className="ct-etapa-row">
              <span className="ct-etapa-name">{tEt(etapaActual.key)}</span>
              {etapaActual.inicio && (
                <span className="ct-etapa-range">
                  {fmt(etapaActual.inicio)} <span className="ct-al">{t("al")}</span> {fmtFin(ciclo, etapaActual.key)}
                </span>
              )}
            </div>
          ) : (
            <div className="ct-etapa-row"><span className="ct-etapa-name">{nombre}</span></div>
          )}
        </div>
        {etapaActual && etapaActual.enCurso && (
          <div className="ct-progress">
            <div className="ct-progress-bar"><span style={{ width: `${pct(etapaActual)}%`, background: COLOR_ETAPA[etapaActual.key] }} /></div>
            <span className="ct-progress-txt">{t("dayOf", { n: etapaActual.dias ?? 0 })}</span>
          </div>
        )}
      </div>

      <div className="ct-zoom">
        <button type="button" className="ct-zoom-btn" onClick={() => setZoom((z) => clampZoom(z / 1.4))} disabled={zoom <= ZOOM_MIN} aria-label={t("zoomOut")}>−</button>
        <span className="ct-zoom-pct">{Math.round(zoom * 100)}%</span>
        <button type="button" className="ct-zoom-btn" onClick={() => setZoom((z) => clampZoom(z * 1.4))} disabled={zoom >= ZOOM_MAX} aria-label={t("zoomIn")}>+</button>
      </div>

      <div className="ct-rail" ref={railRef}>
        <div className="ct-track" style={{ width }}>
          <div className="ct-line" style={{ left: 60, width: width - 90 }} />
          {segmentos.map((s, i) => (
            <div key={i} className="ct-seg" style={{ left: s.x1, width: Math.max(0, s.x2 - s.x1), background: s.color }} />
          ))}
          <div className="ct-hoy-line" style={{ left: hoyX }} />
          <div className="ct-hoy-badge" style={{ left: hoyX }}>{t("today")}</div>

          {puntos.map((p) => {
            const above = p.carril === 0;
            const id = p.kind === "hito" ? `h-${p.etapa}` : `e-${p.ev.id}`;
            const color = p.kind === "hito" ? COLOR_ETAPA[p.etapa] : COLOR_ETAPA[p.ev.tipo];
            const size = p.kind === "hito" ? 24 : 20;
            const titulo = p.kind === "hito" ? tEt(p.etapa) : (p.ev.titulo || p.ev.datos?.[CAMPO_TITULAR[p.ev.tipo]] || tEt(p.ev.tipo));
            const sub = p.kind === "hito" ? t("stageMilestone") : (p.ev.datos?.categoria || tEt(p.ev.tipo));
            const esFinanciacion = p.kind === "evento" && p.ev.tipo === "financiacion";
            const fechaTxt = esFinanciacion ? t("deadlinePrefix", { fecha: fmt(p.fecha) }) : fmt(p.fecha);
            const isSel = id === sel;
            return (
              <div key={id} className="ct-ev" style={{ left: p.x }}
                onClick={() => { const m = (railRef.current as (HTMLElement & { _moved?: () => boolean }) | null)?._moved?.(); if (!m) setSel(isSel ? null : id); }}>
                <div className={`ct-lab ${above ? "up" : "down"}`}>
                  <div className="ct-lab-t">{titulo}</div>
                  <div className="ct-lab-s">{sub}</div>
                  <div className="ct-lab-d">{fechaTxt}</div>
                </div>
                <div className={`ct-stem ${above ? "up" : "down"}`} />
                <span className="ct-mark-plate" style={{ width: size, height: size, top: 100 - size / 2 }} />
                <span className="cp-iso ct-mark" style={{ width: size, height: size, top: 100 - size / 2, background: isSel ? "var(--text)" : color }} />
              </div>
            );
          })}
        </div>
      </div>

      {selPunto && selPunto.kind === "evento" && (
        <div className="ct-det" style={{ borderLeftColor: COLOR_ETAPA[selPunto.ev.tipo] }}>
          <div className="ct-det-head">
            <div>
              <div className="ct-det-tipo" style={{ color: COLOR_ETAPA[selPunto.ev.tipo] }}>{selPunto.ev.datos?.categoria || tEt(selPunto.ev.tipo)}</div>
              <div className="ct-det-title">{selPunto.ev.titulo || selPunto.ev.datos?.[CAMPO_TITULAR[selPunto.ev.tipo]] || tEt(selPunto.ev.tipo)}</div>
              <div className="ct-det-date">{selPunto.ev.tipo === "financiacion" ? t("deadlinePrefix", { fecha: fmt(selPunto.ev.fecha) }) : fmt(selPunto.ev.fecha)}</div>
            </div>
            <div className="ct-det-actions">
              <button className="cp-btn cp-btn-acc" onClick={() => abrirDossier(selPunto.ev.id)}>{t("openDossier")}</button>
              <button className="cp-btn" onClick={() => abrirEnCalendario(selPunto.ev.fecha)}>{t("openInCalendar")}</button>
            </div>
          </div>
          <div className="ct-det-fields">
            {CAMPOS_POR_TIPO[selPunto.ev.tipo]
              .filter((c) => selPunto.ev.datos?.[c.key])
              .map((c) => (
                <div key={c.key} className="ct-det-field">
                  <span className="ct-det-flab">{c.label}</span>
                  <span className="ct-det-fval">{selPunto.ev.datos[c.key]}</span>
                </div>
              ))}
          </div>
        </div>
      )}
      {selPunto && selPunto.kind === "hito" && (
        <div className="ct-det" style={{ borderLeftColor: COLOR_ETAPA[selPunto.etapa] }}>
          <div className="ct-det-head">
            <div>
              <div className="ct-det-tipo" style={{ color: COLOR_ETAPA[selPunto.etapa] }}>{t("stageMilestone")}</div>
              <div className="ct-det-title">{tEt(selPunto.etapa)}</div>
              <div className="ct-det-date">{fmt(selPunto.fecha)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(iso: string) {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtFin(ciclo: EtapaResumen[], key: EtapaKey) {
  const idx = ETAPAS.findIndex((e) => e.key === key);
  for (let i = idx + 1; i < ETAPAS.length; i++) {
    const sig = ciclo.find((c) => c.key === ETAPAS[i].key);
    if (sig?.inicio) return fmt(sig.inicio);
  }
  return "—";
}

function pct(e: EtapaResumen) {
  if (!e.inicio) return 0;
  const inicio = ms(e.inicio);
  const trans = (Date.now() - inicio) / DIA;
  const total = (e.dias ?? 0) + trans;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((trans / total) * 100)));
}
