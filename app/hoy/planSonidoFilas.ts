import type { DatosFila } from "./moodboardFilas";

// Dónde viven las fichas en herramienta_filas.
export const PLAN_SONIDO_DEPARTAMENTO = "Sonido";
export const PLAN_SONIDO_HERRAMIENTA_ID = "son-plan-directo";

// Métodos de captación (provisional: confirmar con Marta).
export const METODOS = ["boom", "lavalier", "mixto", "otro"] as const;
export type Metodo = (typeof METODOS)[number];

export const RIESGOS = ["bajo", "medio", "alto"] as const;
export type Riesgo = (typeof RIESGOS)[number];

// El estado NO se guarda: se calcula con estadoDe().
export type EstadoFicha = "sin_empezar" | "en_preparacion" | "lista";

// Clases de color de la píldora de estado (ya existen en dashboard.css).
export const CLASE_ESTADO_FICHA: Record<EstadoFicha, string> = {
  sin_empezar: "p-mut",
  en_preparacion: "p-warn",
  lista: "p-ok",
};

// Clases de color del control segmentado (ya existen en dashboard.css).
// El texto siempre va escrito en el botón: el color nunca va solo.
export const CLASE_RIESGO: Record<Riesgo, string> = {
  bajo: "seg-ok",
  medio: "seg-warn",
  alto: "seg-bad",
};

export type FichaEscena = {
  escena: string;
  metodo: Metodo | "";
  riesgo: Riesgo | "";
  estrategia: string;
  retos: string;
  wildtrack: string;
  lista: boolean;
};

// Los valores antiguos pueden traer HTML: se limpian al leer.
function sinHtml(v: string | undefined): string {
  return (v ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function leerMetodo(v: string | undefined): Metodo | "" {
  return METODOS.find((m) => m === v) ?? "";
}

function leerRiesgo(v: string | undefined): Riesgo | "" {
  return RIESGOS.find((r) => r === v) ?? "";
}

// fila de la base de datos -> ficha tipada
export function datosAFicha(datos: DatosFila): FichaEscena {
  return {
    escena: sinHtml(datos.escena),
    metodo: leerMetodo(datos.metodo),
    riesgo: leerRiesgo(datos.riesgo),
    estrategia: sinHtml(datos.estrategia),
    retos: sinHtml(datos.retos),
    wildtrack: sinHtml(datos.wildtrack),
    lista: datos.lista === "true",
  };
}

// ficha tipada -> fila de la base de datos (todo texto)
export function fichaADatos(f: FichaEscena): DatosFila {
  return {
    escena: f.escena,
    metodo: f.metodo,
    riesgo: f.riesgo,
    estrategia: f.estrategia,
    retos: f.retos,
    wildtrack: f.wildtrack,
    lista: String(f.lista),
  };
}

// "Marcar como lista" solo se activa con método y riesgo elegidos.
export function puedeMarcarLista(f: FichaEscena): boolean {
  return f.metodo !== "" && f.riesgo !== "";
}

// Estado calculado a partir de los datos.
export function estadoDe(f: FichaEscena): EstadoFicha {
  if (f.lista) return "lista";
  const conDatos = f.metodo || f.riesgo || f.estrategia || f.retos || f.wildtrack;
  return conDatos ? "en_preparacion" : "sin_empezar";
}

// ───────────────────────────────────────────────────────────────
// ESTADO DEL PLAN COMPLETO (Vacío / Borrador / Publicado)
// ───────────────────────────────────────────────────────────────

// Fila aparte, a nivel de proyecto: guarda si el plan está publicado y si está cerrado.
// Va en otra "herramienta" para no mezclarse con las fichas de escena.
export const PLAN_SONIDO_ESTADO_HERRAMIENTA_ID = "son-plan-directo-estado";
export type DatosPlan = {
  publicado: boolean;
  publicadoPor: string;
  publicadoEn: string;
  cerrado: boolean;
  cerradoPor: string;
  cerradoEn: string;
};

// fila de la base de datos -> datos del plan tipados
export function datosAPlan(datos: DatosFila): DatosPlan {
  return {
    publicado: datos.publicado === "true",
    publicadoPor: sinHtml(datos.publicadoPor),
    publicadoEn: sinHtml(datos.publicadoEn),
    cerrado: datos.cerrado === "true",
    cerradoPor: sinHtml(datos.cerradoPor),
    cerradoEn: sinHtml(datos.cerradoEn),
  };
}

// datos del plan -> fila de la base de datos (todo texto)
export function planADatos(p: DatosPlan): DatosFila {
  return {
    publicado: String(p.publicado),
    publicadoPor: p.publicadoPor,
    publicadoEn: p.publicadoEn,
    cerrado: String(p.cerrado),
    cerradoPor: p.cerradoPor,
    cerradoEn: p.cerradoEn,
  };
}

// Estado del plan calculado: sin fichas es Vacío; con fichas, Borrador hasta que se publique;
// Modificado si cambia tras publicarse; Cerrado cuando se envía a postproducción.
export type EstadoPlan = "vacio" | "borrador" | "publicado" | "modificado" | "cerrado";

export const CLASE_ESTADO_PLAN: Record<EstadoPlan, string> = {
  vacio: "p-mut",
  borrador: "p-warn",
  publicado: "p-ok",
  modificado: "p-orange",
  cerrado: "p-mut",
};

export function estadoPlanDe(
  totalFichas: number,
  publicado: boolean,
  hayCambios = false,
  cerrado = false
): EstadoPlan {
  if (totalFichas === 0) return "vacio";
  if (cerrado) return "cerrado";
  if (!publicado) return "borrador";
  return hayCambios ? "modificado" : "publicado";
}

// ¿Hay alguna ficha creada o cambiada después de publicar? Se mira el historial de cada ficha.
export function hayCambiosTrasPublicar(
  fichas: { registro: { fecha: string }[] }[],
  publicadoEn: string
): boolean {
  const publicado = new Date(publicadoEn).getTime();
  if (Number.isNaN(publicado)) return false;
  return fichas.some((f) => f.registro.some((r) => new Date(r.fecha).getTime() > publicado));
}