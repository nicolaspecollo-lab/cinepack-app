// Tipos de proyecto, alineados con los packs/servicios contratables en cinepack.es/packs.html
export const TIPOS_PROYECTO = [
  "Largometraje de ficción",
  "Largometraje documental",
  "Largometraje de animación",
  "Serie de ficción",
  "Serie documental",
  "Serie de TV",
  "Serie de animación",
  "Cortometraje de ficción",
  "Cortometraje documental",
  "Cortometraje de animación",
  "Comerciales / Publicidad",
  "Escuelas / Universidades",
];

export const DEPARTAMENTOS = [
  "Ejecutivo",
  "Dirección",
  "Producción",
  "Fotografía",
  "Arte",
  "Guion",
  "Casting",
  "Reparto",
  "Making of",
  "Sonido",
  "Postproducción",
  "RRHH",
  "Sostenibilidad",
  "Marketing",
  "Difusión",
  "Distribución",
];

// Departamento virtual para invitados externos con vista de solo lectura (clientes/productoras)
export const CLIENTE_DEPT = "Cliente / Productora";

// Estados de tareas, consistentes en toda la app (Pulso, Kanban, Inbox).
export const ESTADOS_TAREA = ["pendiente", "en_curso", "hecho"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];
export const ESTADO_LABEL: Record<EstadoTarea, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecho: "Hecho",
};
export const ESTADO_COLOR: Record<EstadoTarea, string> = {
  pendiente: "var(--muted)",
  en_curso: "var(--cyan)",
  hecho: "var(--lime)",
};

export const ACCENTS: Record<string, string> = {
  "Dirección": "lime",
  "Fotografía": "blue",
  "Arte": "pink",
  "Guion": "yellow",
  "Producción": "cyan",
  "Ejecutivo": "violet",
  "Casting": "orange",
  "Reparto": "white",
  "Making of": "teal",
  "Sonido": "gold",
  "Postproducción": "rose",
  "RRHH": "sky",
  "Sostenibilidad": "green",
  "Marketing": "amber",
  "Difusión": "indigo",
  "Distribución": "coral",
  [CLIENTE_DEPT]: "white",
};

// Matriz de visionado: además de su propio departamento (que edita), cada rol puede
// visionar en solo lectura los documentos y escenas de estos otros departamentos.
export const PERMISOS_VISIONADO: Record<string, string[]> = {
  "Dirección": DEPARTAMENTOS.filter((d) => d !== "Dirección"),
  "Producción": DEPARTAMENTOS.filter((d) => d !== "Producción"),
  "Ejecutivo": DEPARTAMENTOS.filter((d) => d !== "Ejecutivo"),
  "Fotografía": ["Dirección", "Guion", "Arte", "Postproducción"],
  "Arte": ["Dirección", "Guion", "Fotografía", "Reparto"],
  "Guion": ["Dirección", "Producción"],
  "Casting": ["Dirección", "Reparto", "Producción"],
  "Reparto": ["Dirección", "Guion", "Arte", "Casting"],
  "Making of": ["Dirección", "Producción", "Reparto"],
  "Sonido": ["Dirección", "Guion", "Postproducción"],
  "Postproducción": ["Dirección", "Guion", "Sonido", "Fotografía"],
  "RRHH": ["Producción", "Ejecutivo"],
  "Sostenibilidad": ["Producción", "Ejecutivo"],
  "Marketing": ["Dirección", "Producción", "Making of", "Ejecutivo"],
  "Difusión": ["Dirección", "Producción", "Making of", "Marketing", "Ejecutivo"],
  "Distribución": ["Dirección", "Producción", "Marketing", "Ejecutivo"],
};

