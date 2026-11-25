# Necesidad — Notas de preparación del personaje (Reparto principal)

Expediente sin investigador/arquitecto disponible en esta pasada: necesidad
construida directamente por el desarrollador, rápida pero real, sin inventar
afirmaciones de investigación de mercado (no se citan competidores ni datos
externos — solo análisis de la necesidad real del cargo y cruce con el
inventario existente).

## Estado de partida
`rep-notas-preparacion` figuraba en `oficina/inventario.md` como Vacía
(`tipo: "nota"`, sin contenido) para el cargo **Reparto principal**,
departamento **Reparto**.

## Qué necesita de verdad un actor de Reparto principal (trabajo de mesa)
Antes de rodar, un actor que prepara un personaje principal trabaja
típicamente sobre:
1. **Biografía / backstory** del personaje: historia antes de la película,
   rasgos físicos y gestuales, voz y forma de hablar, un objeto personal
   significativo, motivación central.
2. **Objetivos por escena**: qué necesita lograr el personaje en cada
   escena concreta (distinto de la "intención actoral" que anota el director
   en ensayo — acá es la propia lista de trabajo del actor).
3. **Relaciones con otros personajes**: tipo de vínculo (familia, alianza,
   romance, conflicto, rivalidad, mentoría) y qué significa cada relación
   para la construcción del propio personaje.
4. **Arco emocional**: una progresión de puntos (no necesariamente atados a
   una escena concreta — a veces es "Acto 1" o "Punto medio") con el estado
   emocional trabajado y notas de cómo se construyó físicamente.
5. **Notas de ensayo recibidas**: una versión corta y propia, desde el lado
   del actor, de lo que el director le indicó en los ensayos — un registro
   personal de "qué me dijeron", no el cuaderno completo de dirección.

## Por qué esto NO duplica nada existente
- **`dir-notas-ensayo`** ("Notas de ensayo por actor/personaje", Dirección de
  actores): es la vista del **director** sobre el actor — una sesión de
  ensayo por fila, con arco/objetivo de personaje editados por quien dirige,
  visible o no al resto del equipo. `rep-notas-preparacion` es lo opuesto:
  la vista del **actor sobre sí mismo**, con su propio trabajo de mesa
  (biografía, relaciones, objeto personal) que el director nunca completa.
  Las "notas de ensayo recibidas" de esta herramienta son una captura breve
  y personal de lo que el actor se queda del ensayo — no una copia de la
  tabla completa de `dir-notas-ensayo`.
- **`rep-diario-personaje`** ("Diario de personaje / preparación del rol",
  cargo "Protagonista"): es continuidad física y diario en primera persona
  **por escena de rodaje real** (fecha de rodaje, continuidad de vestuario/
  pelo/heridas) — un registro cronológico atado al calendario de producción.
  `rep-notas-preparacion` es atemporal: biografía y arco no cambian cada vez
  que se rueda una escena, se preparan una vez y se consultan.
- **`rep-notas-escenas`** ("Marcas de continuidad", Reparto secundario): es
  continuidad física por escena agrupada por escena de rodaje, no
  preparación de personaje.

## Decisión de diseño (ver también apartado 6/9 del dossier completo,
pendiente de redactar por el comité)
Patrón elegido: **ficha de personaje con pestañas internas** (Biografía /
Objetivos por escena / Relaciones / Arco emocional / Notas de ensayo
recibidas), con un nivel 1 de tarjetas navegables por personaje (nunca
tabla genérica — regla endurecida de Nico, 25/11).

Se evaluaron 3 patrones antes de elegir (ver comentario completo al inicio
de `app/hoy/RepNotasPreparacionPanel.tsx`):
1. Línea de tiempo por escena (como `dir-notas-ensayo`) — descartada: la
   escena no es la unidad real acá, biografía/relaciones no están atadas a
   una escena puntual.
2. Tablero con secciones sueltas en una sola pantalla larga — descartada:
   en 390px un actor repasando antes de entrar a rodar necesita ir directo
   a una sección (objetivo de la escena que va a rodar ya, por ejemplo), no
   desplazarse por todas.
3. **Elegida: ficha con pestañas** — modelo mental real de un "cuaderno de
   personaje" con separadores, resuelve además el problema de 390px (una
   pestaña a la vez, acceso directo).

Contenido precargado: 2 personajes de ejemplo — "Mara Ferreiro" (protagonista
completa: biografía, 4 objetivos por escena distintos, 3 relaciones con tono
de color propio, arco emocional de 4 puntos, 3 notas de ensayo recibidas) y
"Noa" (personaje secundario con preparación más liviana pero igualmente
real), para que la grilla muestre variedad real desde el primer uso.

Cero texto introductorio renderizado: confirmado en pantalla — el panel
bespoke nunca pasa por el párrafo `hp-hint` del motor genérico (bypassa
`HerramientaPanel.tsx` por completo, igual que `NotasEnsayoPanel`/
`MoMemoriaPanel`); solo título + contenido real.
