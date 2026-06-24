-- Área 3 — "Ver como soporte": el super_admin necesita poder LEER cualquier
-- proyecto sin ser project_member. Se agrega una política SELECT adicional
-- por tabla (no se toca ninguna política de INSERT/UPDATE/DELETE existente),
-- así que cualquier intento de escritura mientras se navega "como soporte"
-- sigue bloqueado por las políticas de aislamiento del Área 1 — el modo
-- lectura queda garantizado por el propio RLS, no por lógica de UI.

create policy "acceso_solicitudes_super_admin_select" on public.acceso_solicitudes
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "alertas_super_admin_select" on public.alertas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "archivos_carpetas_super_admin_select" on public.archivos_carpetas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "comunicado_acuse_super_admin_select" on public.comunicado_acuse
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "comunicados_super_admin_select" on public.comunicados
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "consultas_super_admin_select" on public.consultas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "documentos_super_admin_select" on public.documentos
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "escenas_super_admin_select" on public.escenas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "guiones_super_admin_select" on public.guiones
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "guiones_tecnicos_super_admin_select" on public.guiones_tecnicos
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "herramienta_asignaciones_super_admin_select" on public.herramienta_asignaciones
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "herramienta_filas_super_admin_select" on public.herramienta_filas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "hitos_super_admin_select" on public.hitos
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "jornadas_super_admin_select" on public.jornadas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "personal_tools_super_admin_select" on public.personal_tools
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "planos_super_admin_select" on public.planos
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "project_members_super_admin_select" on public.project_members
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "tareas_super_admin_select" on public.tareas
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));

create policy "workspace_blocks_super_admin_select" on public.workspace_blocks
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin'));
