-- CONTROL DE DEPARTAMENTO — que los botones del jefe FUNCIONEN.
-- Causa raíz: (1) las tablas de apoyo cargos_personalizados y
-- herramienta_visibilidad no estaban versionadas y podían faltar; (2) el
-- super_admin solo tenía override de SELECT (lectura), así que cualquier
-- escritura desde la pestaña Control quedaba bloqueada por RLS y "no pasaba
-- nada". Aquí: tablas idempotentes + políticas de ESCRITURA para el jefe del
-- departamento (es_jefe_de_depto + su propio depto) y para el super_admin.
-- Usa helpers security-definer existentes: is_super_admin(), es_jefe_de_depto(),
-- caller_departamento() — nunca consultan profiles inline (evita recursión).

-- 1) Tablas de apoyo (idempotente) ------------------------------------------
create table if not exists public.cargos_personalizados (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  departamento text not null,
  nombre text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.herramienta_visibilidad (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  departamento text not null,
  herramienta text not null,
  oculta boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, departamento, herramienta)
);
alter table public.cargos_personalizados enable row level security;
alter table public.herramienta_visibilidad enable row level security;

-- helper local: ¿el usuario puede administrar este departamento?
create or replace function public.puede_admin_depto(p_departamento text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return public.is_super_admin()
    or (public.es_jefe_de_depto(auth.uid()) and p_departamento = public.caller_departamento());
end;
$$;
grant execute on function public.puede_admin_depto(text) to authenticated;

-- 2) cargos_personalizados ---------------------------------------------------
drop policy if exists "cargos_pers_select" on public.cargos_personalizados;
create policy "cargos_pers_select" on public.cargos_personalizados
  for select to authenticated using (true);

drop policy if exists "cargos_pers_write" on public.cargos_personalizados;
create policy "cargos_pers_write" on public.cargos_personalizados
  for all to authenticated
  using (public.puede_admin_depto(departamento))
  with check (public.puede_admin_depto(departamento));

-- 3) herramienta_visibilidad -------------------------------------------------
drop policy if exists "herr_vis_select" on public.herramienta_visibilidad;
create policy "herr_vis_select" on public.herramienta_visibilidad
  for select to authenticated using (true);

drop policy if exists "herr_vis_write" on public.herramienta_visibilidad;
create policy "herr_vis_write" on public.herramienta_visibilidad
  for all to authenticated
  using (public.puede_admin_depto(departamento))
  with check (public.puede_admin_depto(departamento));

-- 4) profiles: el super_admin puede actualizar cualquier perfil (cargo, etc.).
-- El jefe ya podía por jefe_depto_update_cargo_equipo (migración previa).
drop policy if exists "profiles_super_admin_update" on public.profiles;
create policy "profiles_super_admin_update" on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 5) user_roles: el super_admin puede gestionar cualquier rol compartido.
-- (El jefe ya podía por users_manage_own_or_jefe_equipo_roles.)
drop policy if exists "user_roles_super_admin_all" on public.user_roles;
create policy "user_roles_super_admin_all" on public.user_roles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 6) herramienta_asignaciones: asignar accesos (editar/ver) por herramienta a
-- los integrantes. El jefe del depto y el super_admin pueden escribir.
drop policy if exists "herr_asig_write_depto" on public.herramienta_asignaciones;
create policy "herr_asig_write_depto" on public.herramienta_asignaciones
  for all to authenticated
  using (public.puede_admin_depto(departamento))
  with check (public.puede_admin_depto(departamento));
