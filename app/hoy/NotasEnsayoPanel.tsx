"use client";

// Notas de ensayo por actor/personaje — Dirección de actores.
//
// PANEL A MEDIDA, no el motor genérico de tabla/ficha: la arquitectura de
// integración (ver oficina/expedientes/2026-11-21_direccion_notas-ensayo/
// arquitectura.md, sección 1) definió la interacción como "agrupar por
// personaje y, dentro de cada grupo, mostrar una línea de tiempo de
// sesiones de ensayo" — una jerarquía de dos niveles reales (Personaje →
// Sesión) que ningún `tipo` del motor (tabla/ficha/nota/checklist/galería)
// expresa sin aplanarla y perder justo lo que la hace útil: ver el arco de
// un personaje avanzar escena a escena. El DATO sigue viviendo 100% en
// `herramienta_filas` con el mismo mecanismo de siempre (ver
// useNotasEnsayoFilas.ts) — es solo la vista la que es propia, igual que
// MoodboardFotoLienzo o PlanSonidoPanel.

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { PrintHeader } from "./HerramientaPanel";
import {
  NOTAS_ENSAYO_DEPARTAMENTO,
  VISIBILIDAD,
  escenasALista,
  type SesionEnsayo,
  type Visibilidad,
} from "./notasEnsayoFilas";
import { useNotasEnsayoFilas, type FilaSesion } from "./useNotasEnsayoFilas";

type Props = { fullName: string; editable: boolean };

const SESION_VACIA: SesionEnsayo = {
  personaje: "",
  actor: "",
  arco_personaje: "",
  objetivo_personaje: "",
  fecha: new Date().toISOString().slice(0, 10),
  escenas: "",
  objetivo_escena: "",
  ajuste_interpretacion: "",
  continuidad_arco: "",
  pendiente_proximo: "",
  adjunto_nota: "",
  privada: "Visible al equipo",
};

