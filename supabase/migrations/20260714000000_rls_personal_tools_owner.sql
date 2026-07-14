-- ============================================================================
-- Fix: personal_tools era visible/editable por CUALQUIER miembro del proyecto
-- ============================================================================
-- Encontrado 14-jul-2026: Nicolás (super_admin) veía en "Mis herramientas"
-- (Exclusivas) herramientas personales de OTRO usuario real del proyecto
-- ("Cin Cortasa" — "Compras", "Grcbj"), porque la policy base de
-- `personal_tools` (creada desde el dashboard, no en migraciones) no estaba
-- acotada por owner_id. El cliente (HerramientasPanel.tsx) tampoco filtraba
-- por owner_id/departamento al leer, agravando el problema.
--
-- personal_tools_super_admin_select YA se había eliminado antes
-- (20260624060000_riesgos_beta_audit.sql, con la nota explícita: "personal_tools
-- es configuración personal, no contenido de proyecto — Ver como soporte no
-- debería destapar la configuración personal de cada usuario"). Este fix
-- extiende ese mismo criterio a la policy base: NADIE debe ver/editar las
-- herramientas personales de otro, ni siquiera super_admin.
--
-- Policy RESTRICTIVE: se combina con AND sobre TODAS las policies permisivas
-- existentes (igual patrón que el fix de suspensión de proyectos), sin
-- necesidad de conocer ni tocar la policy base original.
-- ============================================================================

drop policy if exists "personal_tools_solo_owner" on public.personal_tools;
create policy "personal_tools_solo_owner" on public.personal_tools
  as restrictive
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
