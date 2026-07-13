import { NextResponse } from "next/server";
import { requireSuperAdmin } from "../_auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKETS_VALIDOS = new Set(["documentos", "guiones"]);

// Toda ruta manejada debe vivir bajo el prefijo del proyecto: impide que el
// soporte, aun siendo admin, se salga a los archivos de OTRO proyecto por un
// path manipulado (principio de aislamiento entre proyectos de CINE PACK).
function dentroDelProyecto(path: string, projectId: string) {
  return path === projectId || path.startsWith(`${projectId}/`);
}

type Body = {
  action: "list" | "signed" | "move" | "restore" | "delete" | "trash";
  project_id: string;
  bucket?: string;
  path?: string;
  from?: string;
  to?: string;
  papelera_id?: string;
};

export async function POST(req: Request) {
  const authz = await requireSuperAdmin();
  if (!authz.ok) return authz.response;

  const body = (await req.json().catch(() => ({}))) as Partial<Body>;
  const { action, project_id } = body;
  if (!action || !project_id) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const admin = createAdminClient();
  const bucket = body.bucket ?? "documentos";
  if ((action === "list" || action === "signed" || action === "move" || action === "delete") && !BUCKETS_VALIDOS.has(bucket)) {
    return NextResponse.json({ error: "Bucket no válido" }, { status: 400 });
  }

  switch (action) {
    case "list": {
      const path = body.path || project_id;
      if (!dentroDelProyecto(path, project_id)) {
        return NextResponse.json({ error: "Ruta fuera del proyecto" }, { status: 403 });
      }
      const { data, error } = await admin.storage.from(bucket).list(path, { limit: 1000, sortBy: { column: "name", order: "asc" } });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const folders = (data ?? []).filter((i) => i.id === null).map((i) => i.name);
      const files = (data ?? [])
        .filter((i) => i.id !== null)
        .map((i) => ({
          name: i.name,
          nombre: i.name.replace(/^\d+[-_]/, ""),
          path: `${path}/${i.name}`,
          size: (i.metadata as { size?: number } | null)?.size ?? 0,
          created_at: i.created_at ?? null,
        }));
      return NextResponse.json({ folders, files });
    }

    case "signed": {
      const path = body.path;
      if (!path || !dentroDelProyecto(path, project_id)) {
        return NextResponse.json({ error: "Ruta fuera del proyecto" }, { status: 403 });
      }
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300);
      if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo firmar" }, { status: 500 });
      return NextResponse.json({ url: data.signedUrl });
    }

    case "move": {
      const { from, to } = body;
      if (!from || !to || !dentroDelProyecto(from, project_id) || !dentroDelProyecto(to, project_id)) {
        return NextResponse.json({ error: "Ruta fuera del proyecto" }, { status: 403 });
      }
      const { error } = await admin.storage.from(bucket).move(from, to);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "delete": {
      const path = body.path;
      if (!path || !dentroDelProyecto(path, project_id)) {
        return NextResponse.json({ error: "Ruta fuera del proyecto" }, { status: 403 });
      }
      const { error } = await admin.storage.from(bucket).remove([path]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Si el archivo estaba registrado en la papelera, limpiar la fila.
      await admin.from("archivos_papelera").delete().eq("papelera_path", path).eq("project_id", project_id);
      return NextResponse.json({ ok: true });
    }

    case "trash": {
      const { data, error } = await admin
        .from("archivos_papelera")
        .select("*")
        .eq("project_id", project_id)
        .order("deleted_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data ?? [] });
    }

    case "restore": {
      const { papelera_id } = body;
      if (!papelera_id) return NextResponse.json({ error: "Falta papelera_id" }, { status: 400 });
      const { data: fila, error: errF } = await admin
        .from("archivos_papelera")
        .select("*")
        .eq("id", papelera_id)
        .eq("project_id", project_id)
        .single();
      if (errF || !fila) return NextResponse.json({ error: "Archivo no encontrado en la papelera" }, { status: 404 });

      // Destino: la ruta original, o una alternativa pasada por el admin.
      const destino = body.to && dentroDelProyecto(body.to, project_id) ? body.to : fila.original_path;
      const { error: errMove } = await admin.storage.from(fila.bucket).move(fila.papelera_path, destino);
      if (errMove) return NextResponse.json({ error: errMove.message }, { status: 500 });
      await admin.from("archivos_papelera").delete().eq("id", papelera_id);
      return NextResponse.json({ ok: true, restored_to: destino });
    }

    default:
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }
}
