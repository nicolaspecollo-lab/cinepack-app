# Dossier — `mo-memoria` ("Memoria de making of")

> Este archivo arranca con solo las secciones que le corresponden al desarrollador
> (6 y la parte de componentes de 9). El resto (1-5, 7-8, cierre) lo completa el
> director-oficina/comité a partir de `investigacion.md` y `arquitectura.md`.

## 6. Propuesta

`mo-memoria` se construyó como **dos bloques enlazados en una sola pantalla**, nunca
como pestañas: el documento de línea editorial (Bloque A) arriba, y el tablero de
restricciones por escena (Bloque B, el requisito real de QA) abajo. Ambos viven en
la misma herramienta (`tipo: "tabla"` en `app/herramientas.ts`, id `mo-memoria`) y
se renderizan con un panel a medida, `MoMemoriaBoard` (`app/hoy/HerramientaPanel.tsx`),
porque el motor genérico no tiene un modo "documento + tabla visibles juntos".

### Flujo de uso paso a paso

1. **Dirección de making of entra a "Memoria de making of"** desde el menú de
   herramientas de su cargo. La pantalla abre directo en el documento de criterios
   (Bloque A), con su `estado` (Borrador/En revisión/Aprobado/Bloqueado — mismo set
   `ESTADO_DOC` que el resto del repo) visible como chip de color arriba a la derecha.
2. **Redacta o ajusta la línea editorial**: tono y objetivo del BTS, qué priorizar/
   evitar en general, zonas o momentos restringidos sin ligar a una escena concreta.
   Cada campo se autoguarda al salir del campo (`onBlur`), igual que el resto del
   motor. Completa versión, quién aprobó y la fecha de aprobación.
3. **Baja a "Restricciones por escena"** (Bloque B, mismo scroll, sin cambiar de
   pantalla) y toca "Agregar escena": se abre un selector (`CpSelect`) que lee en
   vivo el desglose real de escenas (`guion-desglose-escenas`) — nunca un campo de
   texto en blanco. Si esa herramienta no tiene filas todavía, cae a un campo de
   texto de respaldo (fallback explícito, no un error silencioso).
4. **Marca el flag de restricción** de la escena elegida: Apta / No apta / Requiere
   consentimiento / Uso exclusivo de prensa, con color fuerte y consistente (verde/
   rojo/ámbar/cian) tanto en el chip de la tarjeta como en el borde izquierdo de la
   tarjeta entera — es el único lugar de la herramienta donde el color comunica algo
   crítico, por eso no se desactiva el acento.
5. **Completa motivo, origen del flag** (Dirección de making of / RRHH (menores) /
   Producción (seguridad) / Dirección), quién lo revisó y cuándo, y si corresponde,
   el link al consentimiento relacionado (`mo-derechos-bts`).
6. **Cámara de making of / community management (lectura)** entran a la misma
   herramienta en modo visionario: filtran por chip ("No apta", "Requiere
   consentimiento"...) o buscan por escena/motivo antes de programar cobertura o
   publicar una pieza — así se evita en la práctica el bug de QA (publicar la
   escena de la menor o de la secuencia de riesgo).
7. **Estado vacío propio**: si todavía no se marcó ninguna escena, el tablero no
   dice "esta tabla está vacía" — explica en una frase qué va a vivir ahí ("vas a
   registrar, escena por escena, cuáles NO se pueden publicar...") con un icono de
   escudo en acento rojo, y ofrece adoptar los 5 ejemplos reales del proyecto de
   prueba (la menor, la secuencia de riesgo, y 3 escenas sin restricción) o arrancar
   en blanco.

## 9. Componentes (parte de desarrollo)

- **`app/herramientas.ts`** — nueva entrada `memoriaMakingOf` (id `mo-memoria`,
  `tipo: "tabla"`), reemplaza el placeholder `{ tipo: "nota" }` anterior. Columnas
  de Bloque B con los `ColTipo` ya existentes (`texto`, `largo`, `estado`, `fecha`,
  `link`), sin inventar ningún tipo nuevo. `ESTADO_DOC` se exportó (antes era
  privado del archivo) para reutilizarlo en el badge del documento del Bloque A.
- **`app/hoy/HerramientaPanel.tsx`**:
  - `MoMemoriaBoard` — panel a medida (justificación: dos bloques de naturaleza
    distinta, documento versionado + tablero filtrable, en una sola pantalla sin
    tabs; ningún modo del motor genérico lo cubre). Bloque A se guarda en la fila
    `meta` (`orden:-1`), mismo patrón ya usado por Presupuesto/Actas para guardar
    "cabecera" de un tablero — no se inventó mecanismo nuevo. Se agregó el helper
    `guardarMeta` (autoguardado genérico sobre la fila meta) para esto.
  - Lee en vivo (nunca escribe) `guion-desglose-escenas` vía Supabase para ofrecer
    el selector real de "Agregar escena" — con fallback a texto libre si esa tabla
    está vacía.
  - `MO_MEMORIA_FLAG_TONO` / `MO_MEMORIA_FLAGS` — mapeo explícito de color por
    valor del flag (no se delega en `estadoTono` genérico porque sus regex no
    reconocen "Apta"/"No apta"/etc. correctamente).
  - Se agregó el id `mo-memoria` a `tablaTieneVistaBespoke` y una entrada en
    `EJEMPLOS_POR_ID["mo-memoria"]` con los 5 casos reales del proyecto de prueba
    (Lúa Brizal/menor, secuencia de riesgo con doble de acción, y 3 escenas aptas/
    uso de prensa, para mostrar variedad real).
- **`app/components/Icon.tsx`** — se agregó el icono `shield` (mismo trazo
  1.75px/line-icon que el resto del set) para el encabezado del tablero de
  restricciones y el estado vacío; no se importó ningún set externo.
- **`app/hoy/dashboard.css`** — reglas nuevas `.hp-momem-*` (documento, tarjetas de
  escena con borde de color por tono, chips de filtro, buscador) usando los tokens
  existentes (`var(--gutter)`, `--sp-*`, `--fs-*`, paleta con nombre `--lime`/
  `--amber`/`--rose`/`--cyan`), mobile-first (grid de tarjetas cae a 1 columna a
  ≤640px, buscador pasa a ancho completo).
- Verificado: `npx tsc --noEmit` limpio.
