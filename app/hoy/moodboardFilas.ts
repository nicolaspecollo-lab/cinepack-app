// herramienta_filas guarda el campo `datos` como texto plano (clave -> string).
export type DatosFila = Record<string, string>;

export const MOODBOARD_DEPARTAMENTO = "Arte";
export const MOODBOARD_HERRAMIENTA_ID = "arte-moodboard";

// Cada elemento del tablero: posición y tamaño en píxeles, rotación en grados.
type Base = { id: string; x: number; y: number; ancho: number; alto: number; rotacion: number };
export type ElementoImagen = Base & { tipo: "imagen"; ruta: string };
export type ElementoNota = Base & { tipo: "nota"; texto: string };
export type ElementoMoodboard = ElementoImagen | ElementoNota;

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Valida cada elemento guardado: si alguno viene dañado, se descarta en vez de romper el tablero.
function esElemento(v: unknown): v is ElementoMoodboard {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  const base =
    typeof e.id === "string" &&
    esNumero(e.x) &&
    esNumero(e.y) &&
    esNumero(e.ancho) &&
    esNumero(e.alto) &&
    esNumero(e.rotacion);
  if (!base) return false;
  return (e.tipo === "imagen" && typeof e.ruta === "string") || (e.tipo === "nota" && typeof e.texto === "string");
}

// Lectura: el campo "elementos" es un JSON guardado como texto.
export function datosAElementos(datos: DatosFila): ElementoMoodboard[] {
  try {
    const crudo: unknown = JSON.parse(datos.elementos ?? "[]");
    return Array.isArray(crudo) ? crudo.filter(esElemento) : [];
  } catch {
    return [];
  }
}

// Escritura: solo toca la clave "elementos".
export function elementosADatos(elementos: ElementoMoodboard[]): DatosFila {
  return { elementos: JSON.stringify(elementos) };
}