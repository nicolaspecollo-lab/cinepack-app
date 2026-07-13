import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { LOGO_CP_DARK_BASE64 } from "../../invitaciones/enviar/logo";

export const runtime = "nodejs";

const APP_URL = "https://app.cinepack.es";
const REMITENTE = "CINE PACK <soporte@cinepack.es>";
const LOGO_CID = "logo-cinepack";
const CYAN = "#19CBE6";

// Mismo patrón hexagonal de fondo que el mail de invitación (ver
// app/api/invitaciones/enviar/route.ts) — reescalado igual, comillas
// percent-encoded a propósito (ver comentario original).
const HEXBG =
  "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2790%27 height=%2778%27 viewBox=%270 0 120 104%27%3E%3Cpolygon points=%2730,0 90,0 120,52 90,104 30,104 0,52%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.09)%27 stroke-width=%271.5%27/%3E%3C/svg%3E";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailHtml(nombrePila: string, feedback: string) {
  // Se conservan los saltos de línea del feedback original, escapando el
  // resto del contenido para evitar que un feedback con HTML/scripts se
  // ejecute en el cliente de correo del usuario.
  const feedbackHtml = escapeHtml(feedback).replace(/\n/g, "<br />");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Gracias por tu feedback</title>
    <style>
      .cp-bg-outer, [data-ogsc] .cp-bg-outer { background-color: #0D0D12 !important; }
      .cp-bg-card, [data-ogsc] .cp-bg-card { background-color: #16161D !important; }
      @media (prefers-color-scheme: dark) {
        .cp-bg-outer { background-color: #0D0D12 !important; }
        .cp-bg-card { background-color: #16161D !important; }
      }
    </style>
  </head>
  <body class="cp-bg-outer" style="margin:0;padding:0;background:#0D0D12;" bgcolor="#0D0D12">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Gracias, ${nombrePila} — recibimos tu feedback y quedó registrado.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="cp-bg-outer" bgcolor="#0D0D12" style="background:#0D0D12;padding:48px 20px;">
      <tr>
        <td align="center" class="cp-bg-outer" bgcolor="#0D0D12">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" class="cp-bg-card" bgcolor="#16161D" style="max-width:480px;width:100%;background:#16161D;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:34px 36px 26px 36px;text-align:center;background-color:#16161D;background-image:url('${HEXBG}');background-repeat:repeat;">
                <img src="cid:${LOGO_CID}" alt="CINE PACK" height="30" style="height:30px;width:auto;display:inline-block;" />
                <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a95;margin-top:22px;">
                  Feedback recibido
                </div>
                <div style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:800;font-size:24px;line-height:1.25;color:#F4F4F6;margin-top:10px;">
                  Gracias por ayudarnos a mejorar
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:28px 36px 0 36px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#c8cad4;">
                <p style="margin:0 0 14px;color:#F4F4F6;font-weight:700;text-align:center;">Hola ${nombrePila},</p>
                <p style="margin:0;text-align:center;">Recibimos el mensaje que nos enviaste desde CINE PACK. Queda registrado tal como lo escribiste:</p>
              </td>
            </tr>
            <tr>
              <td class="cp-bg-card" bgcolor="#16161D" style="padding:22px 36px 0 36px;background-color:#16161D;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${CYAN};background:rgba(255,255,255,0.03);">
                  <tr>
                    <td style="padding:16px 18px;font-family:Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#F4F4F6;font-style:italic;">
                      &ldquo;${feedbackHtml}&rdquo;
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:24px 36px 32px 36px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#c8cad4;">
                Lo va a revisar el equipo de CINE PACK. Si hace falta, te contactamos a este mismo correo.
              </td>
            </tr>
            <tr>
              <td class="cp-bg-card" bgcolor="#16161D" style="padding:0 36px;background-color:#16161D;">
                <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:18px 36px 32px 36px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#6f6f7a;">
                Enviado desde <a href="${APP_URL}" style="color:#8a8a95;">app.cinepack.es</a>
              </td>
            </tr>
          </table>
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" class="cp-bg-outer" bgcolor="#0D0D12" style="max-width:480px;width:100%;background:#0D0D12;">
            <tr>
              <td class="cp-bg-outer" bgcolor="#0D0D12" style="padding:20px 12px 0;text-align:center;background-color:#0D0D12;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#5a5a63;">
                CINE PACK — gestión de producción audiovisual · cinepack.es
              </td>
            </tr>
            <tr>
              <td class="cp-bg-outer" bgcolor="#0D0D12" style="padding:14px 20px 0;text-align:justify;background-color:#0D0D12;font-family:Helvetica,Arial,sans-serif;font-size:9.5px;line-height:1.55;color:#4a4a52;">
                La información contenida en este mensaje y/o archivo(s) adjunto(s), enviada por El Vínculo Producciones a través de CINE PACK, es confidencial/privilegiada y está destinada a ser leída solo por la(s) persona(s) a la(s) que va dirigida. Le recordamos que sus datos han sido incorporados al sistema de tratamiento de El Vínculo Producciones y que, siempre que se cumplan los requisitos exigidos por la normativa, podrá ejercer sus derechos de acceso, rectificación, limitación del tratamiento, supresión ("derecho al olvido"), portabilidad, oposición y revocación, en los términos que establece la normativa vigente y aplicable en materia de protección de datos, dirigiendo su petición a la dirección postal Passeig de Mallorca 14A, Palma de Mallorca, o bien a través del correo electrónico <a href="mailto:info@elvinculoproducciones.es" style="color:#6a6a72;">info@elvinculoproducciones.es</a>. Si usted lee este mensaje y no es el destinatario señalado, la persona trabajadora o el agente responsable de entregarlo al destinatario, o lo ha recibido por error, le informamos de que está totalmente prohibida, y puede ser ilegal, cualquier divulgación, distribución o reproducción de esta comunicación, y le rogamos que nos lo notifique de inmediato y nos devuelva el mensaje original a la dirección arriba mencionada. Gracias.
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
  const { content } = (await req.json().catch(() => ({}))) as { content?: string };
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Falta el contenido del feedback" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", auth.user.id)
    .single();

  const email = auth.user.email;
  if (!email) {
    return NextResponse.json({ error: "El usuario no tiene email" }, { status: 400 });
  }

  const nombrePila = (profile?.full_name ?? "").split(" ")[0] || "";

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error: sendError } = await resend.emails.send({
      from: REMITENTE,
      to: email,
      subject: "Recibimos tu feedback — gracias",
      html: emailHtml(nombrePila, content.trim()),
      attachments: [
        {
          filename: "logo-cp-dark.png",
          content: Buffer.from(LOGO_CP_DARK_BASE64, "base64"),
          contentId: LOGO_CID,
        },
      ],
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido al enviar el mail";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
