"use client";

// Control de horarios y avisos al equipo (1AD) — Dirección / 1er asistente
// de dirección.
//
// PANEL A MEDIDA, no el motor genérico de tabla. Ronda 2 de rebote de Nico
// ("esto no es una herramienta, es simplemente un cuadro") — ver
// oficina/expedientes/2026-11-25_direccion_control-horarios-1ad/
// rediseno-panel-medida.md. Jerarquía real de tres niveles que una tabla
// plana (1 fila = 1 setup) aplanaba: Día de rodaje → Departamento con
// presencia real en el set (Gantt de barras CSS, sin librería) → cargo/
// citación dentro del departamento (ajuste de Nico, directo sobre el
// panel, no estaba en la spec original escrita) → detalle de wrap
// previsto/real por setup (el registro original de la ronda 1, sin
// pérdida, 7 campos intactos + el campo de cargo que habilita la
// agrupación). Mismo patrón ya usado por NotasEnsayoPanel.tsx (nivel 1
// tarjetas, nivel 2 vista agrupada a medida).
//
// Cero texto explicativo renderizado al abrir (regla endurecida 25/11/2026):
// esta vista no imprime ningún hint — el campo `hint` en herramientas.ts
// sigue existiendo solo como doc interna.

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "../components/Icon";
import CpSelect from "../components/CpSelect";
import { PrintHeader } from "./HerramientaPanel";
import {
  AVISO_OPCIONES,
  CONTROL_HORARIOS_1AD_DEPARTAMENTO,
  DEPARTAMENTOS_SET,
  OVERTIME_OPCIONES,
  calcularDeltaOvertime,
  agruparPorCargo,
  cantidadSetups,
  ejeDelDia,
  nuevoDepartamentoDia,
  nuevoSetup,
  overtimeDia,
  posicionPct,
  wrapMasTardio,
  type AvisoEnviado,
  type DepartamentoDia,
  type DiaControlHorarios,
  type Overtime,
  type SetupHorario,
} from "./controlHorarios1adFilas";
import { useControlHorarios1ad, type FilaDia } from "./useControlHorarios1ad";

type Props = { fullName: string; editable: boolean };

// Tono por departamento (acento visual real del sistema de diseño, ver
// ACCENTS en app/constants.ts) — para que cada barra del Gantt se distinga
// de un vistazo sin inventar una paleta nueva.
const TONO_DEPTO: Record<string, string> = {
  "Fotografía": "var(--blue)",
  "Arte": "var(--pink)",
  "Sonido": "var(--gold)",
  "Reparto": "var(--white)",
  "Producción": "var(--cyan)",
  "Dirección": "var(--lime)",
};
function tonoDe(depto: string): string {
  return TONO_DEPTO[depto] ?? "var(--muted)";
}

