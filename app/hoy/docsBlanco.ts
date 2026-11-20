// ===========================================================================
// DOCS EN BLANCO (transversal) — modelo de datos + acceso a persistencia
// ---------------------------------------------------------------------------
// Expediente: 2026-11-16_transversal_hoja-documento-blanco
// Arquitectura: ver oficina/expedientes/2026-11-16_transversal_hoja-documento-blanco/arquitectura.md
//
// Persiste contra Supabase real (tabla public.docs_blanco, migración
// supabase/migrations/20261116000000_docs_blanco.sql — corregida 21/11/2026:
// project_id referenciaba public.projects, que no existe; es public.proyectos).
// Reemplaza el stub de localStorage que tenía este archivo hasta el Corte del
// 20/11 (Nico lo excluyó de ese Corte justamente por este motivo).
//
// owner_name no vive en la tabla (solo owner_id): se resuelve acá uniendo
// contra public.profiles (full_name) por los owner_id distintos del listado,
// porque docs_blanco.owner_id referencia auth.users, no profiles, y Supabase
// no puede embeber automáticamente una tabla sin FK declarada entre ambas.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoDocBlanco = "hoja" | "documento";
export type VisibilidadDocBlanco = "privado" | "compartido";

export type DocBlanco = {
  id: string;
  project_id: string;
  tipo: TipoDocBlanco;
  nombre: string;
  contenido: Record<string, unknown>; // snapshot Univer (hoja) o JSON ProseMirror (documento)
  owner_id: string;
  owner_name: string;
  departamento?: string | null;
  visibilidad: VisibilidadDocBlanco;
  created_at: string;
  updated_at: string;
};

type FilaDocBlanco = Omit<DocBlanco, "owner_name">;

async function resolverNombres(supabase: SupabaseClient, filas: FilaDocBlanco[]): Promise<DocBlanco[]> {
  const ids = Array.from(new Set(filas.map((f) => f.owner_id)));
  const nombres = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of data ?? []) {
      if (p.full_name) nombres.set(p.id, p.full_name as string);
    }
  }
  return filas.map((f) => ({ ...f, owner_name: nombres.get(f.owner_id) ?? "" }));
}

export async function listarDocsBlanco(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
  departamento?: string | null
): Promise<DocBlanco[]> {
  const { data, error } = await supabase
    .from("docs_blanco")
    .select("*")
    .eq("project_id", projectId)
    .or(`owner_id.eq.${ownerId},visibilidad.eq.compartido`)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  const filas = (data as FilaDocBlanco[]).filter(
    (d) => !departamento || !d.departamento || d.departamento === departamento || d.owner_id === ownerId
  );
  return resolverNombres(supabase, filas);
}

// Nivel 2 de integración (arquitectura.md, apartado 4): listado a nivel
// proyecto de todo lo "Compartido", sin filtrar por owner ni departamento.
export async function listarDocsCompartidosProyecto(supabase: SupabaseClient, projectId: string): Promise<DocBlanco[]> {
  const { data, error } = await supabase
    .from("docs_blanco")
    .select("*")
    .eq("project_id", projectId)
    .eq("visibilidad", "compartido")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return resolverNombres(supabase, data as FilaDocBlanco[]);
}

export async function crearDocBlanco(
  supabase: SupabaseClient,
  params: {
    projectId: string;
    tipo: TipoDocBlanco;
    nombre: string;
    ownerId: string;
    ownerName: string;
    departamento?: string | null;
    contenidoInicial: Record<string, unknown>;
  }
): Promise<DocBlanco | null> {
  const { data, error } = await supabase
    .from("docs_blanco")
    .insert({
      project_id: params.projectId,
      tipo: params.tipo,
      nombre: params.nombre,
      contenido: params.contenidoInicial,
      owner_id: params.ownerId,
      departamento: params.departamento ?? null,
      visibilidad: "privado",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return { ...(data as FilaDocBlanco), owner_name: params.ownerName };
}

export async function guardarContenidoDocBlanco(supabase: SupabaseClient, id: string, contenido: Record<string, unknown>) {
  await supabase.from("docs_blanco").update({ contenido, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function renombrarDocBlanco(supabase: SupabaseClient, id: string, nombre: string) {
  await supabase.from("docs_blanco").update({ nombre, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function cambiarVisibilidadDocBlanco(supabase: SupabaseClient, id: string, visibilidad: VisibilidadDocBlanco) {
  await supabase.from("docs_blanco").update({ visibilidad, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function eliminarDocBlanco(supabase: SupabaseClient, id: string) {
  await supabase.from("docs_blanco").delete().eq("id", id);
}

export async function obtenerDocBlanco(supabase: SupabaseClient, id: string): Promise<DocBlanco | undefined> {
  const { data, error } = await supabase.from("docs_blanco").select("*").eq("id", id).single();
  if (error || !data) return undefined;
  const [conNombre] = await resolverNombres(supabase, [data as FilaDocBlanco]);
  return conNombre;
}
