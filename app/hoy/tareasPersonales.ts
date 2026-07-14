import { createClient } from "@/lib/supabase/client";

// Clave de localStorage que HerramientasPanel lee para restaurar la
// herramienta personal abierta en Exclusivas. DEBE coincidir exactamente con
// openPersonalKey() de HerramientasPanel.tsx.
export const openPersonalKey = (dept: string) => `cinepack-open-personal-${dept}`;

// Título canónico del tablero de tareas personales de cada usuario.
export const TAREAS_TITULO = "Tareas";

// Garantiza que el usuario tenga su tablero personal "Tareas" (kanban) en este
// departamento, lo crea si no existe. Devuelve el id del tablero, o null si no
// se pudo (sin proyecto/sesión). No siembra filas: la vista kanban se renderiza
// aunque arranque vacía (ver EspacioTrabajoPanel). No fuerza abrirlo — eso lo
// decide cada llamador (ver abrirTareasPersonales, para el acceso del Pulso).
export async function asegurarTareasPersonales(departamento: string): Promise<string | null> {
  const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
  if (!projectId) return null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existentes } = await supabase
    .from("personal_tools")
    .select("id")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .eq("departamento", departamento)
    .eq("titulo", TAREAS_TITULO)
    .order("created_at", { ascending: true })
    .limit(1);

  let id = existentes?.[0]?.id ?? null;

  if (!id) {
    const { data: nueva } = await supabase
      .from("personal_tools")
      .insert({
        project_id: projectId,
        owner_id: user.id,
        owner_name: user.user_metadata?.full_name ?? "",
        departamento,
        titulo: TAREAS_TITULO,
        tipo: "tabla",
        plantilla_id: "kanban",
      })
      .select("id")
      .single();
    id = nueva?.id ?? null;
  }

  return id;
}

// Para el acceso directo "Tareas Pendientes" del Pulso: asegura el tablero y
// además lo marca para que se abra solo al entrar a Exclusivas.
export async function abrirTareasPersonales(departamento: string): Promise<void> {
  const id = await asegurarTareasPersonales(departamento);
  if (id) localStorage.setItem(openPersonalKey(departamento), id);
}
