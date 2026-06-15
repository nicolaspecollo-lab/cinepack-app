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

export type ColTipo = "texto" | "largo" | "num" | "money" | "fecha" | "estado";

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
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Ayuda", "Subvención", "Inversor", "Coproducción", "Preventa"] },
    { key: "importe", label: "Importe", tipo: "money" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Prospecto", "Solicitado", "Concedido", "Firmado", "Denegado"] },
    { key: "resolucion", label: "Fecha resolución", tipo: "fecha" },
    { key: "condiciones", label: "Condiciones", tipo: "largo" },
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
  ],
};
const contratos: Herramienta = {
  id: "ej-contratos",
  nombre: "Contratos (equipo, reparto, proveedores)",
  tipo: "tabla",
  hint: "Estado de firma de todos los contratos del proyecto.",
  columnas: [
    { key: "contraparte", label: "Contraparte" },
    { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Equipo", "Reparto", "Proveedor", "Coproducción"] },
    { key: "importe", label: "Importe", tipo: "money" },
    { key: "inicio", label: "Inicio", tipo: "fecha" },
    { key: "fin", label: "Fin", tipo: "fecha" },
    { key: "firma", label: "Firma", tipo: "estado", opciones: ["Pendiente", "Enviado", "Firmado"] },
  ],
};

// ===========================================================================
// DIRECCIÓN
// ===========================================================================
const calendarioEnsayos: Herramienta = {
  id: "dir-calendario-ensayos",
  nombre: "Calendario de ensayos",
  tipo: "tabla",
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
  ],
};
const cateringDietas: Herramienta = {
  id: "prod-catering",
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
    { key: "num", label: "Nº" },
    { key: "secuencia", label: "Secuencia / Bloque" },
    { key: "resumen", label: "Resumen", tipo: "largo" },
    { key: "funcion", label: "Función dramática" },
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
  ],
};
const calPublicaciones: Herramienta = {
  id: "mo-cal-publicaciones",
  nombre: "Calendario de publicaciones",
  tipo: "tabla",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "canal", label: "Canal" },
    { key: "pieza", label: "Pieza" },
    { key: "copy", label: "Copy / Texto", tipo: "largo" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Programado", "Publicado"] },
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
  columnas: [
    { key: "equipo", label: "Equipo" },
    { key: "categoria", label: "Categoría", tipo: "estado", opciones: ["Grabador", "Micrófono", "Inalámbrico", "Monitoraje", "Accesorio"] },
    { key: "cantidad", label: "Cantidad", tipo: "num" },
    { key: "proveedor", label: "Proveedor" },
    { key: "estado", label: "Estado", tipo: "estado", opciones: ["Reservado", "Confirmado", "Recogido", "Devuelto"] },
  ],
};
const reportesSonido: Herramienta = {
  id: "son-reportes",
  nombre: "Reportes de sonido por toma",
  tipo: "tabla",
  hint: "Vinculado al Reporte de cámara por toma.",
  columnas: [
    { key: "escena", label: "Escena / Toma" },
    { key: "archivo", label: "Archivo / TC" },
    { key: "canales", label: "Canales" },
    { key: "ok", label: "Estado", tipo: "estado", opciones: ["OK", "NG", "Sólo sonido", "Wildtrack"] },
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
  hint: "Vinculado al Plan de mezcla de Sonido.",
  columnas: [
    { key: "version", label: "Versión / Corte" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "duracion", label: "Duración" },
    { key: "cambios", label: "Cambios respecto al anterior", tipo: "largo" },
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
// MAPA: departamento → cargo → { departamento[], cargo[] }
// ===========================================================================
export const HERRAMIENTAS: Record<string, Record<string, CargoTools>> = {
  Ejecutivo: {
    "Producción ejecutiva": {
      departamento: [presupuestoGeneral, presupuestoDepto, planFinanciacion],
      cargo: [
        { id: "ej-memoria", nombre: "Memoria ejecutiva del proyecto", tipo: "nota", hint: "Estado general y decisiones clave." },
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
    "Asistencia de dirección": {
      departamento: [calendarioEnsayos],
      cargo: [
        { id: "dir-control-horarios", nombre: "Control de horarios y avisos al equipo", tipo: "checklist" },
      ],
    },
    "2ª Asistencia de dirección": {
      departamento: [calendarioEnsayos],
      cargo: [
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
        { id: "dir-continuidad-foto", nombre: "Continuidad fotográfica", tipo: "galeria", hint: "Galería + notas de raccord." },
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
            { key: "pros", label: "Pros / Contras", tipo: "largo" },
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
        ACCESOS,
      ],
    },
    "Operación de cámara": {
      departamento: [shotList, inventarioCamara],
      cargo: [
        {
          id: "foto-reporte-camara", nombre: "Reporte de cámara por toma", tipo: "tabla",
          columnas: [
            { key: "escena", label: "Escena / Toma" },
            { key: "lente", label: "Lente" },
            { key: "encuadre", label: "Encuadre" },
            { key: "diafragma", label: "T / Diafragma" },
            { key: "ok", label: "Toma", tipo: "estado", opciones: ["OK", "NG", "Falsa", "Print"] },
            { key: "notas", label: "Notas", tipo: "largo" },
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
        {
          id: "foto-electrico", nombre: "Necesidades eléctricas y generador", tipo: "tabla",
          columnas: [
            { key: "set", label: "Set / Escena" },
            { key: "consumo", label: "Consumo estimado (kW)", tipo: "num" },
            { key: "fuente", label: "Fuente", tipo: "estado", opciones: ["Red", "Generador", "Batería"] },
            { key: "cableado", label: "Cableado / Distribución", tipo: "largo" },
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
      ],
    },
  },

  Arte: {
    "Dirección de arte": {
      departamento: [moodboardArte, paletaColor, planosDecorado],
      cargo: [
        { id: "arte-memoria", nombre: "Memoria de dirección de arte", tipo: "nota", hint: "Concepto visual global." },
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
          columnas: [
            { key: "decorado", label: "Decorado / Elemento" },
            { key: "materiales", label: "Materiales", tipo: "largo" },
            { key: "mano", label: "Mano de obra" },
            { key: "inicio", label: "Inicio", tipo: "fecha" },
            { key: "estado", label: "Estado", tipo: "estado", opciones: ["Planificado", "En construcción", "Montado", "Desmontado"] },
          ],
        },
      ],
    },
    "Atrezzo": {
      departamento: [desgloseAtrezzo, presupuestoArte],
      cargo: [
        {
          id: "arte-inventario-atrezzo", nombre: "Inventario de atrezzo", tipo: "tabla",
          columnas: [
            { key: "objeto", label: "Objeto" },
            { key: "ubicacion", label: "Ubicación / Almacén" },
            { key: "estado", label: "Estado físico", tipo: "estado", opciones: ["Bueno", "A reparar", "Roto"] },
            { key: "disponibilidad", label: "Disponibilidad", tipo: "estado", opciones: ["Disponible", "En set", "Devuelto"] },
          ],
        },
      ],
    },
    "Vestuario": {
      departamento: [desgloseVestuario],
      cargo: [
        { id: "arte-continuidad-vestuario", nombre: "Continuidad de vestuario", tipo: "galeria", hint: "Fotos por escena/personaje.", columnas: [{ key: "personaje", label: "Personaje" }, { key: "escena", label: "Escena" }, { key: "nota", label: "Notas", tipo: "largo" }] },
      ],
    },
    "Maquillaje": {
      departamento: [desgloseVestuario],
      cargo: [
        { id: "arte-continuidad-maquillaje", nombre: "Continuidad de maquillaje por personaje", tipo: "galeria", columnas: [{ key: "personaje", label: "Personaje" }, { key: "escena", label: "Escena" }, { key: "nota", label: "Notas", tipo: "largo" }] },
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
          id: "cast-cal-audiciones", nombre: "Calendario de audiciones y callbacks", tipo: "tabla",
          columnas: [
            { key: "fecha", label: "Fecha", tipo: "fecha" },
            { key: "hora", label: "Hora" },
            { key: "candidato", label: "Candidato/a" },
            { key: "personaje", label: "Personaje" },
            { key: "sala", label: "Sala" },
            { key: "tipo", label: "Tipo", tipo: "estado", opciones: ["Audición", "Callback", "Prueba cámara"] },
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
      cargo: [{ id: "rep-diario-personaje", nombre: "Diario de personaje / preparación del rol", tipo: "nota" }],
    },
    "Reparto principal": {
      departamento: [fichaPersonaje, guionMarcado, calendarioCitaciones, vestMaqAsignado, contratoIndividual],
      cargo: [{ id: "rep-notas-preparacion", nombre: "Notas de preparación del personaje", tipo: "nota" }],
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
        ACCESOS,
      ],
    },
    "Cámara de making of": {
      departamento: [coberturaBTS, materialGrabado],
      cargo: [
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
        ACCESOS,
      ],
    },
    "Microfonía": {
      departamento: [planSonidoDirecto, listaMicros, inventarioSonido, reportesSonido],
      cargo: [
        { id: "son-checklist-microfonia", nombre: "Checklist de microfonía por jornada", tipo: "checklist", hint: "Baterías, frecuencias, colocación." },
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
      ],
    },
  },

  Postproducción: {
    "Dirección de postproducción": {
      departamento: [planMontaje, versionesCorte, notasVisionadoPost, listaVFX, guiaColor, planEntregas, checklistEntrega],
      cargo: [
        { id: "post-memoria", nombre: "Memoria de postproducción", tipo: "nota", hint: "Decisiones de corte, look y mezcla final." },
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
  hint: "Citación diaria del equipo y reparto.",
  columnas: [
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "citacion", label: "Citación general" },
    { key: "set", label: "Set / Locación" },
    { key: "escenas", label: "Escenas" },
    { key: "reparto", label: "Reparto citado", tipo: "largo" },
    { key: "meteo", label: "Meteo / Seguridad", tipo: "largo" },
  ],
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
  for (const h of [GENERAL_CALENDARIO, GENERAL_PLAN_RODAJE, GENERAL_ORDEN_RODAJE]) map[h.id] = h;
  return map;
})();
