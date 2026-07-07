import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const APP_URL = "https://app.cinepack.es";
const REMITENTE = "CINE PACK <invitaciones@cinepack.es>";

type Invitacion = {
  email: string;
  full_name: string;
  departamento: string;
  cargo: string | null;
  proyecto_nombre: string;
  used: boolean;
};

function emailHtml(inv: Invitacion, link: string) {
  return `
  <div style="background:#0D0D12;padding:40px 24px;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#16161d;border:1px solid #2a2a35;border-radius:0;overflow:hidden;">
      <div style="padding:32px 32px 0;text-align:center;">
        <div style="display:inline-block;width:32px;height:32px;background:#E8FF6B;transform:rotate(45deg);margin-bottom:16px;"></div>
        <h1 style="color:#fff;font-size:20px;margin:0 0 8px;">CINE PACK</h1>
      </div>
      <div style="padding:8px 32px 32px;color:#c8c8d0;font-size:14px;line-height:1.6;">
        <p style="color:#fff;font-size:16px;">Hola ${inv.full_name},</p>
        <p>Te sumaron al proyecto <strong style="color:#fff;">${inv.proyecto_nombre}</strong> en CINE PACK, como <strong style="color:#fff;">${inv.departamento}${inv.cargo ? ` · ${inv.cargo}` : ""}</strong>.</p>
        <p>Hacé click abajo para crear tu cuenta y entrar directo al proyecto.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${link}" style="display:inline-block;background:#E8FF6B;color:#0D0D12;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;letter-spacing:0.02em;">CREAR MI CUENTA</a>
        </div>
        <p style="color:#8a8a95;font-size:12px;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
        <a href="${link}" style="color:#8a8a95;word-break:break-all;">${link}</a></p>
      </div>
    </div>
  </div>`;
}

export async function POST(req: Request) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "Falta el token" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = (Array.isArray(data) ? data[0] : data) as Invitacion | null;

  if (error || !inv) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }
  if (inv.used) {
    return NextResponse.json({ error: "La invitación ya fue utilizada" }, { status: 409 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const link = `${APP_URL}/invitacion/${token}`;

  const { error: sendError } = await resend.emails.send({
    from: REMITENTE,
    to: inv.email,
    subject: `Te invitaron al proyecto "${inv.proyecto_nombre}" en CINE PACK`,
    html: emailHtml(inv, link),
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
