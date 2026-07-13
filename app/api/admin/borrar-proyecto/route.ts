import { NextResponse } from "next/server";
import { requireSuperAdmin } from "../_auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKETS = ["documentos", "guiones"] as const;

// Borra recursivamente todos los objetos bajo un prefijo en un bucket.
async function vaciarPrefijo(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string
) {
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return;
  const archivos = data.filter((i) => i.id !== null).map((i) => `${prefix}/${i.name}`);
  if (archivos.length > 0) {
    await admin.storage.from(bucket).remove(archivos);
  }
  const carpetas = data.filter((i) => i.id === null);
  for (const c of carpetas) {
    await vaciarPrefijo(admin, bucket, `${prefix}/${c.name}`);
  }
}

export async function POST(req: Request) {
  const authz = await requireSuperAdmin();
  if (!authz.ok) return authz.response;

  const { project_id } = await req.json().catch(() => ({}));
  if (!project_id || typeof project_id !== "string") {
    return NextResponse.json({ error: "Falta project_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) Solo se puede borrar un proyecto ya archivado (salvaguarda extra).
  const { data: proyecto, error: errP } = await admin
    .from("proyectos")
    .select("id, archivado_at")
    .eq("id", project_id)
    .single();
  if (errP || !proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  if (!proyecto.archivado_at) {
    return NextResponse.json({ error: "El proyecto debe archivarse antes de borrarse definitivamente" }, { status: 409 });
  }

  // 2) Limpieza de ficheros en Storage (ambos buckets) vía la Storage API.
  for (const bucket of BUCKETS) {
    await vaciarPrefijo(admin, bucket, project_id);
  }

  // 3) Borrado en cascada de todas las filas hijas + el proyecto (RPC dinámica,
  //    security definer, verifica is_super_admin internamente). El RPC se llama
  //    con el token del usuario (no service role) para que is_super_admin()
  //    resuelva contra su sesión.
  const { createClient: createUserClient } = await import("@/lib/supabase/server");
  const supaUser = await createUserClient();
  const { error: errDel } = await supaUser.rpc("admin_borrar_proyecto", { p_project_id: project_id });
  if (errDel) {
    return NextResponse.json({ error: errDel.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
