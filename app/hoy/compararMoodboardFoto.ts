import type { FilaReferencia } from "./useMoodboardFotoFilas";

// Máximo de referencias que se pueden comparar a la vez.
export const MAX_COMPARAR = 4;

// Clave del "sitio" de una referencia: mismo nivel, categoría y escena o secuencia vinculada.
function claveSitio(f: FilaReferencia): string {
  const d = f.datos;
  return `${d.nivel}|${d.categoria}|${d.destino.trim().toLowerCase()}`;
}

// True si todas las referencias compiten por el mismo sitio (solo entonces se puede elegir una principal).
export function estanEnMismoSitio(filas: FilaReferencia[]): boolean {
  if (filas.length < 2) return true;
  const primera = claveSitio(filas[0]);
  return filas.every((f) => claveSitio(f) === primera);
}