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

// BETA cerrado (jul-2026): solo estos 4 departamentos tienen sus herramientas habilitadas
// para usuarios comunes. El resto se ve (para transmitir la propuesta completa del producto)
// pero cada herramienta se muestra bloqueada con un cartel "Próximamente". Super_admin
// siempre accede sin restricción, para poder ir habilitando y probando de a uno.
export const MODULOS_BETA_ACTIVOS = ["Ejecutivo", "Dirección", "Guion", "Producción"];

// Estados de tareas, consistentes en toda la app (Pulso, Kanban, Inbox).
export const ESTADOS_TAREA = ["pendiente", "en_curso", "hecho"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];
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

export type DocTemplate = { id: string };
export type DocGrupo = { id: string; color: string; docs: DocTemplate[] };

// Catálogo de documentos esperados por departamento (la "Biblia de funcionamiento").
// Son plantillas: si existe un documento subido con ese id se muestra como completado,
// si no, aparece "Vacío" con opción de subirlo. El texto (nombre/desc) vive en i18n,
// namespace "documentosCatalogo", bajo <departamento>.<grupoId>.docs.<docId>.
export const DOCUMENTOS_POR_DEPARTAMENTO: Record<string, DocGrupo[]> = {
  "Dirección": [
    {
      id: "guion-y-desarrollo",
      color: "var(--lime)",
      docs: [
        { id: "guion-definitivo" },
        { id: "biblia-de-personajes" },
        { id: "referencias-visuales-moodboard" },
      ],
    },
    {
      id: "planificacion",
      color: "var(--cyan)",
      docs: [
        { id: "plan-de-rodaje-maestro" },
        { id: "shot-list-general" },
        { id: "calendario-de-ensayos" },
      ],
    },
    {
      id: "continuidad",
      color: "var(--gold)",
      docs: [
        { id: "partes-de-script" },
        { id: "notas-de-direccion-por-escena" },
      ],
    },
  ],
  "Producción": [
    {
      id: "planificacion",
      color: "var(--cyan)",
      docs: [
        { id: "plan-de-rodaje-maestro" },
        { id: "stripboard" },
        { id: "calendario-general-del-proyecto" },
      ],
    },
    {
      id: "logistica",
      color: "var(--blue)",
      docs: [
        { id: "localizaciones-y-permisos" },
        { id: "hojas-de-ruta-y-transporte" },
        { id: "catering-y-dietas" },
      ],
    },
    {
      id: "coordinacion",
      color: "var(--lime)",
      docs: [
        { id: "ordenes-de-rodaje-callsheets" },
        { id: "partes-de-produccion-diarios" },
      ],
    },
  ],
  "Fotografía": [
    {
      id: "plan-tecnico-de-camara",
      color: "var(--blue)",
      docs: [
        { id: "shot-list-desglose-de-planos" },
        { id: "plan-de-iluminacion" },
        { id: "esquemas-de-set" },
      ],
    },
    {
      id: "equipo",
      color: "var(--cyan)",
      docs: [
        { id: "inventario-de-camara-y-optica" },
        { id: "inventario-de-iluminacion" },
        { id: "hoja-de-alquiler-de-equipo" },
      ],
    },
    {
      id: "referencias",
      color: "var(--violet)",
      docs: [
        { id: "look-book-referencias-de-fotografia" },
        { id: "luts-y-pruebas-de-camara" },
      ],
    },
  ],
  "Arte": [
    {
      id: "direccion-de-arte",
      color: "var(--pink)",
      docs: [
        { id: "moodboard-de-arte" },
        { id: "paleta-de-color-por-escena" },
        { id: "planos-de-decorado" },
      ],
    },
    {
      id: "atrezzo-y-vestuario",
      color: "var(--rose)",
      docs: [
        { id: "desglose-de-atrezzo-por-escena" },
        { id: "desglose-de-vestuario-por-personaje" },
        { id: "continuidad-de-vestuario" },
      ],
    },
    {
      id: "produccion-de-arte",
      color: "var(--orange)",
      docs: [
        { id: "presupuesto-de-arte" },
        { id: "proveedores-y-compras" },
      ],
    },
  ],
  "Guion": [
    {
      id: "versiones",
      color: "var(--yellow)",
      docs: [
        { id: "guion-literario-ultima-version" },
        { id: "historial-de-versiones-y-cambios" },
        { id: "sinopsis-y-escaleta" },
      ],
    },
    {
      id: "desglose",
      color: "var(--lime)",
      docs: [
        { id: "desglose-de-escenas-ia" },
        { id: "desglose-tecnico-planos" },
      ],
    },
    {
      id: "derechos",
      color: "var(--violet)",
      docs: [
        { id: "cesion-de-derechos-de-guion" },
      ],
    },
  ],
  "Ejecutivo": [
    {
      id: "presupuesto-y-costos",
      color: "var(--lime)",
      docs: [
        { id: "presupuesto-general" },
        { id: "presupuesto-por-departamento" },
        { id: "control-de-costos-cost-report" },
        { id: "flujo-de-caja-cashflow" },
      ],
    },
    {
      id: "facturacion",
      color: "var(--cyan)",
      docs: [
        { id: "facturas-emitidas" },
        { id: "facturas-de-proveedores" },
        { id: "pendientes-de-pago" },
      ],
    },
    {
      id: "pagos-y-rendiciones",
      color: "var(--yellow)",
      docs: [
        { id: "comprobantes-de-pago" },
        { id: "nominas-del-equipo" },
        { id: "caja-chica-petty-cash" },
        { id: "rendicion-de-gastos" },
      ],
    },
    {
      id: "contratos-y-legal",
      color: "var(--pink)",
      docs: [
        { id: "contratos-de-equipo" },
        { id: "contratos-de-reparto" },
        { id: "contratos-de-proveedores" },
        { id: "cesion-de-derechos" },
        { id: "acuerdos-de-confidencialidad-nda" },
      ],
    },
    {
      id: "financiacion-y-seguros",
      color: "var(--violet)",
      docs: [
        { id: "plan-de-financiacion" },
        { id: "ayudas-y-subvenciones" },
        { id: "inversores-y-coproduccion" },
        { id: "polizas-de-seguro" },
        { id: "permisos-de-rodaje" },
      ],
    },
  ],
  "Casting": [
    {
      id: "procesos-de-seleccion",
      color: "var(--orange)",
      docs: [
        { id: "listado-de-candidatos" },
        { id: "convocatoria-de-casting" },
        { id: "resultados-de-audiciones" },
      ],
    },
    {
      id: "reparto-confirmado",
      color: "var(--lime)",
      docs: [
        { id: "ficha-de-reparto" },
        { id: "contratos-de-reparto" },
        { id: "cesion-de-imagen" },
      ],
    },
  ],
  "Reparto": [
    {
      id: "ficha-de-personaje",
      color: "var(--white)",
      docs: [
        { id: "ficha-de-personaje-y-arco" },
        { id: "guion-con-escenas-marcadas" },
      ],
    },
    {
      id: "logistica-personal",
      color: "var(--cyan)",
      docs: [
        { id: "calendario-de-citaciones" },
        { id: "vestuario-y-maquillaje-asignado" },
      ],
    },
    {
      id: "contractual",
      color: "var(--pink)",
      docs: [
        { id: "contrato-individual" },
        { id: "cesion-de-imagen" },
      ],
    },
  ],
  "Making of": [
    {
      id: "planificacion-de-contenido",
      color: "var(--teal)",
      docs: [
        { id: "calendario-editorial" },
        { id: "plan-de-cobertura-bts" },
      ],
    },
    {
      id: "material",
      color: "var(--cyan)",
      docs: [
        { id: "listado-de-material-grabado" },
        { id: "seleccion-para-redes" },
      ],
    },
    {
      id: "publicacion",
      color: "var(--lime)",
      docs: [
        { id: "calendario-de-publicaciones" },
        { id: "derechos-de-uso-de-material-bts" },
      ],
    },
  ],
  "Sonido": [
    {
      id: "plan-de-sonido",
      color: "var(--gold)",
      docs: [
        { id: "plan-de-sonido-directo" },
        { id: "lista-de-microfonos-por-escena" },
      ],
    },
    {
      id: "equipo",
      color: "var(--cyan)",
      docs: [
        { id: "inventario-de-equipo-de-sonido" },
        { id: "hoja-de-alquiler-de-equipo" },
      ],
    },
    {
      id: "reportes",
      color: "var(--violet)",
      docs: [
        { id: "reportes-de-sonido-por-toma" },
        { id: "notas-de-postsincronizacion" },
      ],
    },
  ],
  "Postproducción": [
    {
      id: "montaje",
      color: "var(--rose)",
      docs: [
        { id: "plan-de-montaje" },
        { id: "versiones-de-corte-edl" },
        { id: "notas-de-visionado-dailies" },
      ],
    },
    {
      id: "vfx-y-color",
      color: "var(--violet)",
      docs: [
        { id: "lista-de-planos-vfx" },
        { id: "guia-de-color-lut-final" },
      ],
    },
    {
      id: "entregas",
      color: "var(--cyan)",
      docs: [
        { id: "plan-de-entregas-masters" },
        { id: "checklist-de-entrega-final" },
      ],
    },
  ],
  "RRHH": [
    {
      id: "personal",
      color: "var(--sky)",
      docs: [
        { id: "listado-de-equipo-y-contactos" },
        { id: "altas-y-bajas" },
      ],
    },
    {
      id: "jornada-y-descansos",
      color: "var(--cyan)",
      docs: [
        { id: "control-de-horas" },
        { id: "registro-de-descansos-legales" },
      ],
    },
    {
      id: "bienestar",
      color: "var(--lime)",
      docs: [
        { id: "protocolo-de-prevencion-de-riesgos" },
        { id: "canal-de-incidencias" },
      ],
    },
  ],
  "Sostenibilidad": [
    {
      id: "medicion",
      color: "var(--green)",
      docs: [
        { id: "huella-de-carbono-del-proyecto" },
        { id: "consumo-energetico" },
      ],
    },
    {
      id: "gestion",
      color: "var(--lime)",
      docs: [
        { id: "plan-de-gestion-de-residuos" },
        { id: "proveedores-sostenibles" },
      ],
    },
    {
      id: "certificacion",
      color: "var(--cyan)",
      docs: [
        { id: "checklist-produccion-verde" },
        { id: "memoria-de-sostenibilidad" },
      ],
    },
  ],
  "Marketing": [
    {
      id: "estrategia",
      color: "var(--amber)",
      docs: [
        { id: "plan-de-marketing" },
        { id: "identidad-grafica" },
      ],
    },
    {
      id: "contenido",
      color: "var(--cyan)",
      docs: [
        { id: "calendario-de-redes-sociales" },
        { id: "banco-de-assets" },
      ],
    },
  ],
  "Difusión": [
    {
      id: "prensa",
      color: "var(--indigo)",
      docs: [
        { id: "dossier-de-prensa" },
        { id: "listado-de-medios-y-contactos" },
        { id: "notas-de-prensa" },
      ],
    },
  ],
  "Distribución": [
    {
      id: "estrategia-de-distribucion",
      color: "var(--coral)",
      docs: [
        { id: "plan-de-distribucion" },
        { id: "listado-de-festivales" },
        { id: "acuerdos-de-distribucion" },
      ],
    },
  ],
};
