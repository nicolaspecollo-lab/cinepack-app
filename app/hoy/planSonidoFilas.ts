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

// Clases de color ya existentes en dashboard.css.
export const CLASE_ESTADO_FICHA: Record<EstadoFicha, string> = {
  sin_empezar: "p-mut",
  en_preparacion: "p-warn",
  lista: "p-ok",
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