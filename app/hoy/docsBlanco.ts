// ===========================================================================
// DOCS EN BLANCO (transversal) — modelo de datos + acceso a persistencia
// ---------------------------------------------------------------------------
// Expediente: 2026-11-16_transversal_hoja-documento-blanco
// Arquitectura: ver oficina/expedientes/2026-11-16_transversal_hoja-documento-blanco/arquitectura.md
//
// IMPORTANTE (alcance del prototipo de hoy):
// - El modelo de datos (campos, tipos) replica 1:1 la tabla `docs_blanco` que
//   se deja migrada en supabase/migrations/20261116000000_docs_blanco.sql.
// - Esta sesión NO tiene un Supabase real levantado para probar la migración
//   ni las políticas RLS. Por eso este archivo implementa el mismo contrato
//   (mismas funciones: listar/crear/guardar/renombrar/eliminar) pero contra
//   localStorage, como STUB explícito de persistencia — no contra Supabase.
// - Migrar este stub a `supabase.from('docs_blanco')...` es un cambio
//   mecánico (mismas firmas de función) una vez haya un proyecto Supabase
//   real donde correr la migración; no requiere rediseñar la UI.
// ===========================================================================

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

function storageKey(projectId: string) {
  return `cinepack-docs-blanco-${projectId}`;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function leerTodos(projectId: string): DocBlanco[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return raw ? (JSON.parse(raw) as DocBlanco[]) : [];
  } catch {
    return [];
  }
}

function escribirTodos(projectId: string, docs: DocBlanco[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(projectId), JSON.stringify(docs));
}

export function listarDocsBlanco(
  projectId: string,
  ownerId: string,
  departamento?: string | null
): DocBlanco[] {
  return leerTodos(projectId)
    .filter((d) => d.owner_id === ownerId || d.visibilidad === "compartido")
    .filter((d) => !departamento || !d.departamento || d.departamento === departamento || d.owner_id === ownerId)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

// Nivel 2 de integración (arquitectura.md, apartado 4): listado a nivel
// proyecto de todo lo "Compartido", sin filtrar por owner ni departamento —
// a diferencia de listarDocsBlanco (nivel 1, ligado al cargo que lo creó).
// "localStorage" simula hoy una sola fila por proyecto (el stub no separa por
// usuario), así que en este prototipo esto ya incluye lo creado por cualquiera
// en esa sesión; migrado a Supabase sería `select * where project_id=... and
// visibilidad='compartido'` sin RLS por owner.
export function listarDocsCompartidosProyecto(projectId: string): DocBlanco[] {
  return leerTodos(projectId)
    .filter((d) => d.visibilidad === "compartido")
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function crearDocBlanco(params: {
  projectId: string;
  tipo: TipoDocBlanco;
  nombre: string;
  ownerId: string;
  ownerName: string;
  departamento?: string | null;
  contenidoInicial: Record<string, unknown>;
}): DocBlanco {
  const now = new Date().toISOString();
  const doc: DocBlanco = {
    id: uid(),
    project_id: params.projectId,
    tipo: params.tipo,
    nombre: params.nombre,
    contenido: params.contenidoInicial,
    owner_id: params.ownerId,
    owner_name: params.ownerName,
    departamento: params.departamento ?? null,
    visibilidad: "privado",
    created_at: now,
    updated_at: now,
  };
  const docs = leerTodos(params.projectId);
  docs.unshift(doc);
  escribirTodos(params.projectId, docs);
  return doc;
}

export function guardarContenidoDocBlanco(projectId: string, id: string, contenido: Record<string, unknown>) {
  const docs = leerTodos(projectId);
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return;
  docs[idx] = { ...docs[idx], contenido, updated_at: new Date().toISOString() };
  escribirTodos(projectId, docs);
}

export function renombrarDocBlanco(projectId: string, id: string, nombre: string) {
  const docs = leerTodos(projectId);
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return;
  docs[idx] = { ...docs[idx], nombre, updated_at: new Date().toISOString() };
  escribirTodos(projectId, docs);
}

export function cambiarVisibilidadDocBlanco(projectId: string, id: string, visibilidad: VisibilidadDocBlanco) {
  const docs = leerTodos(projectId);
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return;
  docs[idx] = { ...docs[idx], visibilidad, updated_at: new Date().toISOString() };
  escribirTodos(projectId, docs);
}

export function eliminarDocBlanco(projectId: string, id: string) {
  escribirTodos(projectId, leerTodos(projectId).filter((d) => d.id !== id));
}

export function obtenerDocBlanco(projectId: string, id: string): DocBlanco | undefined {
  return leerTodos(projectId).find((d) => d.id === id);
}
