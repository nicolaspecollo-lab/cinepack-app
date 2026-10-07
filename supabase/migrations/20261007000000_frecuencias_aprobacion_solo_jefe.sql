-- El Plan de frecuencias (son-plan-frecuencias) deja el botón "Aprobar" oculto
-- en la UI para quien no es jefe de Sonido, pero la política RLS existente de
-- herramienta_filas ("Dept or tester can update") permite UPDATE a cualquier
-- miembro del departamento, sin distinguir cargo. Este trigger cierra ese
-- hueco: si el campo estado_aprobacion (dentro de datos, jsonb) cambia, exige
-- que quien lo cambia sea jefe real DEL DEPARTAMENTO DE LA FILA (NEW.departamento,
-- no necesariamente el propio del usuario — es_jefe_de_depto() solo valida
-- "sos jefe de tu departamento", no "sos jefe del departamento de esta fila",
-- lo cual dejaría pasar a un jefe de OTRO depto con permiso de editar por ser
-- tester/Ejecutivo) o super_admin.
create or replace function public.check_aprobacion_herramienta_filas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.datos->>'estado_aprobacion') is distinct from (new.datos->>'estado_aprobacion') then
    if not (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.departamento = new.departamento
          and p.cargo = public.cargo_jefe_de(new.departamento)
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.app_role = 'super_admin'
      )
    ) then
      raise exception 'Solo el jefe del departamento o un administrador puede cambiar el estado de aprobación';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_aprobacion_herramienta_filas on public.herramienta_filas;
create trigger trg_check_aprobacion_herramienta_filas
  before update on public.herramienta_filas
  for each row
  execute function public.check_aprobacion_herramienta_filas();
