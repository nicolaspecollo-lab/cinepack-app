-- Créditos del proyecto (guion/dirección/producción) para mostrar en el
-- Pulso y para que el Ejecutivo los edite desde Control. Arrays de texto
-- simple (nombres), no vinculados a cuentas — son créditos, no asignación
-- de equipo.
alter table public.proyectos
  add column if not exists escrito_por jsonb not null default '[]'::jsonb;

alter table public.proyectos
  add column if not exists dirigido_por jsonb not null default '[]'::jsonb;

alter table public.proyectos
  add column if not exists producido_por jsonb not null default '[]'::jsonb;
