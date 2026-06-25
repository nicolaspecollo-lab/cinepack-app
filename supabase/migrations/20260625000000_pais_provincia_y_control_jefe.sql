-- Bloque "modificaciones CinePack" (25-jun-2026):
-- 1) País/Provincia estructurados para residencia y producción (en vez de
--    texto libre), usados en las estadísticas del panel admin.
-- 2) Permitir que el Jefe de Departamento (no solo el Ejecutivo) gestione
--    cargo y cargos compartidos de su propio equipo desde /control-depto.

alter table public.profiles
  add column if not exists pais_residencia text;
alter table public.profiles
  add column if not exists provincia_residencia text;
alter table public.profiles
  add column if not exists pais_produccion text;
alter table public.profiles
  add column if not exists provincia_produccion text;

-- Espejo en SQL del primer cargo de cada departamento en
-- JERARQUIA_POR_DEPARTAMENTO (app/constants.ts). Si se agrega un
-- departamento nuevo o se cambia el cargo de cabeza, actualizar ambos.
create or replace function public.cargo_jefe_de(p_departamento text)
returns text
language sql
immutable
as $$
  select case p_departamento
    when 'Dirección' then 'Dirección'
    when 'Producción' then 'Dirección de producción'
    when 'Fotografía' then 'Dirección de fotografía'
    when 'Arte' then 'Dirección de arte'
    when 'Guion' then 'Guion'
    when 'Ejecutivo' then 'Producción ejecutiva'
    when 'Casting' then 'Dirección de casting'
    when 'Reparto' then 'Protagonista'
    when 'Making of' then 'Dirección de making of'
    when 'Sonido' then 'Dirección de sonido'
    when 'Postproducción' then 'Dirección de postproducción'
    when 'RRHH' then 'Dirección de RRHH'
    when 'Sostenibilidad' then 'Dirección de sostenibilidad'
    when 'Marketing' then 'Jefatura de marketing'
    when 'Difusión' then 'Jefatura de prensa'
    when 'Distribución' then 'Jefatura de distribución'
    else null
  end;
$$;

create or replace function public.es_jefe_de_depto(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.cargo = public.cargo_jefe_de(p.departamento) from public.profiles p where p.id = p_user_id),
    false
  );
$$;

grant execute on function public.cargo_jefe_de(text) to authenticated;
grant execute on function public.es_jefe_de_depto(uuid) to authenticated;

-- Permite a un Jefe de Departamento actualizar cargo/cargos compartidos de
-- los miembros de SU MISMO departamento (antes solo podía el Ejecutivo).
drop policy if exists "jefe_depto_update_cargo_equipo" on public.profiles;
create policy "jefe_depto_update_cargo_equipo"
on public.profiles for update
to authenticated
using (
  public.es_jefe_de_depto(auth.uid())
  and departamento = (select p2.departamento from public.profiles p2 where p2.id = auth.uid())
)
with check (
  public.es_jefe_de_depto(auth.uid())
  and departamento = (select p2.departamento from public.profiles p2 where p2.id = auth.uid())
);

drop policy if exists "Users can manage their own roles (admin context only)" on public.user_roles;
create policy "users_manage_own_or_jefe_equipo_roles"
on public.user_roles for all
to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.departamento = 'Ejecutivo')
  or (
    public.es_jefe_de_depto(auth.uid())
    and exists (
      select 1 from public.profiles p1, public.profiles p2
      where p1.id = auth.uid() and p2.id = user_roles.user_id
      and p1.departamento = p2.departamento
    )
  )
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.departamento = 'Ejecutivo')
  or (
    public.es_jefe_de_depto(auth.uid())
    and exists (
      select 1 from public.profiles p1, public.profiles p2
      where p1.id = auth.uid() and p2.id = user_roles.user_id
      and p1.departamento = p2.departamento
    )
  )
);
