# Sistema de diseño — CINEPACK (extraído del código, reconocimiento)

**Aviso importante:** esta sesión no tiene acceso al repo real de CINEPACK (solo lectura, fuera de alcance de esta sesión). Todo lo de abajo viene del repo de muestreo (`app/cp-theme.css`, `app/globals.css`, `app/admin/admin.css`, `app/hoy/dashboard.css`, `app/components/*`). Antes de aprobar el primer expediente, Nico debe confirmar si estos tokens coinciden con el repo real o si el de muestreo ya diverge.

## Fuente de verdad en este repo
`app/cp-theme.css` es el sistema de diseño activo de la app de cliente (clase raíz `.cp-dash`, con variante clara `.cp-dash.cp-light`). `app/globals.css` solo trae los defaults genéricos de `create-next-app` (Tailwind + Geist) y **no se usa** en las pantallas de producto — no tomar esos tokens como referencia.

## Color — modo oscuro (`.cp-dash`, default)
```
--bg: #0D0D12        --bg-2: #16161D       --line: rgba(255,255,255,.08)
--text: #F4F4F6      --muted: #C8CAD4      --panel: rgba(0,0,0,.18)
--shadow: rgba(0,0,0,.35)   --hexline: rgba(255,255,255,.045)
--hl1..--hl5: rgba(255,255,255,.02 → .08)   (capas de hover/estado)
```
Paleta de acento (colores con nombre, usados como "tono" por tipo de dato/estado en columnas de tabla — ver `sinAcento` en `app/herramientas.ts`):
```
--blue:#1F7DE2  --pink:#F37FB5  --yellow:#F5E26A  --cyan:#19CBE6  --lime:#9EEE6A
--orange:#EE9962  --violet:#C98AF2  --teal:#5BEDD6  --gold:#E6B019  --rose:#F07A7A
--white:#F4F4F6  --sky:#66C3EE  --green:#52EC64  --amber:#E8A330  --indigo:#5F70ED
--coral:#F18E80
```

## Color — modo claro (`.cp-dash.cp-light`)
```
--bg:#F5F5F2  --bg-2:#FFFFFF  --line:rgba(13,13,18,.12)
--text:#16161D  --muted:#16161D  --panel:rgba(13,13,18,.03)  --shadow:rgba(13,13,18,.12)
--hexline:rgba(13,13,18,.07)
```

## "Opción C" (`.cp-optc`) — sistema tipográfico/cromático alternativo, activable por sección
Capa superpuesta (no sustituye `.cp-dash`, se activa con la clase `.cp-optc` en una sección concreta). Oscuro por defecto; invierte el topbar respecto al resto ("chrome oscuro sobre contenido claro o viceversa", pedido explícito de Nico — ver comentario en `cp-theme.css:48-52`).
```
Oscuro:  --optc-bg:#14151A  --optc-text:#F4F4F6  --optc-muted:#9a9da4
         --optc-line:#33343A  --optc-line-soft:#1F2024
         --optc-topbar-bg:#FFFFFF  --optc-topbar-text:#14151A  --optc-topbar-muted:#5b5e66
         --optc-topbar-line:#E2E2E2  --optc-topbar-line-soft:#EAEAEA
Claro:   --optc-bg:#FFFFFF  --optc-text:#14151A  --optc-muted:#5b5e66
         --optc-line:#E2E2E2  --optc-line-soft:#EAEAEA
         --optc-topbar-bg:#14151A  --optc-topbar-text:#F4F4F6  --optc-topbar-muted:#9a9da4
         --optc-topbar-line:#33343A  --optc-topbar-line-soft:#1F2024
```
Tipografías de "Opción C" (self-hosted vía `@font-face`, sin CDN):
```
--optc-font-display: 'Archivo Black','Helvetica Neue',sans-serif
--optc-font-body:    'Source Serif 4',Georgia,serif
--optc-font-mono:    'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace
```
Inputs de `.cp-optc` fuerzan `border-radius:0 !important` + `appearance:none` (esquinas siempre en punta — cuidado con Safari/iOS, requiere apagar el estilo nativo explícitamente; ver comentario en `cp-theme.css:98-104`).

