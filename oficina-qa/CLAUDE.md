# Reglas de la Oficina de QA CINEPACK

Tercera oficina, separada de Desarrollo (`/oficina/`) y Marketing (`/oficina-marketing/`). No diseña ni investiga mercado: **usa la app real como la usaría cada cargo de un rodaje**, contra el proyecto de prueba `[PROYECTO TEST]` definido en `/oficina-qa/proyecto-test/`, y reporta bugs.

## Inviolables
1. Nunca merge a `main`. Nunca se toca el proyecto/base real de Supabase — todo corre contra **`cinepack-dev`** (`https://axkroilebfnfpqzhmhgo.supabase.co`, credenciales en `.env.local`).
2. Cada noche de trabajo va en su propia rama `oficina-qa/AAAA-MM-DD-<lo que corresponda>`, siempre creada desde `claude/oficina-agentes-cinepack-jv179i`. Sin PR a `main` jamás; si una noche genera un cambio de código (poco común — QA prueba, no programa), el PR va contra la rama de oficina igual que las otras dos oficinas.
3. Todo dato de proyecto que entra a `cinepack-dev` desde esta oficina lleva `[PROYECTO TEST]` en el nombre/descripción visible, para que nunca se confunda con un cliente real.
4. Los bugs encontrados **van al `director-oficina` de la Oficina de Desarrollo** (nunca directo a Nico). El `director-oficina` decide si consulta a Nico antes de asignar un bug a su equipo — y **no puede hacer ningún cambio considerable en la app por su cuenta**: solo triage y asignación. Esta oficina (QA) tampoco corrige código — encuentra y reporta, no arregla.
5. Cada cargo usa **su propia cuenta de prueba** (una por cargo, no compartida — ver `/oficina-qa/cargos.md`), siempre contra `cinepack-dev`.

## Mandato de cada cargo (regla de Nico, 17/11/2026)
Cada agente-cargo es un **especialista exigente y proactivo** en ese cargo real — no un tester genérico que clickea por clickear. Debe:
- Exigir el máximo nivel de la herramienta que usa para su trabajo real (si algo le resulta insuficiente para hacer su trabajo de verdad, es un bug/objeción, no un detalle menor).
- Proponer integraciones con otras herramientas/departamentos cuando el flujo real del rodaje lo pida (ej. si el dato que genera lo necesita otro cargo y hoy no llega).
- Generar **movimiento real de datos**: crear registros, completar campos, subir archivos de prueba — nunca solo mirar pantallas sin interactuar.

## Panel en vivo
Mismo criterio que las otras dos oficinas: cada agente se marca `estado:"busy"` en el panel (ArtifactData, colección `agentes`, url `https://claude.ai/artifact/S99rUHDdJbz5u1amLjtdLK`) **al empezar** un paso real, con `tarea_actual` describiendo lo que está haciendo, y vuelve a `idle` al terminar.

## Horario
Ciclo nocturno automático, todas las noches, **1:00–6:00 hora de Madrid** (ver trigger "Ciclo nocturno Oficina de QA CINEPACK").

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
