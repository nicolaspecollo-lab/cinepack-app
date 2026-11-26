"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { HERRAMIENTA_POR_ID } from "../herramientas";

type DialogoLinea = { personaje: string; parentetico?: string; texto: string };

type Escena = {
  id: string;
  numero: number;
  int_ext: string | null;
  lugar: string | null;
  dia_noche: string | null;
  encabezado: string;
  descripcion: string | null;
  personajes: string[];
  dialogo: DialogoLinea[];
  estado: string;
};

type Plano = {
  id: string;
  escena: string;
  plano: string;
  tipo: string | null;
  mov_camara: string | null;
  lente: string | null;
  descripcion: string;
  notas: string | null;
};

type Propuesta = {
  departamento: string;
  herramienta_id: string;
  datos: Record<string, string>;
};

type SetupHorario1AD = {
  id: string;
  escena_setup?: string;
  cargo?: string;
  hora_prevista_wrap?: string;
  hora_real_wrap?: string;
  overtime?: string;
};
type DeptoHorario1AD = { nombre?: string; setups?: SetupHorario1AD[] };

// dir-control-horarios-1ad (RONDA 2, 25/11) no tiene un campo "escena" plano
// — es panel bespoke con datos.departamentos (JSON) → setups[].escena_setup
// por cita. El matching genérico de 3 claves (CAMPOS_ESCENA) no lo alcanza
// sin falsos positivos, así que esta cara busca directo en esa estructura
// real en vez de adivinar o inventar un campo nuevo.
function setupsDeEscena(datos: Record<string, unknown>, numero: number): SetupHorario1AD[] {
  let deptos: DeptoHorario1AD[] = [];
  try {
    const raw = (datos as { departamentos?: unknown }).departamentos;
    deptos = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? (raw as DeptoHorario1AD[]) : [];
  } catch {
    deptos = [];
  }
  const match: SetupHorario1AD[] = [];
  for (const d of deptos) {
    for (const s of d.setups ?? []) {
      if (tokensNumericos(s.escena_setup ?? "").includes(String(numero))) {
        match.push({ ...s, cargo: s.cargo ? (d.nombre ? `${s.cargo} (${d.nombre})` : s.cargo) : d.nombre });
      }
    }
  }
  return match;
}

const CAMPOS_ESCENA = ["escena", "escenas", "secuencia"];

function tokensNumericos(s: string): string[] {
  return s.match(/\d+/g) ?? [];
}

function propuestaDeEscena(datos: Record<string, string>, numero: number): boolean {
  const refs = CAMPOS_ESCENA.map((k) => datos[k] ?? "").join(" ");
  return tokensNumericos(refs).includes(String(numero));
}

function resumenPropuesta(p: Propuesta): string {
  const h = HERRAMIENTA_POR_ID[p.herramienta_id];
  const cols = h?.columnas ?? [];
  const partes = cols
    .filter((c) => !CAMPOS_ESCENA.includes(c.key))
    .map((c) => (p.datos[c.key] ?? "").trim())
    .filter(Boolean);
  return partes.slice(0, 4).join(" · ");
}

// Las 10 caras del cubo. "guion"/"reparto"/"fotografia" leen directo de
// escenas/planos; el resto son genéricas: filtran las propuestas (filas de
// herramienta_filas de cualquier departamento) por los herramienta_id dados,
// mismo mecanismo ya usado por EscenasPanel — no inventa una fuente nueva.
type CaraDef = {
  id: string;
  label: string;
  depto: string;
  kind: "guion" | "fotografia" | "reparto" | "horarios1ad" | "generica";
  herramientaIds?: string[];
};

const CARAS: CaraDef[] = [
  { id: "guion", label: "Guion", depto: "Guion", kind: "guion" },
  { id: "fotografia", label: "Fotografía", depto: "Fotografía", kind: "fotografia" },
  { id: "storyboard", label: "Storyboard", depto: "Fotografía", kind: "generica", herramientaIds: ["foto-guion-tecnico"] },
  { id: "plan-rodaje", label: "Plan de rodaje", depto: "Producción", kind: "generica", herramientaIds: ["gen-plan-rodaje"] },
  { id: "horarios-1ad", label: "Horarios del día", depto: "Dirección", kind: "horarios1ad", herramientaIds: ["dir-control-horarios-1ad"] },
  { id: "reparto", label: "Reparto", depto: "Reparto", kind: "reparto" },
  { id: "vestuario", label: "Vestuario / Maquillaje", depto: "Arte", kind: "generica", herramientaIds: ["vest-desglose-escenas", "maq-desglose-escenas"] },
  { id: "continuidad", label: "Continuidad", depto: "Dirección", kind: "generica", herramientaIds: ["dir-continuidad-foto"] },
  { id: "sonido", label: "Sonido", depto: "Sonido", kind: "generica", herramientaIds: ["son-plan-directo"] },
  { id: "luces", label: "Planta de luces", depto: "Fotografía", kind: "generica", herramientaIds: ["luz-plan-iluminacion"] },
];

