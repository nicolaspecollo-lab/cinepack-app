-- ============================================================================
-- Fix: "Privada" en Notas de ensayo (dir-notas-ensayo) no estaba protegida
-- ============================================================================
-- Encontrado 21/11/2026 al revisar el Corte de dir-notas-ensayo antes de
-- mergear: el campo `privada` ("Visible al equipo" / "Privada") que escribe
-- notasEnsayoFilas.ts se filtraba SOLO en cliente (ver comentario explícito
-- en ese archivo). La política real "Project members can view
-- herramienta_filas" deja ver TODAS las filas del proyecto a cualquier
-- miembro, sin mirar ese campo — cualquiera con acceso a la API de Supabase
-- podía leer notas de ensayo marcadas como privadas.
--
-- Solución: una política RESTRICTIVE (se combina con AND, no con OR, sobre
-- las políticas permisivas ya existentes) que bloquea específicamente las
-- filas de dir-notas-ensayo marcadas 'Privada' para cualquiera que no sea
-- quien la creó (created_by) o Ejecutivo/super_admin — mismo criterio de
-- acceso que el resto de la app. No toca ninguna otra herramienta: el
-- `not (herramienta_id = 'dir-notas-ensayo' and ...)` deja pasar todo lo
-- demás sin cambios.
-- ============================================================================

drop policy if exists "dir_notas_ensayo_privada_restrict" on public.herramienta_filas;
create policy "dir_notas_ensayo_privada_restrict" on public.herramienta_filas
  as restrictive
  for select
  using (
    not (herramienta_id = 'dir-notas-ensayo' and datos->>'privada' = 'Privada')
    or created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.departamento = 'Ejecutivo' or p.app_role = 'super_admin')
    )
  );