## Tipografía base (`.cp-dash`, fuera de `.cp-optc`)
- Cuerpo: `'Courier New', Courier, monospace` (todo `.cp-dash`).
- Títulos `h1-h4`: `'Poppins', sans-serif`, `font-weight:800`, `letter-spacing:-0.02em`, `line-height:1.1`.
- Elementos de marca/topbar (`cp-logo`, `cp-team-name`, `cp-auth-logo-word`): `'Poppins', sans-serif`, pesos 700-800.
- `Poppins` se importa por `@import` de Google Fonts en la cabecera de `cp-theme.css` (pesos 500/600/700/800) — es una CDN externa, a diferencia de las fuentes de "Opción C" que son self-hosted. Confirmar con Nico si esto debe migrar también a self-hosted.

## Escala de espaciado, tipografía fluida y duración (tokens, dentro de `.cp-dash`)
```
--sp-1:4px --sp-2:8px --sp-3:12px --sp-4:16px --sp-5:24px --sp-6:32px
--gutter: 30px (desktop) → 16px (≤640px) → 12px (≤380px)
--fs-xs:11px  --fs-sm:12px
--fs-base: clamp(13px, 1.1vw + 11px, 14px)
--fs-md:   clamp(14px, 1.4vw + 11px, 16px)
--fs-lg:   clamp(16px, 2vw + 12px, 20px)
--fs-xl:   clamp(20px, 3vw + 14px, 28px)
--dur-fast:120ms  --dur:180ms
```
Esto **es** el patrón mobile-first obligatorio: cualquier herramienta nueva debe usar `var(--gutter)` para el margen lateral y la escala `--fs-*`/`--sp-*` en vez de valores sueltos.

## Radios, sombras, formas
- No hay un token `--radius` único — los radios se declaran por componente (`border-radius:50%` en avatares/badges redondos, `border-radius:0` forzado en inputs de `.cp-optc`). **Pendiente**: pedir a Nico el radio estándar de tarjetas/paneles del repo real si existe uno no capturado aquí.
- Sombra estándar de tarjeta/menú flotante: `box-shadow: 0 30px 80px var(--shadow)` (auth card) y `0 32px 80px rgba(0,0,0,.7)` (menú de equipo) / `0 24px 60px rgba(20,21,26,.14)` (dropdown de `.cp-optc`).
- Fondo decorativo: patrón hexagonal repetido vía `background-image` SVG inline (`--hexbg-img`, `--hexbg2-img`, `--optc-hexbg-img`) — motivo recurrente de marca ("hex" aparece también como clase utilitaria `.hex` con `clip-path` hexagonal). Usar el mismo patrón, no crear una variante nueva.

## Iconografía
`app/components/Icon.tsx`: set propio de iconos SVG *line-icons*, sin dependencias externas (ni lucide, ni heroicons instalados para esto). Trazo `1.75px`, heredan color vía `currentColor` y tamaño vía `font-size` del padre. Lista cerrada de nombres (`IconName`) — **toda herramienta nueva que necesite un icono debe añadirlo a este archivo siguiendo el mismo estilo de trazo**, no importar un set de iconos nuevo ni usar emojis.

## Componentes base reutilizables
- `WorkspaceShell.tsx` — shell de pestañas del espacio de trabajo (dónde vive cada herramienta dentro del workspace del proyecto).
- `ToolMenu.tsx` — menú de selección de herramienta por cargo.
- `HerramientaPanel.tsx` (`app/hoy/`) — motor genérico que renderiza cualquier `Herramienta` (`tabla`/`nota`/`checklist`/`ficha`/`galeria`) a partir de su definición en `herramientas.ts`, sin código a medida. **Toda herramienta nueva debe intentar expresarse primero como `Herramienta` tipada en este motor**; solo se justifica un panel a medida (como `MoodboardFotoLienzo`, `PlanSonidoPanel`, `GuionTecnicoPanel`) cuando la interacción no cabe en tabla/nota/checklist/ficha/galería (ej. lienzo visual, generador con IA).
- `CpSelect.tsx` — select estilizado acorde al sistema (reemplaza el `<select>` nativo).
- `CreditosChips.tsx`, `PaisProvinciaField.tsx`, `PasswordField.tsx`, `LocaleToggle.tsx`, `ThemeToggle.tsx`/`ThemeChooser.tsx` — campos y controles base ya resueltos; reusar, no reinventar.
- Tipos de columna del motor de tablas (`ColTipo` en `herramientas.ts`): `texto | largo | num | money | fecha | estado | archivo | link | chips | repetible`. `estado` admite "tono" de color por valor (acento visual) salvo que se marque `sinAcento: true`; `repetible` permite sub-filas anidadas (ej. "Reparto por productora" dentro de Presupuesto). Toda herramienta nueva de tipo tabla debe reusar estos tipos, no inventar uno nuevo sin justificarlo ante el comité.

