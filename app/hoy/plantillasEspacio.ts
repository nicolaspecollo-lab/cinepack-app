// ===========================================================================
// PLANTILLAS DE ESPACIO DE TRABAJO
// ---------------------------------------------------------------------------
// Estilos al elegir un Documento o un Cuadro de celdas personal. El Cuadro de
// celdas arranca con las columnas reales de la plantilla, sin filas. El
// Documento arranca con un esqueleto editable (encabezados/placeholders, sin
// contenido real) para que el estilo elegido se note desde el primer momento
// — no es contenido de ejemplo, es estructura para completar y se reemplaza
// por completo al escribir. "previewLineas"/"previewFilas" son solo para la
// miniatura del modal de selección.
// ===========================================================================

import type { Columna } from "../herramientas";

export type PlantillaDocumento = {
  id: string;
  titulo: string;
  descripcion: string;
  estiloDoc: string; // className aplicada al editor (hp-nota-estilo-*)
  previewLineas: string[]; // solo para la miniatura del modal
  esqueletoHtml: string; // estructura inicial real del documento (HTML)
};

export type PlantillaTabla = {
  id: string;
  titulo: string;
  descripcion: string;
  columnas: Columna[];
  previewFilas: Record<string, string>[]; // solo para la miniatura del modal
};

export const PLANTILLAS_DOCUMENTO: PlantillaDocumento[] = [
  {
    id: "clasico",
    titulo: "Clásico",
    descripcion: "Serif, centrado, márgenes amplios.",
    estiloDoc: "hp-nota-estilo-clasico",
    previewLineas: [
      "Tratamiento de dirección",
      "La cámara observa antes de intervenir.",
      "Cada plano respira un segundo de más.",
      "No hay corte sin motivo dramático.",
    ],
    esqueletoHtml: "<h3>Título del documento</h3><div>Escribí aquí el desarrollo de esta sección.</div>",
  },
  {
    id: "guion",
    titulo: "Guion",
    descripcion: "Monoespaciada, diálogo indentado.",
    estiloDoc: "hp-nota-estilo-guion",
    previewLineas: [
      "INT. CASA DE MARTA — NOCHE",
      "Marta enciende la última vela que le queda.",
      "MARTA",
      "      No es la primera vez que te espero así.",
      "CORTE A:",
    ],
    esqueletoHtml: "<div style=\"text-align:center\"><b>INT. LUGAR — MOMENTO</b></div><div><br></div><div style=\"text-align:center\"><b>PERSONAJE</b></div><div style=\"margin-left:40px\">(Texto del diálogo.)</div>",
  },
  {
    id: "manifiesto",
    titulo: "Manifiesto",
    descripcion: "Tipografía grande, frase declarativa.",
    estiloDoc: "hp-nota-estilo-manifiesto",
    previewLineas: [
      "Filmamos lo que",
      "no se puede actuar.",
      "Lo demás es ruido.",
    ],
    esqueletoHtml: "<h3>Tu frase central.</h3>",
  },
  {
    id: "diario",
    titulo: "Diario de rodaje",
    descripcion: "Fecha lateral, entradas tipo bitácora.",
    estiloDoc: "hp-nota-estilo-diario",
    previewLineas: [
      "12 jun — Día 4",
      "Se perdió la luz natural a las 17:40.",
      "Repetimos la escena 22 con practicables.",
      "13 jun — Día 5",
      "Llueve. Pasamos al plan de interiores.",
    ],
    esqueletoHtml: "<h3>Día 1</h3><ul><li>Anotá lo que pasó hoy.</li></ul>",
  },
  {
    id: "tablon",
    titulo: "Tablón visual",
    descripcion: "Bloques de color intercalados con texto.",
    estiloDoc: "hp-nota-estilo-tablon",
    previewLineas: [
      "Referencias de paleta",
      "Verdes desaturados para el bosque.",
      "Naranjas cálidos para el incendio final.",
      "Azules fríos para la escena del hospital.",
    ],
    esqueletoHtml: "<h3>Referencias</h3><div>Sumá tus notas de paleta y estilo visual.</div>",
  },
  {
    id: "minimalista",
    titulo: "Minimalista",
    descripcion: "Una línea fina, todo el aire posible.",
    estiloDoc: "hp-nota-estilo-minimalista",
    previewLineas: [
      "Notas sueltas",
      "Menos plano, más mirada.",
    ],
    esqueletoHtml: "<div>Notas.</div>",
  },
];

export const PLANTILLAS_TABLA: PlantillaTabla[] = [
  {
    id: "grid-clasico",
    titulo: "Grid clásico",
    descripcion: "Filas y columnas finas, sin adornos.",
    columnas: [
      { key: "item", label: "Elemento" },
      { key: "detalle", label: "Detalle" },
      { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En curso", "Hecho"] },
    ],
    previewFilas: [
      { item: "Steadicam", detalle: "Confirmar disponibilidad", estado: "En curso" },
      { item: "Grúa Russian arm", detalle: "Cotizar dos proveedores", estado: "Pendiente" },
    ],
  },
  {
    id: "kanban",
    titulo: "Tablero kanban",
    descripcion: "Columnas con tarjetas de color.",
    columnas: [
      { key: "tarea", label: "Por hacer" },
      { key: "curso", label: "En curso" },
      { key: "hecho", label: "Hecho" },
    ],
    previewFilas: [
      { tarea: "Localizar faro abandonado", curso: "Permiso de rodaje en costa", hecho: "Casting de extras cerrado" },
    ],
  },
  {
    id: "timeline",
    titulo: "Línea de tiempo",
    descripcion: "Filas horizontales con marca de color.",
    columnas: [
      { key: "fecha", label: "Fecha", tipo: "fecha" },
      { key: "hito", label: "Hito" },
      { key: "responsable", label: "Responsable" },
    ],
    previewFilas: [
      { fecha: "12 jun", hito: "Lectura de guion con el elenco", responsable: "Dirección" },
      { fecha: "18 jun", hito: "Tech scout en locaciones", responsable: "Producción" },
    ],
  },
  {
    id: "mosaico",
    titulo: "Mosaico de color",
    descripcion: "Cada celda es un swatch de estado.",
    columnas: [
      { key: "escena", label: "Escena" },
      { key: "paleta", label: "Paleta" },
      { key: "nota", label: "Nota" },
    ],
    previewFilas: [
      { escena: "Esc. 14", paleta: "Azules nocturnos", nota: "Reforzar contraluz" },
      { escena: "Esc. 31", paleta: "Ocres de tarde", nota: "Practicables cálidos" },
    ],
  },
  {
    id: "checklist-tabla",
    titulo: "Checklist",
    descripcion: "Filas con marca de estado a la izquierda.",
    columnas: [
      { key: "verificar", label: "Verificar" },
      { key: "responsable", label: "Responsable" },
      { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Hecho"] },
    ],
    previewFilas: [
      { verificar: "Liberación de música original", responsable: "Producción", estado: "Hecho" },
      { verificar: "Contrato de extras firmado", responsable: "Producción", estado: "Pendiente" },
    ],
  },
  {
    id: "storyboard",
    titulo: "Storyboard",
    descripcion: "Celdas grandes tipo fotograma.",
    columnas: [
      { key: "plano", label: "Plano" },
      { key: "descripcion", label: "Descripción" },
      { key: "duracion", label: "Duración" },
    ],
    previewFilas: [
      { plano: "01", descripcion: "Gran general del puerto al amanecer", duracion: "6s" },
      { plano: "02", descripcion: "Primer plano de las manos sobre la cuerda", duracion: "3s" },
    ],
  },
];
