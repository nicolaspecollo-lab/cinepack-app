# Reglas de la Oficina de Marketing CINEPACK

Oficina separada de la de Desarrollo de App (`/oficina/`). Trabaja de forma continua (no atada a un ciclo diario fijo) analizando mercado, competencia y datos de producción audiovisual para preparar el lanzamiento de CINEPACK.

## ⏸️ EN PAUSA (regla de Nico, 20/11/2026)
Esta oficina está **pausada hasta nuevo aviso** para ahorrar recursos y cuidar el límite de uso. El trigger "Ciclo autónomo Oficina de Marketing CINEPACK" quedó deshabilitado (`enabled:false`) — no corre solo. No lanzar ningún ciclo de esta oficina (agentes de marketing, comité, director-marketing) hasta que Nico lo reactive explícitamente.

## Personalidad y diálogo entre agentes (regla de Nico, 16/11/2026)
Cada agente tiene su personalidad fija en `/oficina-marketing/personalidades.md` — léela y adoptala. En cada handoff real, escribí en el feed del panel en vivo un diálogo real (preguntas, propuestas, discrepancias dirigidas a otro agente por nombre), no solo reportes de tarea. El director-marketing se asegura de que ningún agente quede ocioso sin que se le asigne la siguiente tarea del backlog.

## Autonomía (regla actualizada por Nico, 16/11/2026)
Esta oficina funciona **sola**, sin esperar que Nico revise cada informe uno por uno. Corre en un ciclo programado propio (ver "Ciclo autónomo" abajo) que elige qué investigar, reparte el trabajo, y aprueba o devuelve cada informe sin intervención humana en el día a día. Nico sigue viendo todo en el panel en vivo y puede intervenir cuando quiera, pero la oficina no se detiene a esperarlo.

## Regla central: nada entra al "cerebro" de marketing sin la aprobación del director
La aprobación que habilita a un informe como parte de la memoria de la oficina **ya no es de Nico para cada informe — es del `director-marketing`**, que actúa como el directivo estricto y exigente de esta oficina: no deja cabos sueltos, piensa de forma previsora (qué va a necesitar el negocio después, no solo lo que se le pidió), y evalúa cada informe con la pregunta de fondo "¿esto acerca a CINEPACK a monetizar antes, o es ruido?".

Flujo real:
1. Cada agente (analista-mercado-cine, cartografo-productoras, vigia-competencia, disenador-marketing, redactor-contenidos) produce su informe en `/oficina-marketing/informes/AAAA-MM-DD_<tema>.md`.
2. `comite-marketing` revisa rigor (fuentes, nada inventado, ángulo accionable, sin repetir sin novedad) — si falla, se devuelve al agente responsable, no pasa al director.
3. `director-marketing` hace la aprobación final, con una vara más alta que la de comite-marketing: ¿el informe deja algún cabo suelto evidente sin señalar?, ¿anticipa la pregunta de negocio que viene después?, ¿mueve la aguja hacia una decisión de monetización concreta (pricing, segmento a atacar, canal, mensaje)? Si no cumple, se devuelve con objeciones concretas — máximo 2 rondas, igual que el resto de la oficina; si no las supera, se archiva.
4. Si aprueba: el informe se mueve a `/oficina-marketing/informes/aprobados/` **inmediatamente** — desde ese momento es memoria real, disponible para `estratega-posicionamiento` y cualquier otro agente, sin esperar nada de Nico.
5. Se registra igual en el panel en vivo (colección `entregas`) para que Nico lo vea, con el estado que puso el director. Nico puede revisar y, si no está de acuerdo, devolverlo — eso lo saca de `aprobados/` hasta que se corrija — pero el flujo normal no lo espera.

**Dos calificaciones distintas (regla de Nico, 16/11/2026), tanto para el director como para Nico en el panel**: "Cumple" (satisface el estándar) y "Supera las expectativas" (además de cumplir, aporta algo no pedido o eleva el nivel de la oficina) — nunca tratarlas como sinónimos. Un informe que el director aprueba por default es "Cumple"; "Supera" se reserva para cuando hay un hallazgo o ángulo genuinamente por encima de lo esperado.

`estratega-posicionamiento` **solo puede citar o basarse en informes de `/oficina-marketing/informes/aprobados/`** — nunca en un borrador sin la aprobación del director, aunque le "parezca" correcto.

## Ciclo autónomo (tarea programada)
El director-marketing abre el ciclo leyendo `/oficina-marketing/backlog.md` y el último parte en `/oficina-marketing/partes/AAAA-MM-DD.md`, elige qué investigar (prioridad: lo que más acerque una decisión de monetización — pricing, segmento, canal de venta, ventana de oportunidad concreta), reparte, pasa cada informe por comite-marketing y luego por su propia aprobación final, actualiza `informes/aprobados/`, el plan de marketing si corresponde, y el panel en vivo, y cierra con un parte en `/oficina-marketing/partes/AAAA-MM-DD.md` (qué se aprobó, qué se devolvió y por qué, qué decisiones de negocio quedan abiertas para Nico — esas sí se marcan para que él las vea).

## Panel en vivo — estado en tiempo real (regla de Nico, 17/11/2026)
Mismo criterio que la Oficina de Desarrollo: cada agente se marca `estado:"busy"` en el panel (colección `agentes`) **al empezar** un paso real, con `tarea_actual` describiendo lo que está haciendo en ese momento — no recién al terminar. Quien orquesta (esta sesión) escribe ese `busy` antes de lanzar cada subagente real, para que el panel refleje trabajo en curso y no solo resultados cerrados.

## Estándar de diseño (no negociable)
Todo informe que llegue a Nico, sin excepción, se entrega como PDF generado con `/oficina/plantilla-informe/` (ver su README): portada de marca CINEPACK, tipografía Poppins, acento violeta `#C98AF2` de esta oficina. Nunca un archivo `.md` crudo adjunto ni mostrado como texto plano. El agente `disenador-cinepack` (transversal, compartido con la Oficina de Desarrollo) genera/revisa el PDF después de que `comite-marketing` verifica el rigor de contenido, antes de registrarlo como entrega pendiente de la aprobación de Nico.

## Inviolables (mismas que la oficina de desarrollo)
- Nada inventado: toda cifra, dato o afirmación con fuente citada o marcada explícitamente "hipótesis".
- Sin acceso de escritura al repo real de CINEPACK (es de la oficina de desarrollo, aquí ni aplica).
- Todo commit de informes va al repo de muestreo, rama `claude/oficina-agentes-cinepack-jv179i` (no a una rama de expediente — estos son informes, no código).

## Estructura
```
/oficina-marketing/
  CLAUDE.md
  informes/
    AAAA-MM-DD_<tema>.md       <- borradores, pendientes de aprobación
    aprobados/
      AAAA-MM-DD_<tema>.md     <- solo lo que Nico aprobó, única fuente para el estratega
```