## Mobile-first (obligatorio, confirmado por el propio CSS)
El gutter lateral y la tipografía ya están definidos como *fluid* y con breakpoints explícitos a 640px y 380px (ver arriba). `overflow-x:hidden` está forzado en `.cp-dash` como "red de seguridad" para que ningún elemento mal medido abra scroll horizontal — cualquier componente nuevo debe respetar esto (nada de anchos fijos que rompan en 390px).

## Herramientas registradas (regla de Nico, 17/11/2026 — obligatoria)
Toda herramienta que se agrega a la app, sin excepción, tiene que quedar registrada acá abajo apenas el comité la aprueba — esta es "la Biblia", la fuente única de qué existe en CINEPACK y por qué. Formato por fila: nombre, departamento/cargo, y 1-2 líneas de **para qué sirve** (el problema real que resuelve, no una descripción genérica de lo que hace técnicamente). El director-oficina agrega la fila como parte del cierre del expediente, antes de notificar a Nico — no es un paso opcional ni posterior.

| Herramienta | Departamento / cargo | Para qué sirve |
|---|---|---|
| Hoja de cálculo en blanco | Transversal | Herramienta genérica de cálculo dentro del espacio de trabajo, para cuando ningún tipo de tabla predefinida del motor cubre lo que el cargo necesita armar sobre la marcha. |
| Documento en blanco | Transversal | Redacción de texto libre con formato real (tablas, imágenes, enlaces) dentro del espacio de trabajo, para notas/documentos que no encajan en ninguna herramienta estructurada existente. |
| Notas de dirección por escena | Dirección | Registro estructurado de notas de dirección por escena (continuidad, intención actoral, tomas), con aviso real al departamento/cargo que corresponda cuando queda algo pendiente. Cumple (17/11), Corte ejecutado a `main`. |
| Checklist de mezcla y masterización de audio | Postproducción/Sonido | Checklist de entregables de la mezcla final, agrupado por tipo de entrega (stems/mezcla final/DCP/streaming) con el mecanismo `agruparPor` generalizado. Pendiente de revisión (2ª ronda). |
| Seguridad laboral y formación obligatoria | RRHH | Sistema de riesgo→normativa→cargos afectados→formación obligatoria→medidas para el rodaje, con los riesgos reales del proyecto de prueba (menor en escena, secuencia de riesgo, proximidad a agua). Pendiente de revisión (2ª ronda, reemplaza al "Plan de bienestar" original). |
| Checklist de descarga, backup y etiquetado de tarjetas | Fotografía/Auxiliar de cámara | Checklist con la regla 3-2-1 y verificación por checksum/MHL precargada, para que no se pierda material de rodaje antes de confirmar backup real. Pendiente de tu revisión (18/11). |
| Checklist de seguimiento por escena/decorado | Arte/Ayudantía de dirección de arte | Checklist de continuidad de decorado (fotos, desglose, objetos sensibles, strike) para que nada se pierda entre el día de rodaje y el siguiente. Pendiente de tu revisión (18/11). |
| Diario de personaje / preparación del rol | Reparto/Protagonista | Tabla por escena con estado emocional, continuidad física y entrada de diario en primera persona — reemplaza la nota de texto libre original. Pendiente de tu revisión (18/11). |
