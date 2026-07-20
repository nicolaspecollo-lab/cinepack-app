// ===========================================================================
// REGISTRY DE HERRAMIENTAS CINE PACK
// ---------------------------------------------------------------------------
// Espejo del mapa de trabajo (prototipo/mapa_herramientas.html), convertido en
// herramientas reales. Cada herramienta declara su TIPO y, si es tabla/ficha,
// sus COLUMNAS bespoke — escritas desde la cabeza de cada cargo, no genéricas.
//
// El id (slug) es estable y se comparte cuando una herramienta de departamento
// aparece en varios cargos: así editan todos sobre los mismos datos.
// ===========================================================================

export type ToolKind = "tabla" | "nota" | "checklist" | "ficha" | "galeria" | "accesos";

export type ColTipo = "texto" | "largo" | "num" | "money" | "fecha" | "estado" | "archivo" | "link";

export type Columna = {
  key: string;
  label: string;
  tipo?: ColTipo;     // por defecto "texto"
  opciones?: string[]; // para tipo "estado" (dropdown)
};

export type Herramienta = {
  id: string;
  nombre: string;
  tipo: ToolKind;
  hint?: string;
  columnas?: Columna[]; // tabla / galería (campos extra de cada tarjeta)
  campos?: Columna[];   // ficha (pares clave/valor)
  estiloDoc?: string;   // nota (className de plantilla elegida al crear)
};

export type CargoTools = {
  departamento: Herramienta[];
  cargo: Herramienta[];
};

const ESTADO_DOC = ["Borrador", "En revisión", "Aprobado", "Bloqueado"];

// Herramienta "Accesos del equipo" — la maneja GestionAccesosPanel, aquí solo marca presencia.
const ACCESOS: Herramienta = {
  id: "accesos-equipo",
  nombre: "Accesos del equipo",
  tipo: "accesos",
  hint: "Asigná herramientas por cargo y dá el OK de Editor / Visionario.",
};

// ===========================================================================
// EJECUTIVO
// ===========================================================================
const presupuestoGeneral: Herramienta = {
  id: "ej-presupuesto-general",
  nombre: "Presupuesto general (top sheet)",
  tipo: "tabla",
  hint: "Top sheet por capítulos: lo presupuestado, comprometido y real del proyecto entero.",
  columnas: [
    { key: "cap", label: "Capítulo" },
    { key: "concepto", label: "Concepto" },
    { key: "presup", label: "Presupuestado", tipo: "money" },
    { key: "comprometido", label: "Comprometido", tipo: "money" },
    { key: "real", label: "Real", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["En presupuesto", "En riesgo", "Sobrepasado"] },
    { key: "doc", label: "Documento", tipo: "archivo" },
  ],
};
const presupuestoDepto: Herramienta = {
  id: "ej-presupuesto-depto",
  nombre: "Presupuesto por departamento",
  tipo: "tabla",
  hint: "Asignación y límite de gasto por departamento.",
  columnas: [
    { key: "depto", label: "Departamento" },
    { key: "asignado", label: "Asignado", tipo: "money" },
    { key: "gastado", label: "Gastado", tipo: "money" },
    { key: "disponible", label: "Disponible", tipo: "money" },
    { key: "limite", label: "Límite de alerta", tipo: "money" },
    { key: "responsable", label: "Responsable" },
  ],
};
const planFinanciacion: Herramienta = {
  id: "ej-plan-financiacion",
  nombre: "Plan de financiación, ayudas y coproducción",
  tipo: "tabla",
  hint: "Ayudas, subvenciones, inversores y coproducción, con estado y plazos.",
  columnas: [
    { key: "fuente", label: "Fuente" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Ayuda", "Subvención", "Premio", "Inversor", "Coproducción", "Preventa"] },
    { key: "importe", label: "Importe", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Prospecto", "Solicitado", "Concedido", "Firmado", "Denegado"] },
    { key: "presentacion", label: "Fecha presentación", tipo: "fecha" },
    { key: "resolucion", label: "Fecha resolución", tipo: "fecha" },
    { key: "condiciones", label: "Condiciones", tipo: "largo" },
    { key: "bases_doc", label: "Bases / Convocatoria (PDF o enlace)", tipo: "archivo" as const },
  ],
};
const controlCostos: Herramienta = {
  id: "ej-control-costos",
  nombre: "Control de costos (cost report)",
  tipo: "tabla",
  hint: "Presupuestado vs. real por partida, con desvío.",
  columnas: [
    { key: "partida", label: "Partida" },
    { key: "presup", label: "Presupuestado", tipo: "money" },
    { key: "real", label: "Real a la fecha", tipo: "money" },
    { key: "ejec", label: "% ejecutado", tipo: "num" },
    { key: "comentario", label: "Comentario", tipo: "largo" },
  ],
};
const flujoCaja: Herramienta = {
  id: "ej-flujo-caja",
  nombre: "Flujo de caja (cashflow)",
  tipo: "tabla",
  hint: "Entradas y salidas previstas semana a semana.",
  columnas: [
    { key: "periodo", label: "Semana / Fecha", tipo: "fecha" },
    { key: "concepto", label: "Concepto principal" },
    { key: "ingresos", label: "Ingresos", tipo: "money" },
    { key: "egresos", label: "Egresos", tipo: "money" },
    { key: "saldo", label: "Saldo", tipo: "money" },
  ],
};
const facturas: Herramienta = {
  id: "ej-facturas",
  nombre: "Facturas",
  tipo: "tabla",
  hint: "Emitidas, de proveedores y pendientes de pago/cobro.",
  columnas: [
    { key: "num", label: "Nº factura" },
    { key: "parte", label: "Proveedor / Cliente" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Emitida", "Proveedor"] },
    { key: "importe", label: "Importe", tipo: "money" },
    { key: "vence", label: "Vencimiento", tipo: "fecha" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Pagada", "Cobrada", "Vencida"] },
    { key: "adjunto", label: "Factura (PDF)", tipo: "archivo" },
  ],
};
const contratos: Herramienta = {
  id: "ej-contratos",
  nombre: "Contratos (equipo, reparto, proveedores)",
  tipo: "tabla",
  hint: "Estado de firma de todos los contratos del proyecto. Incluye garante, penalizaciones y estado de pago.",
  columnas: [
    { key: "contraparte", label: "Contraparte" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Equipo", "Reparto", "Proveedor", "Coproducción"] },
    { key: "importe", label: "Importe", tipo: "money" },
    { key: "inicio", label: "Inicio", tipo: "fecha" },
    { key: "fin", label: "Fin", tipo: "fecha" },
    { key: "fecha_firma", label: "Fecha firma", tipo: "fecha" },
    { key: "archivo_contrato", label: "Archivo contrato", tipo: "archivo" as const },
    { key: "renovacion_automatica", label: "Renovación automática", tipo: "estado", opciones: ["Sí", "No"] },
    { key: "garante", label: "Garante" },
    { key: "penalizacion_incumplimiento", label: "Penalización incumplimiento", tipo: "money" as const },
    { key: "estado_pago", label: "Estado de pago", tipo: "estado", opciones: ["Pendiente", "Pagado", "Atrasado"] },
    { key: "notas_legales", label: "Notas legales", tipo: "largo" },
    { key: "firma", label: "Firma", tipo: "estado", opciones: ["Pendiente", "Enviado", "Firmado"] },
    { key: "contrato_firmado", label: "Contrato firmado", tipo: "archivo" as const },
  ],
};

// Nuevas herramientas ejecutivo
const ejCashflow: Herramienta = {
  id: "ej-cashflow",
  nombre: "Control de flujo de caja semanal",
  tipo: "tabla",
  hint: "Seguimiento semana a semana de ingresos y gastos reales vs. previstos. Detecta déficits antes de que ocurran.",
  columnas: [
    { key: "semana", label: "Semana" },
    { key: "ingresos_previstos", label: "Ingresos previstos", tipo: "money" as const },
    { key: "ingresos_reales", label: "Ingresos reales", tipo: "money" as const },
    { key: "gastos_previstos", label: "Gastos previstos", tipo: "money" as const },
    { key: "gastos_reales", label: "Gastos reales", tipo: "money" as const },
    { key: "saldo", label: "Saldo", tipo: "money" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["OK", "Déficit", "Superávit"] },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};

const ejCoproducciones: Herramienta = {
  id: "ej-coproducciones",
  nombre: "Gestión de coproductores",
  tipo: "tabla",
  hint: "Registro de todos los socios coproductores: aportación, porcentaje, estado de firma y contacto.",
  columnas: [
    { key: "empresa", label: "Empresa" },
    { key: "pais", label: "País" },
    { key: "aportacion", label: "Aportación", tipo: "money" as const },
    { key: "porcentaje", label: "Porcentaje %", tipo: "num" as const },
    { key: "contacto", label: "Contacto" },
    { key: "estado_firma", label: "Estado firma", tipo: "estado", opciones: ["Pendiente", "Enviado", "Firmado", "Rechazado"] },
  ],
};

const ejAyudasSubvenciones: Herramienta = {
  id: "ej-ayudas-subvenciones",
  nombre: "Ayudas y subvenciones",
  tipo: "tabla",
  hint: "Control de todas las convocatorias solicitadas: importes, resoluciones y estado de justificación.",
  columnas: [
    { key: "convocatoria", label: "Convocatoria" },
    { key: "organismo", label: "Organismo" },
    { key: "importe_solicitado", label: "Importe solicitado", tipo: "money" as const },
    { key: "importe_concedido", label: "Importe concedido", tipo: "money" as const },
    { key: "fecha_resolucion", label: "Fecha resolución", tipo: "fecha" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Concedida", "Denegada", "Justificando"] },
    { key: "expediente", label: "Expediente" },
  ],
};

const ejAgendaEjecutivo: Herramienta = {
  id: "ej-agenda-ejecutivo",
  nombre: "Agenda ejecutiva (reuniones y calls)",
  tipo: "tabla",
  hint: "Log de reuniones, calls y proyecciones: con quién, de qué y cuál fue el resultado.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "hora", label: "Hora" },
    { key: "con_quien", label: "Con quién" },
    { key: "asunto", label: "Asunto", tipo: "largo" },
    { key: "resultado", label: "Resultado", tipo: "largo" },
    { key: "seguimiento", label: "Seguimiento", tipo: "estado", opciones: ["Pendiente", "Hecho", "Cancelada"] },
  ],
};

const ejCronogramaProduccion: Herramienta = {
  id: "ej-cronograma-produccion",
  nombre: "Cronograma de producción (hitos)",
  tipo: "tabla",
  hint: "Todos los hitos del proyecto con fecha prevista y real, responsable y estado actual.",
  columnas: [
    { key: "hito", label: "Hito" },
    { key: "fecha_prevista", label: "Fecha prevista", tipo: "fecha" as const },
    { key: "fecha_real", label: "Fecha real", tipo: "fecha" as const },
    { key: "responsable", label: "Responsable" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En curso", "Completado", "Atrasado"] },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};

const ejDeliverables: Herramienta = {
  id: "ej-deliverables",
  nombre: "Deliverables del proyecto",
  tipo: "tabla",
  hint: "Todos los entregables comprometidos: a quién, en qué formato, cuándo y si ya se enviaron.",
  columnas: [
    { key: "entregable", label: "Entregable" },
    { key: "formato", label: "Formato" },
    { key: "para_quien", label: "Para quién" },
    { key: "fecha_entrega", label: "Fecha entrega", tipo: "fecha" as const },
    { key: "archivo_final", label: "Archivo final", tipo: "archivo" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En proceso", "Entregado", "Aprobado"] },
  ],
};

const ejNotasEjecutivo: Herramienta = {
  id: "ej-notas-ejecutivo",
  nombre: "Memoria ejecutiva del proyecto",
  tipo: "nota",
  hint: "Decisiones estratégicas, acuerdos verbales y contexto clave que no está en ningún otro documento.",
};

const ejKpis: Herramienta = {
  id: "ej-kpis",
  nombre: "KPIs clave del proyecto",
  tipo: "ficha",
  hint: "Panel de indicadores clave: días rodados, presupuesto ejecutado, páginas por día y más.",
  campos: [
    { key: "dias_rodaje_total", label: "Días de rodaje total", tipo: "num" as const },
    { key: "dias_rodados", label: "Días rodados", tipo: "num" as const },
    { key: "dias_restantes", label: "Días restantes", tipo: "num" as const },
    { key: "presupuesto_total", label: "Presupuesto total", tipo: "money" as const },
    { key: "presupuesto_ejecutado", label: "Presupuesto ejecutado", tipo: "money" as const },
    { key: "paginas_guion", label: "Páginas de guión total", tipo: "num" as const },
    { key: "paginas_rodadas", label: "Páginas rodadas", tipo: "num" as const },
    { key: "pct_avance", label: "% avance de rodaje", tipo: "num" as const },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS PRODUCCIÓN EJECUTIVA (declaradas antes de HERRAMIENTAS)
// ===========================================================================

// ===========================================================================
// DIRECCIÓN
// ===========================================================================
const calendarioEnsayos: Herramienta = {
  id: "dir-calendario-ensayos",
  nombre: "Calendario de ensayos",
  tipo: "tabla",
  hint: "Planificación de todos los ensayos: fechas, elenco convocado, lugar y foco del trabajo.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "hora", label: "Hora" },
    { key: "escena", label: "Escena / Secuencia" },
    { key: "elenco", label: "Elenco convocado" },
    { key: "lugar", label: "Lugar" },
    { key: "foco", label: "Foco del ensayo", tipo: "largo" },
  ],
};
const partesScript: Herramienta = {
  id: "dir-partes-script",
  nombre: "Partes de script / continuidad por escena",
  tipo: "tabla",
  hint: "Registro de tomas rodadas por escena: estado, notas de raccord y continuidad para montaje.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "toma", label: "Tomas (OK/NG)" },
    { key: "duracion", label: "Duración" },
    { key: "raccord", label: "Notas de raccord", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por rodar", "Rodada", "Pendiente repetir"] },
  ],
};

// ===========================================================================
// PRODUCCIÓN
// ===========================================================================
const stripboard: Herramienta = {
  id: "prod-stripboard",
  nombre: "Stripboard (orden de escenas)",
  tipo: "tabla",
  hint: "Orden de escenas por día y locación.",
  columnas: [
    { key: "dia", label: "Día de rodaje" },
    { key: "escena", label: "Escena" },
    { key: "intext", label: "INT/EXT", tipo: "estado", opciones: ["INT", "EXT", "INT/EXT"] },
    { key: "dianoche", label: "Día/Noche", tipo: "estado", opciones: ["Día", "Noche", "Amanecer", "Atardecer"] },
    { key: "locacion", label: "Locación" },
    { key: "paginas", label: "Páginas (1/8)" },
    { key: "elenco", label: "Elenco" },
    { key: "sinopsis", label: "Síntesis de la escena", tipo: "largo" },
    { key: "ref", label: "Referencia / plano", tipo: "archivo" as const },
  ],
};
const cateringDietas: Herramienta = {
  id: "prod-catering-general",
  nombre: "Catering y dietas",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "servicio", label: "Servicio", tipo: "estado", opciones: ["Desayuno", "Comida", "Cena", "Snacks"] },
    { key: "personas", label: "Nº personas", tipo: "num" },
    { key: "menu", label: "Menú / Dietas especiales", tipo: "largo" },
    { key: "proveedor", label: "Proveedor" },
    { key: "coste", label: "Coste", tipo: "money" },
  ],
};
const partesProduccion: Herramienta = {
  id: "prod-partes-diarios",
  nombre: "Partes de producción diarios",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "escenas", label: "Escenas previstas / rodadas" },
    { key: "inicio", label: "1ª toma" },
    { key: "fin", label: "Corte" },
    { key: "paginas", label: "Páginas rodadas" },
    { key: "incidencias", label: "Incidencias", tipo: "largo" },
  ],
};

// ===========================================================================
// FOTOGRAFÍA
// ===========================================================================
const shotList: Herramienta = {
  id: "foto-shotlist",
  nombre: "Plan técnico de cámara / Shot list",
  tipo: "tabla",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "plano", label: "Plano Nº" },
    { key: "valor", label: "Valor", tipo: "estado", opciones: ["GPG", "PG", "PA", "PM", "PP", "PPP", "Detalle"] },
    { key: "optica", label: "Óptica" },
    { key: "movimiento", label: "Movimiento", tipo: "estado", opciones: ["Fijo", "Pano", "Tilt", "Travelling", "Dolly", "Grúa", "Steadycam", "Mano"] },
    { key: "desc", label: "Descripción", tipo: "largo" },
  ],
};
const inventarioCamara: Herramienta = {
  id: "foto-inventario",
  nombre: "Inventario y hoja de alquiler de equipo",
  tipo: "tabla",
  hint: "Cámara, óptica e iluminación.",
  columnas: [
    { key: "equipo", label: "Equipo" },
    { key: "categoria", label: "Categoría", tipo: "estado", opciones: ["Cámara", "Óptica", "Iluminación", "Maquinaria", "Accesorio"] },
    { key: "cantidad", label: "Cantidad", tipo: "num" },
    { key: "proveedor", label: "Casa de alquiler" },
    { key: "coste", label: "Coste/día", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Reservado", "Confirmado", "Recogido", "Devuelto"] },
    { key: "foto_equipo", label: "Foto del equipo", tipo: "archivo" as const },
  ],
};
const planIluminacion: Herramienta = {
  id: "foto-plan-iluminacion",
  nombre: "Plan de iluminación (planta de luces)",
  tipo: "tabla",
  columnas: [
    { key: "escena", label: "Escena / Set" },
    { key: "esquema", label: "Esquema (clave)" },
    { key: "fuentes", label: "Fuentes / Aparatos", tipo: "largo" },
    { key: "temp", label: "Temperatura color" },
    { key: "notas", label: "Notas de montaje", tipo: "largo" },
    { key: "foto_estado", label: "Foto / Esquema", tipo: "archivo" as const },
  ],
};
const lookbookFoto: Herramienta = {
  id: "foto-lookbook",
  nombre: "Look book / Moodboard de fotografía",
  tipo: "galeria",
  hint: "Referencias de cuadro y estética.",
  columnas: [
    { key: "escena", label: "Escena / Bloque" },
    { key: "nota", label: "Por qué esta referencia", tipo: "largo" },
  ],
};
const paletaColor: Herramienta = {
  id: "foto-paleta-color",
  nombre: "Paleta de color por escena",
  tipo: "galeria",
  hint: "Compartida con Arte y DIT.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "paleta", label: "Códigos / Tonos dominantes" },
    { key: "intencion", label: "Intención dramática", tipo: "largo" },
  ],
};

// ===========================================================================
// ARTE
// ===========================================================================
const moodboardArte: Herramienta = {
  id: "arte-moodboard",
  nombre: "Moodboard de arte",
  tipo: "galeria",
  columnas: [
    { key: "ambito", label: "Set / Personaje / Objeto" },
    { key: "nota", label: "Referencia y uso", tipo: "largo" },
  ],
};
const planosDecorado: Herramienta = {
  id: "arte-planos-decorado",
  nombre: "Planos de decorado",
  tipo: "galeria",
  columnas: [
    { key: "set", label: "Decorado / Set" },
    { key: "escala", label: "Escala / Medidas" },
    { key: "nota", label: "Notas de construcción", tipo: "largo" },
  ],
};
const desgloseAtrezzo: Herramienta = {
  id: "arte-desglose-atrezzo",
  nombre: "Desglose de atrezzo por escena",
  tipo: "tabla",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "objeto", label: "Objeto / Atrezzo" },
    { key: "personaje", label: "Usado por" },
    { key: "origen", label: "Origen", tipo: "estado", opciones: ["Almacén", "Compra", "Alquiler", "Construcción", "Préstamo"] },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por conseguir", "Conseguido", "En set", "Devuelto"] },
  ],
};
const desgloseVestuario: Herramienta = {
  id: "arte-desglose-vestuario",
  nombre: "Desglose de vestuario por personaje",
  tipo: "tabla",
  columnas: [
    { key: "personaje", label: "Personaje" },
    { key: "escena", label: "Escena / Cambio" },
    { key: "look", label: "Look / Prenda", tipo: "largo" },
    { key: "talla", label: "Talla" },
    { key: "origen", label: "Origen", tipo: "estado", opciones: ["Compra", "Alquiler", "Confección", "Actor", "Stock"] },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por conseguir", "Probado", "Listo"] },
    { key: "foto_ref", label: "Foto de referencia", tipo: "archivo" },
  ],
};
const presupuestoArte: Herramienta = {
  id: "arte-presupuesto",
  nombre: "Presupuesto y proveedores de arte",
  tipo: "tabla",
  columnas: [
    { key: "partida", label: "Partida / Elemento" },
    { key: "proveedor", label: "Proveedor" },
    { key: "presup", label: "Presupuestado", tipo: "money" },
    { key: "real", label: "Real", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Cotizando", "Aprobado", "Comprado", "Entregado"] },
  ],
};

// ===========================================================================
// GUION
// ===========================================================================
const historialVersiones: Herramienta = {
  id: "guion-historial",
  nombre: "Historial de versiones y cambios",
  tipo: "tabla",
  columnas: [
    { key: "version", label: "Versión" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "autor", label: "Autor" },
    { key: "cambios", label: "Cambios principales", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ESTADO_DOC },
  ],
};
const sinopsisEscaleta: Herramienta = {
  id: "guion-sinopsis-escaleta",
  nombre: "Sinopsis y escaleta",
  tipo: "tabla",
  columnas: [
    { key: "acto", label: "Acto", tipo: "estado", opciones: ["Acto I", "Acto II", "Acto III"] },
    { key: "num", label: "Nº" },
    { key: "secuencia", label: "Secuencia / Bloque" },
    { key: "funcion", label: "Función dramática" },
    { key: "resumen", label: "Resumen", tipo: "largo" },
  ],
};
const desgloseEscenas: Herramienta = {
  id: "guion-desglose-escenas",
  nombre: "Desglose de escenas",
  tipo: "tabla",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "loc", label: "Locación" },
    { key: "personajes", label: "Personajes" },
    { key: "atrezzo", label: "Atrezzo / Necesidades", tipo: "largo" },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};
const cesionGuion: Herramienta = {
  id: "guion-cesion",
  nombre: "Cesión de derechos de guion",
  tipo: "ficha",
  campos: [
    { key: "obra", label: "Obra / Título" },
    { key: "autor", label: "Autor/es" },
    { key: "cesionario", label: "Cesionario" },
    { key: "alcance", label: "Alcance de la cesión", tipo: "largo" },
    { key: "territorio", label: "Territorio" },
    { key: "vigencia", label: "Vigencia" },
    { key: "estado", label: "Estado de firma", tipo: "estado", opciones: ["Pendiente", "Firmado"] },
  ],
};

// ===========================================================================
// CASTING
// ===========================================================================
const candidatosPersonaje: Herramienta = {
  id: "cast-candidatos",
  nombre: "Listado de candidatos por personaje",
  tipo: "tabla",
  columnas: [
    { key: "personaje", label: "Personaje" },
    { key: "candidato", label: "Candidato/a" },
    { key: "agencia", label: "Agencia / Contacto" },
    { key: "fase", label: "Fase", tipo: "estado", opciones: ["Propuesto", "1ª audición", "Callback", "Prueba de cámara", "Descartado", "Elegido"] },
    { key: "notas", label: "Notas", tipo: "largo" },
    { key: "foto", label: "Foto de casting", tipo: "archivo" },
    { key: "reel", label: "Reel / Material", tipo: "link" },
  ],
};
const convocatoria: Herramienta = {
  id: "cast-convocatoria",
  nombre: "Convocatoria de casting",
  tipo: "ficha",
  campos: [
    { key: "personajes", label: "Personajes buscados", tipo: "largo" },
    { key: "perfil", label: "Perfil / Requisitos", tipo: "largo" },
    { key: "fechas", label: "Fechas de audición" },
    { key: "lugar", label: "Lugar / Modalidad" },
    { key: "material", label: "Material a preparar", tipo: "largo" },
    { key: "publicacion", label: "Canales de publicación" },
  ],
};
const resultadosAudiciones: Herramienta = {
  id: "cast-resultados",
  nombre: "Resultados de audiciones",
  tipo: "tabla",
  columnas: [
    { key: "candidato", label: "Candidato/a" },
    { key: "personaje", label: "Personaje" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "valoracion", label: "Valoración", tipo: "largo" },
    { key: "decision", label: "Decisión", tipo: "estado", opciones: ["Avanza", "En duda", "Descartado", "Elegido"] },
  ],
};
const fichaReparto: Herramienta = {
  id: "cast-ficha-reparto",
  nombre: "Ficha de reparto confirmado",
  tipo: "tabla",
  columnas: [
    { key: "actor", label: "Actor/Actriz" },
    { key: "personaje", label: "Personaje" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Protagonista", "Principal", "Secundario", "Figuración"] },
    { key: "contacto", label: "Contacto" },
    { key: "contrato", label: "Contrato", tipo: "estado", opciones: ["Pendiente", "Firmado"] },
    { key: "foto", label: "Foto", tipo: "archivo" },
  ],
};
const contratosReparto: Herramienta = {
  id: "cast-contratos-reparto",
  nombre: "Contratos de reparto y cesión de imagen",
  tipo: "tabla",
  columnas: [
    { key: "actor", label: "Actor/Actriz" },
    { key: "personaje", label: "Personaje" },
    { key: "cache", label: "Caché", tipo: "money" },
    { key: "jornadas", label: "Nº jornadas", tipo: "num" },
    { key: "imagen", label: "Cesión imagen", tipo: "estado", opciones: ["Pendiente", "Firmada"] },
    { key: "estado", label: "Contrato", tipo: "estado", opciones: ["Pendiente", "Enviado", "Firmado"] },
    { key: "adjunto", label: "Contrato firmado", tipo: "archivo" },
  ],
};

// ===========================================================================
// REPARTO
// ===========================================================================
const fichaPersonaje: Herramienta = {
  id: "rep-ficha-personaje",
  nombre: "Ficha de personaje y arco",
  tipo: "ficha",
  campos: [
    { key: "personaje", label: "Personaje" },
    { key: "edad", label: "Edad / Rango" },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "arco", label: "Arco dramático", tipo: "largo" },
    { key: "relaciones", label: "Relaciones clave", tipo: "largo" },
    { key: "objetivo", label: "Objetivo / Conflicto", tipo: "largo" },
  ],
};
const calendarioCitaciones: Herramienta = {
  id: "rep-citaciones",
  nombre: "Calendario de citaciones",
  tipo: "tabla",
  hint: "Vinculado a la Orden de rodaje general.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "convocatoria", label: "Convocatoria" },
    { key: "set", label: "Locación / Set" },
    { key: "escenas", label: "Escenas" },
    { key: "myp", label: "Maq./Pelu." },
  ],
};
const vestMaqAsignado: Herramienta = {
  id: "rep-vest-maq",
  nombre: "Vestuario y maquillaje asignado",
  tipo: "tabla",
  hint: "Vinculado a Arte.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "vestuario", label: "Vestuario", tipo: "largo" },
    { key: "maquillaje", label: "Maquillaje / Peinado", tipo: "largo" },
    { key: "notas", label: "Notas de continuidad", tipo: "largo" },
  ],
};
const contratoIndividual: Herramienta = {
  id: "rep-contrato-individual",
  nombre: "Contrato individual y cesión de imagen",
  tipo: "ficha",
  campos: [
    { key: "actor", label: "Actor/Actriz" },
    { key: "personaje", label: "Personaje" },
    { key: "cache", label: "Caché" },
    { key: "jornadas", label: "Jornadas" },
    { key: "imagen", label: "Cesión de imagen", tipo: "largo" },
    { key: "estado", label: "Estado de firma", tipo: "estado", opciones: ["Pendiente", "Firmado"] },
    { key: "documento", label: "Contrato firmado (PDF)", tipo: "archivo" },
  ],
};
const guionMarcado: Herramienta = {
  id: "rep-guion-marcado",
  nombre: "Guion con escenas marcadas",
  tipo: "nota",
  hint: "Tus escenas, marcas y anotaciones personales sobre el guion.",
};

// ===========================================================================
// MAKING OF
// ===========================================================================
const calEditorial: Herramienta = {
  id: "mo-cal-editorial",
  nombre: "Calendario editorial",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "pieza", label: "Pieza / Contenido" },
    { key: "formato", label: "Formato", tipo: "estado", opciones: ["Reel", "Entrevista", "Foto fija", "Teaser", "Clip BTS"] },
    { key: "responsable", label: "Responsable" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Idea", "En grabación", "En edición", "Publicado"] },
  ],
};
const coberturaBTS: Herramienta = {
  id: "mo-cobertura-bts",
  nombre: "Plan de cobertura BTS",
  tipo: "tabla",
  hint: "Vinculado a la Orden de rodaje general.",
  columnas: [
    { key: "jornada", label: "Jornada", tipo: "fecha" },
    { key: "momento", label: "Momento / Escena a cubrir" },
    { key: "objetivo", label: "Qué capturar", tipo: "largo" },
    { key: "equipo", label: "Equipo asignado" },
  ],
};
const materialGrabado: Herramienta = {
  id: "mo-material",
  nombre: "Listado de material grabado",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "clip", label: "Clip / Archivo" },
    { key: "contenido", label: "Contenido", tipo: "largo" },
    { key: "ubicacion", label: "Ubicación / Disco" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Crudo", "Seleccionado", "Editado", "Archivado"] },
    { key: "carpeta", label: "Carpeta del making of", tipo: "link" },
  ],
};
const calPublicaciones: Herramienta = {
  id: "mo-cal-publicaciones",
  nombre: "Calendario de publicaciones",
  tipo: "tabla",
  hint: "Planificación completa de publicaciones en redes: copy en dos idiomas, imagen, hashtags y métricas.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "canal", label: "Canal" },
    { key: "pieza", label: "Pieza" },
    { key: "copy", label: "Copy / Texto", tipo: "largo" },
    { key: "copy_es", label: "Copy (ES)", tipo: "largo" },
    { key: "copy_en", label: "Copy (EN)", tipo: "largo" },
    { key: "imagen_principal", label: "Imagen principal", tipo: "archivo" as const },
    { key: "hashtags", label: "Hashtags" },
    { key: "mencion_colaboradores", label: "Mención colaboradores" },
    { key: "plataforma_principal", label: "Plataforma principal", tipo: "estado", opciones: ["Instagram", "TikTok", "Twitter", "Facebook", "YouTube", "LinkedIn"] },
    { key: "resultado_alcance", label: "Alcance resultado", tipo: "num" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Borrador", "En revisión", "Programado", "Publicado"] },
  ],
};
const derechosBTS: Herramienta = {
  id: "mo-derechos-bts",
  nombre: "Derechos de uso de material BTS",
  tipo: "ficha",
  campos: [
    { key: "alcance", label: "Alcance de uso", tipo: "largo" },
    { key: "personas", label: "Personas que ceden imagen", tipo: "largo" },
    { key: "territorio", label: "Territorio / Plataformas" },
    { key: "vigencia", label: "Vigencia" },
    { key: "estado", label: "Estado de firmas", tipo: "estado", opciones: ["Pendiente", "Parcial", "Completo"] },
  ],
};

