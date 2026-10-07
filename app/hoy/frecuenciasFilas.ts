import type { FrecuenciaDatos } from "./useConflictoFrecuencias";

// herramienta_filas guarda el campo `datos` como texto plano (clave -> string).
export type DatosFila = Record<string, string>;

// id de la herramienta en herramientas.ts: es la clave con la que se guardan sus filas.
export const FRECUENCIAS_HERRAMIENTA_ID = "son-plan-frecuencias";

// Departamento dueño de la herramienta.
export const FRECUENCIAS_DEPARTAMENTO = "Sonido";

// "650.3" o "650,3" -> 650.3 ; vacío o no numérico -> null (nunca 0).
export function parseFrecuencia(valor: string | undefined): number | null {
  const limpio = (valor ?? "").trim().replace(",", ".");
  if (limpio === "") return null;
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
}

// Fila guardada (todo texto) -> datos tipados que entiende el hook de conflictos.
export function datosAFrecuencia(datos: DatosFila): FrecuenciaDatos {
  return {
    jornada: datos.jornada ?? "",
    equipo: datos.equipo ?? "",
    modelo_fabricante: datos.modelo_fabricante || undefined,
    departamento_responsable: datos.departamento_responsable ?? "",
    frecuencia_mhz: parseFrecuencia(datos.frecuencia_mhz),
    estado_aprobacion: datos.estado_aprobacion === "aprobada" ? "aprobada" : "pendiente",
    creado_por_departamento: datos.departamento_responsable ?? "",
    notas: datos.notas || undefined,
    // Campos de la especificación de Marta (vacío -> undefined / null).
    tipo: datos.tipo || undefined,
    asignado_a: datos.asignado_a || undefined,
    reserva_mhz: parseFrecuencia(datos.reserva_mhz),
    posicion_petaca: datos.posicion_petaca || undefined,
  };
}

// Datos tipados -> texto, para guardar en herramienta_filas.
export function frecuenciaADatos(f: FrecuenciaDatos): DatosFila {
  const datos: DatosFila = {
    jornada: f.jornada,
    equipo: f.equipo,
    departamento_responsable: f.departamento_responsable,
    frecuencia_mhz: f.frecuencia_mhz === null ? "" : String(f.frecuencia_mhz),
    estado_aprobacion: f.estado_aprobacion,
  };
  // Los opcionales solo se escriben si vienen informados: así el merge de `editar`
  // conserva lo que ya hubiera guardado (por ejemplo, desde la tabla genérica).
  if (f.modelo_fabricante !== undefined) datos.modelo_fabricante = f.modelo_fabricante;
  if (f.notas !== undefined) datos.notas = f.notas;
  if (f.tipo !== undefined) datos.tipo = f.tipo;
  if (f.asignado_a !== undefined) datos.asignado_a = f.asignado_a;
  if (f.posicion_petaca !== undefined) datos.posicion_petaca = f.posicion_petaca;
  if (f.reserva_mhz !== undefined) datos.reserva_mhz = f.reserva_mhz === null ? "" : String(f.reserva_mhz);
  return datos;
}