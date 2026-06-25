-- Estilo/plantilla elegido al crear una herramienta personal (Documento o Cuadro de
-- celdas) desde "Espacio de trabajo". Solo define presentación/estructura; el
-- contenido del documento/tabla arranca vacío.
alter table public.personal_tools
  add column if not exists plantilla_id text;
