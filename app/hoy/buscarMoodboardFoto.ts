import type { Referencia } from "./moodboardFotoFilas";

// Quita mayúsculas y tildes para que "iluminacion" encuentre "Iluminación".
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Una referencia coincide si TODAS las palabras buscadas aparecen en su título,
// en su escena o secuencia vinculada, o en alguna de sus etiquetas.
// Sin texto de búsqueda, coinciden todas.
export function coincideBusqueda(datos: Referencia, busqueda: string): boolean {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const texto = normalizar([datos.titulo, datos.destino, ...datos.etiquetas].join(" "));
  return palabras.every((p) => texto.includes(p));
}