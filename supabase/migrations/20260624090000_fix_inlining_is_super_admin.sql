-- is_super_admin() estaba en "language sql": Postgres puede inlinear
-- funciones SQL simples dentro de la consulta que las invoca, lo cual
-- anula el efecto de "security definer" (deja de ejecutarse como postgres,
-- que tiene bypassrls, y vuelve a evaluar RLS como el rol normal —
-- reintroduciendo la recursión sobre profiles). plpgsql nunca se inlinea.
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles where id = auth.uid() and app_role = 'super_admin'
  );
end;
$$;
