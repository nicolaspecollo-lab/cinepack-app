// Medidas y valores de diseño del lienzo de Fotografía, en píxeles salvo que se indique otra cosa.
// Van aquí y no dentro del componente para ajustar el diseño en un solo sitio sin tocar la lógica.

// Cuadrícula automática
// Ancho al que se aspira por celda: de él sale cuántas columnas caben.
export const ANCHO_CELDA_IDEAL = 280;
// Alto fijo de cada celda.
export const ALTO_CELDA = 240;
// Separación entre celdas.
export const MARGEN = 12;
// Alto mínimo del lienzo, aunque haya pocas referencias.
export const ALTO_MINIMO = 200;

// Borde de cada referencia
export const GROSOR_BORDE = 3;
// Opacidad (de 0 a 1) de las referencias descartadas, para que se vean apagadas.
export const OPACIDAD_DESCARTADA = 0.45;

// Título bajo la imagen
export const ALTO_TITULO = 22;
export const TAMANO_TITULO = 13;
// Separación del texto respecto al borde de la celda (horizontal y vertical).
export const RELLENO_TITULO_X = 8;
export const RELLENO_TITULO_Y = 3;