// ===========================================================================
// SONIDO
// ===========================================================================
const planSonidoDirecto: Herramienta = {
  id: "son-plan-directo",
  nombre: "Plan de sonido directo",
  tipo: "tabla",
  hint: "Estrategia de captación por escena. Vinculado a Shot list.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "estrategia", label: "Estrategia de captación", tipo: "largo" },
    { key: "retos", label: "Retos acústicos", tipo: "largo" },
    { key: "wildtrack", label: "Wildtracks a tomar" },
  ],
};
const listaMicros: Herramienta = {
  id: "son-lista-micros",
  nombre: "Lista de micrófonos por escena",
  tipo: "tabla",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "personaje", label: "Personaje" },
    { key: "micro", label: "Micrófono", tipo: "estado", opciones: ["Pértiga", "Lavalier", "Plant mic", "Hydrophone", "Otro"] },
    { key: "frecuencia", label: "Frecuencia / Canal" },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};
const inventarioSonido: Herramienta = {
  id: "son-inventario",
  nombre: "Inventario y hoja de alquiler de sonido",
  tipo: "tabla",
  hint: "Control completo del equipo de sonido: número de serie, propietario, seguro y fecha de devolución.",
  columnas: [
    { key: "equipo", label: "Equipo" },
    { key: "categoria", label: "Categoría", tipo: "estado", opciones: ["Grabador", "Micrófono", "Inalámbrico", "Monitoraje", "Accesorio"] },
    { key: "cantidad", label: "Cantidad", tipo: "num" },
    { key: "proveedor", label: "Proveedor" },
    { key: "numero_serie", label: "Número de serie" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["OK", "En reparación", "Enviado a técnico"] },
    { key: "propietario", label: "Propietario", tipo: "estado", opciones: ["Propio", "Alquilado", "Prestado"] },
    { key: "seguro", label: "Seguro", tipo: "estado", opciones: ["Sí", "No"] },
    { key: "fecha_devolucion", label: "Fecha devolución", tipo: "fecha" as const },
  ],
};
const reportesSonido: Herramienta = {
  id: "son-reportes",
  nombre: "Reportes de sonido por toma",
  tipo: "tabla",
  hint: "Vinculado al Reporte de cámara por toma. Incluye datos ambientales y observaciones para postproducción.",
  columnas: [
    { key: "escena", label: "Escena / Toma" },
    { key: "archivo", label: "Archivo / TC" },
    { key: "canales", label: "Canales" },
    { key: "ok", label: "Estado", tipo: "estado", opciones: ["OK", "NG", "Sólo sonido", "Wildtrack"] },
    { key: "circunstancias_sonido", label: "Circunstancias de sonido", tipo: "estado", opciones: ["Interior silencioso", "Interior con ruido", "Exterior tranquilo", "Exterior con viento", "Exterior urbano"] },
    { key: "temperatura_ambiente", label: "Temperatura ambiente (ºC)", tipo: "num" as const },
    { key: "humedad", label: "Humedad (%)", tipo: "num" as const },
    { key: "nivel_ruido_ambiente_db", label: "Nivel ruido ambiente (dB)", tipo: "num" as const },
    { key: "observaciones_post", label: "Observaciones para post", tipo: "largo" },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};
const notasADR: Herramienta = {
  id: "son-adr",
  nombre: "Notas de postsincronización (ADR)",
  tipo: "tabla",
  hint: "Vinculado a Postproducción.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "personaje", label: "Personaje" },
    { key: "motivo", label: "Motivo del ADR", tipo: "largo" },
    { key: "prioridad", label: "Prioridad", tipo: "estado", opciones: ["Alta", "Media", "Baja"] },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Grabado", "Integrado"] },
  ],
};

