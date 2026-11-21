// Notas de ensayo por actor/personaje — Dirección de actores.
// Modelo de datos: cada fila de `herramienta_filas` es UNA sesión de ensayo
// de UN personaje (ver arquitectura.md, sección 2). El dato se guarda plano
// (Record<string,string>, mismo motor que el resto de la app) pero la vista
// NUNCA se renderiza como tabla: HerramientasPanel monta un panel a medida
// (NotasEnsayoPanel.tsx) que agrupa estas filas por personaje y las muestra
// como línea de tiempo — ver justificación en ese archivo.

export type DatosFila = Record<string, string>;

export const NOTAS_ENSAYO_DEPARTAMENTO = "Dirección";
export const NOTAS_ENSAYO_HERRAMIENTA_ID = "dir-notas-ensayo";

// "Visible al equipo" vs "Privada" controla si la nota aparece para el resto
// de Dirección/Reparto o solo para quien la escribió (ver 2.1 de la
// arquitectura). El filtrado real de seguridad es tarea de una migración de
// RLS futura (riesgo #2 del arquitecto) — este prototipo aplica el filtro en
// cliente, que es la base sobre la que después se blinda con policy de fila.
export const VISIBILIDAD = ["Visible al equipo", "Privada"] as const;
export type Visibilidad = (typeof VISIBILIDAD)[number];

export type SesionEnsayo = {
  personaje: string;
  actor: string;
  // Cabecera de arco — se repite en cada sesión del mismo personaje (mismo
  // mecanismo que usa el resto del motor para herramientas "de cargo" sin
  // tabla dedicada por entidad): la vista toma el valor de la sesión más
  // reciente y lo muestra una sola vez, fijo arriba de la línea de tiempo.
  arco_personaje: string;
  objetivo_personaje: string;
  fecha: string; // yyyy-mm-dd
  escenas: string; // chips separados por coma: "12, 14A, 15"
  objetivo_escena: string;
  ajuste_interpretacion: string;
  continuidad_arco: string; // "qué cambió desde la última sesión"
  pendiente_proximo: string;
  adjunto_nota: string; // referencia a audio/foto de ensayo (nombre de archivo, no upload real en este prototipo)
  privada: Visibilidad | "";
};

function limpiar(v: string | undefined): string {
  return (v ?? "").replace(/<[^>]*>/g, "").trim();
}

export function datosASesion(datos: DatosFila): SesionEnsayo {
  return {
    personaje: limpiar(datos.personaje),
    actor: limpiar(datos.actor),
    arco_personaje: limpiar(datos.arco_personaje),
    objetivo_personaje: limpiar(datos.objetivo_personaje),
    fecha: limpiar(datos.fecha),
    escenas: limpiar(datos.escenas),
    objetivo_escena: limpiar(datos.objetivo_escena),
    ajuste_interpretacion: limpiar(datos.ajuste_interpretacion),
    continuidad_arco: limpiar(datos.continuidad_arco),
    pendiente_proximo: limpiar(datos.pendiente_proximo),
    adjunto_nota: limpiar(datos.adjunto_nota),
    privada: (VISIBILIDAD.find((v) => v === datos.privada) ?? "Visible al equipo") as Visibilidad,
  };
}

export function sesionADatos(s: SesionEnsayo): DatosFila {
  return {
    personaje: s.personaje,
    actor: s.actor,
    arco_personaje: s.arco_personaje,
    objetivo_personaje: s.objetivo_personaje,
    fecha: s.fecha,
    escenas: s.escenas,
    objetivo_escena: s.objetivo_escena,
    ajuste_interpretacion: s.ajuste_interpretacion,
    continuidad_arco: s.continuidad_arco,
    pendiente_proximo: s.pendiente_proximo,
    adjunto_nota: s.adjunto_nota,
    privada: s.privada || "Visible al equipo",
  };
}

export function escenasALista(escenas: string): string[] {
  return escenas.split(",").map((e) => e.trim()).filter(Boolean);
}