// Jerarquía de cargos por departamento, de mayor a menor responsabilidad.
// Se usa para ordenar el equipo en la pestaña "Equipo" y para que cada persona
// pueda elegir su cargo (sin género) en su perfil.
export const JERARQUIA_POR_DEPARTAMENTO: Record<string, string[]> = {
  "Dirección": [
    "Dirección",
    "Asistencia de dirección",
    "2ª Asistencia de dirección",
    "Script",
    "Dirección de actores",
    "Secretaría de rodaje",
  ],
  "Producción": [
    "Dirección de producción",
    "Jefatura de producción",
    "Asistencia de producción",
    "Coordinación de producción",
    "Jefatura de locaciones",
    "Scouting",
    "Logística",
    "Driver",
  ],
  "Fotografía": [
    "Dirección de fotografía",
    "Operación de cámara",
    "Foquista",
    "Auxiliar de cámara",
    "Maquinista",
    "Eléctricos / Gaffer",
    "DIT (Imagen Digital)",
  ],
  "Arte": [
    "Dirección de arte",
    "Ayudantía de dirección de arte",
    "Construcción de decorados",
    "Atrezzo",
    "Vestuario",
    "Maquillaje",
    "Peluquería",
  ],
  "Guion": [
    "Guion",
    "Coguion",
    "Script doctor",
    "Documentación",
  ],
  "Ejecutivo": [
    "Producción ejecutiva",
    "Dirección financiera",
    "Tesorería",
    "Administración",
    "Legal",
    "Financiación y Seguros",
  ],
  "Casting": [
    "Dirección de casting",
    "Ayudantía de casting",
    "Coordinación de audiciones",
    "Casting de figuración",
  ],
  "Reparto": [
    "Protagonista",
    "Reparto principal",
    "Reparto secundario",
    "Figuración",
  ],
  "Making of": [
    "Dirección de making of",
    "Cámara de making of",
    "Edición de contenido",
    "Community management",
  ],
  "Sonido": [
    "Dirección de sonido",
    "Microfonía",
    "Postproducción de sonido",
  ],
  "Postproducción": [
    "Dirección de postproducción",
    "Montaje",
    "Etalonaje y color",
    "VFX",
    "Sonorización final",
    "Coordinación de postproducción",
  ],
  "RRHH": [
    "Dirección de RRHH",
    "Gestión de personal",
    "Coordinación de bienestar",
  ],
  "Sostenibilidad": [
    "Dirección de sostenibilidad",
    "Medición de impacto",
    "Gestión de residuos",
  ],
  "Marketing": [
    "Jefatura de marketing",
    "Diseño gráfico",
    "Redes sociales",
  ],
  "Difusión": [
    "Jefatura de prensa",
    "Asistencia de prensa",
  ],
  "Distribución": [
    "Jefatura de distribución",
    "Asistencia de distribución",
  ],
};

export type DocTemplate = { nombre: string; desc: string };
export type DocGrupo = { titulo: string; color: string; docs: DocTemplate[] };

