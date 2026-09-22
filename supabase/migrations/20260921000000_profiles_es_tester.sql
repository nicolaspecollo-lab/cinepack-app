-- Flag de tester de QA: habilita el selector de depto/cargo (ya existente
-- para super_admin, ver HoyWorkspace.tsx) sin dar acceso de plataforma
-- (a diferencia de app_role='super_admin', no afecta RLS ni otros proyectos).
alter table public.profiles
  add column if not exists es_tester boolean not null default false;
