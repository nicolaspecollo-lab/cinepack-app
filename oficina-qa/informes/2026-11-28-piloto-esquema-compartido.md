# Informe de QA — piloto del esquema de recursos compartido (28/11/2026)

Piloto de 3 cargos corriendo **secuencialmente contra un único servidor dev compartido** (un solo worktree, un solo `next dev`, puerto 3500), para medir el costo real antes de aplicarlo a los 32 cargos restantes. No es una noche completa de QA — es una medición de costo y de que el esquema funciona.

## 1. Jefatura de locaciones (re-verificación del bug #30 ya corregido)
- Reverificación de bugs anteriores: el bug `Falta campo "Organismo" en permisos de localización` (reportado 27-28/11) se re-confirmó en `jv179i` sin el fix (no hay campo Organismo en "Fichas de localización y permisos") — el fix ya está en PR #30 sobre una rama aparte, pendiente de merge a `jv179i`.
- Trabajo de hoy: navegación real a Exclusivas → Fichas de localización y permisos, confirmación visual de columnas existentes (Permiso, Coste, Foto).
- Bugs encontrados hoy: ninguno nuevo.
- Feedback: la navegación Exclusivas (editable) vs Departamentos (solo lectura) no es obvia la primera vez — un aviso ya existe ("Vista completa del departamento (solo lectura)...") pero un cargo nuevo igual tarda en encontrar dónde se edita.

## 2. Script/Continuidad — Continuidad fotográfica
- Trabajo de hoy: confirmé que cada tarjeta de continuidad YA tiene "Foto de referencia" y "Foto actual / toma en revisión" lado a lado, con severidad y estado — la demanda del cargo ("comparación lado a lado, no solo galería suelta") ya está resuelta en el diseño actual.
- Bugs encontrados: ninguno.
- Ideas: un toggle de "solo discrepancias abiertas" para no scrollear las ya resueltas en rodajes largos.

## 3. Dirección de actores — Notas de ensayo por actor/personaje
- Trabajo de hoy: confirmé que las notas están agrupadas por Protagonista/Secundario/Reparto y vinculadas al personaje real (Marta Oliveira, Tomás Reguera, etc.), con conteo de sesiones — la demanda del cargo ("vincular cada nota al arco del personaje, no un campo aislado") ya está resuelta.
- Bugs encontrados: ninguno nuevo. Nota menor: queda un registro de prueba suelto `QA-PENDIENTE-1795256662091` de una sesión de QA anterior — no es un bug de producto, es dato de prueba a limpiar eventualmente en `cinepack-dev`.
- Ideas: ninguna nueva hoy (la herramienta ya cubre lo que pedía el cargo).

## Conclusión sobre el esquema de recursos
El servidor único compartido funcionó sin problemas para los 3 cargos corridos uno detrás del otro: sin caídas de memoria, sin "Page crashed", sin pegarse contra límites de uso. Ver el mensaje de cierre a Nico para el detalle de costo real medido y la recomendación de cómo escalarlo a los 32 cargos restantes.
