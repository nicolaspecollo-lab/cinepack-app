# Plan de trabajo — Oficina de Marketing CINEPACK

> Borrador para aprobación de Nico. Ningún agente ejecuta tareas reales hasta que Nico apruebe o ajuste este plan.

## 1. Diagnóstico de partida

Hoy sabemos que CINEPACK es una herramienta de gestión integral de rodajes (17 departamentos, ~45 herramientas de departamento, la mayoría ya consolidadas según `/oficina/inventario.md`), construida sobre Next.js 16 / Supabase, con web propia y cerca del lanzamiento. No sabemos: si hay un pricing de referencia definido, si ya existe algún cliente/lead o uso piloto real, dónde está publicada la web (URL) y si ya tiene tráfico, ni qué mercado geográfico prioriza Nico para el lanzamiento. Sin estos datos no podemos calibrar alcance ni urgencia de los informes — van como preguntas abiertas en la sección 4.

## 2. Primeras tareas por agente

**analista-mercado-cine**
- Tarea: números de largometrajes producidos en España 2015-2025 (fuente ICAA), y el mismo bloque para Francia (CNC), Alemania, Italia y Reino Unido (organismo público equivalente de cada uno, o base LUMIERE del Observatorio Europeo del Audiovisual si no hay fuente nacional directa).
- Entrega esperada: `informes/AAAA-MM-DD_produccion-ue-por-pais.md` — tabla por país/año, fuente de cada cifra, huecos de dato explícitos donde no haya fuente oficial.

**cartografo-productoras**
- Tarea: listado de las 20-30 productoras más relevantes de España por volumen de producción, con tamaño, evidencia pública de uso de herramientas de gestión (StudioBinder, Movie Magic, etc.) y contacto público verificable.
- Entrega esperada: `informes/AAAA-MM-DD_productoras-espana.md` — tabla con nombre, tamaño (con fuente), herramienta conocida si hay evidencia, contacto público o "sin dato público".

**vigia-competencia**
- Tarea: ficha de PeliProp (precio, plan, qué ofrece específicamente para convocatorias ICAA, a quién apunta) como primer foco por ser el competidor directo en España; en paralelo, relevamiento general de precios/planes públicos de StudioBinder, Yamdu, Movie Magic y Celtx.
- Entrega esperada: `informes/AAAA-MM-DD_competencia-peliprop.md` + `informes/AAAA-MM-DD_competencia-precios-general.md` — por competidor: precio/plan, funciones clave, fuente, fecha de corte, y sección "qué le falta a cada uno" (oportunidad para CINEPACK).

Los tres pueden arrancar en paralelo apenas Nico apruebe este plan — no dependen entre sí.

## 3. Orden de prioridad y dependencias

- **Ahora, en paralelo:** analista-mercado-cine, cartografo-productoras, vigia-competencia. Ninguno depende de otro para esta primera pasada.
- **Espera:** estratega-posicionamiento no arranca hasta que al menos un informe de mercado/producción y un informe de competencia estén en `informes/aprobados/` (aprobados explícitamente por Nico en el panel, no solo entregados).
- **Espera más:** disenador-marketing y redactor-contenidos no arrancan hasta que estratega-posicionamiento tenga mensaje y segmentación validados en `plan-marketing.md` — nunca trabajan sobre datos crudos sin aprobar.
- **Transversal:** comite-marketing revisa rigor de cada informe (fuentes, nada inventado, ángulo accionable, novedad real) antes de que cualquiera se registre como `entrega` pendiente de la aprobación de Nico. Esto corre después de cada entrega de los tres primeros agentes, no es un paso aparte en el calendario.

## 4. Preguntas abiertas para Nico

1. **Mercado prioritario**: ¿arrancamos por España en solitario o directamente con el bloque UE (España + Francia + Alemania + Italia + Reino Unido) para la primera vuelta de datos de producción y productoras?
2. **Pricing de referencia**: ¿ya existe un precio o modelo de suscripción pensado para CINEPACK, o el vigía de competencia debería relevar precios de la competencia primero para informar esa decisión?
3. **Estado comercial real**: ¿hay algún cliente, lead o uso piloto ya en marcha que el analista/cartógrafo deberían conocer para no proponer como "target" a alguien que ya es cliente? ¿La web ya está online y en qué URL, para poder referenciarla en los informes?
4. **Acceso al repo real**: como señala `/oficina/stack.md`, esta oficina solo tiene acceso al repo de muestreo — ¿hay forma de contrastar el inventario de herramientas (sección de inventario.md) contra el repo real antes de que el equipo de marketing hable de funciones concretas del producto?
