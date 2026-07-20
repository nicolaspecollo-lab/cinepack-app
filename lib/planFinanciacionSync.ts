// Mapeo de campos compartido entre el Plan de financiación (herramienta_filas,
// ej-plan-financiacion) y los eventos de Pulso (eventos_proyecto, tipo
// "financiacion"). Son la MISMA entidad de negocio vista desde dos lugares:
// Ejecutivo → Exclusivas, o Pulso → Calendario/línea de tiempo. Se sincronizan
// en las dos direcciones (ver app/api/plan-financiacion/*), así que el
// mapeo de campos vive en un solo lugar para no desalinearse.
//
// Modelo: UN solo hito de Pulso por convocatoria, con `fecha` = fecha de
// presentación (el deadline — lo único que un evento de calendario puede
// representar con una sola fecha). La fecha de resolución viaja como dato
// informativo dentro de `datos.resolucion`, sin generar una segunda marca.

export const PULSO_EVT_KEY = "_pulso_evt_presentacion";
export const PLAN_FILA_KEY = "_plan_fila_id";

export type FilaFinanciacion = { id?: string; project_id: string; datos: Record<string, string> };
export type EventoFinanciacion = { id?: string; fecha: string; datos: Record<string, string> };

export function payloadEventoDesdeFila(fila: FilaFinanciacion) {
  const datos = fila.datos ?? {};
  const fuente = datos.fuente?.trim() || "Convocatoria sin nombre";
  return {
    project_id: fila.project_id,
    fecha: datos.presentacion,
    tipo: "financiacion" as const,
    titulo: fuente,
    datos: {
      categoria: datos.tipo || "",
      convocatoria: fuente,
      organismo: datos.organismo || "",
      premio: datos.premio || "",
      importe: datos.importe || "",
      estado: datos.estado || "",
      resolucion: datos.resolucion || "",
      condiciones: datos.condiciones || "",
      ...(fila.id ? { [PLAN_FILA_KEY]: fila.id } : {}),
    },
  };
}

export function datosFilaDesdeEvento(ev: EventoFinanciacion) {
  const d = ev.datos ?? {};
  return {
    fuente: d.convocatoria || "",
    tipo: d.categoria || "",
    organismo: d.organismo || "",
    premio: d.premio || "",
    importe: d.importe || "",
    estado: d.estado || "",
    presentacion: ev.fecha || "",
    resolucion: d.resolucion || "",
    condiciones: d.condiciones || "",
  };
}
