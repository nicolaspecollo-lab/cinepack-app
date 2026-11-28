# Reglas de la Oficina de QA CINEPACK

Tercera oficina, separada de Desarrollo (`/oficina/`) y Marketing (`/oficina-marketing/`). No diseña ni investiga mercado: **usa la app real como la usaría cada cargo de un rodaje**, contra el proyecto de prueba `[PROYECTO TEST]` definido en `/oficina-qa/proyecto-test/`, y reporta bugs.

## Inviolables
1. Nunca merge a `main`. Nunca se toca el proyecto/base real de Supabase — todo corre contra **`cinepack-dev`** (`https://axkroilebfnfpqzhmhgo.supabase.co`, credenciales en `.env.local`).
2. Cada noche de trabajo va en su propia rama `oficina-qa/AAAA-MM-DD-<lo que corresponda>`, siempre creada desde `claude/oficina-agentes-cinepack-jv179i`. Sin PR a `main` jamás; si una noche genera un cambio de código (poco común — QA prueba, no programa), el PR va contra la rama de oficina igual que las otras dos oficinas.
3. Todo dato de proyecto que entra a `cinepack-dev` desde esta oficina lleva `[PROYECTO TEST]` en el nombre/descripción visible, para que nunca se confunda con un cliente real.
4. Los bugs encontrados **van al `director-oficina` de la Oficina de Desarrollo** (nunca directo a Nico). El `director-oficina` decide si consulta a Nico antes de asignar un bug a su equipo — y **no puede hacer ningún cambio considerable en la app por su cuenta**: solo triage y asignación. Esta oficina (QA) tampoco corrige código — encuentra y reporta, no arregla.
5. Cada cargo usa **su propia cuenta de prueba** (una por cargo, no compartida — ver `/oficina-qa/cargos.md`), siempre contra `cinepack-dev`.

## Mandato de cada cargo (regla de Nico, 17/11/2026, endurecida 20/11/2026 — "los prompts de los agentes de tester son muy malos")
Cada agente-cargo es un **especialista exigente y proactivo** en ese cargo real — no un tester genérico que clickea por clickear, y nunca alguien que mira la pantalla y dice "se ve bien". El prompt de una línea de `cargos.md` (su personalidad) es solo el punto de partida — esto es obligatorio para TODO cargo, cada noche:

1. **Interactuá con cada control real de la herramienta, no solo con el contenido.** Buscador: escribile algo y confirmá que filtra de verdad. Filtros/chips/tabs: probá cada uno. Ordenar/exportar/subir archivo/agregar fila/borrar fila/editar inline: hacelo de verdad al menos una vez cada uno — nunca asumas que "debe funcionar" porque se ve bien.
2. **Probá casos límite a propósito, no solo el camino feliz**: campo vacío, texto muy largo, caracteres especiales/acentos, fecha inválida, buscar algo que no existe, borrar el único registro que hay, un valor numérico negativo o cero donde no debería. Un bug real casi nunca aparece en el caso obvio.
3. **Reconfirmá cada bug antes de reportarlo** (mismos pasos, una segunda vez) — si no se repite, anotalo como "intermitente, no confirmado", nunca como bug confirmado sin reconfirmar.
4. **Todo reporte de cargo, sin excepción, incluye una sección "Ideas de mejora / nuevas herramientas"** — aunque no haya bugs esa noche. Pensá como la persona real de ese cargo en ese rodaje concreto: ¿qué le falta a esta herramienta para resolverle el día a día de verdad? ¿Qué otra herramienta necesitaría este cargo que hoy no existe en el inventario? Si de verdad no se te ocurre nada, decilo explícitamente y por qué — nunca lo dejes en blanco.
5. Exigir el máximo nivel de la herramienta que usa para su trabajo real (si algo le resulta insuficiente para hacer su trabajo de verdad, es un bug/objeción, no un detalle menor).
6. Proponer integraciones con otras herramientas/departamentos cuando el flujo real del rodaje lo pida (ej. si el dato que genera lo necesita otro cargo y hoy no llega).
7. Generar **movimiento real de datos**: crear registros, completar campos, subir archivos de prueba — nunca solo mirar pantallas sin interactuar.

El `director-qa` pasa este mandato completo (no solo un link a este archivo) en el prompt literal con el que invoca a cada cargo — ver `director-qa.md`.

