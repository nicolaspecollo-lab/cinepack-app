// Control de horarios y avisos al equipo (1AD) — Dirección / 1er asistente
// de dirección.
//
// RONDA 2 DE REBOTE (25/11/2026): el primer rebote de Nico sobre esta
// herramienta fue de texto introductorio (resuelto en la ronda anterior,
// pero para `dir-control-horarios-1ad` ese fix nunca se aplicó hasta ahora
// — ver commit que elimina el render de `hint` en todo el motor genérico).
// El SEGUNDO rebote es de fondo: "esto no es una herramienta, es
// simplemente un cuadro". Ver especificación completa en
// oficina/expedientes/2026-11-25_direccion_control-horarios-1ad/rediseno-panel-medida.md.
// Ajuste adicional de Nico, directo sobre el panel (no estaba en la spec
// original): el detalle de un departamento se agrupa por cargo/citación,
// no como lista plana de setups.
//
// Modelo de datos (una fila = un DÍA de rodaje, no un setup suelto):
//   datos.dia_fecha      -> "yyyy-mm-dd"
//   datos.departamentos  -> JSON string de DepartamentoDia[]
// Mismo patrón que ya usa GENERAL_ORDEN_RODAJE para `llamadas`/`escenas`:
// JSON de formato libre dentro de una columna `largo`, sin ColTipo nuevo —
// el parseo vive en este archivo, el render es 100% bespoke
// (ControlHorarios1ADPanel.tsx), nunca el motor genérico de tabla.

export type DatosFilaDB = Record<string, string>;

export const CONTROL_HORARIOS_1AD_DEPARTAMENTO = "Dirección";
export const CONTROL_HORARIOS_1AD_HERRAMIENTA_ID = "dir-control-horarios-1ad";

// Departamentos reales del proyecto con presencia típica en set (mismo
// catálogo que `DEPARTAMENTOS` en app/constants.ts, acotado a los que
// efectivamente pisan el set un día de rodaje) — son los accesos directos
// del estado vacío de nivel 2, nunca un formulario en blanco genérico.
export const DEPARTAMENTOS_SET = [
  "Fotografía",
  "Arte",
  "Sonido",
  "Reparto",
  "Producción",
  "Dirección",
] as const;

export const OVERTIME_OPCIONES = ["No", "Alerta", "Confirmado"] as const;
export type Overtime = (typeof OVERTIME_OPCIONES)[number];

export const AVISO_OPCIONES = ["Pendiente", "Enviado", "No aplica"] as const;
export type AvisoEnviado = (typeof AVISO_OPCIONES)[number];

export type SetupHorario = {
  id: string; // id local (uuid cliente), nunca viaja a `herramienta_filas.id`
  // Cargo/puesto de la persona citada (ej. "Operador de cámara", "Jefe de
  // Arte") — pedido de Nico sobre la especificación original (rebote del
  // 25/11, directo en el panel): el detalle de un departamento se agrupa
  // por cargo/citación, no como lista plana de setups sin agrupar por
  // quién. No es un ColTipo nuevo ni cambia el contrato de los 7 campos de
  // la ronda 1 — es un 8vo campo libre dentro de cada setup anidado.
  cargo: string;
  escena_setup: string;
  hora_prevista_wrap: string; // "HH:MM"
  hora_real_wrap: string; // "HH:MM"
  delta_minutos: string;
  overtime: Overtime | "";
  aviso_enviado: AvisoEnviado | "";
  observacion: string;
};

export type DepartamentoDia = {
  departamento: string;
  hora_llegada_real: string; // "HH:MM"
  hora_salida_real: string; // "HH:MM"
  setups: SetupHorario[];
};

export type DiaControlHorarios = {
  dia_fecha: string; // "yyyy-mm-dd"
  departamentos: DepartamentoDia[];
};