// Catálogo de documentos esperados por departamento (la "Biblia de funcionamiento").
// Son plantillas: si existe un documento subido con ese nombre se muestra como completado,
// si no, aparece "Vacío" con opción de subirlo.
export const DOCUMENTOS_POR_DEPARTAMENTO: Record<string, DocGrupo[]> = {
  "Dirección": [
    {
      titulo: "Guion y desarrollo",
      color: "var(--lime)",
      docs: [
        { nombre: "Guion definitivo", desc: "Última versión bloqueada del guion." },
        { nombre: "Biblia de personajes", desc: "Arcos, motivaciones y relaciones de cada personaje." },
        { nombre: "Referencias visuales (moodboard)", desc: "Tono, fotografía y referencias de puesta en escena." },
      ],
    },
    {
      titulo: "Planificación",
      color: "var(--cyan)",
      docs: [
        { nombre: "Plan de rodaje maestro", desc: "Calendario día a día de todo el rodaje." },
        { nombre: "Shot list general", desc: "Desglose de planos previstos por jornada." },
        { nombre: "Calendario de ensayos", desc: "Sesiones de lectura y ensayo con el reparto." },
      ],
    },
    {
      titulo: "Continuidad",
      color: "var(--gold)",
      docs: [
        { nombre: "Partes de script", desc: "Registro diario de continuidad y raccords." },
        { nombre: "Notas de dirección por escena", desc: "Indicaciones y ajustes escena a escena." },
      ],
    },
  ],
  "Producción": [
    {
      titulo: "Planificación",
      color: "var(--cyan)",
      docs: [
        { nombre: "Plan de rodaje maestro", desc: "Versión de producción del calendario de rodaje." },
        { nombre: "Stripboard", desc: "Orden de escenas por día y localización." },
        { nombre: "Calendario general del proyecto", desc: "Hitos de preproducción, rodaje y postproducción." },
      ],
    },
    {
      titulo: "Logística",
      color: "var(--blue)",
      docs: [
        { nombre: "Localizaciones y permisos", desc: "Fichas de localización y permisos de rodaje." },
        { nombre: "Hojas de ruta y transporte", desc: "Desplazamientos del equipo y materiales." },
        { nombre: "Catering y dietas", desc: "Planificación de comidas y dietas por jornada." },
      ],
    },
    {
      titulo: "Coordinación",
      color: "var(--lime)",
      docs: [
        { nombre: "Órdenes de rodaje (callsheets)", desc: "Citación diaria de todo el equipo." },
        { nombre: "Partes de producción diarios", desc: "Resumen de lo rodado y lo pendiente cada día." },
      ],
    },
  ],
  "Fotografía": [
    {
      titulo: "Plan técnico de cámara",
      color: "var(--blue)",
      docs: [
        { nombre: "Shot list / desglose de planos", desc: "Planos previstos por escena, tipo y movimiento." },
        { nombre: "Plan de iluminación", desc: "Esquemas de luz por escena y localización." },
        { nombre: "Esquemas de set", desc: "Distribución de cámara, luces y equipo en plató." },
      ],
    },
    {
      titulo: "Equipo",
      color: "var(--cyan)",
      docs: [
        { nombre: "Inventario de cámara y óptica", desc: "Cuerpos, ópticas y accesorios disponibles." },
        { nombre: "Inventario de iluminación", desc: "Focos, paneles y soportes disponibles." },
        { nombre: "Hoja de alquiler de equipo", desc: "Material alquilado, proveedor y fechas." },
      ],
    },
    {
      titulo: "Referencias",
      color: "var(--violet)",
      docs: [
        { nombre: "Look book / referencias de fotografía", desc: "Referencias visuales de look y color." },
        { nombre: "LUTs y pruebas de cámara", desc: "Pruebas de imagen y LUTs de referencia." },
      ],
    },
  ],
  "Arte": [
    {
      titulo: "Dirección de arte",
      color: "var(--pink)",
      docs: [
        { nombre: "Moodboard de arte", desc: "Referencias visuales de dirección de arte." },
        { nombre: "Paleta de color por escena", desc: "Paletas y referencias cromáticas." },
        { nombre: "Planos de decorado", desc: "Planos y distribución de los decorados." },
      ],
    },
    {
      titulo: "Atrezzo y vestuario",
      color: "var(--rose)",
      docs: [
        { nombre: "Desglose de atrezzo por escena", desc: "Objetos de atrezzo necesarios por escena." },
        { nombre: "Desglose de vestuario por personaje", desc: "Vestuario por personaje y escena." },
        { nombre: "Continuidad de vestuario", desc: "Registro fotográfico de continuidad de vestuario." },
      ],
    },
    {
      titulo: "Producción de arte",
      color: "var(--orange)",
      docs: [
        { nombre: "Presupuesto de arte", desc: "Presupuesto asignado al departamento de arte." },
        { nombre: "Proveedores y compras", desc: "Listado de proveedores, compras y alquileres." },
      ],
    },
  ],
  "Guion": [
    {
      titulo: "Versiones",
      color: "var(--yellow)",
      docs: [
        { nombre: "Guion literario (última versión)", desc: "Versión vigente del guion literario." },
        { nombre: "Historial de versiones y cambios", desc: "Registro de versiones (blanca, azul, rosa...)." },
        { nombre: "Sinopsis y escaleta", desc: "Sinopsis general y escaleta por secuencias." },
      ],
    },
    {
      titulo: "Desglose",
      color: "var(--lime)",
      docs: [
        { nombre: "Desglose de escenas (IA)", desc: "Escenas extraídas automáticamente del guion." },
        { nombre: "Desglose técnico (planos)", desc: "Planos asociados a cada escena." },
      ],
    },
    {
      titulo: "Derechos",
      color: "var(--violet)",
      docs: [
        { nombre: "Cesión de derechos de guion", desc: "Acuerdo de cesión de derechos de autoría." },
      ],
    },
  ],
  "Ejecutivo": [
    {
      titulo: "Presupuesto y costos",
      color: "var(--lime)",
      docs: [
        { nombre: "Presupuesto general", desc: "Top sheet y desglose por capítulos del proyecto." },
        { nombre: "Presupuesto por departamento", desc: "Asignación y límite de gasto de cada depto." },
        { nombre: "Control de costos (cost report)", desc: "Presupuestado vs. real, semana a semana." },
        { nombre: "Flujo de caja (cashflow)", desc: "Entradas y salidas previstas por fecha." },
      ],
    },
    {
      titulo: "Facturación",
      color: "var(--cyan)",
      docs: [
        { nombre: "Facturas emitidas", desc: "Facturas que emite la productora." },
        { nombre: "Facturas de proveedores", desc: "Facturas recibidas pendientes de validar." },
        { nombre: "Pendientes de pago", desc: "Facturas aprobadas a la espera de abono." },
      ],
    },
    {
      titulo: "Pagos y rendiciones",
      color: "var(--yellow)",
      docs: [
        { nombre: "Comprobantes de pago", desc: "Justificantes de transferencia y recibos." },
        { nombre: "Nóminas del equipo", desc: "Pagos al crew y al reparto." },
        { nombre: "Caja chica (petty cash)", desc: "Gastos menores con su justificación." },
        { nombre: "Rendición de gastos", desc: "Liquidación de adelantos y dietas." },
      ],
    },
    {
      titulo: "Contratos y legal",
      color: "var(--pink)",
      docs: [
        { nombre: "Contratos de equipo", desc: "Contratación del crew por departamento." },
        { nombre: "Contratos de reparto", desc: "Actores y figuración, con cesión de imagen." },
        { nombre: "Contratos de proveedores", desc: "Localizaciones, alquileres, servicios." },
        { nombre: "Cesión de derechos", desc: "Guion, música, marcas y derechos de autor." },
        { nombre: "Acuerdos de confidencialidad (NDA)", desc: "Protección de información del proyecto." },
      ],
    },
    {
      titulo: "Financiación y seguros",
      color: "var(--violet)",
      docs: [
        { nombre: "Plan de financiación", desc: "Estructura de financiación del proyecto." },
        { nombre: "Ayudas y subvenciones", desc: "Convocatorias, solicitudes y justificación." },
        { nombre: "Inversores y coproducción", desc: "Acuerdos con inversores y coproductores." },
        { nombre: "Pólizas de seguro", desc: "RC, accidentes, negativo y equipos." },
        { nombre: "Permisos de rodaje", desc: "Licencias de localización y vía pública." },
      ],
    },
  ],
  "Casting": [
    {
      titulo: "Procesos de selección",
      color: "var(--orange)",
      docs: [
        { nombre: "Listado de candidatos", desc: "Candidatos por personaje y estado del proceso." },
        { nombre: "Convocatoria de casting", desc: "Bases y convocatoria publicada." },
        { nombre: "Resultados de audiciones", desc: "Notas y decisiones de cada audición." },
      ],
    },
    {
      titulo: "Reparto confirmado",
      color: "var(--lime)",
      docs: [
        { nombre: "Ficha de reparto", desc: "Reparto confirmado por personaje." },
        { nombre: "Contratos de reparto", desc: "Contratos firmados, pendiente validación del Ejecutivo." },
        { nombre: "Cesión de imagen", desc: "Acuerdos de cesión de imagen del reparto." },
      ],
    },
  ],
  "Reparto": [
    {
      titulo: "Ficha de personaje",
      color: "var(--white)",
      docs: [
        { nombre: "Ficha de personaje y arco", desc: "Descripción del personaje y su arco narrativo." },
        { nombre: "Guion con escenas marcadas", desc: "Guion con las escenas propias señaladas." },
      ],
    },
    {
      titulo: "Logística personal",
      color: "var(--cyan)",
      docs: [
        { nombre: "Calendario de citaciones", desc: "Fechas y horarios de citación por actor." },
        { nombre: "Vestuario y maquillaje asignado", desc: "Looks asignados por escena." },
      ],
    },
    {
      titulo: "Contractual",
      color: "var(--pink)",
      docs: [
        { nombre: "Contrato individual", desc: "Contrato de interpretación del actor." },
        { nombre: "Cesión de imagen", desc: "Acuerdo de cesión de imagen firmado." },
      ],
    },
  ],
  "Making of": [
    {
      titulo: "Planificación de contenido",
      color: "var(--teal)",
      docs: [
        { nombre: "Calendario editorial", desc: "Planificación de contenidos a generar." },
        { nombre: "Plan de cobertura BTS", desc: "Qué jornadas y momentos cubrir." },
      ],
    },
    {
      titulo: "Material",
      color: "var(--cyan)",
      docs: [
        { nombre: "Listado de material grabado", desc: "Registro de material behind-the-scenes." },
        { nombre: "Selección para redes", desc: "Material seleccionado para publicación." },
      ],
    },
    {
      titulo: "Publicación",
      color: "var(--lime)",
      docs: [
        { nombre: "Calendario de publicaciones", desc: "Fechas y canales de publicación." },
        { nombre: "Derechos de uso de material BTS", desc: "Autorizaciones de uso del material." },
      ],
    },
  ],
  "Sonido": [
    {
      titulo: "Plan de sonido",
      color: "var(--gold)",
      docs: [
        { nombre: "Plan de sonido directo", desc: "Estrategia de captación por escena." },
        { nombre: "Lista de micrófonos por escena", desc: "Asignación de microfonía por escena." },
      ],
    },
    {
      titulo: "Equipo",
      color: "var(--cyan)",
      docs: [
        { nombre: "Inventario de equipo de sonido", desc: "Grabadoras, micros y accesorios disponibles." },
        { nombre: "Hoja de alquiler de equipo", desc: "Material alquilado, proveedor y fechas." },
      ],
    },
    {
      titulo: "Reportes",
      color: "var(--violet)",
      docs: [
        { nombre: "Reportes de sonido por toma", desc: "Niveles, notas y tomas válidas por escena." },
        { nombre: "Notas de postsincronización", desc: "Diálogos a regrabar en ADR." },
      ],
    },
  ],
  "Postproducción": [
    {
      titulo: "Montaje",
      color: "var(--rose)",
      docs: [
        { nombre: "Plan de montaje", desc: "Calendario y criterios de montaje." },
        { nombre: "Versiones de corte (EDL)", desc: "Historial de versiones de montaje." },
        { nombre: "Notas de visionado / dailies", desc: "Notas de dirección sobre el material rodado." },
      ],
    },
    {
      titulo: "VFX y color",
      color: "var(--violet)",
      docs: [
        { nombre: "Lista de planos VFX", desc: "Planos que requieren efectos visuales." },
        { nombre: "Guía de color / LUT final", desc: "Look final acordado con Fotografía." },
      ],
    },
    {
      titulo: "Entregas",
      color: "var(--cyan)",
      docs: [
        { nombre: "Plan de entregas (masters)", desc: "Formatos y fechas de entrega final." },
        { nombre: "Checklist de entrega final", desc: "Verificación previa a la entrega." },
      ],
    },
  ],
  "RRHH": [
    {
      titulo: "Personal",
      color: "var(--sky)",
      docs: [
        { nombre: "Listado de equipo y contactos", desc: "Directorio del equipo del proyecto." },
        { nombre: "Altas y bajas", desc: "Incorporaciones y bajas del equipo." },
      ],
    },
    {
      titulo: "Jornada y descansos",
      color: "var(--cyan)",
      docs: [
        { nombre: "Control de horas", desc: "Registro de jornada del equipo." },
        { nombre: "Registro de descansos legales", desc: "Cumplimiento de descansos del convenio." },
      ],
    },
    {
      titulo: "Bienestar",
      color: "var(--lime)",
      docs: [
        { nombre: "Protocolo de prevención de riesgos", desc: "Protocolo de seguridad y salud del rodaje." },
        { nombre: "Canal de incidencias", desc: "Registro de incidencias y resolución." },
      ],
    },
  ],
  "Sostenibilidad": [
    {
      titulo: "Medición",
      color: "var(--green)",
      docs: [
        { nombre: "Huella de carbono del proyecto", desc: "Cálculo y seguimiento de emisiones." },
        { nombre: "Consumo energético", desc: "Consumo energético de rodaje y oficinas." },
      ],
    },
    {
      titulo: "Gestión",
      color: "var(--lime)",
      docs: [
        { nombre: "Plan de gestión de residuos", desc: "Reducción, reciclaje y gestión de residuos." },
        { nombre: "Proveedores sostenibles", desc: "Catering, transporte y materiales sostenibles." },
      ],
    },
    {
      titulo: "Certificación",
      color: "var(--cyan)",
      docs: [
        { nombre: "Checklist producción verde", desc: "Cumplimiento de criterios de producción sostenible." },
        { nombre: "Memoria de sostenibilidad", desc: "Informe final de impacto y medidas tomadas." },
      ],
    },
  ],
  "Marketing": [
    {
      titulo: "Estrategia",
      color: "var(--amber)",
      docs: [
        { nombre: "Plan de marketing", desc: "Estrategia, objetivos y calendario de campañas." },
        { nombre: "Identidad gráfica", desc: "Logotipos, tipografías y guía de marca del proyecto." },
      ],
    },
    {
      titulo: "Contenido",
      color: "var(--cyan)",
      docs: [
        { nombre: "Calendario de redes sociales", desc: "Publicaciones planificadas por canal." },
        { nombre: "Banco de assets", desc: "Imágenes, videos y artes para campañas." },
      ],
    },
  ],
  "Difusión": [
    {
      titulo: "Prensa",
      color: "var(--indigo)",
      docs: [
        { nombre: "Dossier de prensa", desc: "Material de prensa del proyecto." },
        { nombre: "Listado de medios y contactos", desc: "Medios y periodistas de interés para el proyecto." },
        { nombre: "Notas de prensa", desc: "Comunicados publicados o programados." },
      ],
    },
  ],
  "Distribución": [
    {
      titulo: "Estrategia de distribución",
      color: "var(--coral)",
      docs: [
        { nombre: "Plan de distribución", desc: "Festivales, plataformas y ventanas previstas." },
        { nombre: "Listado de festivales", desc: "Festivales objetivo y plazos de inscripción." },
        { nombre: "Acuerdos de distribución", desc: "Contratos con distribuidoras y plataformas." },
      ],
    },
  ],
};