function fechaCorta(iso: string): string {
  if (!iso) return "sin fecha";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

type DiaPlan = { dia: string; fecha: string };

export default function ControlHorarios1ADPanel({ fullName, editable }: Props) {
  const { dias, loading, error, crearDia, guardarDia, sembrarEjemplos } = useControlHorarios1ad(fullName);
  const [planDias, setPlanDias] = useState<DiaPlan[]>([]);
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Nivel 1 — lectura pura del plan de rodaje general (gen-plan-rodaje) para
  // derivar la lista de jornadas (Día X/Y + fecha): nunca se duplica a mano
  // (ver sección "Origen de la fecha/Día X-Y" de la especificación).
  useEffect(() => {
    (async () => {
      const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
      if (!projectId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("herramienta_filas")
        .select("datos")
        .eq("project_id", projectId)
        .eq("herramienta_id", "gen-plan-rodaje");
      const filas = (data ?? []) as { datos: Record<string, string> }[];
      setPlanDias(
        filas
          .map((f) => ({ dia: f.datos?.dia ?? "", fecha: f.datos?.fecha ?? "" }))
          .filter((d) => !!d.fecha)
      );
    })();
  }, []);

  // Siembra inicial: solo si el proyecto todavía no tiene ninguna jornada
  // propia registrada (prohibido el "cuadro vacío genérico").
  const sembroRef = useRef(false);
  useEffect(() => {
    if (loading || error || sembroRef.current) return;
    if (dias.length === 0 && editable) {
      sembroRef.current = true;
      sembrarEjemplos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, dias.length, editable]);

  function avisarGuardado() {
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  // Fusión nivel 1: toda fecha del plan de rodaje + toda fecha que ya tenga
  // entradas propias (por si el plan todavía no la tiene cargada), orden
  // cronológico. Nunca se pierde una jornada con datos reales solo porque el
  // plan de rodaje no la menciona.
  const filas = useMemo(() => {
    const porFecha = new Map<string, FilaDia>();
    for (const f of dias) porFecha.set(f.dia.dia_fecha, f);
    const fechas = new Set<string>([...planDias.map((p) => p.fecha), ...dias.map((d) => d.dia.dia_fecha)]);
    const ordenadas = Array.from(fechas).filter(Boolean).sort();
    return ordenadas.map((fecha, i) => {
      const plan = planDias.find((p) => p.fecha === fecha);
      const existente = porFecha.get(fecha);
      return {
        fecha,
        diaLabel: plan?.dia || `${i + 1}/${ordenadas.length}`,
        filaId: existente?.id ?? null,
        dia: existente?.dia ?? { dia_fecha: fecha, departamentos: [] },
      };
    });
  }, [dias, planDias]);

  async function abrirODia(fecha: string) {
    setFechaAbierta(fecha);
    const yaExiste = dias.some((d) => d.dia.dia_fecha === fecha);
    if (!yaExiste) {
      await crearDia({ dia_fecha: fecha, departamentos: [] });
    }
  }

  async function agregarDepartamento(filaId: string | null, fecha: string, departamento: string) {
    let id = filaId;
    if (!id) id = await crearDia({ dia_fecha: fecha, departamentos: [] });
    if (!id) return;
    guardarDia(id, (actual) => ({ ...actual, departamentos: [...actual.departamentos, nuevoDepartamentoDia(departamento)] }));
    avisarGuardado();
  }

  // Recibe una función de actualización (nunca un `DiaControlHorarios` ya
  // armado a partir de una instantánea de render) para que `guardarDia`
  // la aplique siempre contra el último valor real conocido (ver Bug 1).
  function cambiarDia(filaId: string, actualizar: (dia: DiaControlHorarios) => DiaControlHorarios) {
    guardarDia(filaId, actualizar);
    avisarGuardado();
  }

  // Bug 2(a) — vía de creación manual de un día nuevo, sin depender de que
  // `gen-plan-rodaje` tenga datos ni de que ya existan filas válidas: pide
  // la fecha (default razonable: el día siguiente a la última jornada
  // conocida, o mañana si todavía no hay ninguna) y crea la fila
  // `dia_fecha`/`departamentos` directamente.
  async function agregarDiaManual() {
    const ultimaFecha = filas.length ? filas[filas.length - 1].fecha : null;
    const base = ultimaFecha ? new Date(ultimaFecha + "T00:00:00") : new Date();
    if (ultimaFecha) base.setDate(base.getDate() + 1);
    const sugerida = base.toISOString().slice(0, 10);
    const fecha = window.prompt("Fecha de la nueva jornada (AAAA-MM-DD):", sugerida);
    if (!fecha) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      window.alert("Fecha inválida — usá el formato AAAA-MM-DD.");
      return;
    }
    if (filas.some((f) => f.fecha === fecha)) {
      setFechaAbierta(fecha);
      return;
    }
    const id = await crearDia({ dia_fecha: fecha, departamentos: [] });
    if (id) setFechaAbierta(fecha);
  }

  if (loading) return null;

  if (error) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <p>{error === "sin-proyecto" ? "Elegí un proyecto para ver el control de horarios." : error}</p>
      </div>
    );
  }

  const titulo = (
    <h3>
      <span className="hex ch1-hex"></span>
      Control de horarios y avisos al equipo (1AD)
    </h3>
  );

  // ---------------------------------------------------------------------
  // Nivel 1: tarjetas por día de rodaje.
  // ---------------------------------------------------------------------
  if (!fechaAbierta) {
    return (
      <>
        <div className="hp-open-head">{titulo}</div>
        <div className="ch1-wrap hp-print-area">
          <PrintHeader herramientaNombre="Control de horarios y avisos al equipo (1AD)" departamento={CONTROL_HORARIOS_1AD_DEPARTAMENTO} />
          {guardado && <span className="amsg ok ch1-guardado" role="status">Guardado</span>}
          {filas.length === 0 ? (
            <div className="soon-box">
              <span className="hex"></span>
              <h4>Todavía no hay jornadas de rodaje</h4>
              <p>Cargá el plan de rodaje para que las jornadas aparezcan acá automáticamente.</p>
              {editable && (
                <button className="cp-btn ch1-btn-acc" onClick={agregarDiaManual}>
                  <Icon name="plus" size={13} /> Agregar día
                </button>
              )}
            </div>
          ) : (
            <div className="ch1-grid">
              {editable && (
                <button className="ch1-card ch1-card-add" onClick={agregarDiaManual}>
                  <Icon name="plus" size={18} />
                  <span>Agregar día</span>
                </button>
              )}
              {filas.map(({ fecha, diaLabel, dia }) => {
                const overtime = overtimeDia(dia);
                const wrap = wrapMasTardio(dia);
                const n = cantidadSetups(dia);
                return (
                  <button key={fecha} className="ch1-card" onClick={() => abrirODia(fecha)}>
                    <div className="ch1-card-head">
                      <span className="ch1-card-dia">Día {diaLabel}</span>
                      {overtime !== "no" && (
                        <span className={`ch1-chip-ot ${overtime === "confirmado" ? "fuerte" : "tenue"}`}>
                          <Icon name="alert-triangle" size={11} /> Overtime
                        </span>
                      )}
                    </div>
                    <span className="ch1-card-fecha">
                      <Icon name="calendar" size={12} /> {fechaCorta(fecha)}
                    </span>
                    <div className="ch1-card-meta">
                      <span><Icon name="users" size={12} /> {dia.departamentos.length} depto{dia.departamentos.length === 1 ? "" : "s"}</span>
                      <span><Icon name="checklist" size={12} /> {n} setup{n === 1 ? "" : "s"}</span>
                    </div>
                    <span className="ch1-card-wrap">
                      <Icon name="clock" size={12} /> {wrap ? `Wrap más tardío: ${wrap}` : "Sin wrap registrado"}
                    </span>
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
  // Nivel 2: Gantt de presencia por departamento del día abierto. Al
  // tocar/pinchar la barra de un departamento se abre su detalle agrupado
  // por cargo/citación (nivel 3).
  // ---------------------------------------------------------------------
  const filaActual = filas.find((f) => f.fecha === fechaAbierta);
  const dia = filaActual?.dia ?? { dia_fecha: fechaAbierta, departamentos: [] };
  const eje = ejeDelDia(dia);
  const departamentosFaltantes = DEPARTAMENTOS_SET.filter((d) => !dia.departamentos.some((x) => x.departamento === d));

  return (
    <>
      <div className="hp-open-head">
        <h3>
          <span className="hex ch1-hex"></span>
          Día {filaActual?.diaLabel} — {fechaCorta(fechaAbierta)}
        </h3>
        <div className="hp-open-head-tabs">
          <button className="cp-btn" onClick={() => setFechaAbierta(null)}>
            <Icon name="arrow-left" size={13} /> Todos los días
          </button>
        </div>
      </div>
      <div className="ch1-wrap hp-print-area">
        <PrintHeader herramientaNombre="Control de horarios y avisos al equipo (1AD)" departamento={CONTROL_HORARIOS_1AD_DEPARTAMENTO} />
        {guardado && <span className="amsg ok ch1-guardado" role="status">Guardado</span>}

        {dia.departamentos.length === 0 ? (
          <div className="soon-box ch1-empty">
            <span className="hex"></span>
            <h4>Todavía no hay horarios cargados para este día</h4>
            <p>Elegí el primer departamento que llegó al set para empezar su barra de presencia.</p>
            {editable && (
              <div className="ch1-empty-chips">
                {DEPARTAMENTOS_SET.map((d) => (
                  <button key={d} className="cp-btn ch1-btn-acc" style={{ borderColor: tonoDe(d), color: tonoDe(d) }} onClick={() => agregarDepartamento(filaActual?.filaId ?? null, fechaAbierta, d)}>
                    <Icon name="plus" size={12} /> {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="ch1-eje">
              <span>{eje.inicio}</span>
              <span className="ch1-eje-lbl">Eje del día (call más temprano → wrap más tardío)</span>
              <span>{eje.fin}</span>
            </div>
            <div className="ch1-gantt">
              {dia.departamentos.map((dep, i) => (
                <DepartamentoBarra
                  key={`${dep.departamento}-${i}`}
                  dep={dep}
                  eje={eje}
                  editable={editable}
                  // Nunca se arma el `DepartamentoDia` nuevo contra `dep`/`dia`
                  // capturados en este render (ver Bug 1): se manda una
                  // función de parche que `guardarDia` aplica contra el
                  // último valor real conocido en el hook.
                  onCambiar={(parchar) => {
                    if (!filaActual?.filaId) return;
                    cambiarDia(filaActual.filaId, (actualDia) => ({
                      ...actualDia,
                      departamentos: actualDia.departamentos.map((d, idx) => (idx === i ? parchar(d) : d)),
                    }));
                  }}
                  onBorrar={() => {
                    if (!filaActual?.filaId) return;
                    if (!window.confirm(`¿Quitar a ${dep.departamento} de este día?`)) return;
                    cambiarDia(filaActual.filaId, (actualDia) => ({
                      ...actualDia,
                      departamentos: actualDia.departamentos.filter((_, idx) => idx !== i),
                    }));
                  }}
                />
              ))}
            </div>
            {editable && departamentosFaltantes.length > 0 && (
              <div className="ch1-add-depto">
                <span>Agregar departamento:</span>
                <div className="ch1-empty-chips">
                  {departamentosFaltantes.map((d) => (
                    <button key={d} className="cp-btn ch1-btn-acc" style={{ borderColor: tonoDe(d), color: tonoDe(d) }} onClick={() => agregarDepartamento(filaActual?.filaId ?? null, fechaAbierta, d)}>
                      <Icon name="plus" size={12} /> {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function DepartamentoBarra({
  dep,
  eje,
  editable,
  onCambiar,
  onBorrar,
}: {
  dep: DepartamentoDia;
  eje: { inicio: string; fin: string };
  editable: boolean;
  // Función de parche, no el objeto ya armado (ver Bug 1): quien aplica el
  // parche es siempre el último `DepartamentoDia` real conocido, nunca el
  // `dep` de este render (que puede estar obsoleto si hubo una escritura
  // concurrente todavía no reflejada en props).
  onCambiar: (parchar: (dep: DepartamentoDia) => DepartamentoDia) => void;
  onBorrar: () => void;
}) {
  // Click/tap en la barra (o en su cabecera) abre el detalle de ESE
  // departamento, agrupado por cargo/citación — pedido de Nico, directo
  // sobre el panel (rebote 25/11), no estaba en la spec original escrita.
  const [abierta, setAbierta] = useState(false);
  const tono = tonoDe(dep.departamento);
  const left = posicionPct(dep.hora_llegada_real, eje);
  const right = posicionPct(dep.hora_salida_real, eje);
  const width = Math.max(2, right - left);

  function cambiarCampo<K extends keyof DepartamentoDia>(campo: K, valor: DepartamentoDia[K]) {
    onCambiar((actual) => ({ ...actual, [campo]: valor }));
  }

  function cambiarSetup(id: string, campo: keyof SetupHorario, valor: string) {
    onCambiar((actual) => ({ ...actual, setups: actual.setups.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)) }));
  }

  function agregarSetup() {
    onCambiar((actual) => ({ ...actual, setups: [...actual.setups, nuevoSetup()] }));
  }

  function borrarSetup(id: string) {
    onCambiar((actual) => ({ ...actual, setups: actual.setups.filter((s) => s.id !== id) }));
  }

  return (
    <div className="ch1-fila-depto">
      <button className="ch1-depto-head" onClick={() => setAbierta((v) => !v)}>
        <span className="ch1-depto-nombre" style={{ color: tono }}>{dep.departamento}</span>
        <span className="ch1-depto-horas">
          {dep.hora_llegada_real || "—"} → {dep.hora_salida_real || "—"}
        </span>
        <Icon name={abierta ? "chevron-up" : "chevron-down"} size={14} className="ch1-depto-chev" />
      </button>
      <button className="ch1-track" onClick={() => setAbierta((v) => !v)} title={`Ver detalle de ${dep.departamento}`}>
        <div
          className="ch1-barra"
          style={{ left: `${left}%`, width: `${width}%`, background: tono }}
        >
          {dep.setups.map((s) => {
            const pos = posicionPct(s.hora_real_wrap || s.hora_prevista_wrap, eje);
            const posRelativa = Math.max(0, Math.min(100, width > 0 ? ((pos - left) / width) * 100 : 0));
            return (
              <span
                key={s.id}
                className={`ch1-marca ${s.overtime === "Confirmado" ? "ch1-marca-ot" : s.overtime === "Alerta" ? "ch1-marca-alerta" : ""}`}
                style={{ left: `${posRelativa}%` }}
              />
            );
          })}
        </div>
      </button>

      {abierta && (
        <div className="ch1-depto-body">
          {editable ? (
            <div className="ch1-horas-row">
              <label className="ch1-field">
                <span>Hora de llegada real</span>
                <input type="time" defaultValue={dep.hora_llegada_real} onBlur={(e) => cambiarCampo("hora_llegada_real", e.target.value)} />
              </label>
              <label className="ch1-field">
                <span>Hora de salida real</span>
                <input type="time" defaultValue={dep.hora_salida_real} onBlur={(e) => cambiarCampo("hora_salida_real", e.target.value)} />
              </label>
            </div>
          ) : (
            <p className="ch1-ro">Presencia real: {dep.hora_llegada_real || "—"} a {dep.hora_salida_real || "—"}</p>
          )}

          {/* Detalle agrupado por cargo/citación — nunca una lista plana de
              setups sin agrupar por quién. Dentro de cada grupo de cargo,
              una mini línea de tiempo propia con una marca por citación,
              ubicada según su franja horaria dentro del eje del día. */}
          <div className="ch1-cargos">
            {agruparPorCargo(dep.setups).map(({ cargo, setups }) => {
              const inicioGrupo = setups.reduce((min, s) => (s.hora_prevista_wrap && (!min || s.hora_prevista_wrap < min) ? s.hora_prevista_wrap : min), "");
              const finGrupo = setups.reduce((max, s) => (s.hora_real_wrap && (!max || s.hora_real_wrap > max) ? s.hora_real_wrap : max), "");
              const gLeft = posicionPct(inicioGrupo, eje);
              const gRight = posicionPct(finGrupo || inicioGrupo, eje);
              const gWidth = Math.max(1.5, gRight - gLeft);
              return (
                <div key={cargo} className="ch1-cargo-grupo">
                  <div className="ch1-cargo-head">
                    <Icon name="users" size={12} />
                    <span className="ch1-cargo-nombre">{cargo}</span>
                    <span className="ch1-cargo-count">{setups.length} citación{setups.length === 1 ? "" : "es"}</span>
                  </div>
                  <div className="ch1-cargo-track">
                    <div className="ch1-cargo-barra" style={{ left: `${gLeft}%`, width: `${gWidth}%`, background: tono, opacity: 0.35 }} />
                    {setups.map((s) => {
                      const pos = posicionPct(s.hora_prevista_wrap || s.hora_real_wrap, eje);
                      return <span key={s.id} className="ch1-cargo-marca" style={{ left: `${pos}%`, background: tono }} title={`${s.escena_setup} · previsto ${s.hora_prevista_wrap || "?"}`} />;
                    })}
                  </div>
                  <div className="ch1-setups">
                    {setups.map((s) => (
                      <SetupFila key={s.id} setup={s} editable={editable} onCambiar={(campo, valor) => cambiarSetup(s.id, campo, valor)} onBorrar={() => borrarSetup(s.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {editable && (
            <div className="ch1-depto-acciones">
              <button className="cp-btn" onClick={agregarSetup}>
                <Icon name="plus" size={12} /> Agregar setup/citación
              </button>
              <button className="cp-btn hp-btn-danger" onClick={onBorrar}>
                <Icon name="trash" size={12} /> Quitar departamento del día
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SetupFila({
  setup,
  editable,
  onCambiar,
  onBorrar,
}: {
  setup: SetupHorario;
  editable: boolean;
  onCambiar: (campo: keyof SetupHorario, valor: string) => void;
  onBorrar: () => void;
}) {
  const [check, setCheck] = useState<"ok" | "alerta" | null>(null);
  const [horaPrevista, setHoraPrevista] = useState(setup.hora_prevista_wrap);
  const [horaReal, setHoraReal] = useState(setup.hora_real_wrap);

  function onCambiarHora(campo: "hora_prevista_wrap" | "hora_real_wrap", valor: string) {
    const prevista = campo === "hora_prevista_wrap" ? valor : horaPrevista;
    const real = campo === "hora_real_wrap" ? valor : horaReal;
    if (campo === "hora_prevista_wrap") setHoraPrevista(valor); else setHoraReal(valor);
    onCambiar(campo, valor);
    const { delta_minutos, overtime } = calcularDeltaOvertime(prevista, real);
    onCambiar("delta_minutos", delta_minutos);
    onCambiar("overtime", overtime);
  }

  // Validación liviana (no bloquea el guardado) contra GENERAL_PLAN_RODAJE
  // .escenas, por subcadena — mismo mecanismo y criterio que la ronda 2 ya
  // dejó funcionando en el motor genérico de tabla, trasladado acá al input
  // de setup bespoke (ver spec, sección "Integración").
  async function verificar(valor: string) {
    const texto = valor.trim();
    if (!texto) { setCheck(null); return; }
    try {
      const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
      if (!projectId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("herramienta_filas")
        .select("datos")
        .eq("project_id", projectId)
        .eq("herramienta_id", "gen-plan-rodaje");
      const plan = (data ?? []).map((r) => (r.datos as Record<string, string>)?.escenas ?? "").filter(Boolean);
      if (!plan.length) { setCheck(null); return; }
      const buscado = texto.split("/")[0].trim().toLowerCase();
      const encontrada = plan.some((escenasJornada) => escenasJornada.toLowerCase().includes(buscado));
      setCheck(encontrada ? "ok" : "alerta");
    } catch {
      /* sin bloquear el guardado */
    }
  }

  return (
    <div className="ch1-setup" data-setup-id={setup.id}>
      {editable ? (
        <>
          <label className="ch1-field">
            <span>Cargo / citación</span>
            <input defaultValue={setup.cargo} placeholder="ej. Operador de cámara" onBlur={(e) => onCambiar("cargo", e.target.value)} />
          </label>
          <label className="ch1-field ch1-field-setup">
            <span>Escena / Setup</span>
            <div className="ch1-setup-input">
              <input
                defaultValue={setup.escena_setup}
                placeholder="ej. E12 / Setup 1"
                onBlur={(e) => { onCambiar("escena_setup", e.target.value); verificar(e.target.value); }}
              />
              {check && <Icon name={check === "ok" ? "check" : "alert-triangle"} size={13} className={check === "ok" ? "ch1-check-ok" : "ch1-check-alerta"} />}
            </div>
          </label>
          <div className="ch1-horas-row">
            <label className="ch1-field">
              <span>Wrap previsto</span>
              <input type="time" defaultValue={setup.hora_prevista_wrap} onBlur={(e) => onCambiarHora("hora_prevista_wrap", e.target.value)} />
            </label>
            <label className="ch1-field">
              <span>Wrap real</span>
              <input type="time" defaultValue={setup.hora_real_wrap} onBlur={(e) => onCambiarHora("hora_real_wrap", e.target.value)} />
            </label>
            <label className="ch1-field">
              <span>Delta (min.), calculado</span>
              <input value={setup.delta_minutos} readOnly tabIndex={-1} />
            </label>
          </div>
          <div className="ch1-horas-row">
            <label className="ch1-field ch1-field-select">
              <span>Overtime, calculado — override manual si hace falta</span>
              <CpSelect value={setup.overtime} options={OVERTIME_OPCIONES.map((o) => ({ value: o, label: o }))} placeholder="Overtime" onChange={(v) => onCambiar("overtime", v as Overtime)} />
            </label>
            <label className="ch1-field ch1-field-select">
              <span>Aviso enviado</span>
              <CpSelect value={setup.aviso_enviado} options={AVISO_OPCIONES.map((o) => ({ value: o, label: o }))} placeholder="Aviso enviado" onChange={(v) => onCambiar("aviso_enviado", v as AvisoEnviado)} />
            </label>
          </div>
          <label className="ch1-field">
            <span>Observación</span>
            <textarea rows={2} defaultValue={setup.observacion} onBlur={(e) => onCambiar("observacion", e.target.value)} />
          </label>
          <button className="cp-btn hp-btn-danger ch1-btn-del-setup" onClick={onBorrar}>
            <Icon name="trash" size={12} /> Borrar setup
          </button>
        </>
      ) : (
        <>
          <span className="ch1-setup-nombre">{setup.escena_setup || "(sin escena)"}</span>
          {setup.cargo && <span className="ch1-setup-cargo">{setup.cargo}</span>}
          <span className="ch1-setup-horas">Previsto {setup.hora_prevista_wrap || "—"} · Real {setup.hora_real_wrap || "—"} ({setup.delta_minutos || "0"} min)</span>
          {setup.overtime !== "No" && setup.overtime && <span className={`ch1-chip-ot ${setup.overtime === "Confirmado" ? "fuerte" : "tenue"}`}><Icon name="alert-triangle" size={10} /> {setup.overtime}</span>}
          <span className="ch1-setup-aviso"><Icon name="bell" size={11} /> {setup.aviso_enviado || "—"}</span>
          {setup.observacion && <p className="ch1-setup-obs">{setup.observacion}</p>}
        </>
      )}
    </div>
  );
}
