-- URGENTE: profiles_super_admin_select_all (Área 3) está definida sobre
-- profiles y consulta profiles dentro de su propio USING — Postgres detecta
-- la recursión y la consulta falla para CUALQUIER lectura de profiles
-- (incluida la del propio usuario leyendo su fila), no solo para
-- super_admin. Como el código no revisa errores ahí, se interpreta como
-- "no es admin" silenciosamente. Se reemplaza por una función security
-- definer que rompe el ciclo (corre con privilegios elevados, sin volver a
-- evaluar RLS sobre sí misma).
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and app_role = 'super_admin'
  );
$$;

drop policy if exists "profiles_super_admin_select_all" on public.profiles;

create policy "profiles_super_admin_select_all" on public.profiles
  for select
  using (public.is_super_admin());
