# Dossier — Notas de ensayo por actor/personaje

Cargo: Dirección de actores · Departamento: Dirección · Fecha: 21/11/2026

> Nota: este archivo lo abre el desarrollador con las secciones 6 y 9 (parte de
> componentes) completas, según el flujo de la oficina. El resto de las
> secciones (1-5, 7, 8, 10, 11) las completa el director-oficina a partir de
> `investigacion.md` y `arquitectura.md` del mismo expediente, antes de
> generar el PDF con la plantilla de marca.

## 6. Propuesta

### 6.0 Decisión de fondo
No es una tabla. El dato se guarda con el mismo motor de siempre (`herramienta_filas`, una fila = una sesión de ensayo de un personaje), pero la pantalla nunca muestra esas filas como tabla: `NotasEnsayoPanel.tsx` las agrupa por personaje y las presenta en dos niveles de navegación, exactamente como pidió la arquitectura (sección 1 de `arquitectura.md`).

### 6.1 Flujo de uso — Nivel 1: selector de personaje
1. El director/a de actores abre "Notas de ensayo por actor/personaje" desde su panel de cargo. Ve una grilla de **tarjetas**, una por personaje con sesiones registradas (nunca una tabla ni una pantalla vacía genérica: si el proyecto no tiene ninguna sesión todavía, se siembran solas 3 personajes de ejemplo con progresión real — ver 6.4).
2. Cada tarjeta muestra: nombre del personaje, actor/actriz asignado, cuántas sesiones tiene y la fecha de la última, y un adelanto de "pendiente para el próximo ensayo" de la sesión más reciente — así se ve de un vistazo qué quedó abierto sin entrar.
3. Si alguna sesión de ese personaje es privada, la tarjeta lleva un sello "🔒" (icono `key`) discreto.
4. Botón "Nuevo personaje" (solo editable): pide nombre y actor, crea la primera sesión en blanco y entra directo a su línea de tiempo.
5. Tocar una tarjeta entra al Nivel 2.

### 6.2 Flujo de uso — Nivel 2: línea de tiempo del personaje
1. Arriba, **cabecera fija** (no se puede perder de vista scrolleando): actor/actriz, arco del personaje y objetivo del personaje — editable directo ahí (se repite en todas las sesiones de ese personaje para no depender de una tabla aparte).
2. Si la sesión más reciente escribió algo en "continuidad del arco", aparece un bloque destacado con acento coral: **"Qué cambió desde la última sesión"** — es el requisito explícito de la arquitectura ("visible sin tener que buscarlo"), no un campo más perdido en el formulario.
3. Debajo, la **línea de tiempo vertical**: una tarjeta expandible por sesión de ensayo, ordenadas de la más reciente a la más antigua, con un punto de línea de tiempo a la izquierda (ámbar si la sesión es privada, coral si no).
4. Tocar el encabezado de una sesión (fecha + chips de escena) la expande y muestra: objetivo de la escena, ajuste de interpretación trabajado, continuidad del arco (si no es la primera sesión del personaje), pendiente para el próximo ensayo, adjunto de audio/foto y visibilidad.
5. Botón "Nueva sesión" (solo editable): crea una sesión nueva precargada con el actor/arco/objetivo del personaje ya puestos, fecha de hoy, y la deja para completar — nunca repite el personaje a mano.
6. Cada campo se guarda solo (`onBlur`), con aviso breve "Guardado" — mismo patrón que el resto de la app (Plan de sonido, Moodboard).
7. Botón "Todos los personajes" vuelve al Nivel 1.

