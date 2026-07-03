import type { EtapaKey } from "./cicloVida";

// Tipos de evento del calendario del proyecto. Coinciden con las etapas del
// ciclo de vida (la etapa "rodaje" se presenta como "Producción"). Cada tipo
// tiene su color de la paleta oficial y sus campos propios.
export type EventoTipo = EtapaKey;

export type CampoEvento = {
  key: string;
  label: string;
  tipo?: "text" | "fecha" | "money" | "largo";
};

// Color por etapa/tipo, con la paleta oficial (var(--*) de cp-theme.css).
export const COLOR_ETAPA: Record<EtapaKey, string> = {
  desarrollo: "var(--violet)",
  financiacion: "var(--violet)",
  preproduccion: "var(--cyan)",
  rodaje: "var(--lime)",
  postproduccion: "var(--rose)",
  distribucion: "var(--coral)",
};

// Orden de los tipos en el selector (Producción = etapa "rodaje").
export const TIPOS_EVENTO: EventoTipo[] = [
  "desarrollo",
  "financiacion",
  "preproduccion",
  "rodaje",
  "postproduccion",
  "distribucion",
];

// Campos por tipo. Las labels van en español (dato de negocio, mismo criterio
// que las columnas de herramientas.ts, que tampoco se traducen).
export const CAMPOS_POR_TIPO: Record<EventoTipo, CampoEvento[]> = {
  desarrollo: [
    { key: "actividad", label: "Actividad" },
    { key: "responsable", label: "Responsable" },
    { key: "detalle", label: "Detalle", tipo: "largo" },
  ],
  financiacion: [
    { key: "convocatoria", label: "Convocatoria" },
    { key: "organismo", label: "Organismo" },
    { key: "premio", label: "Premio (cash o especie)" },
    { key: "importe", label: "Importe", tipo: "money" },
    { key: "estado", label: "Estado" },
    { key: "condiciones", label: "Nota de las bases", tipo: "largo" },
  ],
  preproduccion: [
    { key: "actividad", label: "Actividad" },
    { key: "responsable", label: "Responsable" },
    { key: "lugar", label: "Locación / sala" },
    { key: "deptos", label: "Deptos implicados" },
  ],
  rodaje: [
    { key: "jornada", label: "Jornada" },
    { key: "escenas", label: "Escenas a rodar" },
    { key: "locacion", label: "Locación" },
    { key: "deptos", label: "Deptos implicados" },
    { key: "citacion", label: "Citación" },
  ],
  postproduccion: [
    { key: "tarea", label: "Tarea" },
    { key: "estudio", label: "Estudio / sala" },
    { key: "entregable", label: "Entregable" },
    { key: "responsable", label: "Responsable" },
  ],
  distribucion: [
    { key: "evento", label: "Festival / mercado" },
    { key: "seccion", label: "Sección" },
    { key: "cuota", label: "Cuota", tipo: "money" },
    { key: "estado", label: "Estado" },
  ],
};

// Campo que se usa como titular del evento si no hay titulo explícito.
export const CAMPO_TITULAR: Record<EventoTipo, string> = {
  desarrollo: "actividad",
  financiacion: "convocatoria",
  preproduccion: "actividad",
  rodaje: "jornada",
  postproduccion: "tarea",
  distribucion: "evento",
};

export type EventoProyecto = {
  id: string;
  project_id: string;
  fecha: string;
  tipo: EventoTipo;
  titulo: string;
  datos: Record<string, string>;
  aviso_dias: number;
  creado_por: string | null;
};

// Departamentos cuyos jefes pueden editar el calendario (si el Ejecutivo los
// habilita). El Ejecutivo y el super_admin siempre pueden.
export const DEPTOS_EDITORES_CALENDARIO = [
  "Ejecutivo",
  "Producción",
  "Dirección",
  "Postproducción",
  "Distribución",
];
