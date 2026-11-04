import type { Geometria } from "./moodboardFotoFilas";

// Caja que ocupa una referencia en el lienzo, teniendo en cuenta que puede estar girada.
// Konva gira la referencia alrededor de su esquina superior izquierda (x, y), con la rotación en grados.
export function cajaOcupada(g: Geometria) {
  const radianes = (g.rotacion * Math.PI) / 180;
  const cos = Math.cos(radianes);
  const sen = Math.sin(radianes);
  // Las cuatro esquinas de la referencia sin girar, relativas a su esquina superior izquierda.
  const esquinas = [
    [0, 0],
    [g.ancho, 0],
    [g.ancho, g.alto],
    [0, g.alto],
  ];
  const xs = esquinas.map(([cx, cy]) => g.x + cx * cos - cy * sen);
  const ys = esquinas.map(([cx, cy]) => g.y + cx * sen + cy * cos);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// Devuelve la geometría desplazada lo justo para que la referencia no salga del lienzo
// por arriba, por la izquierda ni por la derecha. Por abajo no se limita: el lienzo crece.
export function meterDentro(g: Geometria, anchoLienzo: number): Geometria {
  const caja = cajaOcupada(g);
  let dx = 0;
  let dy = 0;
  if (caja.maxX > anchoLienzo) dx = anchoLienzo - caja.maxX;
  // Si es más ancha que el lienzo, manda el borde izquierdo (así siempre se puede agarrar).
  if (caja.minX + dx < 0) dx = -caja.minX;
  if (caja.minY < 0) dy = -caja.minY;
  return { ...g, x: g.x + dx, y: g.y + dy };
}