### 6.3 Flujo — privacidad de una nota
1. Al completar una sesión, el director de actores puede marcar "Privada" en vez de "Visible al equipo" (ej. una duda sobre si el actor está logrando el objetivo, antes de llevarlo a dailies).
2. Esa sesión deja de aparecer para cualquier otro usuario del departamento — en este prototipo el filtro se aplica en cliente comparando `created_by` con el usuario actual (ver 9.3); queda pendiente la policy de fila a nivel de base de datos que exige la arquitectura (riesgo #2 de `arquitectura.md`) antes de llevar esto a producción.

### 6.4 Contenido precargado (nunca un cuadro vacío)
Si un proyecto no tiene ninguna sesión registrada todavía, el panel siembra automáticamente 3 personajes de ejemplo con progresión real de arco a lo largo de varias semanas (no un caso pelado):
- **Marta Oliveira** (protagonista): 3 sesiones (2/9, 16/9, 5/10) mostrando el mismo gesto físico (temblor de mano) evolucionando de síntoma de shock a gesto consciente que ella misma controla — cierre de arco explícito con aviso a Script.
- **Tomás Reguera** (antagonista): 2 sesiones (9/9, 23/9) donde aparece y se formaliza un tic de continuidad (se ajusta la corbata al mentir), con nota explícita de avisar a Script desde qué escena existe ese gesto.
- **Nadia Reguera** (secundaria, 15 años): 1 sesión (30/9) con una nota marcada **Privada** — duda real del director de actores sin resolver todavía, mostrando el caso de uso de la visibilidad restringida.

## 9. Especificación técnica (parte de componentes)

### 9.1 Por qué un panel a medida y no el motor genérico
`tipo: "tabla"` en `herramientas.ts` describe el **dato** (una fila = una sesión), pero la interacción real tiene una jerarquía de dos niveles (Personaje → Sesión) que el motor de tabla/ficha/galería genérico de `HerramientaPanel.tsx` no expresa sin aplanarla — exactamente la objeción que el comité de calidad golpea ("elección de tipo no justificada"). Se construyó `NotasEnsayoPanel.tsx`, montado por `HerramientasPanel.tsx` con la misma condición `abierta.id === NOTAS_ENSAYO_HERRAMIENTA_ID` que ya usan `PlanSonidoPanel`, `MoodboardPanel` y `MoodboardFotoPanel` para sus propios paneles a medida.

### 9.2 Componentes nuevos
- `app/hoy/notasEnsayoFilas.ts` — tipos (`SesionEnsayo`), conversión fila-de-base ↔ tipo (`datosASesion`/`sesionADatos`), constantes (`NOTAS_ENSAYO_DEPARTAMENTO`, `NOTAS_ENSAYO_HERRAMIENTA_ID`, `VISIBILIDAD`) y el set de sesiones de ejemplo (`SESIONES_EJEMPLO`).
- `app/hoy/useNotasEnsayoFilas.ts` — hook de datos: lee/crea/edita/borra filas en `herramienta_filas` (mismo mecanismo que `usePlanSonidoFilas`), expone `sesiones` ya tipadas con `esMia` (comparación `created_by` vs. usuario actual) y `sembrarEjemplos()` para la siembra inicial.
- `app/hoy/NotasEnsayoPanel.tsx` — la vista: Nivel 1 (grilla de tarjetas por personaje, agrupación calculada con `useMemo` a partir de las filas visibles) y Nivel 2 (cabecera de arco fija + línea de tiempo de `SesionCard` expandibles). Reutiliza `PrintHeader` de `HerramientaPanel.tsx` para la vista de impresión y el icono `key`/`clock`/`alert-triangle`/`arrow-right`/`chevron-up`/`chevron-down` ya existentes en `app/components/Icon.tsx` (no se agregó ningún icono nuevo).
- `app/herramientas.ts` — entrada `dir-notas-ensayo` reemplazada: antes `{ tipo: "nota" }` vacía, ahora `tipo: "tabla"` con las 12 columnas del modelo de datos de `arquitectura.md` (sección 2), usadas para que el dato quede tipado aunque la grilla genérica nunca se monte para este id.
- `app/hoy/HerramientasPanel.tsx` — se agregó la detección `esNotasEnsayo` (mismo patrón que `esPlanSonido`/`esMoodboard`/`esMoodboardFoto`) para montar `NotasEnsayoPanel` en vez de `HerramientaPanel`.
- `app/hoy/dashboard.css` — bloque nuevo `NOTAS DE ENSAYO POR ACTOR/PERSONAJE` al final del archivo, con acento propio `var(--coral)` (sin uso previo como acento fijo de ninguna otra herramienta, ver `sistema-diseno.md`), clases `ens-*` para tarjetas de personaje, cabecera de arco y línea de tiempo, con media query `max-width:640px` para mobile-first real.

### 9.3 Modelo de datos (coincide con `arquitectura.md` sección 2)
Una fila de `herramienta_filas` por sesión de ensayo:
`personaje, actor, arco_personaje, objetivo_personaje, fecha, escenas (chips separados por coma), objetivo_escena, ajuste_interpretacion, continuidad_arco, pendiente_proximo, adjunto_nota, privada ("Visible al equipo" | "Privada")`.

Simplificación respecto a la arquitectura, documentada como riesgo: el campo `adjuntos` propuesto como columna `repetible` (sub-filas `nombre`/`archivo`) se implementó en este prototipo como un campo de texto simple (`adjunto_nota`, ej. `"nota-voz-marta-21-05oct.m4a"`) en vez de una subida real de archivo — una herramienta de upload real de audio/foto de ensayo no estaba evaluada ni aprobada por el arquitecto como librería nueva, y no había tiempo en esta jornada para resolver el flujo de Storage + reproductor de audio con la profundidad que merece. Queda señalado para una iteración futura, no se entrega como "cuadro vacío": el campo existe, se guarda y se ve, solo no adjunta el archivo real todavía.

La "cabecera de arco" (arco/objetivo del personaje) se guarda repetida en cada sesión del mismo personaje — no hay una tabla aparte de "personaje" en este prototipo (la arquitectura apunta a que, a futuro, esto debería leerse de `rep-ficha-personaje.arco`/`.objetivo` en modo solo lectura; por ahora se edita directo acá, documentado como integración pendiente, no implementada en este ciclo).

### 9.4 Permisos (implementado en el prototipo)
- Edición: igual criterio que `PlanSonidoPanel`/`MoodboardFotoPanel` (`seccion === "cargo"` y, dentro de esa sección, `isAdmin` o `cargo === cargoJefe`).
- Visibilidad de filas "Privada": filtrada en **cliente**, comparando `created_by` de la fila contra `supabase.auth.getUser()`. Esto es la base funcional del prototipo, no la policy de RLS a nivel de fila que pide la arquitectura (sección 4) — ese es trabajo de migración de base de datos, fuera del alcance de este ciclo (no se tocó ninguna migración ni `cinepack-dev`).

### 9.5 Librerías
Ninguna nueva. Todo el panel es composición de React/CSS propios del sistema de diseño ya existente, igual que anticipó la arquitectura (sección 5).

### 9.6 `npx tsc --noEmit`
Pasa limpio, sin errores, sobre la rama `oficina/2026-11-21-dir-notas-ensayo`.
