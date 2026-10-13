import type { DatosFila } from "./moodboardFilas";

export const MOODBOARD_FOTO_DEPARTAMENTO = "Fotografía";
export const MOODBOARD_FOTO_HERRAMIENTA_ID = "foto-lookbook";

export const NIVELES = ["general", "secuencia", "escena"] as const;
export type Nivel = (typeof NIVELES)[number];

export const CATEGORIAS = ["iluminacion", "color", "encuadre", "composicion"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

// Estados que se guardan en la fila. "conflicto" no se guarda: se calcula
// al comparar referencias (dos principales en el mismo sitio).
export const ESTADOS = ["borrador", "pendiente", "aprobada", "descartada"] as const;
export type Estado = (typeof ESTADOS)[number];

// Un comentario: quién, cuándo (fecha ISO) y qué dijo.
export type Comentario = { usuario: string; fecha: string; texto: string };

// Una referencia visual = una fila de herramienta_filas.
export type Referencia = {
  titulo: string;
  categoria: Categoria;
  nivel: Nivel;
  // Secuencia o escena vinculada (vacío si es del look general).
  destino: string;
  descripcion: string;
  queTomar: string;
  fuente: string;
  etiquetas: string[];
  // Ruta de la imagen en Storage (bucket "documentos").
  ruta: string;
  estado: Estado;
  principal: boolean;
  comentarios: Comentario[];
};

// Comprueba que un texto guardado es uno de los valores permitidos.
function esUno<T extends string>(lista: readonly T[], valor: string | undefined): valor is T {
  return valor !== undefined && (lista as readonly string[]).includes(valor);
}

// Las etiquetas se guardan como JSON dentro del texto; si viene dañado, quedan vacías.
function leerEtiquetas(texto: string | undefined): string[] {
  try {
    const crudo: unknown = JSON.parse(texto ?? "[]");
    return Array.isArray(crudo) ? crudo.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

// Los comentarios también se guardan como JSON; se descartan los que no tengan la forma esperada.
export function leerComentarios(texto: string | undefined): Comentario[] {
  try {
    const crudo: unknown = JSON.parse(texto ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo.filter(
      (c): c is Comentario =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Comentario).usuario === "string" &&
        typeof (c as Comentario).fecha === "string" &&
        typeof (c as Comentario).texto === "string",
    );
  } catch {
    return [];
  }
}

// Lectura: devuelve null si la fila no es una referencia (p. ej. una fila antigua de la galería genérica).
export function datosAReferencia(datos: DatosFila): Referencia | null {
  const { nivel, categoria, estado, ruta } = datos;
  if (!esUno(NIVELES, nivel) || !esUno(CATEGORIAS, categoria) || !esUno(ESTADOS, estado) || !ruta) {
    return null;
  }
  return {
    titulo: datos.titulo ?? "",
    categoria,
    nivel,
    destino: datos.destino ?? "",
    descripcion: datos.descripcion ?? "",
    queTomar: datos.queTomar ?? "",
    fuente: datos.fuente ?? "",
    etiquetas: leerEtiquetas(datos.etiquetas),
    ruta,
    estado,
    principal: datos.principal === "true",
    comentarios: leerComentarios(datos.comentarios),
  };
}

// Escritura: todo se guarda como texto plano.
export function referenciaADatos(r: Referencia): DatosFila {
  return {
    titulo: r.titulo,
    categoria: r.categoria,
    nivel: r.nivel,
    destino: r.destino,
    descripcion: r.descripcion,
    queTomar: r.queTomar,
    fuente: r.fuente,
    etiquetas: JSON.stringify(r.etiquetas),
    ruta: r.ruta,
    estado: r.estado,
    principal: String(r.principal),
    comentarios: JSON.stringify(r.comentarios),
  };
}