import type { Estado } from "./moodboardFotoFilas";

// Colores del lienzo de Fotografía. Van aquí y no en dashboard.css porque se pintan dentro de un
// <canvas>, donde el CSS no llega. Todo el moodboard los importa desde este único archivo.
export const COLOR_FONDO = "#808080";
export const COLOR_CELDA = "#15151c";
export const COLOR_TITULO = "#ffffff";
export const COLOR_CONFLICTO = "#e5484d";

// Color del borde según el estado de la referencia.
export const COLOR_ESTADO: Record<Estado, string> = {
  borrador: "#8a8a99",
  pendiente: "#f2d16b",
  aprobada: "#3fb950",
  descartada: "#6b6b78",
};