"use client";

// Notas de preparación del personaje — Reparto principal.
//
// PANEL A MEDIDA, no el motor genérico. Patrón elegido: "ficha de personaje
// con pestañas internas" (Biografía / Objetivos por escena / Relaciones /
// Arco emocional / Notas de ensayo recibidas), con un nivel 1 de tarjetas
// por personaje (nunca filas de tabla).
//
// Por qué este patrón y no otros dos evaluados:
// 1) Línea de tiempo por escena como estructura principal (como
//    dir-notas-ensayo) — descartado: ahí la escena ES la unidad real
//    (una sesión de ensayo). Acá la escena es solo UNA de varias facetas
//    (biografía, relaciones, voz, objeto) que no están ancladas a una
//    escena puntual — forzarlo a timeline aplanaría justo lo que hace
//    falta: la cabeza del personaje completa, no solo su progreso.
// 2) Tablero con secciones sueltas en una sola pantalla larga — descartado:
//    en 390px un actor repasando antes de entrar a rodar necesita ir
//    directo a "qué quiero en esta escena" o "qué me dijo el director",
//    no desplazarse por secciones que no le importan en ese momento.
// 3) Elegido: ficha con pestañas — es el modelo mental real de un actor
//    preparando un personaje (un "cuaderno de personaje" con separadores),
//    y resuelve el problema de 390px: una pestaña a la vez, acceso directo.
//
// El dato sigue viviendo en `herramienta_filas` (useRepNotasPreparacion.ts)
// — cada fila es UN personaje completo, con objetivos/relaciones/arco/notas
// recibidas como arrays JSON embebidos (mismo mecanismo que `_extra` en
// otras herramientas). Nunca se renderiza ningún texto introductorio al
// abrir (ver exclusión de `herramienta.hint` en HerramientaPanel.tsx).

import { useMemo, useRef, useState } from "react";
import Icon, { type IconName } from "../components/Icon";
import CpSelect from "../components/CpSelect";
import { PrintHeader } from "./HerramientaPanel";
import {
  REP_PREP_DEPARTAMENTO,
  PERSONAJE_VACIO,
  ESTADO_OBJETIVO,
  TIPO_RELACION,
  nuevoId,
  type Personaje,
  type Objetivo,
  type Relacion,
  type PuntoArco,
  type NotaRecibida,
  type EstadoObjetivo,
  type TipoRelacion,
} from "./repNotasPreparacionFilas";
import { useRepNotasPreparacion, type FilaPersonaje } from "./useRepNotasPreparacion";

type Props = { fullName: string; editable: boolean };

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "bio", label: "Biografía", icon: "book" },
  { id: "objetivos", label: "Objetivos por escena", icon: "target" },
  { id: "relaciones", label: "Relaciones", icon: "users" },
  { id: "arco", label: "Arco emocional", icon: "heart" },
  { id: "notas", label: "Notas de ensayo recibidas", icon: "quote" },
];

type Tab = "bio" | "objetivos" | "relaciones" | "arco" | "notas";

const OBJETIVO_TONO: Record<EstadoObjetivo | "", string> = {
  Logrado: "var(--lime)",
  "En trabajo": "var(--amber)",
  Pendiente: "var(--muted)",
  "": "var(--muted)",
};

const RELACION_TONO: Record<TipoRelacion | "", string> = {
  Familia: "var(--sky)",
  "Aliado/a": "var(--lime)",
  Romance: "var(--pink)",
  Conflicto: "var(--rose)",
  "Rival": "var(--orange)",
  "Mentor/a": "var(--violet)",
  "": "var(--muted)",
};

function hashNombre(nombre: string): number {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return h;
}

