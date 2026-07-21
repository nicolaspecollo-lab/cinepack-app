export type EtapaKey =
  | "desarrollo"
  | "financiacion"
  | "preproduccion"
  | "rodaje"
  | "postproduccion"
  | "distribucion";

export const ETAPAS: { key: EtapaKey; label: string }[] = [
  { key: "desarrollo", label: "Desarrollo" },
  { key: "financiacion", label: "Financiación" },
  { key: "preproduccion", label: "Preproducción" },
  { key: "rodaje", label: "Rodaje" },
  { key: "postproduccion", label: "Postproducción" },
  { key: "distribucion", label: "Distribución" },
];

export type FechasCiclo = Record<EtapaKey, string | null>;

export const CICLO_SELECT =
  "fase_desarrollo_inicio, fase_financiacion_inicio, fase_preproduccion_inicio, fase_rodaje_inicio, fase_postproduccion_inicio, fase_distribucion_inicio";

export function fechasCicloDesdeFila(row: Record<string, string | null> | null | undefined): FechasCiclo {
  return {
    desarrollo: row?.fase_desarrollo_inicio ?? null,
    financiacion: row?.fase_financiacion_inicio ?? null,
    preproduccion: row?.fase_preproduccion_inicio ?? null,
    rodaje: row?.fase_rodaje_inicio ?? null,
    postproduccion: row?.fase_postproduccion_inicio ?? null,
    distribucion: row?.fase_distribucion_inicio ?? null,
  };
}

