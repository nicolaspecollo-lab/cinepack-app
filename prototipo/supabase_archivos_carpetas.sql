-- archivos_carpetas: estructura de carpetas del panel de Archivos
-- Los archivos reales van en Supabase Storage; las carpetas se guardan acá.

CREATE TABLE IF NOT EXISTS public.archivos_carpetas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   text NOT NULL,
  departamento text NOT NULL,
  parent_path  text NOT NULL DEFAULT '',  -- '' = raíz, 'Carpeta/Sub' = anidado
  nombre       text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (project_id, departamento, parent_path, nombre)
);

ALTER TABLE public.archivos_carpetas ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado del proyecto puede ver y crear carpetas
CREATE POLICY "archivos_carpetas_all"
  ON public.archivos_carpetas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
