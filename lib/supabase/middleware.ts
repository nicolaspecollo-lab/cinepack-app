import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Comparación en tiempo (casi) constante para no filtrar longitud/contenido de
// las credenciales por timing. Suficiente para una puerta de Basic Auth.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// Segunda capa de seguridad sobre /admin: usuario + contraseña por HTTP Basic
// Auth (misma sensación que el .htaccess de la Biblia). Las credenciales viven
// en variables de entorno (ADMIN_GATE_USER / ADMIN_GATE_PASSWORD), nunca en el
// repo. Devuelve una respuesta 401 si el reto no se supera, o null si pasa.
// Si las variables NO están configuradas, la puerta se omite (fail-open) para
// no bloquear el acceso antes de cargarlas; la restricción de super_admin sigue
// vigente igualmente.
function checkAdminGate(request: NextRequest): NextResponse | null {
  const gateUser = process.env.ADMIN_GATE_USER;
  const gatePass = process.env.ADMIN_GATE_PASSWORD;
  if (!gateUser || !gatePass) return null;

  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (safeEqual(u, gateUser) && safeEqual(p, gatePass)) return null;
    } catch {
      // credencial malformada -> tratar como fallo
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CINE PACK Admin", charset="UTF-8"' },
  });
}

export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const gateFail = checkAdminGate(request);
    if (gateFail) return gateFail;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/hoy")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .single();
    if (profile?.app_role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/proyectos";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
