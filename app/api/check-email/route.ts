import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) return NextResponse.json({ status: "invalid" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return NextResponse.json({ status: "invalid" });

  try {
    const supabase = await createClient();
    // Busca en profiles usando la join con auth.users via RPC o tabla directa
    // profiles tiene id = auth.users.id, y el email está en auth.users
    // Usamos listUsers del admin si está disponible, sino buscamos en invitaciones
    const { data: inv } = await supabase
      .from("invitaciones")
      .select("full_name, departamento, cargo, used")
      .ilike("email", email)
      .maybeSingle();

    if (inv?.used) {
      // Usuario ya registrado — buscar su perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, departamento, cargo")
        .eq("id", (await supabase.from("invitaciones").select("id").ilike("email", email).maybeSingle()).data?.id ?? "")
        .maybeSingle();

      return NextResponse.json({
        status: "registered",
        full_name: profile?.full_name ?? inv.full_name,
        departamento: profile?.departamento ?? inv.departamento,
        cargo: profile?.cargo ?? inv.cargo,
      });
    }

    if (inv && !inv.used) {
      return NextResponse.json({
        status: "invited",
        full_name: inv.full_name,
        departamento: inv.departamento,
        cargo: inv.cargo,
      });
    }

    return NextResponse.json({ status: "not_found" });
  } catch {
    return NextResponse.json({ status: "error" });
  }
}
