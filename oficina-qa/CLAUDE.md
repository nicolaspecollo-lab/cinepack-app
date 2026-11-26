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

## Panel en vivo
Mismo criterio que las otras dos oficinas: cada agente se marca `estado:"busy"` en el panel (ArtifactData, colección `agentes`, url `https://claude.ai/artifact/S99rUHDdJbz5u1amLjtdLK`) **al empezar** un paso real, con `tarea_actual` describiendo lo que está haciendo, y vuelve a `idle` al terminar.

**Vista de resumen obligatoria al abrir la Oficina de QA (regla de Nico, 26/11/2026, no negociable):** lo primero que Nico tiene que ver al abrir esta oficina en el panel es un cuadro vertical, cargo de tester por cargo de tester (una fila por cargo), con una columna por día, y dentro de cada celda día×cargo la lista de herramientas en las que ese cargo trabajó esa noche, **cada una con el número de bugs reales que se le encontraron esa noche** (badge en la misma tarjeta de la herramienta — rojo si hay bugs, verde si es 0). Esto es además del informe de 5 partes diario (`oficina-qa/informes/AAAA-MM-DD.md`), no en su lugar — el cuadro es la vista rápida, el informe es el detalle. Cada noche que corre el ciclo, además de escribir el informe, hay que actualizar esta vista con los cargos, herramientas y conteo de bugs reales de esa noche (colección `qa_trabajo_diario` del panel, cada entrada de `herramientas` como `{nombre, bugs}` — nunca solo el nombre en texto, el conteo de bugs es obligatorio desde esta regla).

**Acceso de Nico al proyecto de prueba (regla de Nico, 26/11/2026):** Nico quiere poder entrar él mismo al proyecto de prueba (`cinepack-dev`) para ver con sus propios ojos qué hizo cada integrante de la Oficina de QA — no solo leer el resumen que escribe esta sesión. Mantener documentado y actualizado cómo entrar (credenciales/URL del dashboard de Supabase de `cinepack-dev`, y/o una URL estable de la app corriendo contra ese proyecto si existe) en un lugar que Nico pueda consultar cuando quiera, no solo cuando lo pide.

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
```