function fechaCorta(iso: string): string {
  if (!iso) return "sin fecha";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotasEnsayoPanel({ fullName, editable }: Props) {
  const { sesiones, loading, error, crear, editar, borrar, sembrarEjemplos } = useNotasEnsayoFilas(fullName);
  const [personajeAbierto, setPersonajeAbierto] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  // Siembra inicial: solo una vez, cuando ya sabemos de verdad que el
  // proyecto no tiene ninguna sesión (loading terminó, sin error, lista vacía).
  const sembroIntentado = useRef(false);
  useEffect(() => {
    if (loading || error || sembroIntentado.current) return;
    if (sesiones.length === 0 && editable) {
      sembroIntentado.current = true;
      sembrarEjemplos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, sesiones.length, editable]);

  function avisarGuardado() {
    setGuardado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setGuardado(false), 2000);
  }

  // Filtro de visibilidad: una fila "Privada" solo se muestra a quien la
  // creó. (Filtro en cliente — la policy de fila a nivel de base, pendiente,
  // ver riesgo #2 de la arquitectura).
  const visibles = useMemo(
    () => sesiones.filter((s) => s.datos.privada !== "Privada" || s.esMia),
    [sesiones]
  );

  // Agrupación por personaje — el corazón de la vista. Orden de personajes:
  // por fecha de la sesión más reciente, el más activo primero.
  const personajes = useMemo(() => {
    const porNombre = new Map<string, FilaSesion[]>();
    for (const s of visibles) {
      const key = s.datos.personaje || "(sin personaje)";
      if (!porNombre.has(key)) porNombre.set(key, []);
      porNombre.get(key)!.push(s);
    }
    return Array.from(porNombre.entries())
      .map(([nombre, filas]) => ({
        nombre,
        filas: [...filas].sort((a, b) => b.datos.fecha.localeCompare(a.datos.fecha)),
      }))
      .sort((a, b) => (b.filas[0]?.datos.fecha ?? "").localeCompare(a.filas[0]?.datos.fecha ?? ""));
  }, [visibles]);

  function cambiar<K extends keyof SesionEnsayo>(fila: FilaSesion, campo: K, valor: SesionEnsayo[K]) {
    if (fila.datos[campo] === valor) return;
    editar(fila.id, { ...fila.datos, [campo]: valor });
    avisarGuardado();
  }

  async function nuevaSesion(personajeBase?: FilaSesion) {
    const base: SesionEnsayo = personajeBase
      ? {
          ...SESION_VACIA,
          personaje: personajeBase.datos.personaje,
          actor: personajeBase.datos.actor,
          arco_personaje: personajeBase.datos.arco_personaje,
          objetivo_personaje: personajeBase.datos.objetivo_personaje,
        }
      : SESION_VACIA;
    const ok = await crear(base);
    if (ok && personajeBase) {
      setPersonajeAbierto(personajeBase.datos.personaje);
      avisarGuardado();
    }
  }

  async function nuevoPersonaje() {
    const nombre = window.prompt("Nombre del personaje:");
    if (!nombre || !nombre.trim()) return;
    const actor = window.prompt("Actor/actriz asignado (opcional):") ?? "";
    const ok = await crear({ ...SESION_VACIA, personaje: nombre.trim(), actor: actor.trim() });
    if (ok) setPersonajeAbierto(nombre.trim());
  }

  function borrarSesion(fila: FilaSesion) {
    if (!window.confirm("¿Borrar esta sesión de ensayo? No se puede deshacer.")) return;
    borrar(fila.id);
  }

  if (loading) return null;

  if (error) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <p>{error === "sin-proyecto" ? "Elegí un proyecto para ver sus notas de ensayo." : error}</p>
      </div>
    );
  }

  const titulo = (
    <h3>
      <span className="hex ens-hex"></span>
      Notas de ensayo por actor/personaje
    </h3>
  );

  // ---------------------------------------------------------------------
  // Nivel 1: selector de personaje (tarjetas, nunca filas de tabla).
  // ---------------------------------------------------------------------
  if (!personajeAbierto) {
    return (
      <>
        <div className="hp-open-head">
          {titulo}
          {editable && (
            <div className="hp-open-head-tabs">
              <button className="cp-btn ens-btn-acc" onClick={nuevoPersonaje}>
                <Icon name="plus" size={13} /> Nuevo personaje
              </button>
            </div>
          )}
        </div>
        <div className="ens-wrap hp-print-area">
          <PrintHeader herramientaNombre="Notas de ensayo por actor/personaje" departamento={NOTAS_ENSAYO_DEPARTAMENTO} />
          {guardado && <span className="amsg ok ens-guardado" role="status">Guardado</span>}
          {personajes.length === 0 ? (
            <div className="soon-box">
              <span className="hex"></span>
              <h4>Todavía no hay ningún personaje en ensayo</h4>
              <p>
                {editable
                  ? "Cada personaje lleva su propia línea de tiempo de sesiones — arrancá creando el primero."
                  : "Dirección de actores todavía no registró ninguna sesión."}
              </p>
            </div>
          ) : (
            <div className="ens-grid">
              {personajes.map(({ nombre, filas }) => {
                const ultima = filas[0];
                return (
                  <button key={nombre} className="ens-card" onClick={() => setPersonajeAbierto(nombre)}>
                    <span className="ens-card-bar" />
                    <div className="ens-card-top">
                      <span className="ens-card-nombre">{nombre}</span>
                      {ultima?.datos.privada === "Privada" && (
                        <span className="ens-tag-priv" title="Tiene notas privadas">
                          <Icon name="key" size={11} />
                        </span>
                      )}
                    </div>
                    <span className="ens-card-actor">{ultima?.datos.actor || "Sin actor asignado"}</span>
                    <div className="ens-card-meta">
                      <Icon name="clock" size={12} />
                      <span>{filas.length} sesión{filas.length === 1 ? "" : "es"} · última {fechaCorta(ultima?.datos.fecha ?? "")}</span>
                    </div>
                    {ultima?.datos.pendiente_proximo && (
                      <p className="ens-card-pend">
                        <Icon name="arrow-right" size={12} /> {ultima.datos.pendiente_proximo}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------
  // Nivel 2: línea de tiempo vertical de sesiones de un personaje.
  // ---------------------------------------------------------------------
  const filasPersonaje = personajes.find((p) => p.nombre === personajeAbierto)?.filas ?? [];
  const cabecera = filasPersonaje[0];

  return (
    <>
      <div className="hp-open-head">
        <h3>
          <span className="hex ens-hex"></span>
          {personajeAbierto}
        </h3>
        <div className="hp-open-head-tabs">
          <button className="cp-btn" onClick={() => setPersonajeAbierto(null)}>
            <Icon name="arrow-left" size={13} /> Todos los personajes
          </button>
          {editable && (
            <button className="cp-btn ens-btn-acc" onClick={() => nuevaSesion(cabecera)}>
              <Icon name="plus" size={13} /> Nueva sesión
            </button>
          )}
        </div>
      </div>
      <div className="ens-wrap hp-print-area">
        <PrintHeader herramientaNombre="Notas de ensayo por actor/personaje" departamento={NOTAS_ENSAYO_DEPARTAMENTO} />
        {guardado && <span className="amsg ok ens-guardado" role="status">Guardado</span>}

        {/* Cabecera de arco — fija, de solo lectura salvo edición explícita,
            ancla la continuidad del arco al arco de guion real (sección 3.2
            de la arquitectura: lectura de rep-ficha-personaje.arco/objetivo;
            acá, dentro del prototipo, se edita directo en la sesión más
            reciente y se repite hacia abajo). */}
        {cabecera && (
          <div className="ens-arco">
            <div className="ens-arco-row">
              <span className="ens-arco-lbl">Actor/actriz</span>
              {editable ? (
                <input
                  className="ens-arco-in"
                  defaultValue={cabecera.datos.actor}
                  onBlur={(e) => cambiar(cabecera, "actor", e.target.value)}
                />
              ) : (
                <span className="ens-arco-val">{cabecera.datos.actor || "—"}</span>
              )}
            </div>
            <div className="ens-arco-row">
              <span className="ens-arco-lbl">Arco del personaje</span>
              {editable ? (
                <textarea
                  className="ens-arco-ta"
                  rows={2}
                  defaultValue={cabecera.datos.arco_personaje}
                  onBlur={(e) => cambiar(cabecera, "arco_personaje", e.target.value)}
                />
              ) : (
                <p className="ens-arco-val">{cabecera.datos.arco_personaje || "—"}</p>
              )}
            </div>
            <div className="ens-arco-row">
              <span className="ens-arco-lbl">Objetivo del personaje</span>
              {editable ? (
                <textarea
                  className="ens-arco-ta"
                  rows={2}
                  defaultValue={cabecera.datos.objetivo_personaje}
                  onBlur={(e) => cambiar(cabecera, "objetivo_personaje", e.target.value)}
                />
              ) : (
                <p className="ens-arco-val">{cabecera.datos.objetivo_personaje || "—"}</p>
              )}
            </div>
            {cabecera.datos.continuidad_arco && (
              <div className="ens-arco-cambio">
                <Icon name="alert-triangle" size={13} />
                <div>
                  <span className="ens-arco-cambio-lbl">Qué cambió desde la última sesión</span>
                  <p>{cabecera.datos.continuidad_arco}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="ens-timeline">
          {filasPersonaje.map((fila, i) => (
            <SesionCard
              key={fila.id}
              fila={fila}
              editable={editable}
              esPrimeraDelPersonaje={i === filasPersonaje.length - 1}
              onCambiar={(campo, valor) => cambiar(fila, campo, valor)}
              onBorrar={() => borrarSesion(fila)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function SesionCard({
  fila,
  editable,
  esPrimeraDelPersonaje,
  onCambiar,
  onBorrar,
}: {
  fila: FilaSesion;
  editable: boolean;
  esPrimeraDelPersonaje: boolean;
  onCambiar: <K extends keyof SesionEnsayo>(campo: K, valor: SesionEnsayo[K]) => void;
  onBorrar: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const d = fila.datos;
  const escenas = escenasALista(d.escenas);

  return (
    <div className={`ens-sesion ${d.privada === "Privada" ? "ens-sesion-priv" : ""}`}>
      <span className="ens-sesion-dot" />
      <div className="ens-sesion-card">
        <button className="ens-sesion-head" onClick={() => setAbierta((v) => !v)}>
          <span className="ens-sesion-fecha">
            <Icon name="clock" size={12} /> {fechaCorta(d.fecha)}
          </span>
          <span className="ens-sesion-escenas">
            {escenas.length > 0
              ? escenas.map((e) => <span key={e} className="ens-chip">{e}</span>)
              : <span className="ens-chip ens-chip-vacio">sin escena</span>}
          </span>
          {d.privada === "Privada" && (
            <span className="ens-tag-priv" title="Nota privada del director de actores">
              <Icon name="key" size={11} /> Privada
            </span>
          )}
          <Icon name={abierta ? "chevron-up" : "chevron-down"} size={14} className="ens-sesion-chev" />
        </button>

        {abierta && (
          <div className="ens-sesion-body">
            {editable ? (
              <>
                <label className="ens-field">
                  <span>Fecha de ensayo</span>
                  <input type="date" defaultValue={d.fecha} onBlur={(e) => onCambiar("fecha", e.target.value)} />
                </label>
                <label className="ens-field">
                  <span>Escenas trabajadas (separadas por coma)</span>
                  <input defaultValue={d.escenas} onBlur={(e) => onCambiar("escenas", e.target.value)} />
                </label>
                <label className="ens-field">
                  <span>Objetivo de la escena</span>
                  <textarea rows={2} defaultValue={d.objetivo_escena} onBlur={(e) => onCambiar("objetivo_escena", e.target.value)} />
                </label>
                <label className="ens-field">
                  <span>Ajuste de interpretación trabajado</span>
                  <textarea rows={2} defaultValue={d.ajuste_interpretacion} onBlur={(e) => onCambiar("ajuste_interpretacion", e.target.value)} />
                </label>
                {!esPrimeraDelPersonaje && (
                  <label className="ens-field">
                    <span>Continuidad del arco desde el ensayo anterior</span>
                    <textarea rows={2} defaultValue={d.continuidad_arco} onBlur={(e) => onCambiar("continuidad_arco", e.target.value)} />
                  </label>
                )}
                <label className="ens-field">
                  <span>Pendiente para el próximo ensayo</span>
                  <textarea rows={2} defaultValue={d.pendiente_proximo} onBlur={(e) => onCambiar("pendiente_proximo", e.target.value)} />
                </label>
                <label className="ens-field">
                  <span>Adjunto (nombre de audio/foto de ensayo)</span>
                  <input defaultValue={d.adjunto_nota} placeholder="ej. nota-voz-15oct.m4a" onBlur={(e) => onCambiar("adjunto_nota", e.target.value)} />
                </label>
                <label className="ens-field ens-field-select">
                  <span>Visibilidad</span>
                  <select defaultValue={d.privada} onChange={(e) => onCambiar("privada", e.target.value as Visibilidad)}>
                    {VISIBILIDAD.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button className="cp-btn hp-btn-danger ens-btn-del" onClick={onBorrar}>
                  <Icon name="trash" size={13} /> Borrar sesión
                </button>
              </>
            ) : (
              <>
                <Campo label="Objetivo de la escena" valor={d.objetivo_escena} />
                <Campo label="Ajuste de interpretación trabajado" valor={d.ajuste_interpretacion} />
                {!esPrimeraDelPersonaje && <Campo label="Continuidad del arco" valor={d.continuidad_arco} />}
                <Campo label="Pendiente para el próximo ensayo" valor={d.pendiente_proximo} />
                {d.adjunto_nota && <Campo label="Adjunto" valor={d.adjunto_nota} />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  if (!valor) return null;
  return (
    <div className="ens-field ens-field-ro">
      <span>{label}</span>
      <p>{valor}</p>
    </div>
  );
}