const N = CARAS.length;
const ANGULO = 360 / N;

export default function Escena3DPanel({ departamento }: { departamento: string }) {
  const t = useTranslations("escenas");
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [numeroEscena, setNumeroEscena] = useState<number | null>(null);
  const [activo, setActivo] = useState(0);
  const [radio, setRadio] = useState(220);
  const stageRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const [{ data: esc }, { data: pl }, { data: prop }] = await Promise.all([
      supabase.from("escenas").select("*").eq("project_id", projectId)
        .order("orden", { ascending: true }).order("numero", { ascending: true }),
      supabase.from("planos").select("*").eq("project_id", projectId),
      supabase.from("herramienta_filas").select("departamento, herramienta_id, datos").eq("project_id", projectId),
    ]);
    setEscenas(esc ?? []);
    setPlanos(pl ?? []);
    setPropuestas((prop ?? []) as Propuesta[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (escenas.length > 0 && numeroEscena === null) setNumeroEscena(escenas[0].numero);
  }, [escenas, numeroEscena]);

  // Radio del cubo: depende del ancho real de la cara para que no se vea
  // "flotando" en ningún viewport (fórmula estándar de carrusel poligonal).
  useEffect(() => {
    const calc = () => {
      const w = stageRef.current?.clientWidth ?? 320;
      const anchoCara = Math.min(w - 32, 420);
      setRadio(Math.round(anchoCara / (2 * Math.tan(Math.PI / N))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const escena = escenas.find((e) => e.numero === numeroEscena) ?? null;

  const propuestasEscena = useMemo(() => {
    if (!escena) return [];
    return propuestas.filter((p) => propuestaDeEscena(p.datos, escena.numero));
  }, [propuestas, escena]);

  const planosEscena = useMemo(
    () => (escena ? planos.filter((p) => p.escena === String(escena.numero)) : []),
    [planos, escena]
  );

  const setupsHorarios1ad = useMemo(() => {
    if (!escena) return [];
    const filas = propuestas.filter((p) => p.herramienta_id === "dir-control-horarios-1ad");
    return filas.flatMap((f) => setupsDeEscena(f.datos, escena.numero));
  }, [propuestas, escena]);

  const irA = (idx: number) => {
    if (idx === activo) return;
    setActivo(idx);
  };

  const rotY = -activo * ANGULO;
  // Duración del giro: proporcional a cuántas caras cruza, para que un
  // acceso directo lejano se sienta como "la rueda gira rápido" en vez de
  // tele-transportarse — nunca más de ~1.1s para no sentirse lento.
  const [anguloAnterior, setAnguloAnterior] = useState(0);
  const prevActivoRef = useRef(0);
  useEffect(() => {
    const saltos = Math.min(
      Math.abs(activo - prevActivoRef.current),
      N - Math.abs(activo - prevActivoRef.current)
    );
    prevActivoRef.current = activo;
    setAnguloAnterior(saltos);
  }, [activo]);
  const duracionMs = Math.min(300 + anguloAnterior * 90, 1100);

  if (loading) return <p className="cons-text">{t("loading")}</p>;

  if (escenas.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("noScenesTitle")}</h4>
        <p>{t("noScenesDesc", { name: "Escena 3D", script: "Guion", dept: departamento })}</p>
      </div>
    );
  }

  return (
    <div className="e3d-wrap">
      <div className="e3d-selector">
        <label htmlFor="e3d-escena-select">Escena</label>
        <select
          id="e3d-escena-select"
          value={numeroEscena ?? ""}
          onChange={(ev) => setNumeroEscena(Number(ev.target.value))}
        >
          {escenas.map((e) => (
            <option key={e.id} value={e.numero}>
              {e.numero}. {e.encabezado}
            </option>
          ))}
        </select>
        {escena && (
          <span className="e3d-escena-meta">
            {escena.int_ext ?? ""} · {escena.dia_noche ?? ""} · {escena.lugar ?? ""}
          </span>
        )}
      </div>

      <div className="e3d-shortcuts" role="tablist" aria-label="Acceso directo por departamento">
        {CARAS.map((c, i) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={i === activo}
            className={`e3d-shortcut ${i === activo ? "on" : ""}`}
            onClick={() => irA(i)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="e3d-stage" ref={stageRef}>
        <div
          className="e3d-cube"
          style={{
            transform: `translateZ(-${radio}px) rotateY(${rotY}deg)`,
            transition: `transform ${duracionMs}ms cubic-bezier(.22,.9,.25,1)`,
          }}
        >
          {CARAS.map((c, i) => {
            // Con 10 caras (36° entre sí), más de una queda "de frente" a la
            // vez dentro de los ±90° que backface-visibility no oculta —
            // un cubo de 4 caras no tiene este problema, el de 10 sí. Sin
            // atenuar las no-activas, el texto de la cara vecina se superpone
            // y se vuelve ilegible (bug real encontrado en QA, 820px). Las
            // caras no activas quedan como insinuación tenue, nunca legibles
            // ni clicables.
            const esActiva = i === activo;
            return (
            <div
              key={c.id}
              className="e3d-face"
              style={{
                transform: `rotateY(${i * ANGULO}deg) translateZ(${radio}px)`,
                opacity: esActiva ? 1 : 0.08,
                pointerEvents: esActiva ? "auto" : "none",
                transition: `opacity ${duracionMs}ms ease`,
              }}
            >
              <CaraContenido
                cara={c}
                escena={escena}
                planosEscena={planosEscena}
                propuestasEscena={propuestasEscena}
                setupsHorarios1ad={setupsHorarios1ad}
              />
            </div>
            );
          })}
        </div>
      </div>

      <div className="e3d-nav">
        <button onClick={() => irA((activo - 1 + N) % N)} aria-label="Cara anterior">‹</button>
        <span className="e3d-nav-label">{CARAS[activo].label}</span>
        <button onClick={() => irA((activo + 1) % N)} aria-label="Cara siguiente">›</button>
      </div>
    </div>
  );
}

function CaraContenido({
  cara,
  escena,
  planosEscena,
  propuestasEscena,
  setupsHorarios1ad,
}: {
  cara: CaraDef;
  escena: Escena | null;
  planosEscena: Plano[];
  propuestasEscena: Propuesta[];
  setupsHorarios1ad: SetupHorario1AD[];
}) {
  if (!escena) return <p className="e3d-vacio">Elegí una escena arriba.</p>;

  if (cara.kind === "guion") {
    return (
      <div className="e3d-cara-body">
        <h5>{escena.encabezado}</h5>
        <p className="e3d-meta">{escena.int_ext} · {escena.dia_noche} · {escena.lugar}</p>
        {escena.descripcion && <p className="e3d-desc">{escena.descripcion}</p>}
        {escena.dialogo?.length > 0 ? (
          <ul className="e3d-dialogo">
            {escena.dialogo.slice(0, 6).map((d, i) => (
              <li key={i}><b>{d.personaje}</b>{d.parentetico ? ` (${d.parentetico})` : ""}: {d.texto}</li>
            ))}
          </ul>
        ) : (
          <p className="e3d-vacio">Sin diálogo cargado todavía para esta escena.</p>
        )}
      </div>
    );
  }

  if (cara.kind === "fotografia") {
    if (planosEscena.length === 0) {
      return <p className="e3d-vacio">Sin planos del guion técnico cargados todavía para esta escena.</p>;
    }
    return (
      <ul className="e3d-planos">
        {planosEscena.map((p) => (
          <li key={p.id}>
            <b>{p.plano}</b> — {p.tipo ?? "sin encuadre"} · {p.mov_camara ?? "sin movimiento"}
            {p.lente ? ` · ${p.lente}` : ""}
            {p.descripcion ? <div className="e3d-desc-chica">{p.descripcion}</div> : null}
          </li>
        ))}
      </ul>
    );
  }

  if (cara.kind === "horarios1ad") {
    if (setupsHorarios1ad.length === 0) {
      return <p className="e3d-vacio">Sin horarios del día cargados todavía para esta escena.</p>;
    }
    return (
      <ul className="e3d-horarios1ad">
        {setupsHorarios1ad.map((s) => (
          <li key={s.id}>
            <b>{s.cargo ?? "Sin cargo"}</b> — previsto {s.hora_prevista_wrap || "?"} · real {s.hora_real_wrap || "?"}
            {s.overtime ? ` · overtime: ${s.overtime}` : ""}
          </li>
        ))}
      </ul>
    );
  }

  if (cara.kind === "reparto") {
    if (!escena.personajes || escena.personajes.length === 0) {
      return <p className="e3d-vacio">Sin personajes asignados a esta escena todavía.</p>;
    }
    return (
      <ul className="e3d-reparto">
        {escena.personajes.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    );
  }

  // genérica: filtra por los herramienta_id de esta cara dentro de las
  // propuestas ya traídas para la escena.
  const filas = (cara.herramientaIds ?? []).length
    ? propuestasEscena.filter((p) => cara.herramientaIds!.includes(p.herramienta_id))
    : [];

  if (filas.length === 0) {
    return <p className="e3d-vacio">Sin {cara.label.toLowerCase()} cargado todavía para esta escena.</p>;
  }

  return (
    <ul className="e3d-generica">
      {filas.map((p, i) => <li key={i}>{resumenPropuesta(p)}</li>)}
    </ul>
  );
}
