import type { Referencia } from "./moodboardFotoFilas";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

// "Sitio" = mismo nivel, destino y categoría (el destino sin distinguir mayúsculas ni espacios).
function claveSitio(d: Referencia): string {
  return `${d.nivel}|${d.destino.trim().toLowerCase()}|${d.categoria}`;
}

// Una referencia compite si es principal y no está descartada.
function compite(d: Referencia): boolean {
  return d.principal && d.estado !== "descartada";
}

// Ids de las referencias en conflicto: dos o más que compiten por el mismo sitio.
// El conflicto no se guarda en la base de datos: se calcula cada vez que se pinta.
export function idsEnConflicto(referencias: FilaReferencia[]): Set<string> {
  const grupos = new Map<string, string[]>();

  for (const f of referencias) {
    if (!compite(f.datos)) continue;
    const clave = claveSitio(f.datos);
    grupos.set(clave, [...(grupos.get(clave) ?? []), f.id]);
  }

  const ids = new Set<string>();
  for (const lista of grupos.values()) {
    if (lista.length >= 2) lista.forEach((id) => ids.add(id));
  }
  return ids;
}

// Todas las referencias que compiten por el mismo sitio que la indicada (incluida ella).
export function referenciasEnMismoSitio(referencias: FilaReferencia[], id: string): FilaReferencia[] {
  const origen = referencias.find((f) => f.id === id);
  if (!origen) return [];
  const clave = claveSitio(origen.datos);
  return referencias.filter((f) => compite(f.datos) && claveSitio(f.datos) === clave);
}