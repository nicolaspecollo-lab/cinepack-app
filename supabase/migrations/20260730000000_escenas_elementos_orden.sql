-- El guion se parseaba con descripción (un solo bloque) y diálogo (lista
-- aparte), así que una escena con acotación→diálogo→acotación→diálogo
-- perdía ese orden: todas las acotaciones terminaban juntas arriba.
-- "elementos" guarda la secuencia real de bloques (acción o diálogo) en el
-- orden en que aparecen en el guion. descripcion/dialogo se conservan
-- (se siguen derivando de elementos) porque otras pantallas ya los leen
-- así y no necesitan el orden exacto.
alter table public.escenas
  add column if not exists elementos jsonb not null default '[]'::jsonb;