function diasEntre(desde: Date, hasta: Date): number {
  const ms = hasta.setHours(0, 0, 0, 0) - desde.setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

/** Días que faltan para que arranque una fecha futura (0 si ya llegó o no tiene fecha). */
function diasParaEmpezar(fechaInicio: string | null): number | null {
  if (!fechaInicio) return null;
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const hoy = new Date();
  if (inicio <= hoy) return null;
  return Math.max(diasEntre(hoy, inicio) - 1, 0);
}

export type EtapaEstado = "completada" | "pendiente" | "en_curso" | "sin_fecha";

export type EtapaResumen = {
  key: EtapaKey;
  label: string;
  estado: EtapaEstado;
  dias: number | null;
  inicio: string | null;
  /** true si hoy cae dentro del rango de esta etapa (ya empezó y no terminó). */
  enCurso: boolean;
};

/**
 * Lista siempre las 6 etapas. Para cada una con fecha de inicio, el "fin" es el inicio
 * de la siguiente etapa CON fecha definida (saltando huecos).
 * - sin_fecha: el Ejecutivo todavía no definió el inicio de esa etapa.
 * - pendiente, todavía no empezó: días = cuenta atrás hasta que arranque (misma cuenta
 *   que la card grande de rodaje, para que ambos números siempre coincidan).
 * - pendiente, en curso (ya empezó, se conoce el fin): días = cuánto falta para que cierre.
 * - en_curso: ya empezó pero no hay fin de referencia (es la última etapa con fecha) →
 *   días = transcurridos desde el inicio.
 * - completada: ya se cerró (hoy >= fin) → días = duración total de la etapa.
 */
export function resumenCiclo(fechas: FechasCiclo): EtapaResumen[] {
  const hoy = new Date();
  const conFecha = ETAPAS.map((e) => ({ ...e, inicio: fechas[e.key] }))
    .filter((e) => e.inicio)
    .map((e) => ({ ...e, inicioDate: new Date(`${e.inicio}T00:00:00`) }));

  return ETAPAS.map((etapa) => {
    const inicio = fechas[etapa.key];
    if (!inicio) return { key: etapa.key, label: etapa.label, estado: "sin_fecha" as const, dias: null, inicio: null, enCurso: false };

    const idx = conFecha.findIndex((e) => e.key === etapa.key);
    const inicioDate = conFecha[idx].inicioDate;
    const yaEmpezo = inicioDate <= hoy;

    if (!yaEmpezo) {
      const dias = diasParaEmpezar(inicio) ?? 0;
      return { key: etapa.key, label: etapa.label, estado: "pendiente" as const, dias, inicio, enCurso: false };
    }

    const siguiente = conFecha[idx + 1];
    const finDate = siguiente ? siguiente.inicioDate : null;

    if (!finDate) {
      const dias = diasEntre(new Date(inicioDate), new Date(hoy)) + 1;
      return { key: etapa.key, label: etapa.label, estado: "en_curso" as const, dias: Math.max(dias, 0), inicio, enCurso: true };
    }

    if (hoy >= finDate) {
      const dias = diasEntre(new Date(inicioDate), new Date(finDate));
      return { key: etapa.key, label: etapa.label, estado: "completada" as const, dias, inicio, enCurso: false };
    }

    const dias = diasEntre(new Date(hoy), new Date(finDate));
    return { key: etapa.key, label: etapa.label, estado: "pendiente" as const, dias, inicio, enCurso: true };
  });
}

/**
 * Avance global del proyecto según su ciclo de vida completo (0-100), pensado
 * para una barra tipo "30% completado". Reparte el 100% de forma pareja entre
 * las 6 etapas: cada etapa vale 1/6. Suma las etapas ya completadas + la
 * fracción interna de la etapa en curso (transcurrido / duración de la etapa;
 * si es la última etapa con fecha y no hay fin de referencia, se cuenta a la
 * mitad). Devuelve null si el Ejecutivo no ha definido ninguna fecha todavía.
 */
export function avanceProyectoPct(fechas: FechasCiclo): number | null {
  const ciclo = resumenCiclo(fechas);
  const hoy = new Date();
  const conFecha = ETAPAS.map((e) => ({ key: e.key, inicio: fechas[e.key] }))
    .filter((e): e is { key: EtapaKey; inicio: string } => !!e.inicio)
    .map((e) => ({ ...e, inicioDate: new Date(`${e.inicio}T00:00:00`) }));
  if (conFecha.length === 0) return null;

  const total = ETAPAS.length; // 6
  let acumulado = 0;

  for (const etapa of ciclo) {
    if (etapa.estado === "completada") {
      acumulado += 1;
    } else if (etapa.enCurso) {
      const idx = conFecha.findIndex((e) => e.key === etapa.key);
      const inicioDate = conFecha[idx]?.inicioDate;
      const finDate = conFecha[idx + 1]?.inicioDate ?? null;
      if (inicioDate && finDate && finDate > inicioDate) {
        const frac = (hoy.getTime() - inicioDate.getTime()) / (finDate.getTime() - inicioDate.getTime());
        acumulado += Math.min(1, Math.max(0, frac));
      } else {
        acumulado += 0.5; // última etapa en curso sin fin de referencia
      }
    }
  }

  return Math.min(100, Math.max(0, Math.round((acumulado / total) * 100)));
}

/**
 * Etapa actualmente en curso y su propio avance interno (0-100) — para
 * mostrar "Avance de la etapa: X" además del avance global del proyecto.
 * Reusa el mismo cálculo de fracción que avanceProyectoPct usa internamente
 * para la etapa en curso, pero devuelto solo (sin repartir entre las 6).
 * null si ninguna etapa está en curso.
 */
export function etapaEnCursoPct(fechas: FechasCiclo): { etapa: EtapaResumen; pct: number } | null {
  const ciclo = resumenCiclo(fechas);
  const actual = ciclo.find((e) => e.enCurso);
  if (!actual || !actual.inicio) return null;

  const hoy = new Date();
  const conFecha = ETAPAS.map((e) => ({ key: e.key, inicio: fechas[e.key] }))
    .filter((e): e is { key: EtapaKey; inicio: string } => !!e.inicio)
    .map((e) => ({ ...e, inicioDate: new Date(`${e.inicio}T00:00:00`) }));
  const idx = conFecha.findIndex((e) => e.key === actual.key);
  const inicioDate = conFecha[idx]?.inicioDate;
  const finDate = conFecha[idx + 1]?.inicioDate ?? null;

  let pct = 50; // última etapa con fecha, sin fin de referencia
  if (inicioDate && finDate && finDate > inicioDate) {
    const frac = (hoy.getTime() - inicioDate.getTime()) / (finDate.getTime() - inicioDate.getTime());
    pct = Math.round(Math.min(1, Math.max(0, frac)) * 100);
  }
  return { etapa: actual, pct };
}

/** Días transcurridos de rodaje (1 = primer día) o 0 si todavía no empezó / no tiene fecha definida. */
export function diaDeRodaje(fechaInicioRodaje: string | null): number {
  if (!fechaInicioRodaje) return 0;
  const inicio = new Date(`${fechaInicioRodaje}T00:00:00`);
  const hoy = new Date();
  if (inicio > hoy) return 0;
  return diasEntre(inicio, hoy) + 1;
}

/** Días que faltan para que arranque el rodaje (null si ya empezó o no tiene fecha). */
export function diasFaltanRodaje(fechaInicioRodaje: string | null): number | null {
  return diasParaEmpezar(fechaInicioRodaje);
}
