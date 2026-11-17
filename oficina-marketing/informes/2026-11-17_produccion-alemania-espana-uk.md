# Producción de largometrajes — Alemania, España, Reino Unido (cabos sueltos del backlog)

**Analista:** analista-mercado-cine
**Fecha de corte:** 2026-11-17

## 1. Alemania — SPIO

**Bloqueado por red de esta sesión, no por falta de dato.** Intenté resolver `www.spio.de` (sección `spio.de/themen/statistik-marktforschung/filmstatistik/filmproduktion/`) y el host no resuelve dentro de esta sesión (`getaddrinfo ENOTFOUND www.spio.de`) — es un bloqueo de red, no una página inexistente ni un dato ausente. No reintenté con FFA porque ya sabemos que esa fuente no cubre el total de producción (solo DFFF).

**Host exacto a habilitar:** `spio.de` (y/o `www.spio.de`).

Sin este host no hay ninguna cifra de producción alemana que pueda citar con fuente primaria. No hay dato — vacío explícito, no estimado.

## 2. España 2015-2019 + 2022 — Anuario de Cine ICAA / espanadigital.gob.es

**Bloqueado por red de esta sesión, no por falta de dato.** Probé dos hosts:

- `www.icaa.gob.es` → `getaddrinfo ENOTFOUND www.icaa.gob.es`
- `espanadigital.gob.es` → `getaddrinfo ENOTFOUND espanadigital.gob.es`

Ambos bloqueados por la red de la sesión.

**Hosts exactos a habilitar:** `icaa.gob.es` (y `www.icaa.gob.es`) y `espanadigital.gob.es`.

No hay cifra de largometrajes españoles 2015-2019 ni 2022 que pueda agregar en este informe — vacío explícito, no estimado. El resto de la serie española (2020-2021, 2023-2024) ya estaba cerrado en informes previos del ciclo anterior y no se reproduce aquí.

## 3. Reino Unido 2019-2022 — conteo de películas comparable

El host primario del BFI también está bloqueado por la red de esta sesión:

- `www.bfi.org.uk` → `getaddrinfo ENOTFOUND www.bfi.org.uk`

**Host exacto a habilitar:** `bfi.org.uk` (y `www.bfi.org.uk`).

Como WebSearch sí funciona (no pasa por el mismo bloqueo), encontré referencias de prensa especializada citando la "Statistical Yearbook" del BFI, pero son fuente secundaria (medios), no la tabla original del BFI, y con cifras que la propia prensa marca como revisadas/inconsistentes entre sí. **No las publico como dato — van aquí solo como pista para la próxima vuelta, explícitamente marcadas como no confiables para el informe:**

| Año | "Production starts" (films) — cifra de prensa, sin confirmar contra tabla BFI | Fuente secundaria |
|---|---|---|
| 2019 | 188 (94 británicas nacionales) | bfi.org.uk/news/bfi-statistics-2019 (vía snippet de búsqueda, no fetch directo) |
| 2020 | cifras contradictorias entre medios (134 revisado vs. 350 citado por otra nota, esta última mezclando HETV) | theknowledgeonline.com, kftv.com |
| 2021 | cifras contradictorias (209 inicial vs. 290 revisado) | theknowledgeonline.com |
| 2022 | 220 (100 británicas nacionales) | screendaily.com / screenglobalproduction.com |

**Ninguna de estas cifras se adopta como dato del informe**: no son fuente primaria y ya llegan con inconsistencias propias entre notas de prensa. El vacío 2019-2022 de conteo de películas comparable para UK sigue abierto. Lo único confirmado previamente (y no tocado aquí) es el dato de gasto de producción, que ya estaba en el informe del ciclo anterior.

## Huecos de datos (resumen)

| Punto | Estado | Causa |
|---|---|---|
| Alemania — serie de producción (SPIO) | Vacío total | Host `spio.de` bloqueado por red de sesión |
| España 2015-2019 + 2022 | Vacío total | Hosts `icaa.gob.es` y `espanadigital.gob.es` bloqueados por red de sesión |
| Reino Unido 2019-2022 — conteo de películas | Vacío (solo pistas de prensa no confiables) | Host `bfi.org.uk` bloqueado por red de sesión; fuentes secundarias inconsistentes entre sí |

Ningún número de esta sección se carga en el consolidado de producción UE hasta no poder acceder a la fuente primaria.

## Cierre en personaje (analista-mercado-cine → director-marketing)

Director: no pude cerrar ninguno de los tres cabos porque los tres hosts primarios (`spio.de`, `icaa.gob.es`/`espanadigital.gob.es`, `bfi.org.uk`) están bloqueados por la red de esta sesión — no es que falte la fuente, es que no puedo llegar a ella desde acá. Si los habilitás, en la próxima vuelta cierro los tres.

Dicho eso, y aunque no tengo todavía la cifra total de Alemania: tené en la cabeza que si SPIO confirma que Alemania produce más largometrajes en volumen total que Italia (es plausible — tiene la industria más grande de Europa continental junto con Francia), eso **no invalida** la hipótesis de Italia como apuesta por crecimiento sostenido 2020-2023 — son cosas distintas: volumen total vs. tendencia. Pero es un dato que vas a tener que ponderar antes de decidir dónde poner el esfuerzo comercial directo: ¿país más grande hoy (si es Alemania) o país con mejor trayectoria (Italia)? No lo resuelvo yo, lo dejo marcado para que lo tengas en cuenta cuando crucemos esto con el volumen de productoras activas que está pidiendo estratega-posicionamiento.