function uuidLocal(): string {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function datosADia(datos: DatosFilaDB): DiaControlHorarios {
  let departamentos: DepartamentoDia[] = [];
  try {
    const parsed = JSON.parse(datos.departamentos || "[]");
    if (Array.isArray(parsed)) {
      departamentos = parsed.map((d: Partial<DepartamentoDia>) => ({
        departamento: d.departamento ?? "",
        hora_llegada_real: d.hora_llegada_real ?? "",
        hora_salida_real: d.hora_salida_real ?? "",
        setups: Array.isArray(d.setups)
          ? d.setups.map((s: Partial<SetupHorario>) => ({
              id: s.id ?? uuidLocal(),
              cargo: s.cargo ?? "",
              escena_setup: s.escena_setup ?? "",
              hora_prevista_wrap: s.hora_prevista_wrap ?? "",
              hora_real_wrap: s.hora_real_wrap ?? "",
              delta_minutos: s.delta_minutos ?? "",
              overtime: (s.overtime as Overtime) ?? "",
              aviso_enviado: (s.aviso_enviado as AvisoEnviado) ?? "",
              observacion: s.observacion ?? "",
            }))
          : [],
      }));
    }
  } catch {
    departamentos = [];
  }
  return { dia_fecha: datos.dia_fecha ?? "", departamentos };
}

export function diaADatos(dia: DiaControlHorarios): DatosFilaDB {
  return {
    dia_fecha: dia.dia_fecha,
    departamentos: JSON.stringify(dia.departamentos),
  };
}

export function nuevoSetup(): SetupHorario {
  return {
    id: uuidLocal(),
    cargo: "",
    escena_setup: "",
    hora_prevista_wrap: "",
    hora_real_wrap: "",
    delta_minutos: "",
    overtime: "No",
    aviso_enviado: "Pendiente",
    observacion: "",
  };
}

export function nuevoDepartamentoDia(departamento: string): DepartamentoDia {
  return { departamento, hora_llegada_real: "", hora_salida_real: "", setups: [nuevoSetup()] };
}

// Overtime del día — se deriva, nunca se guarda a mano (ver nivel 1 de la
// especificación): si ALGÚN setup tiene "Confirmado" -> chip fuerte; si
// alguno tiene "Alerta" y ninguno "Confirmado" -> chip tenue; si todo "No" o
// no hay datos -> sin chip.
export function overtimeDia(dia: DiaControlHorarios): "confirmado" | "alerta" | "no" {
  let alerta = false;
  for (const dep of dia.departamentos) {
    for (const s of dep.setups) {
      if (s.overtime === "Confirmado") return "confirmado";
      if (s.overtime === "Alerta") alerta = true;
    }
  }
  return alerta ? "alerta" : "no";
}

export function wrapMasTardio(dia: DiaControlHorarios): string | null {
  let max: string | null = null;
  for (const dep of dia.departamentos) {
    const candidatos = [dep.hora_salida_real, ...dep.setups.map((s) => s.hora_real_wrap)].filter(Boolean);
    for (const c of candidatos) if (!max || c > max) max = c;
  }
  return max;
}

export function cantidadSetups(dia: DiaControlHorarios): number {
  return dia.departamentos.reduce((acc, d) => acc + d.setups.length, 0);
}

// Agrupación del detalle de un departamento por cargo/citación (pedido de
// Nico, rebote del 25/11 directo en el panel): el detalle nunca se muestra
// como lista plana de setups sin agrupar por quién los hizo — cada cargo
// que tuvo presencia ese día dentro del departamento es su propio grupo,
// con sus setups dentro, en orden de wrap previsto.
export function agruparPorCargo(setups: SetupHorario[]): { cargo: string; setups: SetupHorario[] }[] {
  const porCargo = new Map<string, SetupHorario[]>();
  for (const s of setups) {
    const key = s.cargo || "(sin cargo asignado)";
    if (!porCargo.has(key)) porCargo.set(key, []);
    porCargo.get(key)!.push(s);
  }
  return Array.from(porCargo.entries()).map(([cargo, items]) => ({
    cargo,
    setups: [...items].sort((a, b) => a.hora_prevista_wrap.localeCompare(b.hora_prevista_wrap)),
  }));
}

// Eje horizontal del Gantt: call más temprano a wrap más tardío de ESE día
// (nunca un rango fijo de proyecto — cada jornada tiene su propia duración).
// Fallback 06:00–22:00 cuando el día todavía no tiene ninguna entrada.
export function ejeDelDia(dia: DiaControlHorarios): { inicio: string; fin: string } {
  let inicio: string | null = null;
  let fin: string | null = null;
  for (const dep of dia.departamentos) {
    const horas = [dep.hora_llegada_real, dep.hora_salida_real, ...dep.setups.map((s) => s.hora_prevista_wrap), ...dep.setups.map((s) => s.hora_real_wrap)].filter(Boolean);
    for (const h of horas) {
      if (!inicio || h < inicio) inicio = h;
      if (!fin || h > fin) fin = h;
    }
  }
  return { inicio: inicio ?? "06:00", fin: fin && fin > (inicio ?? "06:00") ? fin : "22:00" };
}

export function minutosDesdeMedianoche(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

// Posición en % de una hora dentro del eje del día, acotada a [0,100] para
// que un dato fuera de rango nunca rompa el layout (barra no se corta).
export function posicionPct(hhmm: string, eje: { inicio: string; fin: string }): number {
  if (!hhmm) return 0;
  const total = minutosDesdeMedianoche(eje.fin) - minutosDesdeMedianoche(eje.inicio);
  if (total <= 0) return 0;
  const rel = minutosDesdeMedianoche(hhmm) - minutosDesdeMedianoche(eje.inicio);
  return Math.min(100, Math.max(0, (rel / total) * 100));
}

// ---------------------------------------------------------------------------
// Contenido precargado real (3 jornadas, varios departamentos con horarios
// reales distintos, setups agrupados por cargo) — nunca un formulario en
// blanco. Decisión sobre las 2 filas viejas de la ronda 1 (E22/Setup A,
// E23/Setup B, modelo plano): se DESCARTAN como datos de QA, no de
// producción real (ver justificación en el dossier, apartado 6/9) — el
// modelo nuevo es incompatible campo a campo (de fila-setup a
// fila-día-con-departamentos-anidados) y esas 2 filas no tenían
// hora_llegada_real/hora_salida_real por definición, porque ese campo no
// existía todavía. Se reemplazan por estos 3 días ricos y reales (que SÍ
// retoman los mismos nombres de escena E22/E23 como homenaje continuista,
// ahora con el modelo correcto).
// ---------------------------------------------------------------------------
export const DIAS_EJEMPLO: DiaControlHorarios[] = [
  {
    dia_fecha: "2026-11-23",
    departamentos: [
      {
        departamento: "Fotografía",
        hora_llegada_real: "06:10",
        hora_salida_real: "20:45",
        setups: [
          { id: uuidLocal(), cargo: "Operador de cámara", escena_setup: "E12 / Setup 1", hora_prevista_wrap: "09:30", hora_real_wrap: "09:55", delta_minutos: "25", overtime: "No", aviso_enviado: "No aplica", observacion: "Retraso por cambio de óptica, sin impacto." },
          { id: uuidLocal(), cargo: "Operador de cámara", escena_setup: "E12 / Setup 2", hora_prevista_wrap: "13:00", hora_real_wrap: "13:40", delta_minutos: "40", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
          { id: uuidLocal(), cargo: "Foquista", escena_setup: "E14 / Setup 1", hora_prevista_wrap: "20:00", hora_real_wrap: "20:45", delta_minutos: "45", overtime: "Alerta", aviso_enviado: "Enviado", observacion: "Se avisó al equipo que el wrap se corría 45'." },
        ],
      },
      {
        departamento: "Arte",
        hora_llegada_real: "05:30",
        hora_salida_real: "21:00",
        setups: [
          { id: uuidLocal(), cargo: "Jefe de Arte", escena_setup: "E12 — ambientación set", hora_prevista_wrap: "08:00", hora_real_wrap: "07:50", delta_minutos: "-10", overtime: "No", aviso_enviado: "No aplica", observacion: "Terminó antes, set listo con margen." },
          { id: uuidLocal(), cargo: "Ayudante de Arte", escena_setup: "E14 — strike parcial", hora_prevista_wrap: "20:30", hora_real_wrap: "21:00", delta_minutos: "30", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
        ],
      },
      {
        departamento: "Sonido",
        hora_llegada_real: "06:45",
        hora_salida_real: "20:30",
        setups: [
          { id: uuidLocal(), cargo: "Microfonista", escena_setup: "E12 / Setup 1", hora_prevista_wrap: "09:30", hora_real_wrap: "09:50", delta_minutos: "20", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
          { id: uuidLocal(), cargo: "Microfonista", escena_setup: "E14 / Setup 1", hora_prevista_wrap: "20:00", hora_real_wrap: "20:30", delta_minutos: "30", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
        ],
      },
      {
        departamento: "Reparto",
        hora_llegada_real: "07:00",
        hora_salida_real: "20:00",
        setups: [
          { id: uuidLocal(), cargo: "Asistente de reparto", escena_setup: "E12 — protagonista", hora_prevista_wrap: "09:30", hora_real_wrap: "09:50", delta_minutos: "20", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
        ],
      },
      {
        departamento: "Producción",
        hora_llegada_real: "05:15",
        hora_salida_real: "21:15",
        setups: [
          { id: uuidLocal(), cargo: "Ayudante de producción", escena_setup: "Cierre de jornada", hora_prevista_wrap: "20:30", hora_real_wrap: "21:15", delta_minutos: "45", overtime: "Alerta", aviso_enviado: "Enviado", observacion: "Avisado a Producción general por overrun acumulado del día." },
        ],
      },
    ],
  },
  {
    dia_fecha: "2026-11-24",
    departamentos: [
      {
        departamento: "Fotografía",
        hora_llegada_real: "06:00",
        hora_salida_real: "23:10",
        setups: [
          { id: uuidLocal(), cargo: "Operador de cámara", escena_setup: "E22 / Setup A", hora_prevista_wrap: "22:00", hora_real_wrap: "23:10", delta_minutos: "70", overtime: "Confirmado", aviso_enviado: "Enviado", observacion: "Overtime confirmado por lluvia — reposición de toma exterior." },
        ],
      },
      {
        departamento: "Arte",
        hora_llegada_real: "05:30",
        hora_salida_real: "23:10",
        setups: [
          { id: uuidLocal(), cargo: "Jefe de Arte", escena_setup: "E23 / Setup B", hora_prevista_wrap: "22:00", hora_real_wrap: "23:10", delta_minutos: "70", overtime: "Confirmado", aviso_enviado: "Enviado", observacion: "Mismo overrun que Fotografía, set no se podía liberar antes." },
        ],
      },
      {
        departamento: "Sonido",
        hora_llegada_real: "06:30",
        hora_salida_real: "23:00",
        setups: [
          { id: uuidLocal(), cargo: "Microfonista", escena_setup: "E22-E23 — cobertura nocturna", hora_prevista_wrap: "22:00", hora_real_wrap: "23:00", delta_minutos: "60", overtime: "Confirmado", aviso_enviado: "Enviado", observacion: "" },
        ],
      },
      {
        departamento: "Producción",
        hora_llegada_real: "05:00",
        hora_salida_real: "23:30",
        setups: [
          { id: uuidLocal(), cargo: "Jefe de producción", escena_setup: "Cierre de jornada + aviso RRHH", hora_prevista_wrap: "22:00", hora_real_wrap: "23:30", delta_minutos: "90", overtime: "Confirmado", aviso_enviado: "Enviado", observacion: "Overtime confirmado, se notifica para cómputo mensual del convenio." },
        ],
      },
    ],
  },
  {
    dia_fecha: "2026-11-25",
    departamentos: [
      {
        departamento: "Fotografía",
        hora_llegada_real: "07:00",
        hora_salida_real: "18:20",
        setups: [
          { id: uuidLocal(), cargo: "Operador de cámara", escena_setup: "E30 / Setup 1", hora_prevista_wrap: "12:00", hora_real_wrap: "11:50", delta_minutos: "-10", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
          { id: uuidLocal(), cargo: "Foquista", escena_setup: "E31 / Setup 1", hora_prevista_wrap: "18:00", hora_real_wrap: "18:20", delta_minutos: "20", overtime: "No", aviso_enviado: "No aplica", observacion: "Jornada corta, día de interiores." },
        ],
      },
      {
        departamento: "Reparto",
        hora_llegada_real: "08:00",
        hora_salida_real: "18:00",
        setups: [
          { id: uuidLocal(), cargo: "Asistente de reparto", escena_setup: "E30 — dos personajes", hora_prevista_wrap: "12:00", hora_real_wrap: "11:50", delta_minutos: "-10", overtime: "No", aviso_enviado: "No aplica", observacion: "" },
        ],
      },
    ],
  },
];
