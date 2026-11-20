-- ============================================================================
-- Fix: "infinite recursion detected in policy for relation docs_blanco" (42P17)
-- ============================================================================
-- Encontrado 21/11/2026 al aplicar 20261116000000_docs_blanco.sql contra
-- cinepack-dev y probar la herramienta en vivo (toda lectura de docs_blanco
-- fallaba con 500, incluso para el propio owner).
--
-- Causa real: docs_blanco_select/_update consultan docs_blanco_accesos, y
-- docs_blanco_accesos_select/_write consultaban DE VUELTA docs_blanco — un
-- ciclo de dos tablas. Postgres lo detecta igual que el caso ya documentado
-- en 20260624100000_fix_definitivo_recursion_profiles.sql ("Postgres prohíbe
-- que una política... necesite volver a consultar esa misma tabla para
-- resolverse, incluso a través de una función security definer con
-- bypassrls — restricción estructural de la fase de reescritura"), solo que
-- acá el ciclo pasa por dos tablas en vez de una.
--
-- Solución: cortar el borde que cierra el ciclo (docs_blanco_accesos →
-- docs_blanco). Hoy ninguna UI usa docs_blanco_accesos todavía (ver
-- DocumentosProyectoPanel.tsx, "este prototipo no implementa
-- docs_blanco_accesos — Nivel 3 de permisos granulares, queda para cuando se
-- construya GestionAccesosPanel.tsx"), así que no hay regresión funcional
-- real: se bloquean sus escrituras hasta que exista esa UI, y su lectura
-- queda acotada a la fila propia, sin volver a consultar docs_blanco.
-- ============================================================================

drop policy if exists "docs_blanco_accesos_select" on public.docs_blanco_accesos;
create policy "docs_blanco_accesos_select" on public.docs_blanco_accesos
  for select
  using (user_id = auth.uid());

-- Bloqueada a propósito hasta que se construya la UI de gestión de accesos
-- (Nivel 3, todavía no implementada en ningún panel) — evita reintroducir
-- el ciclo con una condición que vuelva a consultar docs_blanco.owner_id.
-- Cuando se construya esa UI, el camino correcto es una función RPC
-- `security definer` que haga el chequeo de owner vía una tabla auxiliar sin
-- RLS (o un endpoint de servidor con service role), no una policy aquí.
drop policy if exists "docs_blanco_accesos_write" on public.docs_blanco_accesos;
create policy "docs_blanco_accesos_write" on public.docs_blanco_accesos
  for all
  using (false)
  with check (false);