## Informe diario por cargo (regla de Nico, 25/11/2026)
Todos los días, Nico recibe un documento (`/oficina-qa/informes/AAAA-MM-DD.md`) con una sección por cada cargo que trabajó esa noche, en este orden: (1) reverificación de los bugs reportados en noches anteriores de esa herramienta, con OK explícito de "corregido" o "sigue abierto"; (2) qué trabajo hizo hoy contra el proyecto de prueba; (3) bugs encontrados hoy; (4) solución propuesta para cada uno; (5) feedback real del flujo de trabajo de hoy (no solo si funciona, sino cómo se sintió usarlo y qué mejoraría). Ver el detalle completo y el orden exacto en `.claude/agents/director-qa.md`. Esto se suma a (no reemplaza) `/oficina-qa/bugs/` e `/oficina-qa/ideas/`, que siguen siendo el insumo interno hacia desarrollo.

## Presupuesto de tiempo (regla de Nico, 25/11/2026)
Cada cargo calcula que tiene 2 horas reales (la ventana 1:00–3:00 Madrid) y se frena ANTES de quedarse sin créditos de la sesión, priorizando: reverificación de bugs viejos ya empezada → escribir el informe de 5 partes con lo que tiene → recién después, si queda margen, seguir probando cosas nuevas. Un informe parcial entregado a tiempo vale más que uno completo que nunca llega.

## El informe siempre va en PDF también (regla de Nico, 28/11/2026)
El informe diario por cargo nunca se entrega solo como markdown — siempre se genera también el PDF con `oficina/plantilla-informe/` (acento `--cyan` `#19CBE6` para distinguir esta oficina de Desarrollo/Marketing) y se manda a Nico con SendUserFile, igual que cualquier dossier. No es opcional ni "si hay tiempo" — es parte de cerrar la entrega, como ya es regla para los dossiers de Desarrollo.

## Recursos reales del contenedor — causa raíz de la saturación del 27-28/11 (regla de Nico, 28/11/2026)
La noche del 27-28/11, lanzar varios cargos en paralelo (cada uno con su propio worktree + servidor Next.js + navegador Playwright) saturó la memoria del contenedor (~15GB totales) y además quemó el presupuesto de uso de la cuenta tan rápido que se pegó contra el límite de 5 horas y el semanal la misma noche. Reglas permanentes para no repetirlo:
1. **Un solo servidor de desarrollo compartido por noche**, no uno por cargo. Quien orquesta lo levanta una vez (worktree único, ya estable) y cada cargo se conecta a esa misma URL con su propia sesión de navegador — nunca crea su propio `next dev`.
2. **Concurrencia real limitada a 2-3 cargos corriendo Playwright a la vez**, nunca 10+. El resto espera en cola y se lanza recién cuando se libera un lugar.
3. **Tandas chicas y escalonadas**, no ráfagas grandes: lanzar la siguiente tanda cuando la anterior termina, no todas de entrada — así el presupuesto de la cuenta se gasta parejo en vez de todo junto.
Esto aplica también al ciclo diario de Desarrollo si corren varios expedientes en paralelo — mismo riesgo, misma regla.

## Panel en vivo
Mismo criterio que las otras dos oficinas: cada agente se marca `estado:"busy"` en el panel (ArtifactData, colección `agentes`, url `https://claude.ai/artifact/S99rUHDdJbz5u1amLjtdLK`) **al empezar** un paso real, con `tarea_actual` describiendo lo que está haciendo, y vuelve a `idle` al terminar.

## Horario
Ciclo nocturno automático, todas las noches, **1:00–3:00 hora de Madrid** (2 horas, regla de Nico 20/11/2026 para cuidar el límite de uso — antes era una ventana más larga). Ver trigger "Ciclo nocturno Oficina de QA CINEPACK". Con menos tiempo disponible, priorizar calidad real de la prueba (pocos cargos bien probados) sobre cubrir muchos cargos superficialmente.

## Estructura
```
/oficina-qa/
  CLAUDE.md
  cargos.md                 <- ~50 cargos, herramienta, cuenta de prueba, personalidad
  proyecto-test/
    guion.md                <- película ficticia, 94 min, con complejidades reales
    desglose-guion.md
    plan-rodaje-esquema.md
    presupuesto-aproximado.md
    reparto-ficticio.md
  scripts/
    crear-cuentas-qa.mjs    <- alta de las cuentas de prueba (signup público + proxy)
  bugs/
    AAAA-MM-DD.md           <- bugs encontrados esa noche, antes de entregarlos al director-oficina
  ideas/
    AAAA-MM-DD.md           <- ideas de mejora/nuevas herramientas de todos los cargos
  informes/
    AAAA-MM-DD.md           <- informe diario por cargo para Nico (regla 25/11/2026, ver director-qa.md)
```