function RetratoIlustrado({ nombre }: { nombre: string }) {
  const h = hashNombre(nombre || "?");
  const hue = h % 360;
  const bustoHue = (hue + 30) % 360;
  return (
    <svg viewBox="0 0 120 150" className="rnp-retrato-svg" aria-hidden="true">
      <defs>
        <linearGradient id={`rnp-bg-${h}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue},40%,28%)`} />
          <stop offset="100%" stopColor={`hsl(${hue},36%,14%)`} />
        </linearGradient>
      </defs>
      <rect width="120" height="150" fill={`url(#rnp-bg-${h})`} />
      <circle cx="60" cy="54" r="26" fill={`hsl(${bustoHue},34%,58%)`} />
      <path d="M14 150c0-30 20-50 46-50s46 20 46 50z" fill={`hsl(${bustoHue},30%,44%)`} />
    </svg>
  );
}

export default function RepNotasPreparacionPanel({ fullName, editable }: Props) {
  const { personajes, loading, error, crear, editar, borrar, sembrarEjemplos } = useRepNotasPreparacion(fullName);
  const [personajeAbierto, setPersonajeAbierto] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("bio");
  const [guardado, setGuardado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sembroIntentado = useRef(false);
  if (!loading && !error && !sembroIntentado.current && personajes.length === 0 && editable) {
    sembroIntentado.current = true;
    sembrarEjemplos();
  }

  function avisarGuardado() {
    setGuardado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setGuardado(false), 1800);
  }

  function actualizar(fila: FilaPersonaje, cambios: Partial<Personaje>) {
    editar(fila.id, { ...fila.datos, ...cambios });
    avisarGuardado();
  }

  async function nuevoPersonaje() {
    const nombre = window.prompt("Nombre del personaje que vas a preparar:");
    if (!nombre || !nombre.trim()) return;
    const actor = window.prompt("Tu nombre (actor/actriz):") ?? fullName;
    const ok = await crear({ ...PERSONAJE_VACIO, personaje: nombre.trim(), actor: actor.trim() });
    if (ok) { setPersonajeAbierto(nombre.trim()); setTab("bio"); }
  }

  function borrarPersonaje(fila: FilaPersonaje) {
    if (!window.confirm(`¿Borrar la preparación de "${fila.datos.personaje}"? No se puede deshacer.`)) return;
    borrar(fila.id);
    setPersonajeAbierto(null);
  }

  if (loading) return null;

  if (error) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <p>{error === "sin-proyecto" ? "Elegí un proyecto para ver tus notas de preparación." : error}</p>
      </div>
    );
  }

  const titulo = (
    <h3>
      <span className="hex rnp-hex"></span>
      Notas de preparación del personaje
    </h3>
  );

  // -------------------------------------------------------------------
  // Nivel 1 — grid de personajes.
  // -------------------------------------------------------------------
  if (!personajeAbierto) {
    return (
      <>
        <div className="hp-open-head">
          {titulo}
          {editable && (
            <div className="hp-open-head-tabs">
              <button className="cp-btn rnp-btn-acc" onClick={nuevoPersonaje}>
                <Icon name="plus" size={13} /> Nuevo personaje
              </button>
            </div>
          )}
        </div>
        <div className="rnp-wrap hp-print-area">
          <PrintHeader herramientaNombre="Notas de preparación del personaje" departamento={REP_PREP_DEPARTAMENTO} />
          {guardado && <span className="amsg ok rnp-guardado" role="status">Guardado</span>}
          {personajes.length === 0 ? (
            <div className="soon-box">
              <span className="hex"></span>
              <h4>Todavía no preparaste ningún personaje</h4>
              <p>
                {editable
                  ? "Cada personaje tiene su propio cuaderno: biografía, objetivos por escena, relaciones y arco emocional."
                  : "No hay preparación registrada todavía."}
              </p>
            </div>
          ) : (
            <div className="rnp-grid">
              {personajes.map((p) => (
                <PersonajeCard
                  key={p.id}
                  fila={p}
                  onAbrir={() => { setPersonajeAbierto(p.datos.personaje); setTab("bio"); }}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------
  // Nivel 2 — ficha con pestañas de un personaje.
  // -------------------------------------------------------------------
  const fila = personajes.find((p) => p.datos.personaje === personajeAbierto);
  if (!fila) { setPersonajeAbierto(null); return null; }
  const d = fila.datos;

  return (
    <>
      <div className="hp-open-head">
        <h3>
          <span className="hex rnp-hex"></span>
          {d.personaje}
        </h3>
        <div className="hp-open-head-tabs">
          <button className="cp-btn" onClick={() => setPersonajeAbierto(null)}>
            <Icon name="arrow-left" size={13} /> Todos los personajes
          </button>
          {editable && (
            <button className="cp-btn hp-btn-danger" onClick={() => borrarPersonaje(fila)}>
              <Icon name="trash" size={13} /> Borrar
            </button>
          )}
        </div>
      </div>
      <div className="rnp-wrap hp-print-area">
        <PrintHeader herramientaNombre="Notas de preparación del personaje" departamento={REP_PREP_DEPARTAMENTO} />
        {guardado && <span className="amsg ok rnp-guardado" role="status">Guardado</span>}

        <div className="rnp-ficha-head">
          <div className="rnp-ficha-retrato">
            {d.foto_url ? <img src={d.foto_url} alt={`Retrato de ${d.personaje}`} /> : <RetratoIlustrado nombre={d.personaje} />}
          </div>
          <div className="rnp-ficha-id">
            {editable ? (
              <>
                <input className="rnp-ficha-actor-in" defaultValue={d.actor} placeholder="Actor/actriz" onBlur={(e) => actualizar(fila, { actor: e.target.value })} />
                <input className="rnp-ficha-ocup-in" defaultValue={d.ocupacion} placeholder="Ocupación del personaje" onBlur={(e) => actualizar(fila, { ocupacion: e.target.value })} />
                <input className="rnp-ficha-edad-in" defaultValue={d.edad} placeholder="Edad del personaje" onBlur={(e) => actualizar(fila, { edad: e.target.value })} />
              </>
            ) : (
              <>
                <span className="rnp-ficha-actor">{d.actor || "Sin actor asignado"}</span>
                <span className="rnp-ficha-ocup">{d.ocupacion || "—"}</span>
                <span className="rnp-ficha-edad">{d.edad || "—"}</span>
              </>
            )}
          </div>
        </div>

        <nav className="rnp-tabs" role="tablist">
          {TABS.map((tabDef) => (
            <button
              key={tabDef.id}
              role="tab"
              aria-selected={tab === tabDef.id}
              className={`rnp-tab${tab === tabDef.id ? " active" : ""}`}
              onClick={() => setTab(tabDef.id)}
            >
              <Icon name={tabDef.icon} size={14} />
              <span>{tabDef.label}</span>
              {tabDef.id === "objetivos" && d.objetivos.length > 0 && <span className="rnp-tab-count">{d.objetivos.length}</span>}
              {tabDef.id === "relaciones" && d.relaciones.length > 0 && <span className="rnp-tab-count">{d.relaciones.length}</span>}
              {tabDef.id === "arco" && d.arco.length > 0 && <span className="rnp-tab-count">{d.arco.length}</span>}
              {tabDef.id === "notas" && d.notas_recibidas.length > 0 && <span className="rnp-tab-count">{d.notas_recibidas.length}</span>}
            </button>
          ))}
        </nav>

        <div className="rnp-tab-body">
          {tab === "bio" && <TabBiografia fila={fila} editable={editable} onCambiar={(c) => actualizar(fila, c)} />}
          {tab === "objetivos" && <TabObjetivos fila={fila} editable={editable} onCambiar={(c) => actualizar(fila, c)} />}
          {tab === "relaciones" && <TabRelaciones fila={fila} editable={editable} onCambiar={(c) => actualizar(fila, c)} />}
          {tab === "arco" && <TabArco fila={fila} editable={editable} onCambiar={(c) => actualizar(fila, c)} />}
          {tab === "notas" && <TabNotas fila={fila} editable={editable} onCambiar={(c) => actualizar(fila, c)} />}
        </div>
      </div>
    </>
  );
}

function PersonajeCard({ fila, onAbrir }: { fila: FilaPersonaje; onAbrir: () => void }) {
  const d = fila.datos;
  const logrados = d.objetivos.filter((o) => o.estado === "Logrado").length;
  const total = d.objetivos.length;
  const pct = total > 0 ? Math.round((logrados / total) * 100) : 0;
  const ultimoArco = d.arco[d.arco.length - 1];
  return (
    <button className="rnp-card" onClick={onAbrir}>
      <div className="rnp-card-retrato">
        {d.foto_url ? <img src={d.foto_url} alt={`Retrato de ${d.personaje}`} /> : <RetratoIlustrado nombre={d.personaje} />}
        {d.notas_recibidas.length > 0 && (
          <span className="rnp-card-notas" title={`${d.notas_recibidas.length} nota(s) de ensayo recibidas`}>
            <Icon name="quote" size={11} /> {d.notas_recibidas.length}
          </span>
        )}
      </div>
      <div className="rnp-card-id">
        <span className="rnp-card-nombre">{d.personaje}</span>
        <span className="rnp-card-actor">{d.actor || "Sin actor asignado"}</span>
      </div>
      {d.ocupacion && <p className="rnp-card-ocup">{d.ocupacion}</p>}
      <div className="rnp-card-stats">
        {total > 0 && (
          <div className="rnp-card-progreso" title={`${logrados} de ${total} objetivos logrados`}>
            <div className="rnp-card-progreso-bar"><span style={{ width: `${pct}%` }} /></div>
            <span className="rnp-card-progreso-txt">{logrados}/{total} objetivos</span>
          </div>
        )}
        <div className="rnp-card-meta">
          {d.relaciones.length > 0 && <span><Icon name="users" size={12} /> {d.relaciones.length}</span>}
          {d.arco.length > 0 && <span><Icon name="heart" size={12} /> {d.arco.length} puntos de arco</span>}
        </div>
      </div>
      {ultimoArco && (
        <p className="rnp-card-arco-actual">
          <Icon name="arrow-right" size={12} /> {ultimoArco.estado_emocional}
        </p>
      )}
    </button>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="rnp-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TabBiografia({ fila, editable, onCambiar }: { fila: FilaPersonaje; editable: boolean; onCambiar: (c: Partial<Personaje>) => void }) {
  const d = fila.datos;
  if (!editable) {
    return (
      <div className="rnp-bio-ro">
        <CampoRo label="Biografía / backstory" valor={d.biografia} />
        <CampoRo label="Rasgos físicos y gestuales" valor={d.rasgos_fisicos} />
        <CampoRo label="Voz y forma de hablar" valor={d.voz_habla} />
        <CampoRo label="Objeto personal significativo" valor={d.objeto_personal} />
        <CampoRo label="Motivación central" valor={d.motivacion_central} />
      </div>
    );
  }
  return (
    <div className="rnp-bio-form" key={fila.id}>
      <Campo label="Biografía / backstory">
        <textarea rows={5} defaultValue={d.biografia} onBlur={(e) => onCambiar({ biografia: e.target.value })} />
      </Campo>
      <Campo label="Rasgos físicos y gestuales">
        <textarea rows={3} defaultValue={d.rasgos_fisicos} onBlur={(e) => onCambiar({ rasgos_fisicos: e.target.value })} />
      </Campo>
      <Campo label="Voz y forma de hablar">
        <textarea rows={3} defaultValue={d.voz_habla} onBlur={(e) => onCambiar({ voz_habla: e.target.value })} />
      </Campo>
      <Campo label="Objeto personal significativo">
        <input defaultValue={d.objeto_personal} onBlur={(e) => onCambiar({ objeto_personal: e.target.value })} />
      </Campo>
      <Campo label="Motivación central">
        <textarea rows={2} defaultValue={d.motivacion_central} onBlur={(e) => onCambiar({ motivacion_central: e.target.value })} />
      </Campo>
      <Campo label="URL de la foto retrato">
        <input defaultValue={d.foto_url} placeholder="Pegar URL de la foto real" onBlur={(e) => onCambiar({ foto_url: e.target.value })} />
      </Campo>
    </div>
  );
}

function CampoRo({ label, valor }: { label: string; valor: string }) {
  if (!valor) return null;
  return (
    <div className="rnp-field rnp-field-ro">
      <span>{label}</span>
      <p>{valor}</p>
    </div>
  );
}

function TabObjetivos({ fila, editable, onCambiar }: { fila: FilaPersonaje; editable: boolean; onCambiar: (c: Partial<Personaje>) => void }) {
  const d = fila.datos;

  function agregar() {
    const nuevo: Objetivo = { id: nuevoId(), escena: "", objetivo: "", estado: "Pendiente" };
    onCambiar({ objetivos: [...d.objetivos, nuevo] });
  }
  function cambiarUno(id: string, cambios: Partial<Objetivo>) {
    onCambiar({ objetivos: d.objetivos.map((o) => (o.id === id ? { ...o, ...cambios } : o)) });
  }
  function borrarUno(id: string) {
    onCambiar({ objetivos: d.objetivos.filter((o) => o.id !== id) });
  }

  if (d.objetivos.length === 0 && !editable) {
    return <p className="rnp-vacio">Todavía no hay objetivos por escena registrados.</p>;
  }

  return (
    <div className="rnp-lista">
      {d.objetivos.map((o) => (
        <div key={o.id} className="rnp-obj-row">
          <span className="rnp-obj-tono" style={{ background: OBJETIVO_TONO[o.estado] }} />
          {editable ? (
            <>
              <input className="rnp-obj-escena" defaultValue={o.escena} placeholder="Escena" onBlur={(e) => cambiarUno(o.id, { escena: e.target.value })} />
              <textarea className="rnp-obj-texto" rows={2} defaultValue={o.objetivo} placeholder="Qué necesita lograr en esta escena" onBlur={(e) => cambiarUno(o.id, { objetivo: e.target.value })} />
              <CpSelect
                value={o.estado}
                options={[...ESTADO_OBJETIVO]}
                placeholder="Estado"
                onChange={(v) => cambiarUno(o.id, { estado: v as EstadoObjetivo })}
              />
              <button className="rnp-btn-icon" onClick={() => borrarUno(o.id)} title="Borrar objetivo">
                <Icon name="trash" size={13} />
              </button>
            </>
          ) : (
            <div className="rnp-obj-ro">
              <div className="rnp-obj-ro-head">
                <span className="rnp-obj-escena-txt">{o.escena || "Sin escena"}</span>
                <span className="rnp-estado-badge" style={{ color: OBJETIVO_TONO[o.estado], borderColor: OBJETIVO_TONO[o.estado] }}>{o.estado || "Pendiente"}</span>
              </div>
              <p>{o.objetivo}</p>
            </div>
          )}
        </div>
      ))}
      {editable && (
        <button className="cp-btn rnp-btn-acc rnp-add" onClick={agregar}>
          <Icon name="plus" size={13} /> Nuevo objetivo por escena
        </button>
      )}
    </div>
  );
}

function TabRelaciones({ fila, editable, onCambiar }: { fila: FilaPersonaje; editable: boolean; onCambiar: (c: Partial<Personaje>) => void }) {
  const d = fila.datos;

  function agregar() {
    const nuevo: Relacion = { id: nuevoId(), personaje: "", actor: "", tipo: "", notas: "" };
    onCambiar({ relaciones: [...d.relaciones, nuevo] });
  }
  function cambiarUno(id: string, cambios: Partial<Relacion>) {
    onCambiar({ relaciones: d.relaciones.map((r) => (r.id === id ? { ...r, ...cambios } : r)) });
  }
  function borrarUno(id: string) {
    onCambiar({ relaciones: d.relaciones.filter((r) => r.id !== id) });
  }

  if (d.relaciones.length === 0 && !editable) {
    return <p className="rnp-vacio">Todavía no hay relaciones registradas.</p>;
  }

  return (
    <div className="rnp-rel-grid">
      {d.relaciones.map((r) => (
        <div key={r.id} className="rnp-rel-card" style={{ borderLeftColor: RELACION_TONO[r.tipo] }}>
          {editable ? (
            <>
              <input className="rnp-rel-nombre-in" defaultValue={r.personaje} placeholder="Nombre del personaje" onBlur={(e) => cambiarUno(r.id, { personaje: e.target.value })} />
              <input className="rnp-rel-actor-in" defaultValue={r.actor} placeholder="Actor/actriz" onBlur={(e) => cambiarUno(r.id, { actor: e.target.value })} />
              <CpSelect value={r.tipo} options={[...TIPO_RELACION]} placeholder="Tipo de relación" onChange={(v) => cambiarUno(r.id, { tipo: v as TipoRelacion })} />
              <textarea rows={3} defaultValue={r.notas} placeholder="Qué significa esta relación para tu personaje" onBlur={(e) => cambiarUno(r.id, { notas: e.target.value })} />
              <button className="rnp-btn-icon rnp-rel-del" onClick={() => borrarUno(r.id)} title="Borrar relación">
                <Icon name="trash" size={13} />
              </button>
            </>
          ) : (
            <>
              <div className="rnp-rel-head">
                <span className="rnp-rel-nombre">{r.personaje || "Sin nombre"}</span>
                {r.tipo && <span className="rnp-estado-badge" style={{ color: RELACION_TONO[r.tipo], borderColor: RELACION_TONO[r.tipo] }}>{r.tipo}</span>}
              </div>
              <span className="rnp-rel-actor">{r.actor || "Sin actor asignado"}</span>
              {r.notas && <p>{r.notas}</p>}
            </>
          )}
        </div>
      ))}
      {editable && (
        <button className="cp-btn rnp-btn-acc rnp-rel-add" onClick={agregar}>
          <Icon name="plus" size={13} /> Nueva relación
        </button>
      )}
    </div>
  );
}

function TabArco({ fila, editable, onCambiar }: { fila: FilaPersonaje; editable: boolean; onCambiar: (c: Partial<Personaje>) => void }) {
  const d = fila.datos;

  function agregar() {
    const nuevo: PuntoArco = { id: nuevoId(), momento: "", estado_emocional: "", nota: "" };
    onCambiar({ arco: [...d.arco, nuevo] });
  }
  function cambiarUno(id: string, cambios: Partial<PuntoArco>) {
    onCambiar({ arco: d.arco.map((a) => (a.id === id ? { ...a, ...cambios } : a)) });
  }
  function borrarUno(id: string) {
    onCambiar({ arco: d.arco.filter((a) => a.id !== id) });
  }

  if (d.arco.length === 0 && !editable) {
    return <p className="rnp-vacio">Todavía no hay puntos de arco emocional registrados.</p>;
  }

  return (
    <div className="rnp-arco-timeline">
      {d.arco.map((a, i) => (
        <div key={a.id} className="rnp-arco-punto">
          <span className="rnp-arco-dot" />
          <div className="rnp-arco-card">
            {editable ? (
              <>
                <input className="rnp-arco-momento-in" defaultValue={a.momento} placeholder={`Momento ${i + 1} (ej. Acto 1, Punto medio...)`} onBlur={(e) => cambiarUno(a.id, { momento: e.target.value })} />
                <input className="rnp-arco-estado-in" defaultValue={a.estado_emocional} placeholder="Estado emocional" onBlur={(e) => cambiarUno(a.id, { estado_emocional: e.target.value })} />
                <textarea rows={2} defaultValue={a.nota} placeholder="Nota de trabajo" onBlur={(e) => cambiarUno(a.id, { nota: e.target.value })} />
                <button className="rnp-btn-icon rnp-arco-del" onClick={() => borrarUno(a.id)} title="Borrar punto">
                  <Icon name="trash" size={13} />
                </button>
              </>
            ) : (
              <>
                <span className="rnp-arco-momento">{a.momento || `Momento ${i + 1}`}</span>
                <span className="rnp-arco-estado">{a.estado_emocional}</span>
                {a.nota && <p>{a.nota}</p>}
              </>
            )}
          </div>
        </div>
      ))}
      {editable && (
        <button className="cp-btn rnp-btn-acc rnp-add" onClick={agregar}>
          <Icon name="plus" size={13} /> Nuevo punto de arco
        </button>
      )}
    </div>
  );
}

function TabNotas({ fila, editable, onCambiar }: { fila: FilaPersonaje; editable: boolean; onCambiar: (c: Partial<Personaje>) => void }) {
  const d = fila.datos;
  const ordenadas = useMemo(() => [...d.notas_recibidas].sort((a, b) => b.fecha.localeCompare(a.fecha)), [d.notas_recibidas]);

  function agregar() {
    const nuevo: NotaRecibida = { id: nuevoId(), fecha: new Date().toISOString().slice(0, 10), de: "Dirección de actores", texto: "" };
    onCambiar({ notas_recibidas: [...d.notas_recibidas, nuevo] });
  }
  function cambiarUno(id: string, cambios: Partial<NotaRecibida>) {
    onCambiar({ notas_recibidas: d.notas_recibidas.map((n) => (n.id === id ? { ...n, ...cambios } : n)) });
  }
  function borrarUno(id: string) {
    onCambiar({ notas_recibidas: d.notas_recibidas.filter((n) => n.id !== id) });
  }

  if (ordenadas.length === 0 && !editable) {
    return <p className="rnp-vacio">Todavía no se registraron notas de ensayo recibidas.</p>;
  }

  return (
    <div className="rnp-notas-lista">
      {ordenadas.map((n) => (
        <div key={n.id} className="rnp-nota-card">
          <Icon name="quote" size={14} className="rnp-nota-icon" />
          <div className="rnp-nota-body">
            {editable ? (
              <>
                <div className="rnp-nota-meta-row">
                  <input type="date" className="rnp-nota-fecha-in" defaultValue={n.fecha} onBlur={(e) => cambiarUno(n.id, { fecha: e.target.value })} />
                  <input className="rnp-nota-de-in" defaultValue={n.de} placeholder="De (ej. Dirección de actores)" onBlur={(e) => cambiarUno(n.id, { de: e.target.value })} />
                  <button className="rnp-btn-icon" onClick={() => borrarUno(n.id)} title="Borrar nota">
                    <Icon name="trash" size={13} />
                  </button>
                </div>
                <textarea rows={2} defaultValue={n.texto} placeholder="Qué te dijo el director/a en ensayo" onBlur={(e) => cambiarUno(n.id, { texto: e.target.value })} />
              </>
            ) : (
              <>
                <div className="rnp-nota-meta-row-ro">
                  <span className="rnp-nota-fecha">{n.fecha}</span>
                  <span className="rnp-nota-de">{n.de}</span>
                </div>
                <p>{n.texto}</p>
              </>
            )}
          </div>
        </div>
      ))}
      {editable && (
        <button className="cp-btn rnp-btn-acc rnp-add" onClick={agregar}>
          <Icon name="plus" size={13} /> Nueva nota recibida
        </button>
      )}
    </div>
  );
}
