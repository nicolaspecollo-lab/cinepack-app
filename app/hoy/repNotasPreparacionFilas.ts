// Notas de preparación del personaje — Reparto principal.
// Modelo de datos: cada fila de `herramienta_filas` es UN personaje que el
// actor/actriz está preparando (no una sesión, a diferencia de
// `dir-notas-ensayo`). Es el cuaderno de trabajo de mesa del propio actor
// sobre SU personaje — biografía, objetivos por escena, relaciones y arco
// emocional — nunca la vista del director sobre el actor (eso ya existe en
// dir-notas-ensayo) ni la continuidad física entre jornadas (eso es
// rep-notas-escenas / rep-diario-personaje). Los arrays anidados
// (objetivos/relaciones/arco/notas recibidas) se guardan como JSON dentro de
// columnas de texto plano del mismo motor (Record<string,string>) — mismo
// mecanismo que `_extra` en otras herramientas.

export type DatosFila = Record<string, string>;

export const REP_PREP_DEPARTAMENTO = "Reparto";
export const REP_PREP_HERRAMIENTA_ID = "rep-notas-preparacion";

export const ESTADO_OBJETIVO = ["Pendiente", "En trabajo", "Logrado"] as const;
export type EstadoObjetivo = (typeof ESTADO_OBJETIVO)[number];

export const TIPO_RELACION = ["Familia", "Aliado/a", "Romance", "Conflicto", "Rival", "Mentor/a"] as const;
export type TipoRelacion = (typeof TIPO_RELACION)[number];

export type Objetivo = { id: string; escena: string; objetivo: string; estado: EstadoObjetivo | "" };
export type Relacion = { id: string; personaje: string; actor: string; tipo: TipoRelacion | ""; notas: string };
export type PuntoArco = { id: string; momento: string; estado_emocional: string; nota: string };
export type NotaRecibida = { id: string; fecha: string; de: string; texto: string };

export type Personaje = {
  personaje: string;
  actor: string;
  edad: string;
  ocupacion: string;
  foto_url: string;
  biografia: string;
  rasgos_fisicos: string;
  voz_habla: string;
  objeto_personal: string;
  motivacion_central: string;
  objetivos: Objetivo[];
  relaciones: Relacion[];
  arco: PuntoArco[];
  notas_recibidas: NotaRecibida[];
};

function limpiar(v: string | undefined): string {
  return (v ?? "").replace(/<[^>]*>/g, "").trim();
}

