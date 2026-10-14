import type { FilaReferencia } from "./useMoodboardFotoFilas";

// Devuelve los ids de las referencias en conflicto: dos o más principales,
// no descartadas, en el mismo sitio (mismo nivel, destino y categoría).
// El conflicto no se guarda en la base de datos: se calcula cada vez que se pinta.
export function idsEnConflicto(referencias: FilaReferencia[]): Set<string> {
  const grupos = new Map<string, string[]>();

  for (const f of referencias) {
    const d = f.datos;
    if (!d.principal || d.estado === "descartada") continue;
    const clave = `${d.nivel}|${d.destino.trim().toLowerCase()}|${d.categoria}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f.id]);
  }

  const ids = new Set<string>();
  for (const lista of grupos.values()) {
    if (lista.length >= 2) lista.forEach((id) => ids.add(id));
  }
  return ids;
}