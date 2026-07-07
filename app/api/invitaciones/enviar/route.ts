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

// Paleta oficial de acentos por departamento (ver memoria "paleta de colores
// oficial" — únicos hex válidos, armonizados al logo real de CINE PACK).
const ACENTO_DEPTO: Record<string, string> = {
  "Dirección": "#9EEE6A",
  "Fotografía": "#1F7DE2",
  "Arte": "#F37FB5",
  "Guion": "#F5E26A",
  "Producción": "#19CBE6",
  "Ejecutivo": "#C98AF2",
  "Casting": "#EE9962",
  "Reparto": "#F4F4F6",
  "Making of": "#5BEDD6",
  "Sonido": "#E6B019",
  "Postproducción": "#F07A7A",
  "RRHH": "#66C3EE",
  "Sostenibilidad": "#52EC64",
  "Marketing": "#E8A330",
  "Difusión": "#5F70ED",
  "Distribución": "#F18E80",
};
const CYAN = "#19CBE6"; // mismo acento que usa el botón real de /invitacion/[token]

// Mismo patrón hexagonal de fondo que .hexbg en cp-theme.css (login, registro,
// invitación), reescalado para una tarjeta de email más chica.
const HEXBG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='78' viewBox='0 0 120 104'%3E%3Cpolygon points='30,0 90,0 120,52 90,104 30,104 0,52' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1.5'/%3E%3C/svg%3E";

function emailHtml(inv: Invitacion, link: string) {
  const acento = ACENTO_DEPTO[inv.departamento] ?? "#9EEE6A";
  const rol = inv.cargo ? `${inv.departamento} · ${inv.cargo}` : inv.departamento;
  const nombrePila = inv.full_name.split(" ")[0];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invitación a CINE PACK</title>
  </head>
  <body style="margin:0;padding:0;background:#0D0D12;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${nombrePila}, te están esperando en "${inv.proyecto_nombre}".
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D12;padding:48px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161D;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td style="padding:34px 36px;text-align:center;background-color:#16161D;background-image:url('${HEXBG}');background-repeat:repeat;">
                <img src="${APP_URL}/logo-cp-dark.png" alt="CINE PACK" height="30" style="height:30px;width:auto;display:inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 0 36px;text-align:center;">
                <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a95;">
                  Te invitaron a un proyecto
                </div>
                <div style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.25;color:#F4F4F6;margin-top:10px;">
                  ${inv.proyecto_nombre}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 0 36px;text-align:center;">
                <span style="display:inline-block;border:1px solid ${acento};color:${acento};font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;">
                  ${rol}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 36px 0 36px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#c8cad4;">
                <p style="margin:0 0 14px;color:#F4F4F6;font-weight:700;">Hola ${nombrePila}, ¡enhorabuena!</p>
                <p style="margin:0;">Ya tenés un lugar reservado en el equipo. Creá tu cuenta con un clic y vas a encontrar tu departamento, tus tareas y todo lo que el equipo fue cargando, listo para trabajar.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 36px 6px 36px;text-align:center;">
                <a href="${link}" style="display:inline-block;background:${CYAN};color:#0D0D12;text-decoration:none;font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;padding:15px 30px;">
                  Crear mi cuenta →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 36px 0 36px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#6f6f7a;">
                Al crear tu cuenta aceptás nuestra <a href="${APP_URL}/legal/privacidad" style="color:#8a8a95;">política de privacidad</a>.
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px 0 36px;">
                <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 32px 36px;font-family:Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#6f6f7a;text-align:center;">
                Si el botón no funciona, copiá este enlace en tu navegador:<br />
                <a href="${link}" style="color:#8a8a95;word-break:break-all;">${link}</a>
              </td>
            </tr>
          </table>
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
            <tr>
              <td style="padding:20px 12px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#5a5a63;">
                CINE PACK — gestión de producción audiovisual · cinepack.es
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
