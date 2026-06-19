import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { projectId, texto, paraDepartamento, autorNombre } = (await req.json()) as {
    projectId?: string;
    texto?: string;
    paraDepartamento?: string | null;
    autorNombre?: string | null;
  };

  if (!projectId || !texto) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("nombre, webhook_url")
    .eq("id", projectId)
    .maybeSingle();

  if (!proyecto?.webhook_url) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await fetch(proyecto.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Alerta crítica en "${proyecto.nombre}"${paraDepartamento ? ` (${paraDepartamento})` : ""}: ${texto}${autorNombre ? ` — ${autorNombre}` : ""}`,
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo notificar el webhook" });
  }

  return NextResponse.json({ ok: true });
}
