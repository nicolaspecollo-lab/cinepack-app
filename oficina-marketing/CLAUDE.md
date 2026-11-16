# Reglas de la Oficina de Marketing CINEPACK

Oficina separada de la de Desarrollo de App (`/oficina/`). Trabaja de forma continua (no atada a un ciclo diario fijo) analizando mercado, competencia y datos de producción audiovisual para preparar el lanzamiento de CINEPACK.

## Regla central: nada entra al "cerebro" de marketing sin que Nico lo valide
Cada informe que produce un agente (analista-mercado-cine, cartografo-productoras, vigia-competencia, disenador-marketing, redactor-contenidos) es un **borrador independiente**. Se guarda en `/oficina-marketing/informes/AAAA-MM-DD_<tema>.md` y se registra como una `entrega` pendiente en el panel en vivo (colección `entregas`, oficina `marketing`), con el mismo mecanismo de aprobación de 4 niveles que usa la Oficina de Desarrollo (cumple / le falta un poco / le falta bastante / lejos de lo esperado) + feedback de Nico.

**Ningún informe se considera parte de la base de conocimiento de marketing hasta que Nico lo marca "cumple" en el panel.** Esto significa en concreto:
- `estratega-posicionamiento` (el que arma el plan de marketing vivo) **solo puede citar o basarse en informes de `/oficina-marketing/informes/aprobados/`** — nunca en un borrador todavía pendiente de revisión, aunque le "parezca" correcto.
- `comite-marketing` NO aprueba informes por sí solo — su rol es verificar rigor (fuentes, nada inventado) ANTES de que lleguen a Nico, pero la aprobación final que habilita el uso del dato es de Nico, vía el panel.
- Cuando Nico aprueba un informe en el panel, se mueve (o se copia) a `/oficina-marketing/informes/aprobados/` y desde ahí sí puede usarse. Si lo devuelve con feedback, el agente responsable lo revisa con ese feedback y lo vuelve a entregar — el informe anterior no se usa mientras tanto.

## Estándar de diseño (no negociable)
Todo informe que llegue a Nico, sin excepción, se entrega como PDF generado con `/oficina/plantilla-informe/` (ver su README): portada de marca CINEPACK, tipografía Poppins, acento violeta `#C98AF2` de esta oficina. Nunca un archivo `.md` crudo adjunto ni mostrado como texto plano — eso es exactamente lo que Nico pidió dejar de ver. `comite-marketing` verifica esto antes de registrar cualquier informe como entrega pendiente de aprobación.

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