function parseJSON<T>(v: string | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

let idSeq = 0;
export function nuevoId(): string {
  idSeq += 1;
  return `rnp-${Date.now()}-${idSeq}`;
}

export function datosAPersonaje(datos: DatosFila): Personaje {
  return {
    personaje: limpiar(datos.personaje),
    actor: limpiar(datos.actor),
    edad: limpiar(datos.edad),
    ocupacion: limpiar(datos.ocupacion),
    foto_url: limpiar(datos.foto_url),
    biografia: limpiar(datos.biografia),
    rasgos_fisicos: limpiar(datos.rasgos_fisicos),
    voz_habla: limpiar(datos.voz_habla),
    objeto_personal: limpiar(datos.objeto_personal),
    motivacion_central: limpiar(datos.motivacion_central),
    objetivos: parseJSON<Objetivo[]>(datos.objetivos_json, []),
    relaciones: parseJSON<Relacion[]>(datos.relaciones_json, []),
    arco: parseJSON<PuntoArco[]>(datos.arco_json, []),
    notas_recibidas: parseJSON<NotaRecibida[]>(datos.notas_json, []),
  };
}

export function personajeADatos(p: Personaje): DatosFila {
  return {
    personaje: p.personaje,
    actor: p.actor,
    edad: p.edad,
    ocupacion: p.ocupacion,
    foto_url: p.foto_url,
    biografia: p.biografia,
    rasgos_fisicos: p.rasgos_fisicos,
    voz_habla: p.voz_habla,
    objeto_personal: p.objeto_personal,
    motivacion_central: p.motivacion_central,
    objetivos_json: JSON.stringify(p.objetivos),
    relaciones_json: JSON.stringify(p.relaciones),
    arco_json: JSON.stringify(p.arco),
    notas_json: JSON.stringify(p.notas_recibidas),
  };
}

export const PERSONAJE_VACIO: Personaje = {
  personaje: "",
  actor: "",
  edad: "",
  ocupacion: "",
  foto_url: "",
  biografia: "",
  rasgos_fisicos: "",
  voz_habla: "",
  objeto_personal: "",
  motivacion_central: "",
  objetivos: [],
  relaciones: [],
  arco: [],
  notas_recibidas: [],
};

// Contenido precargado real: dos personajes de un proyecto de prueba —
// una protagonista con preparación completa (biografía, 4 objetivos por
// escena distintos, 3 relaciones, arco emocional de 4 puntos y notas de
// ensayo recibidas) y un personaje secundario con una preparación más
// liviana pero igualmente real, para que la grilla muestre variedad desde
// el primer uso.
export const PERSONAJES_EJEMPLO: Personaje[] = [
  {
    personaje: "Mara Ferreiro",
    actor: "Lucía Abad",
    edad: "34 años (en la historia)",
    ocupacion: "Ingeniera agrónoma, vuelve al pueblo tras la enfermedad del padre",
    foto_url: "",
    biografia:
      "Se fue del pueblo a los 19 jurando no volver. Hizo carrera en la ciudad, construyó una vida ordenada " +
      "a base de control: horarios, rutinas, una pareja que no la cuestiona demasiado. El diagnóstico de su " +
      "padre la obliga a volver a un lugar que asocia solo con la muerte de su madre, diez años atrás, y con " +
      "una relación rota con su hermano Diego que nunca se animó a repararse.",
    rasgos_fisicos:
      "Postura rígida, hombros siempre un poco levantados. Habla rápido cuando está nerviosa, se corrige a sí " +
      "misma a mitad de frase. Se toca el reloj de pulsera (el único objeto que quedó de su madre) cuando algo " +
      "la descoloca.",
    voz_habla:
      "Registro bajo y controlado en la ciudad; en el pueblo se le cuela el acento que trató de borrarse. " +
      "Nunca sube el volumen cuando discute — al contrario, baja la voz y acelera el ritmo.",
    objeto_personal: "El reloj de pulsera de su madre, roto desde hace años pero que nunca se quita.",
    motivacion_central:
      "Que cada decisión de Mara se lea como huida hacia adelante, nunca como indiferencia — ella no deja de " +
      "sentir, deja de permitirse sentir en público.",
    objetivos: [
      { id: "o1", escena: "Escena 3-4", objetivo: "Esconder el miedo detrás de la ironía al recibir la noticia por teléfono", estado: "Logrado" },
      { id: "o2", escena: "Escena 9", objetivo: "Pedir ayuda a Diego sin sonar débil ni sonar a reproche", estado: "En trabajo" },
      { id: "o3", escena: "Escena 14", objetivo: "Decir en voz alta la verdad sobre por qué se fue, aunque le cueste la relación con Diego", estado: "Pendiente" },
      { id: "o4", escena: "Escena 21", objetivo: "Aceptar quedarse y decirlo antes de que se lo pregunten", estado: "Logrado" },
    ],
    relaciones: [
      { id: "r1", personaje: "Diego Ferreiro", actor: "Bruno Castelo", tipo: "Familia", notas: "Hermano menor. Quedó él solo a cargo del padre durante diez años — la relación arranca con resentimiento acumulado, no con un conflicto puntual." },
      { id: "r2", personaje: "Sole Vidal", actor: "Nagore Etxe", tipo: "Aliado/a", notas: "Mejor amiga de la infancia, la única que la trata igual que antes de irse. Con ella Mara baja la guardia de verdad — es el único personaje con el que puede estar en silencio sin que sea tenso." },
      { id: "r3", personaje: "Nuño Castro", actor: "Adrián Soutullo", tipo: "Romance", notas: "Vuelve a cruzarse con él después de años; interés romántico tardío que Mara no busca y evita nombrar hasta el acto 3." },
    ],
    arco: [
      { id: "a1", momento: "Acto 1 — llegada al pueblo", estado_emocional: "Hermética, todo bajo control aparente", nota: "El cuerpo cerrado, el reloj como ancla cuando algo la descoloca." },
      { id: "a2", momento: "Punto medio — primera discusión real con Diego", estado_emocional: "Grieta — pide ayuda por primera vez en la historia", nota: "Primera vez que se le quiebra la voz en escena; decidimos que sea apenas perceptible, no un llanto." },
      { id: "a3", momento: "Acto 3 — funeral / decisión de quedarse", estado_emocional: "En duelo, pero presente, ya no disociada", nota: "El temblor de mano que trabajamos en ensayo vuelve acá, pero esta vez Mara lo nota y lo controla a propósito." },
      { id: "a4", momento: "Cierre — reconciliación con Diego", estado_emocional: "En paz, sin resolver todo del todo", nota: "A propósito no cerramos el arco al 100% — la reconciliación es real pero incómoda todavía, no un abrazo limpio." },
    ],
    notas_recibidas: [
      { id: "n1", fecha: "2026-09-16", de: "Dirección de actores (ensayo)", texto: "Bajar el volumen de la discusión por teléfono — jugarlo con silencios y cortes de llamada, nunca gritando." },
      { id: "n2", fecha: "2026-09-23", de: "Dirección de actores (ensayo)", texto: "Buscar un gesto físico repetible para la tensión con Diego, que Script pueda seguir en continuidad." },
      { id: "n3", fecha: "2026-10-05", de: "Dirección de actores (ensayo)", texto: "El temblor de mano funciona en la escena 21, pero no abusar de él en escenas anteriores — reservarlo para ahí." },
    ],
  },
  {
    personaje: "Noa",
    actor: "Lucía Abad (doblaje de voz interior, escenas 2 y 17)",
    edad: "8 años (en la historia)",
    ocupacion: "Hija de un vecino, aparece en dos escenas como testigo silencioso",
    foto_url: "",
    biografia:
      "Personaje secundario breve: la hija de un vecino que observa la discusión entre Mara y Diego sin que " +
      "ninguno de los dos note que está ahí. No tiene diálogo, pero su mirada abre y cierra la película.",
    rasgos_fisicos: "Quieta, observadora, nunca corre — camina despacio como si no quisiera hacer ruido en ningún lugar.",
    voz_habla: "Sin diálogo en estas dos escenas.",
    objeto_personal: "Un cuaderno de dibujo que lleva siempre apretado contra el pecho.",
    motivacion_central: "Que su presencia se sienta como testigo moral silencioso, nunca como un recurso de guion forzado.",
    objetivos: [
      { id: "o1", escena: "Escena 2", objetivo: "Estar presente sin que el encuadre la necesite — que se pueda encontrar si se busca", estado: "Logrado" },
      { id: "o2", escena: "Escena 17", objetivo: "Reaccionar a la discusión solo con la respiración, sin gesto facial marcado", estado: "En trabajo" },
    ],
    relaciones: [
      { id: "r1", personaje: "Mara Ferreiro", actor: "Lucía Abad", tipo: "Conflicto", notas: "No se conocen realmente — la relación es unidireccional: Noa observa a Mara, Mara nunca la ve." },
    ],
    arco: [
      { id: "a1", momento: "Escena 2", estado_emocional: "Curiosidad neutra", nota: "Primera aparición, sin carga emocional todavía." },
      { id: "a2", momento: "Escena 17", estado_emocional: "Incomodidad contenida", nota: "Entiende que está viendo algo que no debería — se queda igual." },
    ],
    notas_recibidas: [],
  },
];
