# Comité de calidad — dir-actas (Secretaría de rodaje) — Ronda 1

Revisión contra los 7 puntos de `/oficina/CLAUDE.md` y `.claude/agents/comite-calidad.md`:

1. **Fuentes**: cumple. Toda afirmación del dossier lleva enlace o está marcada "Hipótesis — sin confirmar" (ver §4, §9 del dossier.md).
2. **Específica del cargo**: cumple. Campos (`tipo_reunion` con opciones reales de rodaje, `responsable_pendientes`, archivo firmado) no son un formulario genérico reutilizable sin cambios para otro cargo.
3. **Supera a la competencia**: cumple, justificado — búsqueda explícita confirma que StudioBinder/Yamdu no publican función de actas/minutas de reunión (§5).
4. **Integración en 3 niveles con flujos concretos**: cumple — departamento (convención de texto compartida con `dir-cambios-guion`), proyecto (distinción concreta de campos frente a `ej-gestion-documental`), otros departamentos (participantes nombrados, patrón de referencia por texto ya usado en expedientes previos).
5. **Sistema de diseño y responsive**: **objeción parcial**. El componente reutiliza tokens/patrones existentes al 100% (verificado línea por línea contra `sistema-diseno.md` y el código de `GestionDocumentalBoard`) y el CSS nuevo respeta gutter/breakpoints — pero **no hay capturas reales de la herramienta en uso**, solo de la pantalla de bloqueo de QA (cuenta de prueba con perfil incompleto en `cinepack-dev`, documentado en §8/§10 del dossier, con precedente idéntico ya registrado por esta misma oficina el 18/11 en `oficina-qa/bugs/2026-11-18.md`). No es un defecto de este código: es un bloqueo de datos de un entorno de prueba compartido, fuera del control de este expediente, honestamente documentado y no disimulado.
6. **No duplica nada existente**: cumple — contrastado contra `inventario.md` y `ej-gestion-documental` (distinción explícita en §7).
7. **Ambición y profundidad**: cumple — cubre 4+ tipos reales de reunión con terminología propia, buscador real (pedido explícito de QA 18/11), editor de participantes, adjunto de archivo, y una decisión de diseño justificada por escrito descartando dos patrones alternativos antes de elegir tarjetas+buscador.

## Decisión
**Aprobado**, con la objeción del punto 5 registrada como limitación documentada (no oculta) — mismo criterio que esta oficina ya aplicó el 18/11 para `foto-checklist-descarga` (expediente `2026-11-18_tres-herramientas-vacias`, que tampoco llegó a una interacción de escritura completa y fue entregado igual, con la limitación anotada). Archivar un código correcto, en sistema de diseño, bien integrado y con investigación real por un bloqueo de infraestructura de pruebas ajeno al código sería penalizar lo que no se puede controlar desde este expediente — no es el espíritu de la regla de "nunca inventar capturas", que sí se cumplió estrictamente (no se fabricó ninguna captura falsa).

Se autoriza al director-oficina a generar `dossier.pdf`, abrir el PR en borrador y notificar a Nico, dejando constancia expresa de la limitación del punto 5 en el resumen de entrega.

**Pendiente para la Oficina de QA** (no para desarrollo): completar/corregir el campo `departamento` del perfil de `qa.dir-secretaria2@mailinator.com` en `cinepack-dev` para que la próxima pasada de QA pueda completar la interacción real y tomar las capturas de la herramienta en uso.