// ===========================================================================
// POSTPRODUCCIÓN
// ===========================================================================
const planMontaje: Herramienta = {
  id: "post-plan-montaje",
  nombre: "Plan de montaje",
  tipo: "tabla",
  columnas: [
    { key: "hito", label: "Hito / Fase" },
    { key: "inicio", label: "Inicio", tipo: "fecha" },
    { key: "fin", label: "Entrega", tipo: "fecha" },
    { key: "responsable", label: "Responsable" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En curso", "En revisión", "Aprobado"] },
  ],
};
const versionesCorte: Herramienta = {
  id: "post-versiones-corte",
  nombre: "Versiones de corte (EDL)",
  tipo: "tabla",
  hint: "Vinculado al Plan de mezcla de Sonido. Incluye link de visionado, aprobaciones y notas de dirección y producción.",
  columnas: [
    { key: "version", label: "Versión / Corte" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "duracion", label: "Duración" },
    { key: "duracion_exacta", label: "Duración exacta (TC)" },
    { key: "timecode_in", label: "Timecode IN" },
    { key: "timecode_out", label: "Timecode OUT" },
    { key: "cambios", label: "Cambios respecto al anterior", tipo: "largo" },
    { key: "link_visionado", label: "Link de visionado", tipo: "link" as const },
    { key: "aprobado_dir", label: "Aprobado por dirección", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Cambios", "Rechazado"] },
    { key: "aprobado_prod", label: "Aprobado por producción", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Cambios"] },
    { key: "notas_dir", label: "Notas de dirección", tipo: "largo" },
    { key: "notas_prod", label: "Notas de producción", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Rough cut", "Fine cut", "Picture lock"] },
  ],
};
const notasVisionadoPost: Herramienta = {
  id: "post-notas-visionado",
  nombre: "Notas de visionado / dailies",
  tipo: "tabla",
  hint: "Vinculado a Decisiones de visionado de Dirección.",
  columnas: [
    { key: "escena", label: "Escena / Corte" },
    { key: "tc", label: "Timecode" },
    { key: "nota", label: "Nota", tipo: "largo" },
    { key: "autor", label: "De" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Abierta", "Resuelta", "Descartada"] },
  ],
};
const listaVFX: Herramienta = {
  id: "post-lista-vfx",
  nombre: "Lista de planos VFX",
  tipo: "tabla",
  hint: "Vinculado a Shot list de Fotografía.",
  columnas: [
    { key: "plano", label: "Plano / ID" },
    { key: "escena", label: "Escena" },
    { key: "tipo", label: "Tipo de efecto", tipo: "estado", opciones: ["Limpieza", "Composición", "CGI", "Matte", "Cielo", "Tracking", "Otro"] },
    { key: "desc", label: "Descripción", tipo: "largo" },
    { key: "complejidad", label: "Complejidad", tipo: "estado", opciones: ["Baja", "Media", "Alta"] },
  ],
};
const guiaColor: Herramienta = {
  id: "post-guia-color",
  nombre: "Guía de color / LUT final",
  tipo: "tabla",
  hint: "Vinculado a Paleta de color por escena.",
  columnas: [
    { key: "escena", label: "Escena / Bloque" },
    { key: "look", label: "Look / Intención", tipo: "largo" },
    { key: "lut", label: "LUT / Referencia" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por etalonar", "Etalonado", "Aprobado"] },
  ],
};
const planEntregas: Herramienta = {
  id: "post-plan-entregas",
  nombre: "Plan de entregas (masters)",
  tipo: "tabla",
  columnas: [
    { key: "master", label: "Master / Versión" },
    { key: "formato", label: "Formato / Codec" },
    { key: "destino", label: "Destino" },
    { key: "fecha", label: "Fecha límite", tipo: "fecha" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En proceso", "Entregado"] },
  ],
};
const checklistEntrega: Herramienta = {
  id: "post-checklist-entrega",
  nombre: "Checklist de entrega final",
  tipo: "checklist",
};

// ===========================================================================
// RRHH
// ===========================================================================
const listadoEquipo: Herramienta = {
  id: "rrhh-listado-equipo",
  nombre: "Listado de equipo y contactos",
  tipo: "tabla",
  columnas: [
    { key: "nombre", label: "Nombre" },
    { key: "depto", label: "Departamento" },
    { key: "cargo", label: "Cargo" },
    { key: "tel", label: "Teléfono" },
    { key: "email", label: "Email" },
  ],
};
const altasBajas: Herramienta = {
  id: "rrhh-altas-bajas",
  nombre: "Altas y bajas",
  tipo: "tabla",
  columnas: [
    { key: "nombre", label: "Nombre" },
    { key: "depto", label: "Departamento" },
    { key: "tipo", label: "Movimiento", tipo: "estado", opciones: ["Alta", "Baja"] },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Tramitando", "Comunicado", "Hecho"] },
  ],
};
const controlHoras: Herramienta = {
  id: "rrhh-control-horas",
  nombre: "Control de horas",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "persona", label: "Persona" },
    { key: "entrada", label: "Entrada" },
    { key: "salida", label: "Salida" },
    { key: "extra", label: "Horas extra", tipo: "num" },
  ],
};
const descansosLegales: Herramienta = {
  id: "rrhh-descansos",
  nombre: "Registro de descansos legales",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Jornada", tipo: "fecha" },
    { key: "fin", label: "Hora de corte" },
    { key: "siguiente", label: "Citación siguiente" },
    { key: "descanso", label: "Descanso (h)", tipo: "num" },
    { key: "ok", label: "Cumple", tipo: "estado", opciones: ["Sí", "No", "Revisar"] },
  ],
};
const protocoloRiesgos: Herramienta = {
  id: "rrhh-protocolo-riesgos",
  nombre: "Protocolo de prevención de riesgos",
  tipo: "ficha",
  campos: [
    { key: "ambito", label: "Ámbito / Actividad" },
    { key: "riesgos", label: "Riesgos identificados", tipo: "largo" },
    { key: "medidas", label: "Medidas preventivas", tipo: "largo" },
    { key: "epis", label: "EPIs necesarios" },
    { key: "responsable", label: "Responsable" },
  ],
};
const canalIncidencias: Herramienta = {
  id: "rrhh-incidencias",
  nombre: "Canal de incidencias",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Laboral", "Seguridad", "Convivencia", "Otra"] },
    { key: "desc", label: "Descripción", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Abierta", "En gestión", "Resuelta"] },
  ],
};

// ===========================================================================
// SOSTENIBILIDAD
// ===========================================================================
const huellaCarbono: Herramienta = {
  id: "sost-huella",
  nombre: "Huella de carbono del proyecto",
  tipo: "tabla",
  columnas: [
    { key: "fuente", label: "Fuente de emisión" },
    { key: "categoria", label: "Categoría", tipo: "estado", opciones: ["Transporte", "Energía", "Catering", "Residuos", "Alojamiento", "Otro"] },
    { key: "actividad", label: "Dato de actividad" },
    { key: "co2", label: "kg CO₂e", tipo: "num" },
  ],
};
const consumoEnergetico: Herramienta = {
  id: "sost-energia",
  nombre: "Consumo energético",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha / Jornada", tipo: "fecha" },
    { key: "fuente", label: "Fuente", tipo: "estado", opciones: ["Red", "Generador", "Batería", "Solar"] },
    { key: "consumo", label: "Consumo (kWh / L)", tipo: "num" },
    { key: "set", label: "Set / Locación" },
  ],
};
const gestionResiduos: Herramienta = {
  id: "sost-residuos",
  nombre: "Plan de gestión de residuos",
  tipo: "tabla",
  columnas: [
    { key: "residuo", label: "Tipo de residuo" },
    { key: "gestion", label: "Gestión", tipo: "estado", opciones: ["Reciclaje", "Reutilización", "Compost", "Vertedero", "Donación"] },
    { key: "responsable", label: "Responsable" },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};
const proveedoresSost: Herramienta = {
  id: "sost-proveedores",
  nombre: "Proveedores sostenibles",
  tipo: "tabla",
  hint: "Vinculado a Control de proveedores del Ejecutivo.",
  columnas: [
    { key: "proveedor", label: "Proveedor" },
    { key: "servicio", label: "Servicio" },
    { key: "criterio", label: "Criterio sostenible", tipo: "largo" },
    { key: "cert", label: "Certificación" },
  ],
};
const checklistVerde: Herramienta = {
  id: "sost-checklist-verde",
  nombre: "Checklist producción verde",
  tipo: "checklist",
};

// ===========================================================================
// MARKETING
// ===========================================================================
const planMarketing: Herramienta = {
  id: "mkt-plan",
  nombre: "Plan de marketing",
  tipo: "tabla",
  hint: "Estrategia, objetivos y calendario de campañas.",
  columnas: [
    { key: "campana", label: "Campaña / Fase" },
    { key: "objetivo", label: "Objetivo", tipo: "largo" },
    { key: "canal", label: "Canales" },
    { key: "inicio", label: "Inicio", tipo: "fecha" },
    { key: "presup", label: "Presupuesto", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Idea", "En curso", "Lanzada", "Cerrada"] },
  ],
};
const identidadGrafica: Herramienta = {
  id: "mkt-identidad",
  nombre: "Identidad gráfica",
  tipo: "galeria",
  hint: "Logos, tipografías y guía de marca. Vinculado a Moodboard de Arte.",
  columnas: [
    { key: "elemento", label: "Elemento" },
    { key: "uso", label: "Uso / Norma", tipo: "largo" },
  ],
};
const calRedes: Herramienta = {
  id: "mkt-cal-redes",
  nombre: "Calendario de redes sociales",
  tipo: "tabla",
  hint: "Vinculado a Calendario de redes de Making of.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "canal", label: "Canal" },
    { key: "contenido", label: "Contenido", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planeado", "Diseñado", "Programado", "Publicado"] },
  ],
};
const bancoAssets: Herramienta = {
  id: "mkt-banco-assets",
  nombre: "Banco de assets",
  tipo: "galeria",
  hint: "Imágenes, videos y artes. Vinculado a Banco de selección de Making of.",
  columnas: [
    { key: "asset", label: "Asset" },
    { key: "tipo", label: "Tipo / Formato" },
    { key: "uso", label: "Uso permitido", tipo: "largo" },
  ],
};

// ===========================================================================
// DIFUSIÓN
// ===========================================================================
const dossierPrensa: Herramienta = {
  id: "dif-dossier",
  nombre: "Dossier de prensa",
  tipo: "ficha",
  campos: [
    { key: "sinopsis", label: "Sinopsis", tipo: "largo" },
    { key: "ficha", label: "Ficha técnica/artística", tipo: "largo" },
    { key: "notas", label: "Notas del director", tipo: "largo" },
    { key: "contacto", label: "Contacto de prensa" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ESTADO_DOC },
  ],
};
const listadoMedios: Herramienta = {
  id: "dif-medios",
  nombre: "Listado de medios y contactos",
  tipo: "tabla",
  columnas: [
    { key: "medio", label: "Medio" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Prensa", "Radio", "TV", "Digital", "Influencer"] },
    { key: "contacto", label: "Contacto" },
    { key: "email", label: "Email" },
    { key: "relacion", label: "Relación", tipo: "estado", opciones: ["Frío", "Contactado", "Confirmado"] },
  ],
};
const notasPrensa: Herramienta = {
  id: "dif-notas-prensa",
  nombre: "Notas de prensa",
  tipo: "tabla",
  hint: "Vinculado a Calendario de publicaciones.",
  columnas: [
    { key: "titulo", label: "Título" },
    { key: "fecha", label: "Fecha envío", tipo: "fecha" },
    { key: "angulo", label: "Ángulo / Mensaje", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Borrador", "Aprobada", "Enviada"] },
  ],
};

// ===========================================================================
// DISTRIBUCIÓN
// ===========================================================================
const planDistribucion: Herramienta = {
  id: "dist-plan",
  nombre: "Plan de distribución",
  tipo: "tabla",
  hint: "Festivales, plataformas y ventanas.",
  columnas: [
    { key: "ventana", label: "Ventana / Canal" },
    { key: "territorio", label: "Territorio" },
    { key: "fecha", label: "Fecha estimada", tipo: "fecha" },
    { key: "condiciones", label: "Condiciones", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Objetivo", "En negociación", "Cerrado"] },
  ],
};
const listadoFestivales: Herramienta = {
  id: "dist-festivales",
  nombre: "Listado de festivales",
  tipo: "tabla",
  hint: "Vinculado al Calendario general del proyecto.",
  columnas: [
    { key: "festival", label: "Festival" },
    { key: "categoria", label: "Categoría / Sección" },
    { key: "deadline", label: "Deadline", tipo: "fecha" },
    { key: "cuota", label: "Cuota", tipo: "money" },
    { key: "prioridad", label: "Prioridad", tipo: "estado", opciones: ["Alta", "Media", "Baja"] },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Objetivo", "Inscrito", "Seleccionado", "Rechazado"] },
  ],
};
const acuerdosDistribucion: Herramienta = {
  id: "dist-acuerdos",
  nombre: "Acuerdos de distribución",
  tipo: "tabla",
  hint: "Vinculado a Contratos del Ejecutivo/Legal.",
  columnas: [
    { key: "contraparte", label: "Distribuidor / Plataforma" },
    { key: "territorio", label: "Territorio" },
    { key: "ventana", label: "Ventana" },
    { key: "importe", label: "Importe / MG", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["En negociación", "Acordado", "Firmado"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — DIRECCIÓN
// ===========================================================================
const dirBreakdownTecnico: Herramienta = {
  id: "dir-breakdown-tecnico",
  nombre: "Desglose técnico por escena",
  tipo: "tabla",
  hint: "Detalle técnico de cada escena: decorado, actores, efectos especiales, hora dorada y permisos necesarios.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "decorado", label: "Decorado" },
    { key: "actores_necesarios", label: "Actores necesarios" },
    { key: "efectos_especiales", label: "Efectos especiales", tipo: "largo" },
    { key: "hora_dorada", label: "Hora dorada", tipo: "estado", opciones: ["Sí", "No", "N/A"] },
    { key: "permisos_necesarios", label: "Permisos necesarios", tipo: "largo" },
    { key: "equipo_especial", label: "Equipo especial", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En preparación", "Listo"] },
  ],
};

const dirContinuidadDiaria: Herramienta = {
  id: "dir-continuidad-diaria",
  nombre: "Continuidad diaria de rodaje",
  tipo: "ficha",
  hint: "Resumen de dirección del día: qué se rodó, qué quedó pendiente y cambios de guión en set.",
  campos: [
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "dia_rodaje", label: "Día de rodaje" },
    { key: "escenas_rodadas", label: "Escenas rodadas", tipo: "largo" },
    { key: "escenas_pendientes", label: "Escenas pendientes", tipo: "largo" },
    { key: "cambios_guion", label: "Cambios de guión en set", tipo: "largo" },
    { key: "observaciones_director", label: "Observaciones del director", tipo: "largo" },
    { key: "tomas_destacadas", label: "Tomas destacadas para montaje", tipo: "largo" },
  ],
};

const dirPlanExtras: Herramienta = {
  id: "dir-plan-extras",
  nombre: "Plan de figuración (extras)",
  tipo: "tabla",
  hint: "Gestión completa de figuración: días, perfil, cantidad, qué llevan y cómo se coordina su citación.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "tipo_figurante", label: "Tipo de figurante" },
    { key: "cantidad", label: "Cantidad", tipo: "num" as const },
    { key: "descripcion_perfil", label: "Descripción del perfil", tipo: "largo" },
    { key: "que_llevan", label: "Qué llevan / vestuario propio", tipo: "largo" },
    { key: "hora_citacion", label: "Hora citación" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por cubrir", "Convocado", "Confirmado", "Cancelado"] },
  ],
};

const dirControlLlamadas: Herramienta = {
  id: "dir-control-llamadas",
  nombre: "Control de llamadas al equipo",
  tipo: "tabla",
  hint: "Registro de llamadas realizadas para coordinación: quién, cuándo, sobre qué y cuál fue el acuerdo.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "hora", label: "Hora" },
    { key: "persona", label: "Persona" },
    { key: "cargo", label: "Cargo" },
    { key: "asunto", label: "Asunto", tipo: "largo" },
    { key: "acuerdo", label: "Acuerdo / resultado", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Hecho", "Sin respuesta"] },
  ],
};

const dirScriptLog: Herramienta = {
  id: "dir-script-log",
  nombre: "Log de tomas (Script)",
  tipo: "tabla",
  hint: "Registro detallado de cada toma: escena, número de toma, resultado y timecode. Base del informe de script.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "toma", label: "Toma", tipo: "num" as const },
    { key: "resultado", label: "Resultado", tipo: "estado", opciones: ["OK", "NG", "HOLD", "Print", "Falsa"] },
    { key: "timecode", label: "Timecode" },
    { key: "duracion", label: "Duración" },
    { key: "observaciones", label: "Observaciones", tipo: "largo" },
  ],
};

const dirCambiosGuion: Herramienta = {
  id: "dir-cambios-guion",
  nombre: "Cambios de guión en set",
  tipo: "tabla",
  hint: "Registro oficial de todas las modificaciones de diálogo o acción ocurridas durante el rodaje.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "escena", label: "Escena" },
    { key: "version_anterior", label: "Versión anterior", tipo: "largo" },
    { key: "version_nueva", label: "Versión nueva", tipo: "largo" },
    { key: "motivo", label: "Motivo del cambio", tipo: "largo" },
    { key: "aprobado_por", label: "Aprobado por" },
  ],
};

const dirFotosContinuidad: Herramienta = {
  id: "dir-fotos-continuidad",
  nombre: "Fotos de continuidad por escena",
  tipo: "galeria",
  hint: "Galería de fotos de continuidad organizadas por escena. Esencial para mantener raccord entre jornadas.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "personaje", label: "Personaje" },
    { key: "descripcion", label: "Descripción de raccord", tipo: "largo" },
    { key: "aprobada", label: "Aprobada", tipo: "estado", opciones: ["Sí", "No"] },
  ],
};

const dirChecklistPreproduccion: Herramienta = {
  id: "dir-checklist-preproduccion",
  nombre: "Checklist de preproducción (dirección)",
  tipo: "checklist",
  hint: "Lista de verificación para dirección antes de comenzar el rodaje: guión final, ensayos, plan técnico, etc.",
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — PRODUCCIÓN
// ===========================================================================
const prodProveedoresDetalle: Herramienta = {
  id: "prod-proveedores-detalle",
  nombre: "Control de proveedores (detalle completo)",
  tipo: "tabla",
  hint: "Ficha completa de cada proveedor: contacto, precio acordado, forma de pago, contrato y valoración.",
  columnas: [
    { key: "nombre", label: "Nombre" },
    { key: "servicio", label: "Servicio" },
    { key: "contacto", label: "Contacto" },
    { key: "telefono", label: "Teléfono" },
    { key: "email", label: "Email" },
    { key: "precio_acuerdo", label: "Precio acordado", tipo: "money" as const },
    { key: "forma_pago", label: "Forma de pago", tipo: "estado", opciones: ["Transferencia", "Efectivo", "Tarjeta"] },
    { key: "estado_pago", label: "Estado de pago", tipo: "estado", opciones: ["Pendiente", "Pagado", "Atrasado"] },
    { key: "contrato", label: "Contrato", tipo: "archivo" as const },
    { key: "valoracion", label: "Valoración", tipo: "estado", opciones: ["Excelente", "Bueno", "Regular", "Malo"] },
  ],
};

const prodEquipoTecnico: Herramienta = {
  id: "prod-equipo-tecnico",
  nombre: "Equipo técnico (tarifas y contratos)",
  tipo: "tabla",
  hint: "Registro de todo el equipo técnico contratado: tarifa, días trabajados, total y estado del contrato.",
  columnas: [
    { key: "nombre", label: "Nombre" },
    { key: "cargo_real", label: "Cargo real" },
    { key: "departamento", label: "Departamento" },
    { key: "fecha_inicio", label: "Fecha inicio", tipo: "fecha" as const },
    { key: "fecha_fin", label: "Fecha fin", tipo: "fecha" as const },
    { key: "tarifa_dia", label: "Tarifa/día", tipo: "money" as const },
    { key: "dias_trabajados", label: "Días trabajados", tipo: "num" as const },
    { key: "total", label: "Total", tipo: "money" as const },
    { key: "estado_contrato", label: "Estado contrato", tipo: "estado", opciones: ["Pendiente", "Firmado", "Liquidado"] },
  ],
};

const prodLocalizacionesScouting: Herramienta = {
  id: "prod-localizaciones-scouting",
  nombre: "Localizaciones (scouting)",
  tipo: "tabla",
  hint: "Base de datos de localizaciones candidatas y confirmadas: precio, distancia, permisos y foto de referencia.",
  columnas: [
    { key: "nombre_lugar", label: "Nombre del lugar" },
    { key: "direccion", label: "Dirección" },
    { key: "contacto_propietario", label: "Contacto propietario" },
    { key: "precio_dia", label: "Precio/día", tipo: "money" as const },
    { key: "capacidad", label: "Capacidad" },
    { key: "distancia_base", label: "Distancia a base (km)", tipo: "num" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["En scouting", "Pendiente permiso", "Confirmada", "Descartada"] },
    { key: "foto_ref", label: "Foto referencia", tipo: "archivo" as const },
    { key: "notas_tecnicas", label: "Notas técnicas", tipo: "largo" },
  ],
};

const prodPermisos: Herramienta = {
  id: "prod-permisos",
  nombre: "Control de permisos de rodaje",
  tipo: "tabla",
  hint: "Registro de todos los permisos necesarios: quién lo concede, cuándo se solicitó y archivo del permiso.",
  columnas: [
    { key: "tipo_permiso", label: "Tipo de permiso" },
    { key: "entidad", label: "Entidad" },
    { key: "solicitado", label: "Fecha solicitud", tipo: "fecha" as const },
    { key: "concedido", label: "Fecha concesión", tipo: "fecha" as const },
    { key: "archivo_permiso", label: "Archivo permiso", tipo: "archivo" as const },
    { key: "coste", label: "Coste", tipo: "money" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Solicitado", "Concedido", "Denegado"] },
    { key: "contacto", label: "Contacto" },
  ],
};

const prodPlanSemana: Herramienta = {
  id: "prod-plan-semana",
  nombre: "Plan semanal de rodaje",
  tipo: "tabla",
  hint: "Planificación operativa semana a semana: qué se rueda cada día, crew necesario y estado de confirmación.",
  columnas: [
    { key: "dia", label: "Día" },
    { key: "localizacion", label: "Localización" },
    { key: "escenas", label: "Escenas" },
    { key: "crew_necesario", label: "Crew necesario", tipo: "num" as const },
    { key: "extras_necesarios", label: "Extras necesarios", tipo: "num" as const },
    { key: "hora_inicio", label: "Hora inicio" },
    { key: "hora_fin_estimada", label: "Hora fin estimada" },
    { key: "notas", label: "Notas", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "Confirmado", "Rodado", "Cancelado"] },
  ],
};

const prodComunicacionEquipo: Herramienta = {
  id: "prod-comunicacion-equipo",
  nombre: "Protocolos de comunicación del equipo",
  tipo: "nota",
  hint: "Canales oficiales de comunicación, grupos de WhatsApp/Slack, cadena de mando y protocolos de urgencia.",
};

const prodChecklistCierreRodaje: Herramienta = {
  id: "prod-checklist-cierre-rodaje",
  nombre: "Checklist de cierre de jornada",
  tipo: "checklist",
  hint: "Verificación de cierre de cada jornada: equipo devuelto, set limpio, material descargado, órdenes del día siguiente.",
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — FOTOGRAFÍA
// ===========================================================================
const fotoPlanCamara: Herramienta = {
  id: "foto-plan-camara",
  nombre: "Plan de cámara por escena",
  tipo: "tabla",
  hint: "Planificación técnica detallada de cada plano: cámara, óptica, movimiento y estado de aprobación.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "descripcion_plano", label: "Descripción del plano" },
    { key: "tipo_camara", label: "Cámara", tipo: "estado", opciones: ["A", "B", "C"] },
    { key: "objetivo", label: "Objetivo / Óptica" },
    { key: "distancia_focal", label: "Distancia focal" },
    { key: "altura_camara", label: "Altura cámara", tipo: "estado", opciones: ["Suelo", "Normal", "Alta", "Grúa"] },
    { key: "angulo", label: "Ángulo" },
    { key: "movimiento", label: "Movimiento" },
    { key: "referencia_visual", label: "Referencia visual", tipo: "link" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Rodado"] },
  ],
};

const fotoInventarioCamara: Herramienta = {
  id: "foto-inventario-camara",
  nombre: "Inventario de cámara (equipo propio y alquilado)",
  tipo: "tabla",
  hint: "Control de todo el equipo de cámara: número de serie, estado y fechas de recogida y devolución.",
  columnas: [
    { key: "elemento", label: "Elemento" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "numero_serie", label: "Número de serie" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["OK", "En reparación", "Alquilado", "Devuelto"] },
    { key: "propietario", label: "Propietario" },
    { key: "fecha_recogida", label: "Fecha recogida", tipo: "fecha" as const },
    { key: "fecha_devolucion", label: "Fecha devolución", tipo: "fecha" as const },
  ],
};

const fotoLookBook: Herramienta = {
  id: "foto-look-book",
  nombre: "Look book de fotografía (referencias visuales)",
  tipo: "galeria",
  hint: "Referencias visuales aprobadas por dirección y fotografía. Cada imagen con descripción del look y quién la aprobó.",
  columnas: [
    { key: "clave_look", label: "Clave del look" },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "aprobado_por", label: "Aprobado por" },
  ],
};

const fotoGuionTecnico: Herramienta = {
  id: "foto-guion-tecnico",
  nombre: "Guión técnico (storyboard en tabla)",
  tipo: "tabla",
  hint: "Guión técnico por plano: tipo, óptica, movimiento, clave de iluminación y tiempo estimado de setup.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "num_plano", label: "Plano Nº" },
    { key: "descripcion_plano", label: "Descripción del plano", tipo: "largo" },
    { key: "tipo_plano", label: "Tipo de plano" },
    { key: "objetivo", label: "Objetivo" },
    { key: "movimiento", label: "Movimiento" },
    { key: "iluminacion_clave", label: "Clave de iluminación", tipo: "largo" },
    { key: "tiempo_estimado", label: "Tiempo estimado (min)", tipo: "num" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Rodado", "Descartado"] },
  ],
};

const fotoOrdenDiaCamara: Herramienta = {
  id: "foto-orden-dia-camara",
  nombre: "Orden del día de cámara",
  tipo: "tabla",
  hint: "Lista ordenada de setups del día para el departamento de cámara: cuánto tiempo necesita cada uno.",
  columnas: [
    { key: "orden", label: "Orden", tipo: "num" as const },
    { key: "tipo_plano", label: "Tipo de plano" },
    { key: "escena", label: "Escena" },
    { key: "descripcion", label: "Descripción" },
    { key: "setup_tiempo", label: "Tiempo de setup (min)", tipo: "num" as const },
    { key: "notas", label: "Notas", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Listo", "Rodado", "Skip"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — ILUMINACIÓN / ELÉCTRICO
// ===========================================================================
const luzPlanIluminacion: Herramienta = {
  id: "luz-plan-iluminacion",
  nombre: "Plan de iluminación por escena (Gaffer)",
  tipo: "tabla",
  hint: "Diseño de iluminación escena por escena: fuentes principales, relleno, look y estado del montaje.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "interior_exterior", label: "INT/EXT", tipo: "estado", opciones: ["Interior", "Exterior", "Mixto"] },
    { key: "hora_dia", label: "Hora del día", tipo: "estado", opciones: ["Día", "Noche", "Amanecer", "Atardecer", "Artificial"] },
    { key: "fuentes_principales", label: "Fuentes principales", tipo: "largo" },
    { key: "fuentes_relleno", label: "Fuentes de relleno", tipo: "largo" },
    { key: "descripcion_look", label: "Descripción del look", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "En set", "Rodado"] },
  ],
};

const luzInventarioEquipo: Herramienta = {
  id: "luz-inventario-equipo",
  nombre: "Inventario de equipo de iluminación",
  tipo: "tabla",
  hint: "Control del parque de luminarias: marca, potencia, cantidad, estado y propietario.",
  columnas: [
    { key: "elemento", label: "Elemento" },
    { key: "marca", label: "Marca" },
    { key: "potencia_w", label: "Potencia (W)", tipo: "num" as const },
    { key: "cantidad", label: "Cantidad", tipo: "num" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["OK", "Averiado", "Alquilado"] },
    { key: "propietario", label: "Propietario" },
    { key: "ubicacion", label: "Ubicación" },
  ],
};

const luzGenerador: Herramienta = {
  id: "luz-generador",
  nombre: "Control de generador por jornada",
  tipo: "tabla",
  hint: "Log diario del generador: kW disponibles, consumo real, nivel de combustible e incidencias.",
  columnas: [
    { key: "jornada", label: "Jornada", tipo: "fecha" as const },
    { key: "localizacion", label: "Localización" },
    { key: "kw_disponibles", label: "kW disponibles", tipo: "num" as const },
    { key: "kw_consumidos", label: "kW consumidos", tipo: "num" as const },
    { key: "combustible_inicio", label: "Combustible inicio (L)", tipo: "num" as const },
    { key: "combustible_fin", label: "Combustible fin (L)", tipo: "num" as const },
    { key: "incidencias", label: "Incidencias", tipo: "largo" },
  ],
};

const luzChecklistSeguridad: Herramienta = {
  id: "luz-checklist-seguridad",
  nombre: "Checklist de seguridad eléctrica",
  tipo: "checklist",
  hint: "Verificación de seguridad eléctrica antes de cada jornada: tomas de tierra, cuadros, potencia disponible.",
};

const luzPeticionEquipo: Herramienta = {
  id: "luz-peticion-equipo",
  nombre: "Petición de equipo de iluminación",
  tipo: "tabla",
  hint: "Solicitudes de material al proveedor: qué se necesita, cuándo y con qué urgencia.",
  columnas: [
    { key: "elemento", label: "Elemento" },
    { key: "cantidad", label: "Cantidad", tipo: "num" as const },
    { key: "fecha_necesaria", label: "Fecha necesaria", tipo: "fecha" as const },
    { key: "proveedor", label: "Proveedor" },
    { key: "precio_estimado", label: "Precio estimado", tipo: "money" as const },
    { key: "urgencia", label: "Urgencia", tipo: "estado", opciones: ["Normal", "Urgente", "Crítico"] },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Solicitado", "Confirmado", "Entregado"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — ARTE
// ===========================================================================
const arteLocalizacionesArte: Herramienta = {
  id: "arte-localizaciones-arte",
  nombre: "Intervención de arte en localizaciones",
  tipo: "tabla",
  hint: "Qué cambios de arte necesita cada localización: presupuesto, estado actual y resultado final.",
  columnas: [
    { key: "decorado", label: "Decorado" },
    { key: "estilo_visual", label: "Estilo visual", tipo: "largo" },
    { key: "palette_colores", label: "Paleta de colores" },
    { key: "texturas_clave", label: "Texturas clave", tipo: "largo" },
    { key: "cambios_necesarios", label: "Cambios necesarios", tipo: "largo" },
    { key: "presupuesto", label: "Presupuesto", tipo: "money" as const },
    { key: "foto_estado_actual", label: "Foto estado actual", tipo: "archivo" as const },
    { key: "foto_resultado", label: "Foto resultado final", tipo: "archivo" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por intervenir", "En proceso", "Listo"] },
  ],
};

const arteReferenciasVisuales: Herramienta = {
  id: "arte-referencias-visuales",
  nombre: "Referencias visuales de arte y concepto",
  tipo: "galeria",
  hint: "Galería de referencias de arte organizadas por escena: estilo, texturas, paleta y elementos clave.",
  columnas: [
    { key: "escena", label: "Escena / Bloque" },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "aprobado", label: "Aprobado", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Descartado"] },
  ],
};

const arteArmamentoEspecial: Herramienta = {
  id: "arte-armamento-especial",
  nombre: "Armas y elementos especiales de atrezzo",
  tipo: "tabla",
  hint: "Control de armas y elementos especiales: licencias, empresa de suministro, fechas y coste.",
  columnas: [
    { key: "elemento", label: "Arma / Elemento especial" },
    { key: "tipo", label: "Tipo" },
    { key: "propietario", label: "Propietario" },
    { key: "licencia_necesaria", label: "Licencia necesaria", tipo: "estado", opciones: ["Sí", "No"] },
    { key: "empresa_suministro", label: "Empresa de suministro" },
    { key: "coste", label: "Coste", tipo: "money" as const },
    { key: "fecha_recogida", label: "Fecha recogida", tipo: "fecha" as const },
    { key: "fecha_devolucion", label: "Fecha devolución", tipo: "fecha" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Confirmado", "Entregado"] },
  ],
};

const arteAmbientacionExt: Herramienta = {
  id: "arte-ambientacion-ext",
  nombre: "Ambientación de exteriores",
  tipo: "tabla",
  hint: "Plan de ambientación para localizaciones exteriores: elementos, flora, vehículos, fachadas y presupuesto.",
  columnas: [
    { key: "localizacion", label: "Localización" },
    { key: "elementos_ambiente", label: "Elementos de ambiente", tipo: "largo" },
    { key: "flora_necesaria", label: "Flora necesaria", tipo: "largo" },
    { key: "vehiculos_epoca", label: "Vehículos / época", tipo: "largo" },
    { key: "cambios_fachada", label: "Cambios de fachada", tipo: "largo" },
    { key: "presupuesto", label: "Presupuesto", tipo: "money" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En proceso", "Listo"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — VESTUARIO
// ===========================================================================
const vestDesgloseEscenas: Herramienta = {
  id: "vest-desglose-escenas",
  nombre: "Desglose de vestuario por escena",
  tipo: "tabla",
  hint: "Qué lleva cada personaje en cada escena: look completo, tipo de cambio y aprobación de dirección.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "personaje", label: "Personaje" },
    { key: "look_numero", label: "Look Nº" },
    { key: "descripcion_completa", label: "Descripción completa", tipo: "largo" },
    { key: "referencia_foto", label: "Foto referencia", tipo: "archivo" as const },
    { key: "cambio_desde", label: "Tipo de cambio", tipo: "estado", opciones: ["Continuidad", "Cambio parcial", "Cambio completo"] },
    { key: "aprobado_dir", label: "Aprobado por dirección", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Cambiar"] },
  ],
};

const vestPresupuestoVestuario: Herramienta = {
  id: "vest-presupuesto-vestuario",
  nombre: "Presupuesto de vestuario",
  tipo: "tabla",
  hint: "Desglose de costes de vestuario por categoría: compras, alquileres, confecciones y devoluciones.",
  columnas: [
    { key: "categoria", label: "Categoría" },
    { key: "descripcion", label: "Descripción" },
    { key: "unidades", label: "Unidades", tipo: "num" as const },
    { key: "coste_unitario", label: "Coste unitario", tipo: "money" as const },
    { key: "total", label: "Total", tipo: "money" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Comprado", "Alquilado", "Devuelto"] },
  ],
};

const vestCalendarioPruebas: Herramienta = {
  id: "vest-calendario-pruebas",
  nombre: "Calendario de pruebas de vestuario",
  tipo: "tabla",
  hint: "Agenda de pruebas con actores: qué looks se prueban, resultado y foto de cada sesión.",
  columnas: [
    { key: "actor", label: "Actor/Actriz" },
    { key: "personaje", label: "Personaje" },
    { key: "fecha_prueba", label: "Fecha prueba", tipo: "fecha" as const },
    { key: "hora", label: "Hora" },
    { key: "looks_a_probar", label: "Looks a probar", tipo: "largo" },
    { key: "resultado", label: "Resultado", tipo: "estado", opciones: ["Aprobado", "Ajustes", "Repetir"] },
    { key: "notas", label: "Notas", tipo: "largo" },
    { key: "foto", label: "Foto", tipo: "archivo" as const },
  ],
};

const vestMantenimiento: Herramienta = {
  id: "vest-mantenimiento",
  nombre: "Mantenimiento y reparación de vestuario",
  tipo: "tabla",
  hint: "Registro de incidencias con prendas: roturas, manchas, pérdidas y coste de reparación.",
  columnas: [
    { key: "prenda", label: "Prenda" },
    { key: "incidencia", label: "Incidencia", tipo: "estado", opciones: ["Rotura", "Mancha", "Desgaste", "Pérdida"] },
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "solucion", label: "Solución aplicada", tipo: "largo" },
    { key: "coste_reparacion", label: "Coste reparación", tipo: "money" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En reparación", "Resuelto"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — MAQUILLAJE Y PELUQUERÍA
// ===========================================================================
const maqDesgloseEscenas: Herramienta = {
  id: "maq-desglose-escenas",
  nombre: "Desglose de maquillaje por escena",
  tipo: "tabla",
  hint: "Qué maquillaje necesita cada personaje en cada escena: tiempo de preparación, efectos y material.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "personaje", label: "Personaje" },
    { key: "descripcion_look", label: "Descripción del look", tipo: "largo" },
    { key: "tiempo_preparacion", label: "Tiempo preparación (min)", tipo: "num" as const },
    { key: "efectos_especiales", label: "Efectos especiales", tipo: "estado", opciones: ["Sin efectos", "Heridas", "Edad", "Prótesis", "FX"] },
    { key: "material_necesario", label: "Material necesario", tipo: "largo" },
    { key: "foto_resultado", label: "Foto resultado", tipo: "archivo" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "OK", "Revisar"] },
  ],
};

const maqInventarioProductos: Herramienta = {
  id: "maq-inventario-productos",
  nombre: "Inventario de productos de maquillaje",
  tipo: "tabla",
  hint: "Control de stock de productos: cantidad inicial, actual, estado de reposición y precio.",
  columnas: [
    { key: "producto", label: "Producto" },
    { key: "marca", label: "Marca" },
    { key: "referencia", label: "Referencia" },
    { key: "uso", label: "Uso" },
    { key: "cantidad_inicio", label: "Cantidad inicio", tipo: "num" as const },
    { key: "cantidad_actual", label: "Cantidad actual", tipo: "num" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["OK", "Por reponer", "Agotado"] },
    { key: "precio", label: "Precio", tipo: "money" as const },
    { key: "proveedor", label: "Proveedor" },
  ],
};

const maqEfectosEspeciales: Herramienta = {
  id: "maq-efectos-especiales-maq",
  nombre: "Efectos especiales de maquillaje (SFX)",
  tipo: "tabla",
  hint: "Planificación de efectos especiales de maquillaje: proceso, materiales, tiempo y coste por escena.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "tipo_efecto", label: "Tipo de efecto" },
    { key: "descripcion_tecnica", label: "Descripción técnica", tipo: "largo" },
    { key: "tiempo_aplicacion", label: "Tiempo aplicación (min)", tipo: "num" as const },
    { key: "materiales", label: "Materiales", tipo: "largo" },
    { key: "foto_proceso", label: "Foto proceso", tipo: "archivo" as const },
    { key: "foto_resultado", label: "Foto resultado", tipo: "archivo" as const },
    { key: "proveedor_externo", label: "Proveedor externo" },
    { key: "coste", label: "Coste", tipo: "money" as const },
  ],
};

const maqCalendarioPreparacion: Herramienta = {
  id: "maq-calendario-preparacion",
  nombre: "Calendario de preparación de maquillaje",
  tipo: "tabla",
  hint: "Agenda diaria de maquillaje: quién entra a qué hora, cuánto tarda y notas del día.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "actor", label: "Actor/Actriz" },
    { key: "hora_inicio", label: "Hora inicio" },
    { key: "look_del_dia", label: "Look del día" },
    { key: "tiempo_previsto", label: "Tiempo previsto (min)", tipo: "num" as const },
    { key: "tiempo_real", label: "Tiempo real (min)", tipo: "num" as const },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — CASTING
// ===========================================================================
const castBreakdownActores: Herramienta = {
  id: "cast-breakdown-actores",
  nombre: "Breakdown de actores por personaje",
  tipo: "tabla",
  hint: "Perfil buscado para cada personaje: género, edad, tipo físico, habilidades y estado del casting.",
  columnas: [
    { key: "personaje", label: "Personaje" },
    { key: "genero", label: "Género", tipo: "estado", opciones: ["H", "M", "No binario", "Indistinto"] },
    { key: "edad_min", label: "Edad mín.", tipo: "num" as const },
    { key: "edad_max", label: "Edad máx.", tipo: "num" as const },
    { key: "tipo_fisico", label: "Tipo físico", tipo: "largo" },
    { key: "habilidades_especiales", label: "Habilidades especiales", tipo: "largo" },
    { key: "disponibilidad_requerida", label: "Disponibilidad requerida", tipo: "largo" },
    { key: "importancia", label: "Importancia", tipo: "estado", opciones: ["Principal", "Secundario", "Cameo", "Figuración especial"] },
    { key: "estado_casting", label: "Estado casting", tipo: "estado", opciones: ["Abierto", "En proceso", "Cerrado"] },
  ],
};

const castSesionesPrueba: Herramienta = {
  id: "cast-sesiones-prueba",
  nombre: "Sesiones de prueba de casting",
  tipo: "tabla",
  hint: "Log de pruebas realizadas: tipo de sesión, escenas leídas, resultado y notas del director y del casting.",
  columnas: [
    { key: "actor", label: "Actor/Actriz" },
    { key: "fecha_sesion", label: "Fecha sesión", tipo: "fecha" as const },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Autocarataje", "Presencial", "Video-llamada"] },
    { key: "escenas_leidas", label: "Escenas leídas", tipo: "largo" },
    { key: "resultado", label: "Resultado", tipo: "estado", opciones: ["Pendiente", "Avanza", "En lista corta", "Elegido", "Descartado"] },
    { key: "notas_director", label: "Notas director", tipo: "largo" },
    { key: "notas_casting", label: "Notas casting", tipo: "largo" },
  ],
};

const castTablaDisponibilidad: Herramienta = {
  id: "cast-tabla-disponibilidad",
  nombre: "Tabla de disponibilidad de actores",
  tipo: "tabla",
  hint: "Disponibilidad de actores semana a semana con restricciones y contacto del representante.",
  columnas: [
    { key: "actor", label: "Actor/Actriz" },
    { key: "personaje", label: "Personaje" },
    { key: "sem1", label: "Semana 1", tipo: "estado", opciones: ["Disponible", "No disponible", "Con restricción"] },
    { key: "sem2", label: "Semana 2", tipo: "estado", opciones: ["Disponible", "No disponible", "Con restricción"] },
    { key: "sem3", label: "Semana 3", tipo: "estado", opciones: ["Disponible", "No disponible", "Con restricción"] },
    { key: "sem4", label: "Semana 4", tipo: "estado", opciones: ["Disponible", "No disponible", "Con restricción"] },
    { key: "restricciones", label: "Restricciones", tipo: "largo" },
    { key: "contacto_representante", label: "Contacto representante" },
  ],
};

const castFichaAgencia: Herramienta = {
  id: "cast-ficha-agencia",
  nombre: "Directorio de agencias de representación",
  tipo: "tabla",
  hint: "Directorio de agencias con actores, comisión y contacto principal.",
  columnas: [
    { key: "agencia", label: "Agencia" },
    { key: "pais", label: "País" },
    { key: "contacto_principal", label: "Contacto principal" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "actores_con_ellos", label: "Actores que representan", tipo: "largo" },
    { key: "comision_pct", label: "Comisión (%)", tipo: "num" as const },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — SONIDO
// ===========================================================================
const sonMapaMicrosEscena: Herramienta = {
  id: "son-mapa-micros-escena",
  nombre: "Mapa de micrófonos por escena",
  tipo: "tabla",
  hint: "Asignación detallada de micrófonos por personaje y escena: frecuencia, canal y nivel de grabación.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "personaje", label: "Personaje" },
    { key: "tipo_micro", label: "Tipo de micrófono", tipo: "estado", opciones: ["Inalámbrico", "Boom", "Cañón", "Toma directa"] },
    { key: "frecuencia", label: "Frecuencia" },
    { key: "canal_grabacion", label: "Canal de grabación", tipo: "num" as const },
    { key: "nivel_grabacion", label: "Nivel de grabación (dB)", tipo: "num" as const },
    { key: "notas_especiales", label: "Notas especiales", tipo: "largo" },
  ],
};

const sonPlanADR: Herramienta = {
  id: "son-plan-adr",
  nombre: "Plan de sesiones ADR",
  tipo: "tabla",
  hint: "Planificación de postsincronización: escena, actor, motivo del ADR, estudio y estado.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "dialogo_original", label: "Diálogo original", tipo: "largo" },
    { key: "actor", label: "Actor/Actriz" },
    { key: "motivo", label: "Motivo", tipo: "estado", opciones: ["Ruido", "Interpretación", "Guión", "Acento"] },
    { key: "fecha_sesion_adr", label: "Fecha sesión ADR", tipo: "fecha" as const },
    { key: "estudio", label: "Estudio" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Grabado", "Aprobado", "Descartado"] },
  ],
};

const sonPlaylistMusicaTemp: Herramienta = {
  id: "son-playlist-musica-temp",
  nombre: "Playlist de música temporal",
  tipo: "tabla",
  hint: "Música temp usada en montaje: artista, sello, uso y disponibilidad de derechos para referencia del compositor.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "cancion", label: "Canción" },
    { key: "artista", label: "Artista" },
    { key: "sello_discografico", label: "Sello discográfico" },
    { key: "duracion", label: "Duración" },
    { key: "uso", label: "Uso", tipo: "estado", opciones: ["Ambiente", "Score temp", "Referencia"] },
    { key: "derechos_disponibles", label: "Derechos disponibles", tipo: "estado", opciones: ["Sí", "No", "Por gestionar"] },
    { key: "link", label: "Link", tipo: "link" as const },
  ],
};

const sonEntregaPost: Herramienta = {
  id: "son-entrega-post",
  nombre: "Entrega de sonido para postproducción",
  tipo: "tabla",
  hint: "Stems y archivos finales de sonido: formato técnico, archivo y estado de entrega.",
  columnas: [
    { key: "stem", label: "Stem" },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "formato", label: "Formato" },
    { key: "sample_rate", label: "Sample rate (Hz)", tipo: "num" as const },
    { key: "bit_depth", label: "Bit depth", tipo: "num" as const },
    { key: "archivo_final", label: "Archivo final", tipo: "archivo" as const },
    { key: "fecha_entrega", label: "Fecha entrega", tipo: "fecha" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En mezcla", "Entregado", "Aprobado"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — POSTPRODUCCIÓN
// ===========================================================================
const postNotasCorteEscena: Herramienta = {
  id: "post-notas-corte-escena",
  nombre: "Notas de corte por escena",
  tipo: "tabla",
  hint: "Observaciones de montaje escena por escena: número de cortes, duración y decisión final.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "num_cortes", label: "Nº cortes", tipo: "num" as const },
    { key: "duracion_escena", label: "Duración escena" },
    { key: "observaciones_montaje", label: "Observaciones de montaje", tipo: "largo" },
    { key: "musica_temp", label: "Música temp", tipo: "link" as const },
    { key: "decision_final", label: "Decisión final", tipo: "estado", opciones: ["Queda", "Reducir", "Ampliar", "Cortar"] },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};

const postVFXTracking: Herramienta = {
  id: "post-vfx-tracking",
  nombre: "VFX tracking (shots)",
  tipo: "tabla",
  hint: "Seguimiento completo de cada shot VFX: empresa, complejidad, precio, entrega y estado de aprobación.",
  columnas: [
    { key: "shot_id", label: "Shot ID" },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "tipo_vfx", label: "Tipo VFX", tipo: "estado", opciones: ["Compositing", "CGI", "Rotoscopia", "Paint", "Tracking", "Otro"] },
    { key: "empresa_vfx", label: "Empresa VFX" },
    { key: "complejidad", label: "Complejidad", tipo: "estado", opciones: ["Baja", "Media", "Alta", "Muy alta"] },
    { key: "precio", label: "Precio", tipo: "money" as const },
    { key: "fecha_entrega", label: "Fecha entrega", tipo: "fecha" as const },
    { key: "link_revision", label: "Link revisión", tipo: "link" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En proceso", "En revisión", "Aprobado", "Entregado"] },
  ],
};

const postDCPDeliverables: Herramienta = {
  id: "post-dcp-deliverables",
  nombre: "DCP y deliverables técnicos",
  tipo: "tabla",
  hint: "Control de versiones DCP y masters técnicos: resolución, ratio, audio, idioma y estado de QC.",
  columnas: [
    { key: "version", label: "Versión" },
    { key: "resolucion", label: "Resolución", tipo: "estado", opciones: ["2K", "4K", "HD", "SDR", "HDR"] },
    { key: "ratio", label: "Ratio", tipo: "estado", opciones: ["1.85", "2.39", "1.33", "1.78"] },
    { key: "audio_config", label: "Audio", tipo: "estado", opciones: ["5.1", "7.1", "Stereo", "Atmos"] },
    { key: "idioma", label: "Idioma" },
    { key: "subtitulos", label: "Subtítulos" },
    { key: "encriptacion", label: "Encriptación", tipo: "estado", opciones: ["Sí", "No"] },
    { key: "archivo_dcp", label: "Archivo DCP", tipo: "archivo" as const },
    { key: "fecha_creacion", label: "Fecha creación", tipo: "fecha" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En proceso", "QC", "Aprobado", "Enviado"] },
  ],
};

const postQCChecklist: Herramienta = {
  id: "post-qc-checklist",
  nombre: "Checklist de control de calidad técnico (QC)",
  tipo: "checklist",
  hint: "Verificación técnica de imagen, sonido, subtítulos y metadatos antes de cada entrega.",
};

const postLicenciasMusica: Herramienta = {
  id: "post-licencias-musica",
  nombre: "Licencias de música",
  tipo: "tabla",
  hint: "Control de clearances musicales: sincronización, master, fee, territorio y archivo de licencia.",
  columnas: [
    { key: "tema", label: "Tema" },
    { key: "compositor", label: "Compositor" },
    { key: "editorial", label: "Editorial" },
    { key: "tipo_uso", label: "Tipo de uso", tipo: "estado", opciones: ["Sincronización", "Master", "Adaptación"] },
    { key: "fee", label: "Fee", tipo: "money" as const },
    { key: "territorio", label: "Territorio" },
    { key: "duracion", label: "Duración" },
    { key: "archivo_licencia", label: "Archivo licencia", tipo: "archivo" as const },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["En negociación", "Aprobado", "Pagado", "Rechazado"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — MAKING OF / BTS / COMUNICACIÓN
// ===========================================================================
const btsInventarioMaterial: Herramienta = {
  id: "bts-inventario-material",
  nombre: "Inventario de material BTS",
  tipo: "tabla",
  hint: "Registro de todo el material BTS captado: tipo, escena relacionada y aprobación para publicación.",
  columnas: [
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Video", "Foto", "Audio"] },
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "escena_relacionada", label: "Escena relacionada" },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "archivo_master", label: "Archivo master", tipo: "archivo" as const },
    { key: "aprobado_publicacion", label: "Aprobado para publicación", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Rechazado"] },
    { key: "fecha_publicacion", label: "Fecha publicación", tipo: "fecha" as const },
  ],
};

const btsPlanContenido: Herramienta = {
  id: "bts-plan-contenido",
  nombre: "Plan de contenido de redes (BTS)",
  tipo: "tabla",
  hint: "Planificación semanal de contenido para redes: plataforma, tipo, recursos necesarios y responsable.",
  columnas: [
    { key: "semana", label: "Semana" },
    { key: "plataforma", label: "Plataforma", tipo: "estado", opciones: ["Instagram", "TikTok", "YouTube", "Newsletter"] },
    { key: "tipo_contenido", label: "Tipo de contenido", tipo: "estado", opciones: ["Reels", "Story", "Post foto", "Video largo", "Live"] },
    { key: "descripcion", label: "Descripción", tipo: "largo" },
    { key: "recurso_necesario", label: "Recurso necesario", tipo: "largo" },
    { key: "responsable", label: "Responsable" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "En producción", "Publicado"] },
  ],
};

const btsContactosPrensa: Herramienta = {
  id: "bts-contactos-prensa",
  nombre: "Directorio de prensa y acreditaciones",
  tipo: "tabla",
  hint: "Contactos de medios: tipo de cobertura, estado de acreditación y notas de relación.",
  columnas: [
    { key: "medio", label: "Medio" },
    { key: "periodista", label: "Periodista" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "tipo_cobertura", label: "Tipo de cobertura", tipo: "estado", opciones: ["Entrevista", "Set visit", "Trailer", "Estreno"] },
    { key: "estado_acreditacion", label: "Estado acreditación", tipo: "estado", opciones: ["Pendiente", "Acreditado", "Asistió"] },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};

const btsKitPrensa: Herramienta = {
  id: "bts-kit-prensa",
  nombre: "Kit de prensa oficial",
  tipo: "nota",
  hint: "Guía y materiales del kit de prensa: synopsis, ficha técnica, fotos autorizadas, contacto y derechos de uso.",
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — REPARTO
// ===========================================================================
const repNotasEscenasDetalle: Herramienta = {
  id: "rep-notas-escenas-detalle",
  nombre: "Notas de escenas detalladas (reparto)",
  tipo: "tabla",
  hint: "Análisis profundo de cada escena para el actor: emociones, relaciones, objetivo y beats clave.",
  columnas: [
    { key: "escena", label: "Escena" },
    { key: "paginas_guion", label: "Páginas de guión" },
    { key: "emociones_personaje", label: "Emociones del personaje", tipo: "largo" },
    { key: "relacion_con", label: "Relación con", tipo: "largo" },
    { key: "objetivo_escena", label: "Objetivo en la escena", tipo: "largo" },
    { key: "obstaculos", label: "Obstáculos", tipo: "largo" },
    { key: "beats_clave", label: "Beats clave", tipo: "largo" },
    { key: "notas_del_director", label: "Notas del director", tipo: "largo" },
  ],
};

const repResearchPersonaje: Herramienta = {
  id: "rep-research-personaje",
  nombre: "Research del personaje",
  tipo: "nota",
  hint: "Investigación de contexto histórico, social y psicológico para preparar el rol en profundidad.",
};

const repPronunciacion: Herramienta = {
  id: "rep-pronunciacion",
  nombre: "Guía de pronunciación",
  tipo: "tabla",
  hint: "Referencia fonética para palabras o frases del guión en idiomas o acentos específicos.",
  columnas: [
    { key: "palabra_frase", label: "Palabra / Frase" },
    { key: "pronunciacion_fonotica", label: "Pronunciación fonética" },
    { key: "idioma", label: "Idioma / Acento", tipo: "estado", opciones: ["Español", "Inglés", "Francés", "Otro", "Acento especial"] },
    { key: "grabacion", label: "Grabación de referencia", tipo: "archivo" as const },
    { key: "aprobado", label: "Aprobado", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Revisar"] },
  ],
};

// ===========================================================================
// NUEVAS HERRAMIENTAS — MAKING OF (BTS CREW)
// ===========================================================================
const moPlanRodajeBTS: Herramienta = {
  id: "mo-plan-rodaje-bts",
  nombre: "Plan de rodaje BTS por jornada",
  tipo: "tabla",
  hint: "Planificación del equipo BTS para cada jornada: escenas a cubrir, equipo y objetivo de contenido.",
  columnas: [
    { key: "jornada", label: "Jornada", tipo: "fecha" as const },
    { key: "escenas_previstas", label: "Escenas previstas", tipo: "largo" },
    { key: "crew_bts", label: "Crew BTS" },
    { key: "equipo_bts", label: "Equipo BTS", tipo: "largo" },
    { key: "objetivo_contenido", label: "Objetivo de contenido", tipo: "largo" },
    { key: "resultado_horas", label: "Horas grabadas", tipo: "num" as const },
    { key: "material_aprobado", label: "Material aprobado", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Rechazado"] },
  ],
};

const moEntrevistas: Herramienta = {
  id: "mo-entrevistas",
  nombre: "Entrevistas del making of",
  tipo: "tabla",
  hint: "Log de entrevistas grabadas para el making of: temas, duración, fragmentos usables y estado.",
  columnas: [
    { key: "entrevistado", label: "Entrevistado" },
    { key: "cargo", label: "Cargo" },
    { key: "fecha", label: "Fecha", tipo: "fecha" as const },
    { key: "temas_tratados", label: "Temas tratados", tipo: "largo" },
    { key: "duracion_min", label: "Duración (min)", tipo: "num" as const },
    { key: "archivo_video", label: "Archivo de vídeo", tipo: "archivo" as const },
    { key: "fragmentos_usables", label: "Fragmentos usables", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Grabada", "Montada", "Publicada"] },
  ],
};

// ===========================================================================
// MAPA: departamento → cargo → { departamento[], cargo[] }
// ===========================================================================
export const HERRAMIENTAS: Record<string, Record<string, CargoTools>> = {
  Ejecutivo: {
    "Producción ejecutiva": {
      departamento: [presupuestoGeneral, presupuestoDepto, planFinanciacion],
      cargo: [
        { id: "ej-memoria", nombre: "Memoria ejecutiva del proyecto", tipo: "nota", hint: "Estado general y decisiones clave." },
        ejCashflow,
        ejCoproducciones,
        ejAyudasSubvenciones,
        ejAgendaEjecutivo,
        ejCronogramaProduccion,
        ejDeliverables,
        ejNotasEjecutivo,
        ejKpis,
        ACCESOS,
      ],
    },
    "Dirección financiera": {
      departamento: [presupuestoGeneral, presupuestoDepto, controlCostos, flujoCaja],
      cargo: [
        {
          id: "ej-modelo-financiero", nombre: "Modelo financiero y proyección", tipo: "tabla",
          columnas: [
            { key: "escenario", label: "Escenario", tipo: "estado", opciones: ["Optimista", "Base", "Conservador"] },
            { key: "hipotesis", label: "Hipótesis", tipo: "largo" },
            { key: "ingreso", label: "Ingreso proyectado", tipo: "money" },
            { key: "coste", label: "Coste proyectado", tipo: "money" },
            { key: "margen", label: "Margen", tipo: "money" },
          ],
        },
      ],
    },
    "Tesorería": {
      departamento: [controlCostos, flujoCaja, facturas],
      cargo: [
        {
          id: "ej-pagos-nominas", nombre: "Pagos, nóminas, caja chica y rendiciones", tipo: "tabla",
          columnas: [
            { key: "beneficiario", label: "Beneficiario" },
            { key: "concepto", label: "Concepto", tipo: "estado", opciones: ["Nómina", "Pago proveedor", "Caja chica", "Rendición", "Anticipo"] },
            { key: "importe", label: "Importe", tipo: "money" },
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Pagado", "Rendido"] },
            { key: "nomina_sin_firmar", label: "Nómina sin firmar", tipo: "archivo" },
            { key: "nomina_firmada", label: "Nómina firmada", tipo: "archivo" },
          ],
        },
      ],
    },
    "Administración": {
      departamento: [facturas, contratos],
      cargo: [
        { id: "ej-gestion-documental", nombre: "Gestión documental administrativa", tipo: "checklist", hint: "Archivo y digitalización." },
      ],
    },
    "Legal": {
      departamento: [contratos],
      cargo: [
        {
          id: "ej-derechos-pi", nombre: "Tabla de derechos y propiedad intelectual", tipo: "tabla",
          hint: "Mapa completo de cesiones: quién posee qué, hasta cuándo y con qué condiciones.",
          columnas: [
            { key: "elemento", label: "Elemento / Obra" },
            { key: "titular", label: "Titular de derechos" },
            { key: "licenciado_a", label: "Licenciado a" },
            { key: "tipo", label: "Tipo de derecho", tipo: "estado", opciones: ["Guion", "Música", "Imagen", "Marca", "Software", "Archivo histórico", "Otro"] },
            { key: "territorio", label: "Territorio" },
            { key: "fecha_registro", label: "Fecha de registro", tipo: "fecha" as const },
            { key: "vigencia", label: "Vigencia hasta", tipo: "fecha" },
            { key: "caducidad", label: "Caducidad", tipo: "fecha" as const },
            { key: "exclusividad", label: "Exclusividad", tipo: "estado", opciones: ["Exclusiva", "No exclusiva", "Primera ventana"] },
            { key: "royalties_pct", label: "Royalties (%)", tipo: "num" as const },
            { key: "archivo_certificado", label: "Certificado / Documento", tipo: "archivo" as const },
            { key: "estado", label: "Estado cesión", tipo: "estado", opciones: ["Pendiente", "Negociando", "Firmado", "Vencido"] },
            { key: "doc", label: "Documento", tipo: "archivo" as const },
          ],
        },
        {
          id: "ej-cesion-nda", nombre: "Cesión de derechos y NDA", tipo: "tabla",
          columnas: [
            { key: "doc", label: "Documento" },
            { key: "contraparte", label: "Contraparte" },
            { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Cesión de derechos", "NDA"] },
            { key: "vigencia", label: "Vigencia" },
            { key: "estado", label: "Firma", tipo: "estado", opciones: ["Pendiente", "Enviado", "Firmado"] },
          ],
        },
      ],
    },
    "Financiación y Seguros": {
      departamento: [planFinanciacion],
      cargo: [
        {
          id: "ej-polizas-permisos", nombre: "Pólizas de seguro y permisos de rodaje", tipo: "tabla",
          columnas: [
            { key: "item", label: "Póliza / Permiso" },
            { key: "entidad", label: "Aseguradora / Organismo" },
            { key: "cobertura", label: "Cobertura / Alcance", tipo: "largo" },
            { key: "desde", label: "Vigencia desde", tipo: "fecha" },
            { key: "hasta", label: "Vigencia hasta", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Gestionando", "Vigente", "Vencido"] },
          ],
        },
      ],
    },
  },

  Dirección: {
    "Dirección": {
      departamento: [calendarioEnsayos],
      cargo: [
        { id: "dir-notas-escena", nombre: "Notas de dirección por escena", tipo: "nota" },
        { id: "dir-decisiones-visionado", nombre: "Decisiones de visionado (dailies)", tipo: "checklist" },
        ACCESOS,
      ],
    },
    "1er asistente de dirección": {
      departamento: [calendarioEnsayos],
      cargo: [
        dirBreakdownTecnico,
        dirContinuidadDiaria,
        { id: "dir-control-horarios-1ad", nombre: "Control de horarios y avisos al equipo (1AD)", tipo: "checklist", hint: "Checklist de control de tiempos del día: wrap de cada setup, alertas de overtime, notificaciones al equipo." },
      ],
    },
    "Asistencia de dirección": {
      departamento: [calendarioEnsayos],
      cargo: [
        { id: "dir-control-horarios", nombre: "Control de horarios y avisos al equipo", tipo: "checklist" },
      ],
    },
    "2ª Asistencia de dirección": {
      departamento: [calendarioEnsayos],
      cargo: [
        dirPlanExtras,
        dirControlLlamadas,
        {
          id: "dir-figuracion-escena", nombre: "Listado de figuración/extras por escena", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena" },
            { key: "tipo", label: "Tipo de extra" },
            { key: "cantidad", label: "Cantidad", tipo: "num" },
            { key: "indicaciones", label: "Indicaciones", tipo: "largo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por cubrir", "Confirmado"] },
          ],
        },
      ],
    },
    "Script": {
      departamento: [partesScript],
      cargo: [
        {
          id: "dir-continuidad-foto", nombre: "Continuidad fotográfica", tipo: "galeria", hint: "Galería + notas de raccord.",
          columnas: [
            { key: "escena", label: "Escena / Toma" },
            { key: "raccord", label: "Notas de raccord", tipo: "largo" },
          ],
        },
        dirScriptLog,
        dirCambiosGuion,
        dirFotosContinuidad,
        dirChecklistPreproduccion,
      ],
    },
    "Dirección de actores": {
      departamento: [calendarioEnsayos],
      cargo: [
        { id: "dir-notas-ensayo", nombre: "Notas de ensayo por actor/personaje", tipo: "nota" },
      ],
    },
    "Secretaría de rodaje": {
      departamento: [],
      cargo: [
        { id: "dir-actas", nombre: "Actas de reuniones y archivo administrativo", tipo: "nota" },
      ],
    },
  },

  Producción: {
    "Dirección de producción": {
      departamento: [stripboard],
      cargo: [
        {
          id: "prod-presup-operativo", nombre: "Presupuesto operativo de producción", tipo: "tabla",
          columnas: [
            { key: "partida", label: "Partida operativa" },
            { key: "presup", label: "Presupuestado", tipo: "money" },
            { key: "real", label: "Real", tipo: "money" },
            { key: "responsable", label: "Responsable" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["En presupuesto", "En riesgo", "Sobrepasado"] },
          ],
        },
        ACCESOS,
      ],
    },
    "Jefatura de producción": {
      departamento: [stripboard, cateringDietas],
      cargo: [
        {
          id: "prod-proveedores", nombre: "Control de proveedores y alquileres", tipo: "tabla",
          columnas: [
            { key: "proveedor", label: "Proveedor" },
            { key: "servicio", label: "Servicio / Material" },
            { key: "coste", label: "Coste", tipo: "money" },
            { key: "periodo", label: "Periodo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Cotizando", "Reservado", "Confirmado", "Devuelto"] },
          ],
        },
        {
          id: "prod-parte-diario", nombre: "Parte de producción diario", tipo: "ficha",
          hint: "El documento maestro del día: resume todo lo que pasó en el set.",
          campos: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "dia", label: "Día de rodaje" },
            { key: "locacion", label: "Localización" },
            { key: "hora_inicio", label: "Hora de inicio" },
            { key: "hora_fin", label: "Hora de fin" },
            { key: "horas_extra", label: "Horas extra", tipo: "num" },
            { key: "escenas_rodadas", label: "Escenas rodadas" },
            { key: "paginas_rodadas", label: "Páginas rodadas" },
            { key: "paginas_pendientes", label: "Páginas pendientes" },
            { key: "extras", label: "Nº de figurantes", tipo: "num" },
            { key: "accidentes", label: "Accidentes / incidencias", tipo: "largo" },
            { key: "retrasos", label: "Motivos de retraso", tipo: "largo" },
            { key: "notas", label: "Notas para producción", tipo: "largo" },
            { key: "firma_dir", label: "Firma dirección" },
            { key: "firma_prod", label: "Firma producción" },
          ],
        },
        {
          id: "prod-transporte", nombre: "Control de transporte y vehículos por jornada", tipo: "tabla",
          hint: "Qué vehículo sale a qué hora, con quién y a dónde.",
          columnas: [
            { key: "vehiculo", label: "Vehículo / Matrícula" },
            { key: "conductor", label: "Conductor" },
            { key: "pasajeros", label: "Pasajeros" },
            { key: "origen", label: "Desde" },
            { key: "destino", label: "Hasta" },
            { key: "hora_salida", label: "Hora de salida" },
            { key: "hora_llegada", label: "Hora estimada llegada" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Programado", "En ruta", "Llegó", "Cancelado"] },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
        {
          id: "prod-catering", nombre: "Control de catering y dietas por jornada", tipo: "tabla",
          hint: "Cantidad, especiales y coste de comidas. Nunca llegues al set sin saberlo.",
          columnas: [
            { key: "jornada", label: "Jornada / Fecha" },
            { key: "proveedor", label: "Proveedor" },
            { key: "cantidad", label: "Comensales", tipo: "num" },
            { key: "especiales", label: "Restricciones dietéticas", tipo: "largo" },
            { key: "menu", label: "Menú", tipo: "largo" },
            { key: "hora_servicio", label: "Hora de servicio" },
            { key: "coste", label: "Coste total", tipo: "money" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Por confirmar", "Confirmado", "Servido", "Cancelado"] },
          ],
        },
        prodProveedoresDetalle,
        prodEquipoTecnico,
        prodLocalizacionesScouting,
        prodPermisos,
        prodPlanSemana,
        prodComunicacionEquipo,
        prodChecklistCierreRodaje,
        {
          id: "prod-checklist-jornada", nombre: "Checklist de preparación de jornada", tipo: "checklist",
          hint: "Antes de cada día de rodaje: locación, permisos, equipos, catering, transporte, plan B.",
        },
        {
          id: "prod-material-prestado", nombre: "Control de material prestado o alquilado", tipo: "tabla",
          hint: "Qué está fuera, de quién es y cuándo tiene que volver.",
          columnas: [
            { key: "objeto", label: "Objeto / Equipo" },
            { key: "propietario", label: "Propietario / Proveedor" },
            { key: "responsable", label: "Responsable interno" },
            { key: "salida", label: "Fecha de salida", tipo: "fecha" },
            { key: "devolucion", label: "Fecha devolución", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["En uso", "En almacén", "Devuelto", "Con daños"] },
            { key: "coste_dia", label: "Coste/día", tipo: "money" },
            { key: "foto", label: "Foto estado", tipo: "archivo" as const },
          ],
        },
      ],
    },
    "Asistencia de producción": {
      departamento: [partesProduccion],
      cargo: [
        { id: "prod-tareas-admin", nombre: "Tareas administrativas diarias", tipo: "checklist" },
      ],
    },
    "Coordinación de producción": {
      departamento: [stripboard, partesProduccion],
      cargo: [
        {
          id: "prod-agenda-coord", nombre: "Agenda de coordinación entre departamentos", tipo: "tabla",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "tema", label: "Tema" },
            { key: "deptos", label: "Departamentos" },
            { key: "acuerdo", label: "Acuerdo / Pendiente", tipo: "largo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Abierto", "En curso", "Cerrado"] },
          ],
        },
      ],
    },
    "Jefatura de locaciones": {
      departamento: [],
      cargo: [
        {
          id: "prod-ficha-localizacion", nombre: "Fichas de localización y permisos", tipo: "ficha",
          campos: [
            { key: "nombre", label: "Localización" },
            { key: "direccion", label: "Dirección", tipo: "largo" },
            { key: "contacto", label: "Contacto propietario" },
            { key: "permiso", label: "Permiso", tipo: "estado", opciones: ["Pendiente", "Solicitado", "Concedido"] },
            { key: "coste", label: "Coste" },
            { key: "notas", label: "Notas (accesos, ruido, luz)", tipo: "largo" },
            { key: "permiso_doc", label: "Permiso (documento)", tipo: "archivo" },
            { key: "foto", label: "Foto de la localización", tipo: "archivo" },
          ],
        },
      ],
    },
    "Scouting": {
      departamento: [],
      cargo: [
        {
          id: "prod-banco-localizaciones", nombre: "Banco de localizaciones candidatas", tipo: "galeria",
          columnas: [
            { key: "lugar", label: "Lugar" },
            { key: "escena", label: "Escena posible" },
            { key: "distancia", label: "Distancia / Tiempo (km · min)" },
            { key: "acceso", label: "Acceso y parking", tipo: "largo" },
            { key: "pros", label: "Pros / Contras", tipo: "largo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Candidata", "Visitada", "Aprobada", "Descartada"] },
          ],
        },
        {
          id: "prod-plan-locaciones-jornada", nombre: "Plan de locaciones por jornada", tipo: "tabla",
          hint: "Qué locación se usa cada día de rodaje.",
          columnas: [
            { key: "dia", label: "Día", tipo: "num" },
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "locacion", label: "Localización" },
            { key: "direccion", label: "Dirección / GPS", tipo: "largo" },
            { key: "hora_llegada", label: "Hora llegada equipo" },
            { key: "hora_inicio", label: "Inicio de rodaje" },
            { key: "hora_fin", label: "Fin estimado" },
            { key: "escenas", label: "Escenas del día" },
            { key: "notas_logistica", label: "Notas logística", tipo: "largo" },
            { key: "permiso_doc", label: "Permiso del día", tipo: "archivo" as const },
          ],
        },
        {
          id: "prod-checklist-locacion", nombre: "Checklist de estado de localización", tipo: "checklist",
          hint: "Condiciones antes, durante y después del rodaje.",
        },
        {
          id: "prod-reporte-incidencias-loc", nombre: "Incidencias y daños en localizaciones", tipo: "tabla",
          hint: "Registro de incidencias, daños o reclamaciones.",
          columnas: [
            { key: "locacion", label: "Localización" },
            { key: "dia", label: "Día" },
            { key: "descripcion", label: "Descripción", tipo: "largo" },
            { key: "responsable", label: "Responsable" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Abierta", "Gestionada", "Cerrada"] },
            { key: "foto", label: "Foto / Evidencia", tipo: "archivo" as const },
          ],
        },
      ],
    },
    "Logística": {
      departamento: [cateringDietas],
      cargo: [
        {
          id: "prod-hojas-ruta", nombre: "Hojas de ruta y transporte", tipo: "tabla",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "origen", label: "Origen" },
            { key: "destino", label: "Destino" },
            { key: "vehiculo", label: "Vehículo" },
            { key: "pasajeros", label: "Pasajeros / Carga", tipo: "largo" },
            { key: "salida", label: "Hora salida" },
          ],
        },
      ],
    },
    "Driver": {
      departamento: [],
      cargo: [
        { id: "prod-checklist-vehiculos", nombre: "Checklist de vehículos, combustible y mantenimiento", tipo: "checklist" },
      ],
    },
  },

  Fotografía: {
    "Dirección de fotografía": {
      departamento: [lookbookFoto, paletaColor, planIluminacion, shotList],
      cargo: [
        { id: "foto-memoria", nombre: "Memoria de fotografía y decisiones técnicas", tipo: "nota", hint: "Look, formato, sensor." },
        { id: "foto-luts", nombre: "LUTs y pruebas de cámara", tipo: "galeria", columnas: [{ key: "prueba", label: "Prueba" }, { key: "nota", label: "Resultado", tipo: "largo" }] },
        fotoPlanCamara,
        fotoInventarioCamara,
        fotoLookBook,
        fotoGuionTecnico,
        ACCESOS,
      ],
    },
    "Operación de cámara": {
      departamento: [shotList, inventarioCamara],
      cargo: [
        fotoOrdenDiaCamara,
        {
          id: "foto-reporte-camara", nombre: "Reporte de cámara por toma", tipo: "tabla",
          hint: "Log de tomas del día. OK = buena; Print = imprimir para montaje. Incluye datos de codec, color space y notas DIT.",
          columnas: [
            { key: "escena", label: "Escena" },
            { key: "toma", label: "Toma", tipo: "num" },
            { key: "lente", label: "Lente" },
            { key: "diafragma", label: "T / f" },
            { key: "iso", label: "ISO / EI" },
            { key: "fps", label: "FPS" },
            { key: "encuadre", label: "Encuadre", tipo: "estado", opciones: ["PG", "PM", "PA", "PP", "PPP", "PE", "PD", "PG/D"] },
            { key: "movimiento", label: "Movimiento", tipo: "estado", opciones: ["Fija", "Zoom", "Pan", "Tilt", "Dolly", "Steadycam", "Grúa", "Handheld"] },
            { key: "ok", label: "Estado", tipo: "estado", opciones: ["OK", "NG", "Falsa", "Print", "Print+OK"] },
            { key: "formato_grabacion", label: "Formato de grabación" },
            { key: "codec", label: "Codec" },
            { key: "color_space", label: "Color space" },
            { key: "balance_blanco", label: "Balance de blanco" },
            { key: "nd_filter", label: "Filtro ND" },
            { key: "temperatura_color", label: "Temperatura de color (K)", tipo: "num" as const },
            { key: "ruido", label: "Ruido", tipo: "estado", opciones: ["Limpio", "Grain leve", "Grain intenso"] },
            { key: "observaciones_dit", label: "Observaciones DIT", tipo: "largo" },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
        {
          id: "foto-reporte-dia", nombre: "Resumen de jornada de cámara", tipo: "ficha",
          hint: "Resumen rápido del día: tarjetas, material rodado, incidencias técnicas.",
          campos: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "dia_rodaje", label: "Día de rodaje" },
            { key: "camara", label: "Cámara principal" },
            { key: "tarjetas", label: "Tarjetas usadas" },
            { key: "tb_rodados", label: "TB rodados" },
            { key: "escenas_rodadas", label: "Escenas rodadas" },
            { key: "fps", label: "FPS del día" },
            { key: "resolución", label: "Resolución" },
            { key: "incidencias", label: "Incidencias técnicas", tipo: "largo" },
            { key: "notas", label: "Notas para DIT / post", tipo: "largo" },
          ],
        },
      ],
    },
    "Foquista": {
      departamento: [shotList],
      cargo: [
        {
          id: "foto-marcas-foco", nombre: "Tabla de distancias y marcas de foco por toma", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena / Toma" },
            { key: "optica", label: "Óptica" },
            { key: "distA", label: "Marca A (m)", tipo: "num" },
            { key: "distB", label: "Marca B (m)", tipo: "num" },
            { key: "distC", label: "Marca C (m)", tipo: "num" },
            { key: "notas", label: "Notas de transición", tipo: "largo" },
          ],
        },
      ],
    },
    "Auxiliar de cámara": {
      departamento: [inventarioCamara],
      cargo: [
        { id: "foto-checklist-descarga", nombre: "Checklist de descarga, backup y etiquetado de tarjetas", tipo: "checklist" },
      ],
    },
    "Maquinista": {
      departamento: [shotList],
      cargo: [
        {
          id: "foto-movimientos", nombre: "Plan de movimientos de cámara por escena", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena" },
            { key: "equipo", label: "Equipo", tipo: "estado", opciones: ["Grúa", "Dolly", "Steadycam", "Cabezal", "Slider", "Travelling"] },
            { key: "movimiento", label: "Movimiento", tipo: "largo" },
            { key: "montaje", label: "Montaje / Riel" },
          ],
        },
      ],
    },
    "Eléctricos / Gaffer": {
      departamento: [planIluminacion, inventarioCamara],
      cargo: [
        luzPlanIluminacion,
        luzInventarioEquipo,
        luzGenerador,
        luzChecklistSeguridad,
        luzPeticionEquipo,
        {
          id: "foto-electrico", nombre: "Necesidades eléctricas y generador", tipo: "tabla",
          columnas: [
            { key: "set", label: "Set / Escena" },
            { key: "consumo", label: "Consumo estimado (kW)", tipo: "num" },
            { key: "fuente", label: "Fuente", tipo: "estado", opciones: ["Red", "Generador", "Batería"] },
            { key: "cableado", label: "Cableado / Distribución", tipo: "largo" },
            { key: "foto_planta", label: "Planta eléctrica (foto/PDF)", tipo: "archivo" as const },
          ],
        },
      ],
    },
    "DIT (Imagen Digital)": {
      departamento: [paletaColor],
      cargo: [
        { id: "foto-dit-backup", nombre: "Backup y verificación de material (checksum)", tipo: "checklist" },
        {
          id: "foto-dit-color", nombre: "Reporte de color y LUTs aplicados por escena", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena" },
            { key: "lut", label: "LUT aplicada" },
            { key: "ajustes", label: "Ajustes en set", tipo: "largo" },
            { key: "notas", label: "Notas para post", tipo: "largo" },
          ],
        },
        {
          id: "foto-dit-log-backup", nombre: "Log diario de backup confirmado", tipo: "tabla",
          hint: "Registro de cada disco: qué se copió, cuántas copias y hash de verificación.",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "disco_origen", label: "Tarjeta/Disco origen" },
            { key: "disco_backup1", label: "Backup 1 (ruta)" },
            { key: "disco_backup2", label: "Backup 2 (ruta)" },
            { key: "gb", label: "GB copiados", tipo: "num" as const },
            { key: "checksum", label: "Checksum OK", tipo: "estado", opciones: ["Pendiente", "Verificado", "Error"] },
            { key: "notas", label: "Notas" },
          ],
        },
        {
          id: "foto-dit-ficha-jornada", nombre: "Ficha técnica de jornada (DIT)", tipo: "ficha",
          hint: "Resumen del día: total GB, tarjetas, incidencias de cámara.",
          campos: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "total_gb", label: "Total GB copiados", tipo: "num" },
            { key: "tarjetas", label: "Tarjetas / discos origen" },
            { key: "copias_destino", label: "Destinos de backup (rutas)", tipo: "largo" },
            { key: "checksum_estado", label: "Verificación checksum", tipo: "estado", opciones: ["Pendiente", "Verificado", "Error"] },
            { key: "luts_aplicadas", label: "LUTs aplicadas hoy" },
            { key: "incidencias", label: "Incidencias de cámara", tipo: "largo" },
            { key: "notas_post", label: "Notas para postproducción", tipo: "largo" },
          ],
        },
      ],
    },
  },

  Arte: {
    "Dirección de arte": {
      departamento: [moodboardArte, paletaColor, planosDecorado],
      cargo: [
        { id: "arte-memoria", nombre: "Memoria de dirección de arte", tipo: "nota", hint: "Concepto visual global." },
        arteLocalizacionesArte,
        arteReferenciasVisuales,
        arteArmamentoEspecial,
        arteAmbientacionExt,
        ACCESOS,
      ],
    },
    "Ayudantía de dirección de arte": {
      departamento: [moodboardArte, planosDecorado, desgloseAtrezzo, desgloseVestuario],
      cargo: [
        { id: "arte-checklist-tareas", nombre: "Checklist de seguimiento por escena/decorado", tipo: "checklist" },
      ],
    },
    "Construcción de decorados": {
      departamento: [planosDecorado, presupuestoArte],
      cargo: [
        {
          id: "arte-build-sheet", nombre: "Plan de construcción y materiales (build sheet)", tipo: "tabla",
          hint: "Plan de construcción de cada decorado con presupuesto, coste real, proveedor y foto de avance.",
          columnas: [
            { key: "decorado", label: "Decorado / Elemento" },
            { key: "materiales", label: "Materiales", tipo: "largo" },
            { key: "mano", label: "Mano de obra" },
            { key: "inicio", label: "Inicio", tipo: "fecha" },
            { key: "presupuesto", label: "Presupuesto", tipo: "money" as const },
            { key: "coste_real", label: "Coste real", tipo: "money" as const },
            { key: "proveedor_materiales", label: "Proveedor materiales" },
            { key: "foto_avance", label: "Foto de avance", tipo: "archivo" as const },
            { key: "aprobado_dir", label: "Aprobado por dirección", tipo: "estado", opciones: ["Pendiente", "Aprobado", "Rechazado"] },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "En construcción", "Montado", "Desmontado"] },
          ],
        },
        {
          id: "arte-timeline-decorados", nombre: "Timeline de decorados (Gantt simplificado)", tipo: "tabla",
          hint: "Cronograma de cada decorado: cuándo se construye, se monta, se rueda y se desmonta.",
          columnas: [
            { key: "decorado", label: "Decorado" },
            { key: "inicio_construccion", label: "Inicio construcción", tipo: "fecha" },
            { key: "fin_construccion", label: "Fin construcción", tipo: "fecha" },
            { key: "montaje", label: "Montaje en set", tipo: "fecha" },
            { key: "rodaje", label: "Días de rodaje" },
            { key: "desmontaje", label: "Desmontaje", tipo: "fecha" },
            { key: "responsable", label: "Responsable" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "En construcción", "Montado", "Rodando", "Desmontado"] },
          ],
        },
      ],
    },
    "Atrezzo": {
      departamento: [desgloseAtrezzo, presupuestoArte],
      cargo: [
        {
          id: "arte-inventario-atrezzo", nombre: "Inventario de atrezzo", tipo: "tabla",
          hint: "Inventario completo de atrezzo con foto, valor, seguro y proveedor.",
          columnas: [
            { key: "objeto", label: "Objeto" },
            { key: "ubicacion", label: "Ubicación / Almacén" },
            { key: "estado", label: "Estado físico", tipo: "estado", opciones: ["Bueno", "A reparar", "Roto"] },
            { key: "disponibilidad", label: "Disponibilidad", tipo: "estado", opciones: ["Disponible", "En set", "Devuelto"] },
            { key: "foto", label: "Foto", tipo: "archivo" as const },
            { key: "seguro", label: "Asegurado", tipo: "estado", opciones: ["Sí", "No"] },
            { key: "valor", label: "Valor", tipo: "money" as const },
            { key: "proveedor", label: "Proveedor" },
          ],
        },
        {
          id: "arte-props-pendientes", nombre: "Props y elementos pendientes de conseguir", tipo: "tabla",
          hint: "Todo lo que todavía falta adquirir o fabricar antes del rodaje. Incluye foto de referencia y presupuesto máximo.",
          columnas: [
            { key: "objeto", label: "Objeto / Elemento" },
            { key: "escena", label: "Escena" },
            { key: "fuente", label: "Fuente / Tienda", tipo: "largo" },
            { key: "presupuesto", label: "Presupuesto", tipo: "money" },
            { key: "foto_referencia", label: "Foto de referencia", tipo: "archivo" as const },
            { key: "aprobado_por", label: "Aprobado por" },
            { key: "presupuesto_maximo", label: "Presupuesto máximo", tipo: "money" as const },
            { key: "coste_real", label: "Coste real", tipo: "money" as const },
            { key: "prioridad", label: "Prioridad", tipo: "estado", opciones: ["Urgente", "Alta", "Media", "Baja"] },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En búsqueda", "Conseguido", "Descartado"] },
          ],
        },
      ],
    },
    "Vestuario": {
      departamento: [desgloseVestuario],
      cargo: [
        vestDesgloseEscenas,
        vestPresupuestoVestuario,
        vestCalendarioPruebas,
        vestMantenimiento,
        {
          id: "arte-continuidad-vestuario", nombre: "Continuidad de vestuario", tipo: "galeria",
          hint: "Foto de referencia por personaje y escena. Incluye desglose completo del look.",
          columnas: [
            { key: "personaje", label: "Personaje" },
            { key: "escena", label: "Escena" },
            { key: "look", label: "Look / Variante" },
            { key: "cambio", label: "Cambio de vestuario", tipo: "estado", opciones: ["Sin cambio", "Cambio parcial", "Cambio total", "Envejecido"] },
            { key: "nota", label: "Notas", tipo: "largo" },
          ],
        },
        {
          id: "arte-tabla-vestuario", nombre: "Tabla de prendas por personaje", tipo: "tabla",
          hint: "Inventario completo de prendas: talla, color, estado de pieza, necesidad de lavado y coste.",
          columnas: [
            { key: "personaje", label: "Personaje" },
            { key: "prenda", label: "Prenda" },
            { key: "talla", label: "Talla" },
            { key: "color_dominante", label: "Color dominante" },
            { key: "estado_pieza", label: "Estado de la pieza", tipo: "estado", opciones: ["Nueva", "Usada", "Alquilada", "Comprada", "Devolver"] },
            { key: "lavado_necesario", label: "Lavado necesario", tipo: "estado", opciones: ["Sí", "No"] },
            { key: "escenas_uso", label: "Escenas de uso", tipo: "largo" },
            { key: "origen", label: "Origen", tipo: "estado", opciones: ["Propio", "Alquilado", "Comprado", "Fabricado"] },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Disponible", "En limpieza", "En reparación", "Devuelto"] },
            { key: "foto", label: "Foto", tipo: "archivo" as const },
            { key: "coste", label: "Coste", tipo: "money" as const },
            { key: "proveedor", label: "Proveedor" },
          ],
        },
      ],
    },
    "Maquillaje": {
      departamento: [desgloseVestuario],
      cargo: [
        maqDesgloseEscenas,
        maqInventarioProductos,
        maqEfectosEspeciales,
        maqCalendarioPreparacion,
        {
          id: "arte-continuidad-maquillaje", nombre: "Continuidad de maquillaje por personaje", tipo: "galeria",
          hint: "Foto de referencia por escena para mantener la continuidad.",
          columnas: [
            { key: "personaje", label: "Personaje" },
            { key: "escena", label: "Escena" },
            { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Natural", "Caracterización", "Heridas/FX", "Envejecimiento"] },
            { key: "nota", label: "Notas", tipo: "largo" },
          ],
        },
        {
          id: "arte-ficha-maquillaje", nombre: "Ficha de maquillaje por personaje", tipo: "tabla",
          hint: "Productos y técnica por personaje.",
          columnas: [
            { key: "personaje", label: "Personaje" },
            { key: "base", label: "Base / Fondo" },
            { key: "productos", label: "Productos usados", tipo: "largo" },
            { key: "tiempo_aplicacion", label: "Tiempo aplicación (min)", tipo: "num" },
            { key: "notas", label: "Notas especiales", tipo: "largo" },
          ],
        },
      ],
    },
    "Peluquería": {
      departamento: [desgloseVestuario],
      cargo: [
        { id: "arte-continuidad-peinado", nombre: "Continuidad de peinado por personaje", tipo: "galeria", columnas: [{ key: "personaje", label: "Personaje" }, { key: "escena", label: "Escena" }, { key: "nota", label: "Notas", tipo: "largo" }] },
      ],
    },
  },

  Guion: {
    "Guion": {
      departamento: [historialVersiones, sinopsisEscaleta, desgloseEscenas, cesionGuion],
      cargo: [
        { id: "guion-notas-reescritura", nombre: "Notas de reescritura y pendientes", tipo: "nota" },
        ACCESOS,
      ],
    },
    "Coguion": {
      departamento: [historialVersiones, sinopsisEscaleta, desgloseEscenas],
      cargo: [
        {
          id: "guion-comentarios", nombre: "Comentarios y sugerencias por escena", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena" },
            { key: "comentario", label: "Comentario", tipo: "largo" },
            { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Diálogo", "Estructura", "Personaje", "Ritmo"] },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Abierto", "Aplicado", "Descartado"] },
          ],
        },
      ],
    },
    "Script doctor": {
      departamento: [historialVersiones, sinopsisEscaleta],
      cargo: [
        { id: "guion-informe-doctor", nombre: "Informe de script doctor", tipo: "nota", hint: "Diagnóstico y recomendaciones." },
      ],
    },
    "Documentación": {
      departamento: [sinopsisEscaleta, desgloseEscenas],
      cargo: [
        { id: "guion-banco-investigacion", nombre: "Banco de investigación y referencias", tipo: "galeria", columnas: [{ key: "tema", label: "Tema" }, { key: "fuente", label: "Fuente / Link" }, { key: "nota", label: "Nota", tipo: "largo" }] },
      ],
    },
  },

  Casting: {
    "Dirección de casting": {
      departamento: [candidatosPersonaje, convocatoria, resultadosAudiciones, fichaReparto, contratosReparto],
      cargo: [
        { id: "cast-memoria", nombre: "Memoria de casting", tipo: "nota", hint: "Criterios y decisiones finales." },
        castBreakdownActores,
        castSesionesPrueba,
        castTablaDisponibilidad,
        castFichaAgencia,
        ACCESOS,
      ],
    },
    "Ayudantía de casting": {
      departamento: [candidatosPersonaje, convocatoria, resultadosAudiciones],
      cargo: [
        {
          id: "cast-agentes", nombre: "Agenda de comunicaciones con agentes/representantes", tipo: "tabla",
          columnas: [
            { key: "agente", label: "Agente / Representante" },
            { key: "actor", label: "Actor/Actriz" },
            { key: "fecha", label: "Último contacto", tipo: "fecha" },
            { key: "asunto", label: "Asunto", tipo: "largo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En conversación", "Cerrado"] },
          ],
        },
      ],
    },
    "Coordinación de audiciones": {
      departamento: [convocatoria, resultadosAudiciones],
      cargo: [
        {
          id: "cast-cal-audiciones", nombre: "Agenda de audiciones y callbacks", tipo: "tabla",
          hint: "El planning completo de todas las citaciones: quién, cuándo y resultado.",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "hora", label: "Hora" },
            { key: "candidato", label: "Candidato/a" },
            { key: "personaje", label: "Personaje" },
            { key: "sala", label: "Sala" },
            { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Audición", "Callback", "Prueba cámara", "Self-tape"] },
            { key: "resultado", label: "Resultado", tipo: "estado", opciones: ["Pendiente", "Seleccionado", "En lista corta", "Descartado"] },
            { key: "notas", label: "Notas de casting", tipo: "largo" },
          ],
        },
        {
          id: "cast-briefing-perfil", nombre: "Briefing de perfil buscado por personaje", tipo: "nota",
          hint: "Descripción completa de lo que buscás en cada personaje para compartir con agencias.",
        },
        {
          id: "cast-comparativa", nombre: "Comparativa final de candidatos por personaje", tipo: "tabla",
          hint: "Los finalistas uno a uno: fortalezas, debilidades y opinión del director.",
          columnas: [
            { key: "personaje", label: "Personaje" },
            { key: "candidato", label: "Candidato/a" },
            { key: "fortaleza", label: "Puntos fuertes", tipo: "largo" },
            { key: "debilidad", label: "Puntos débiles", tipo: "largo" },
            { key: "opinion_dir", label: "Opinión de dirección", tipo: "largo" },
            { key: "estado", label: "Decisión", tipo: "estado", opciones: ["En evaluación", "Favorito", "Elegido", "Reserva", "Descartado"] },
            { key: "selfTape", label: "Self-tape / prueba", tipo: "archivo" as const },
          ],
        },
      ],
    },
    "Casting de figuración": {
      departamento: [candidatosPersonaje, fichaReparto],
      cargo: [
        {
          id: "cast-banco-figurantes", nombre: "Banco de figurantes", tipo: "galeria",
          columnas: [
            { key: "nombre", label: "Nombre" },
            { key: "perfil", label: "Perfil (edad, físico)" },
            { key: "disponibilidad", label: "Disponibilidad" },
            { key: "contacto", label: "Contacto" },
          ],
        },
      ],
    },
  },

  Reparto: {
    "Protagonista": {
      departamento: [fichaPersonaje, guionMarcado, calendarioCitaciones, vestMaqAsignado, contratoIndividual],
      cargo: [
        { id: "rep-diario-personaje", nombre: "Diario de personaje / preparación del rol", tipo: "nota" },
        repNotasEscenasDetalle,
        repResearchPersonaje,
        repPronunciacion,
        {
          id: "rep-agenda-personal", nombre: "Mi agenda de rodaje personal", tipo: "tabla",
          hint: "Tus días de rodaje, horario de citación y escenas de cada jornada.",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "hora_citacion", label: "Hora de citación" },
            { key: "localizacion", label: "Localización" },
            { key: "escenas", label: "Escenas del día" },
            { key: "hora_fin", label: "Hora estimada fin" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Confirmada", "Pendiente", "Cancelada", "Rodada"] },
            { key: "notas", label: "Notas del día", tipo: "largo" },
          ],
        },
      ],
    },
    "Reparto principal": {
      departamento: [fichaPersonaje, guionMarcado, calendarioCitaciones, vestMaqAsignado, contratoIndividual],
      cargo: [
        { id: "rep-notas-preparacion", nombre: "Notas de preparación del personaje", tipo: "nota" },
        {
          id: "rep-agenda-personal-principal", nombre: "Mi agenda de rodaje personal", tipo: "tabla",
          hint: "Tus días de rodaje, horario de citación y escenas de cada jornada.",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "hora_citacion", label: "Hora de citación" },
            { key: "localizacion", label: "Localización" },
            { key: "escenas", label: "Escenas del día" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Confirmada", "Pendiente", "Cancelada", "Rodada"] },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
      ],
    },
    "Reparto secundario": {
      departamento: [fichaPersonaje, calendarioCitaciones, vestMaqAsignado, contratoIndividual],
      cargo: [{ id: "rep-notas-escenas", nombre: "Notas de escenas y marcas", tipo: "nota" }],
    },
    "Figuración": {
      departamento: [calendarioCitaciones, vestMaqAsignado],
      cargo: [{ id: "rep-instrucciones-figuracion", nombre: "Instrucciones de figuración por jornada", tipo: "checklist" }],
    },
  },

  "Making of": {
    "Dirección de making of": {
      departamento: [calEditorial, coberturaBTS, materialGrabado, calPublicaciones, derechosBTS],
      cargo: [
        { id: "mo-memoria", nombre: "Memoria de making of", tipo: "nota", hint: "Línea editorial y criterios." },
        btsInventarioMaterial,
        btsPlanContenido,
        btsContactosPrensa,
        btsKitPrensa,
        moEntrevistas,
        ACCESOS,
      ],
    },
    "Cámara de making of": {
      departamento: [coberturaBTS, materialGrabado],
      cargo: [
        moPlanRodajeBTS,
        {
          id: "mo-hoja-rodaje-bts", nombre: "Hoja de rodaje BTS por jornada", tipo: "tabla",
          columnas: [
            { key: "jornada", label: "Jornada", tipo: "fecha" },
            { key: "planos", label: "Planos a cubrir", tipo: "largo" },
            { key: "equipo", label: "Equipo" },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
      ],
    },
    "Edición de contenido": {
      departamento: [materialGrabado, calPublicaciones, derechosBTS],
      cargo: [
        {
          id: "mo-banco-cortes", nombre: "Banco de selección y cortes", tipo: "tabla",
          columnas: [
            { key: "clip", label: "Clip seleccionado" },
            { key: "destino", label: "Destino / Pieza" },
            { key: "duracion", label: "Duración" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Seleccionado", "En edición", "Aprobado", "Publicado"] },
          ],
        },
      ],
    },
    "Community management": {
      departamento: [calEditorial, calPublicaciones],
      cargo: [
        {
          id: "mo-redes-metricas", nombre: "Calendario de redes y métricas", tipo: "tabla",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "canal", label: "Canal" },
            { key: "pieza", label: "Publicación" },
            { key: "alcance", label: "Alcance", tipo: "num" },
            { key: "engagement", label: "Engagement", tipo: "num" },
          ],
        },
      ],
    },
  },

  Sonido: {
    "Dirección de sonido": {
      departamento: [planSonidoDirecto, listaMicros, inventarioSonido, reportesSonido, notasADR],
      cargo: [
        { id: "son-memoria", nombre: "Memoria de sonido", tipo: "nota", hint: "Criterios estéticos y decisiones técnicas." },
        sonMapaMicrosEscena,
        sonPlanADR,
        sonPlaylistMusicaTemp,
        sonEntregaPost,
        ACCESOS,
      ],
    },
    "Microfonía": {
      departamento: [planSonidoDirecto, listaMicros, inventarioSonido, reportesSonido],
      cargo: [
        { id: "son-checklist-microfonia", nombre: "Checklist de microfonía por jornada", tipo: "checklist", hint: "Baterías, frecuencias, colocación." },
        {
          id: "son-control-baterias", nombre: "Control de baterías y pilas por jornada", tipo: "tabla",
          hint: "Rastrea el nivel de carga de cada dispositivo a lo largo del día.",
          columnas: [
            { key: "dispositivo", label: "Dispositivo / Micro" },
            { key: "tipo_pila", label: "Tipo de pila/batería" },
            { key: "inicio", label: "Nivel inicio día", tipo: "estado", opciones: ["100%", "75%", "50%", "25%", "Reemplazada"] },
            { key: "medio_dia", label: "Nivel mediodía", tipo: "estado", opciones: ["100%", "75%", "50%", "25%", "Reemplazada"] },
            { key: "fin", label: "Nivel fin día", tipo: "estado", opciones: ["100%", "75%", "50%", "25%", "Reemplazada"] },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
        {
          id: "son-reporte-boom", nombre: "Reporte de boom y percha por escena", tipo: "tabla",
          hint: "Control de cobertura del boom en cada escena del día.",
          columnas: [
            { key: "escena", label: "Escena / Toma" },
            { key: "angulo", label: "Ángulo de boom" },
            { key: "ruido_fondo", label: "Ruido de fondo", tipo: "estado", opciones: ["Limpio", "Aceptable", "Ruidoso", "Inutilizable"] },
            { key: "alternativa", label: "Micro alternativo usado" },
            { key: "wildtrack", label: "Wildtrack grabado", tipo: "estado", opciones: ["Sí", "No", "N/A"] },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
        {
          id: "son-problemas-set", nombre: "Problemas de sonido en set", tipo: "tabla",
          hint: "Incidencias: ruidos, interferencias, fallos de equipo.",
          columnas: [
            { key: "dia", label: "Día" },
            { key: "escena", label: "Escena" },
            { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Ruido externo", "Interferencia RF", "Fallo equipo", "Viento", "Otro"] },
            { key: "descripcion", label: "Descripción", tipo: "largo" },
            { key: "solucion", label: "Solución aplicada", tipo: "largo" },
            { key: "requiere_adr", label: "Requiere ADR", tipo: "estado", opciones: ["Sí", "No", "Por confirmar"] },
          ],
        },
      ],
    },
    "Postproducción de sonido": {
      departamento: [reportesSonido, notasADR],
      cargo: [
        {
          id: "son-plan-mezcla", nombre: "Plan de mezcla y entrega final de sonido", tipo: "tabla",
          columnas: [
            { key: "elemento", label: "Elemento / Stem" },
            { key: "responsable", label: "Responsable" },
            { key: "formato", label: "Formato entrega" },
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En mezcla", "Aprobado", "Entregado"] },
          ],
        },
        {
          id: "son-sinc-audio", nombre: "Hoja de sincronización de audio por escena", tipo: "tabla",
          hint: "Qué pista de audio corresponde a cada toma de imagen. El mapa que necesita post para no volverse loco.",
          columnas: [
            { key: "escena", label: "Escena" },
            { key: "toma", label: "Toma" },
            { key: "pista_video", label: "Archivo de vídeo" },
            { key: "pista_audio", label: "Archivo de audio" },
            { key: "timecode_in", label: "TC inicio" },
            { key: "claqueta", label: "Nº claqueta" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "Sincronizado", "Problema"] },
            { key: "notas", label: "Notas para montaje", tipo: "largo" },
          ],
        },
      ],
    },
  },

  Postproducción: {
    "Dirección de postproducción": {
      departamento: [planMontaje, versionesCorte, notasVisionadoPost, listaVFX, guiaColor, planEntregas, checklistEntrega],
      cargo: [
        { id: "post-memoria", nombre: "Memoria de postproducción", tipo: "nota", hint: "Decisiones de corte, look y mezcla final." },
        postNotasCorteEscena,
        postVFXTracking,
        postDCPDeliverables,
        postQCChecklist,
        postLicenciasMusica,
        ACCESOS,
      ],
    },
    "Montaje": {
      departamento: [planMontaje, versionesCorte, notasVisionadoPost],
      cargo: [
        {
          id: "post-timeline-montaje", nombre: "Línea de tiempo de montaje", tipo: "tabla",
          columnas: [
            { key: "secuencia", label: "Secuencia" },
            { key: "duracion", label: "Duración" },
            { key: "orden", label: "Orden" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Sin montar", "Montada", "Ajustada", "Cerrada"] },
          ],
        },
      ],
    },
    "Etalonaje y color": {
      departamento: [listaVFX, guiaColor],
      cargo: [
        {
          id: "post-sesiones-etalonaje", nombre: "Sesiones de etalonaje", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena / Plano" },
            { key: "ajustes", label: "Ajustes aplicados", tipo: "largo" },
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "estado", label: "Aprobación", tipo: "estado", opciones: ["En proceso", "A revisar", "Aprobado"] },
          ],
        },
      ],
    },
    "VFX": {
      departamento: [listaVFX, guiaColor],
      cargo: [
        {
          id: "post-tracking-vfx", nombre: "Tracking de planos VFX", tipo: "tabla",
          columnas: [
            { key: "plano", label: "Plano / ID" },
            { key: "proveedor", label: "Proveedor / Artista" },
            { key: "version", label: "Versión" },
            { key: "entrega", label: "Entrega", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Briefing", "WIP", "Review", "Aprobado", "Final"] },
          ],
        },
      ],
    },
    "Sonorización final": {
      departamento: [versionesCorte, notasVisionadoPost],
      cargo: [
        { id: "post-checklist-mezcla", nombre: "Checklist de mezcla y masterización de audio", tipo: "checklist" },
      ],
    },
    "Coordinación de postproducción": {
      departamento: [planEntregas, checklistEntrega],
      cargo: [
        {
          id: "post-cal-maestro", nombre: "Calendario maestro de postproducción", tipo: "tabla",
          hint: "Hitos de montaje, color, VFX, sonido y entregas.",
          columnas: [
            { key: "hito", label: "Hito" },
            { key: "area", label: "Área", tipo: "estado", opciones: ["Montaje", "Color", "VFX", "Sonido", "Entrega"] },
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "responsable", label: "Responsable" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Pendiente", "En curso", "Hecho"] },
          ],
        },
      ],
    },
  },

  RRHH: {
    "Dirección de RRHH": {
      departamento: [listadoEquipo, altasBajas, controlHoras, descansosLegales, protocoloRiesgos, canalIncidencias],
      cargo: [
        { id: "rrhh-memoria", nombre: "Memoria de RRHH", tipo: "nota", hint: "Políticas y decisiones." },
        ACCESOS,
      ],
    },
    "Gestión de personal": {
      departamento: [listadoEquipo, altasBajas, controlHoras],
      cargo: [
        {
          id: "rrhh-ficha-personal", nombre: "Ficha de personal individual", tipo: "ficha",
          hint: "Vinculado a Contratos de equipo del Ejecutivo.",
          campos: [
            { key: "nombre", label: "Nombre" },
            { key: "doc", label: "Documentación", tipo: "largo" },
            { key: "contacto", label: "Contacto / Emergencia", tipo: "largo" },
            { key: "contrato", label: "Contrato" },
            { key: "notas", label: "Notas", tipo: "largo" },
          ],
        },
      ],
    },
    "Coordinación de bienestar": {
      departamento: [descansosLegales, protocoloRiesgos, canalIncidencias],
      cargo: [
        { id: "rrhh-plan-bienestar", nombre: "Plan de bienestar y actividades del equipo", tipo: "checklist" },
      ],
    },
  },

  Sostenibilidad: {
    "Dirección de sostenibilidad": {
      departamento: [huellaCarbono, consumoEnergetico, gestionResiduos, proveedoresSost, checklistVerde],
      cargo: [
        { id: "sost-memoria", nombre: "Memoria de sostenibilidad", tipo: "nota", hint: "Objetivos y resultados." },
        ACCESOS,
      ],
    },
    "Medición de impacto": {
      departamento: [huellaCarbono, consumoEnergetico],
      cargo: [
        {
          id: "sost-indicadores", nombre: "Panel de indicadores de impacto", tipo: "tabla",
          columnas: [
            { key: "indicador", label: "Indicador", tipo: "estado", opciones: ["Huella CO₂", "Energía", "Agua", "Residuos"] },
            { key: "valor", label: "Valor", tipo: "num" },
            { key: "unidad", label: "Unidad" },
            { key: "objetivo", label: "Objetivo", tipo: "num" },
            { key: "tendencia", label: "Tendencia", tipo: "estado", opciones: ["Mejora", "Estable", "Empeora"] },
          ],
        },
      ],
    },
    "Gestión de residuos": {
      departamento: [gestionResiduos, proveedoresSost, checklistVerde],
      cargo: [
        {
          id: "sost-registro-residuos", nombre: "Registro de residuos por jornada", tipo: "tabla",
          columnas: [
            { key: "fecha", label: "Jornada", tipo: "fecha" },
            { key: "tipo", label: "Tipo de residuo" },
            { key: "cantidad", label: "Cantidad (kg/L)", tipo: "num" },
            { key: "destino", label: "Destino", tipo: "estado", opciones: ["Reciclaje", "Reutilización", "Compost", "Vertedero", "Donación"] },
          ],
        },
      ],
    },
  },

  Marketing: {
    "Jefatura de marketing": {
      departamento: [planMarketing, identidadGrafica, calRedes, bancoAssets],
      cargo: [
        { id: "mkt-memoria", nombre: "Memoria de marketing", tipo: "nota", hint: "Objetivos, presupuesto y resultados." },
        ACCESOS,
      ],
    },
    "Diseño gráfico": {
      departamento: [planMarketing, identidadGrafica, bancoAssets],
      cargo: [
        {
          id: "mkt-solicitudes-piezas", nombre: "Solicitudes de piezas gráficas", tipo: "tabla",
          columnas: [
            { key: "pieza", label: "Pieza" },
            { key: "brief", label: "Brief", tipo: "largo" },
            { key: "formato", label: "Formato" },
            { key: "deadline", label: "Deadline", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Solicitada", "En diseño", "En revisión", "Entregada"] },
          ],
        },
      ],
    },
    "Redes sociales": {
      departamento: [calRedes, bancoAssets],
      cargo: [
        {
          id: "mkt-publicaciones-metricas", nombre: "Calendario de publicaciones y métricas por canal", tipo: "tabla",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "canal", label: "Canal" },
            { key: "pieza", label: "Publicación" },
            { key: "alcance", label: "Alcance", tipo: "num" },
            { key: "interaccion", label: "Interacciones", tipo: "num" },
          ],
        },
      ],
    },
  },

  Difusión: {
    "Jefatura de prensa": {
      departamento: [dossierPrensa, listadoMedios, notasPrensa],
      cargo: [
        { id: "dif-memoria", nombre: "Memoria de difusión", tipo: "nota", hint: "Estrategia de prensa y cobertura lograda." },
        ACCESOS,
      ],
    },
    "Asistencia de prensa": {
      departamento: [listadoMedios, notasPrensa],
      cargo: [
        {
          id: "dif-tracking-envios", nombre: "Seguimiento de envíos y respuestas a medios", tipo: "tabla",
          columnas: [
            { key: "medio", label: "Medio" },
            { key: "envio", label: "Material enviado" },
            { key: "fecha", label: "Fecha envío", tipo: "fecha" },
            { key: "respuesta", label: "Respuesta", tipo: "largo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Enviado", "Abierto", "Interesado", "Publicado", "Sin respuesta"] },
          ],
        },
      ],
    },
  },

  Distribución: {
    "Jefatura de distribución": {
      departamento: [planDistribucion, listadoFestivales, acuerdosDistribucion],
      cargo: [
        { id: "dist-memoria", nombre: "Memoria de distribución", tipo: "nota", hint: "Estrategia y resultados." },
        ACCESOS,
      ],
    },
    "Asistencia de distribución": {
      departamento: [listadoFestivales, acuerdosDistribucion],
      cargo: [
        {
          id: "dist-inscripciones", nombre: "Seguimiento de inscripciones a festivales", tipo: "tabla",
          columnas: [
            { key: "festival", label: "Festival" },
            { key: "fecha", label: "Fecha inscripción", tipo: "fecha" },
            { key: "material", label: "Materiales enviados", tipo: "largo" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Preparando", "Inscrito", "Confirmado", "Seleccionado", "Rechazado"] },
          ],
        },
      ],
    },
  },
};

// ===========================================================================
// HERRAMIENTAS GENERALES DEL PROYECTO (scope "General": las edita cualquier
// integrante del proyecto). Construidas con el mismo motor que el resto.
// ===========================================================================
export const GENERAL_CALENDARIO: Herramienta = {
  id: "gen-calendario",
  nombre: "Calendario general del proyecto",
  tipo: "tabla",
  hint: "Hitos de todo el proyecto, de desarrollo a distribución.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "hito", label: "Hito / Evento" },
    { key: "fase", label: "Fase", tipo: "estado", opciones: ["Desarrollo", "Preproducción", "Rodaje", "Postproducción", "Distribución"] },
    { key: "depto", label: "Departamento" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "En curso", "Hecho"] },
  ],
};
export const GENERAL_PLAN_RODAJE: Herramienta = {
  id: "gen-plan-rodaje",
  nombre: "Plan de rodaje",
  tipo: "tabla",
  hint: "Planificación general de jornadas de rodaje.",
  columnas: [
    { key: "dia", label: "Día" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "escenas", label: "Escenas" },
    { key: "locacion", label: "Locación" },
    { key: "set", label: "Set · INT/EXT" },
    { key: "paginas", label: "Páginas (1/8)" },
    { key: "notas", label: "Notas", tipo: "largo" },
  ],
};
export const GENERAL_ORDEN_RODAJE: Herramienta = {
  id: "gen-orden-rodaje",
  nombre: "Orden de rodaje (callsheet)",
  tipo: "tabla",
  hint: "Una fila por jornada de rodaje. Imprimí cada jornada en formato callsheet para llevarla al set.",
  columnas: [
    { key: "dia", label: "Día (X/Y)" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "set_principal", label: "Localización principal" },
    { key: "set_secundario", label: "Localización secundaria" },
    { key: "productora", label: "Productora" },
    { key: "unidad", label: "Unidad" },
    { key: "clima", label: "Clima / Amanecer-Anochecer" },
    { key: "citaciones", label: "Citaciones generales (JSON)", tipo: "largo" },
    { key: "localizaciones", label: "Localizaciones (JSON)", tipo: "largo" },
    { key: "llamadas", label: "Llamadas por departamento (JSON)", tipo: "largo" },
    { key: "escenas_resumen", label: "Resumen de escenas" },
    { key: "escenas", label: "Escenas del día (JSON)", tipo: "largo" },
    { key: "reparto_individual", label: "Reparto — citación individual (JSON)", tipo: "largo" },
    { key: "contactos", label: "Contactos clave (JSON)", tipo: "largo" },
    { key: "notas", label: "Notas de producción", tipo: "largo" },
  ],
};

export const GENERAL_CONTACTOS_EMERGENCIA: Herramienta = {
  id: "gen-contactos-emergencia",
  nombre: "Contactos de emergencia del proyecto",
  tipo: "tabla",
  hint: "Médico, bomberos, propietarios, seguros, ayuntamiento… al alcance de todos.",
  columnas: [
    { key: "nombre", label: "Nombre / Servicio" },
    { key: "rol", label: "Rol / Categoría", tipo: "estado", opciones: ["Médico", "Bomberos", "Policía", "Seguro", "Locación", "Ayuntamiento", "Equipo", "Otro"] },
    { key: "telefono", label: "Teléfono" },
    { key: "email", label: "E-mail / Contacto" },
    { key: "notas", label: "Notas / Disponibilidad", tipo: "largo" },
  ],
};

export const GENERAL_CHECKLIST_WRAP: Herramienta = {
  id: "gen-checklist-wrap",
  nombre: "Checklist de cierre de rodaje (wrap)",
  tipo: "checklist",
  hint: "Puntos que todo el equipo debe confirmar antes de dar por finalizado el rodaje.",
};

// Unión deduplicada de TODAS las herramientas de departamento del depto.
export function deptTools(departamento: string): Herramienta[] {
  const dep = HERRAMIENTAS[departamento];
  if (!dep) return [];
  const seen = new Set<string>();
  const out: Herramienta[] = [];
  for (const cargo of Object.keys(dep)) {
    for (const h of dep[cargo].departamento) {
      if (!seen.has(h.id)) { seen.add(h.id); out.push(h); }
    }
  }
  return out;
}

// Herramientas exclusivas agrupadas por cargo (todas las del departamento).
export function cargoGroups(departamento: string): { cargo: string; tools: Herramienta[] }[] {
  const dep = HERRAMIENTAS[departamento];
  if (!dep) return [];
  return Object.keys(dep).map((c) => ({ cargo: c, tools: dep[c].cargo }));
}

// Índice id → herramienta (para resolver propuestas por escena, etc.).
export const HERRAMIENTA_POR_ID: Record<string, Herramienta> = (() => {
  const map: Record<string, Herramienta> = {};
  for (const dep of Object.values(HERRAMIENTAS)) {
    for (const ct of Object.values(dep)) {
      for (const h of [...ct.departamento, ...ct.cargo]) map[h.id] = h;
    }
  }
  for (const h of [GENERAL_CALENDARIO, GENERAL_PLAN_RODAJE, GENERAL_ORDEN_RODAJE, GENERAL_CONTACTOS_EMERGENCIA, GENERAL_CHECKLIST_WRAP]) map[h.id] = h;
  return map;
})();

// Columnas/campos de tipo "archivo" de una herramienta (para la Carpeta de archivos).
export function archivoColumnasDe(h: Herramienta): Columna[] {
  return [...(h.columnas ?? []), ...(h.campos ?? [])].filter((c) => c.tipo === "archivo");
}
