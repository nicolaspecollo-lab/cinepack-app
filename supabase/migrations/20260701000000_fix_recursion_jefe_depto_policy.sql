-- Fix: jefe_depto_update_cargo_equipo contiene un subquery directo a
-- public.profiles dentro de su USING/WITH CHECK → Postgres lo evalúa mientras
-- ya está evaluando una policy sobre profiles → recursión infinita.
--
-- Solución: mover la subquery a una función SECURITY DEFINER (propiedad de
-- postgres, bypassrls=true). Postgres la ejecuta sin re-evaluar RLS, cortando
-- el ciclo de recursión.

create or replace function public.caller_departamento()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select departamento from public.profiles where id = auth.uid();
$$;

grant execute on function public.caller_departamento() to authenticated;

drop policy if exists "jefe_depto_update_cargo_equipo" on public.profiles;
create policy "jefe_depto_update_cargo_equipo"
on public.profiles for update
to authenticated
using (
  public.es_jefe_de_depto(auth.uid())
  and departamento = public.caller_departamento()
)
with check (
  public.es_jefe_de_depto(auth.uid())
  and departamento = public.caller_departamento()
);