// Contenido precargado real: 3 personajes de un proyecto de prueba, cada uno
// con una progresión de ensayo a lo largo de varias semanas — no un caso
// pelado. Se siembra una sola vez si el proyecto todavía no tiene ninguna
// sesión registrada (ver NotasEnsayoPanel: efecto de siembra inicial).
export const SESIONES_EJEMPLO: SesionEnsayo[] = [
  // --- Marta Oliveira — protagonista, arco de negación a aceptación ---
  {
    personaje: "Marta Oliveira", actor: "Irene Calvo",
    arco_personaje: "De la negación del diagnóstico de su padre a aceptar que tiene que volver al pueblo y hacerse cargo.",
    objetivo_personaje: "Que cada decisión de Marta se lea como huida hacia adelante, nunca como indiferencia.",
    fecha: "2026-09-02",
    escenas: "3, 4",
    objetivo_escena: "Marta se entera por teléfono y sigue trabajando como si nada — el objetivo es que se note el esfuerzo de disociar, no que esté fría.",
    ajuste_interpretacion: "Irene lo jugaba como shock mudo; probamos que siga hablando por teléfono de temas de trabajo mientras la mano le tiembla — contraste entre voz controlada y cuerpo que se escapa.",
    continuidad_arco: "",
    pendiente_proximo: "Afinar cuánto tiembla la mano: en la primera toma de prueba se vio demasiado, puede leerse como enfermedad de ella y no como nervios.",
    adjunto_nota: "",
    privada: "Visible al equipo",
  },
  {
    personaje: "Marta Oliveira", actor: "Irene Calvo",
    arco_personaje: "De la negación del diagnóstico de su padre a aceptar que tiene que volver al pueblo y hacerse cargo.",
    objetivo_personaje: "Que cada decisión de Marta se lea como huida hacia adelante, nunca como indiferencia.",
    fecha: "2026-09-16",
    escenas: "8, 9, 9A",
    objetivo_escena: "Primera discusión con su hermano por teléfono sobre quién se ocupa del padre — Marta todavía se defiende, no cede.",
    ajuste_interpretacion: "Bajamos el volumen de la discusión a propósito: en vez de gritar, Marta corta llamadas y hace silencios largos. El enojo se expresa en la gestión del teléfono (cuelga, vuelve a llamar, bloquea), no en la voz.",
    continuidad_arco: "El temblor de mano que trabajamos en la sesión del 2/9 ya no aparece acá — a propósito: cuando discute se pone rígida, el cuerpo se le cierra en vez de temblar. Es la misma tensión con otra salida física.",
    pendiente_proximo: "Para la escena del funeral (todavía sin ensayar) necesito que Irene decida si el cuerpo vuelve a temblar o se queda rígido — no puede ser la primera vez que aparece ahí.",
    adjunto_nota: "",
    privada: "Visible al equipo",
  },
  {
    personaje: "Marta Oliveira", actor: "Irene Calvo",
    arco_personaje: "De la negación del diagnóstico de su padre a aceptar que tiene que volver al pueblo y hacerse cargo.",
    objetivo_personaje: "Que cada decisión de Marta se lea como huida hacia adelante, nunca como indiferencia.",
    fecha: "2026-10-05",
    escenas: "21",
    objetivo_escena: "Marta decide quedarse — primera escena donde dice en voz alta que va a volver al pueblo.",
    ajuste_interpretacion: "Decidimos que el temblor de mano de la escena 3-4 SÍ vuelve acá, pero esta vez Marta lo nota y lo esconde cerrando el puño — el público tiene que ver que ella misma se da cuenta de que ya no puede seguir fingiendo.",
    continuidad_arco: "Cierra el arco físico abierto en la sesión del 2/9: temblor → rigidez (16/9) → temblor reconocido y controlado (hoy). Rodaje: ya está agendado para la semana del 19/10, avisar a Script para que la continuidad de manos quede anotada antes de esa fecha.",
    pendiente_proximo: "Ninguno — arco cerrado para esta fase. Revisar en dailies si el gesto del puño se lee en plano medio o hace falta un primer plano de la mano.",
    adjunto_nota: "nota-voz-marta-21-05oct.m4a",
    privada: "Visible al equipo",
  },

  // --- Tomás Reguera — antagonista, arco de seguridad a duda ---
  {
    personaje: "Tomás Reguera", actor: "Pablo Yagüe",
    arco_personaje: "Empieza convencido de que la venta del terreno es lo único razonable; termina sin poder defenderlo ni ante sí mismo.",
    objetivo_personaje: "Tomás nunca es un villano de manual — cada escena tiene que dejar una grieta pequeña en su seguridad, no una revelación grande al final.",
    fecha: "2026-09-09",
    escenas: "6",
    objetivo_escena: "Reunión en el ayuntamiento, Tomás presenta la oferta de compra como un favor al pueblo.",
    ajuste_interpretacion: "Pablo lo estaba jugando campechano/simpático. Ajustamos a un registro más corporativo y seco — Tomás ensaya el discurso en su cabeza antes de decirlo, se nota que es un argumento preparado, no una convicción espontánea.",
    continuidad_arco: "",
    pendiente_proximo: "Buscar un tic o gesto repetible cuando miente a sabiendas (ej. se toca el nudo de la corbata) para que Script lo pueda seguir en continuidad en las escenas siguientes.",
    adjunto_nota: "",
    privada: "Visible al equipo",
  },
  {
    personaje: "Tomás Reguera", actor: "Pablo Yagüe",
    arco_personaje: "Empieza convencido de que la venta del terreno es lo único razonable; termina sin poder defenderlo ni ante sí mismo.",
    objetivo_personaje: "Tomás nunca es un villano de manual — cada escena tiene que dejar una grieta pequeña en su seguridad, no una revelación grande al final.",
    fecha: "2026-09-23",
    escenas: "14",
    objetivo_escena: "Tomás se entera de que el comprador real va a demoler la escuela del pueblo, no a restaurarla como decía.",
    ajuste_interpretacion: "Encontramos el gesto pendiente de la sesión anterior: Tomás se ajusta la corbata cuando algo lo incomoda. Acá lo usamos por primera vez, apenas un segundo, antes de recomponerse y seguir vendiendo la idea.",
    continuidad_arco: "El gesto de la corbata nace en esta sesión (no existía el 9/9) — avisar a Script (dirScriptLog) para que quede anotado como seña de continuidad desde la escena 14 en adelante, no antes.",
    pendiente_proximo: "Decidir si el gesto se repite en la escena 19 (todavía sin ensayar) o si para entonces Tomás ya dejó de poder disimular del todo.",
    adjunto_nota: "",
    privada: "Visible al equipo",
  },

  // --- Nadia Reguera — secundaria, nota de preparación personal (privada) ---
  {
    personaje: "Nadia Reguera", actor: "Celia Moutinho",
    arco_personaje: "Hija de Tomás, quince años. Empieza del lado de su padre por lealtad; en el tercio final elige quedarse con Marta.",
    objetivo_personaje: "Que su cambio de lado se sienta ganado escena a escena, no una decisión de guion que cae de golpe.",
    fecha: "2026-09-30",
    escenas: "17",
    objetivo_escena: "Nadia escucha sin querer la discusión entre Tomás y Marta sobre el terreno.",
    ajuste_interpretacion: "Celia todavía está insegura con los silencios largos — tiende a llenar el silencio con movimiento. Trabajamos quedarse completamente quieta mientras escucha, y que el único movimiento sea la respiración.",
    continuidad_arco: "",
    pendiente_proximo: "Duda sin resolver: no estoy seguro de que a los 15 años el personaje leería la escena como traición a su padre o como alivio. Quiero verlo una vez más antes de llevarlo a dailies — anotado como nota privada hasta decidir.",
    adjunto_nota: "",
    privada: "Privada",
  },
];
