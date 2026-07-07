import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { LOGO_CP_DARK_BASE64 } from "./logo";

export const runtime = "nodejs";

const APP_URL = "https://app.cinepack.es";
const REMITENTE = "CINE PACK <invitaciones@cinepack.es>";
const LOGO_CID = "logo-cinepack";

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
// Las comillas del SVG van percent-encoded (%27) a propósito: si quedan como
// comillas simples literales, chocan con las comillas simples del url('...')
// que las envuelve en el style del email y rompen TODO ese atributo style
// (fondo, patrón y centrado) en clientes como Apple Mail.
const HEXBG =
  "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2790%27 height=%2778%27 viewBox=%270 0 120 104%27%3E%3Cpolygon points=%2730,0 90,0 120,52 90,104 30,104 0,52%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.09)%27 stroke-width=%271.5%27/%3E%3C/svg%3E";

function emailHtml(inv: Invitacion, link: string) {
  const acento = ACENTO_DEPTO[inv.departamento] ?? "#9EEE6A";
  const rol = inv.cargo ? `${inv.departamento} · ${inv.cargo}` : inv.departamento;
  const nombrePila = inv.full_name.split(" ")[0];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Invitación a CINE PACK</title>
    <style>
      /* Gmail (web y app) puede ignorar bgcolor/background-color inline y
         mostrar fondo blanco por defecto. Estas reglas con !important, más
         el selector [data-ogsc] (marca que Gmail agrega a los elementos
         cuando su modo oscuro está activo), son la forma documentada de
         forzar el color igual bajo Gmail. */
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
      ${nombrePila}, te están esperando en «${inv.proyecto_nombre}».
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="cp-bg-outer" bgcolor="#0D0D12" style="background:#0D0D12;padding:48px 20px;">
      <tr>
        <td align="center" class="cp-bg-outer" bgcolor="#0D0D12">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" class="cp-bg-card" bgcolor="#16161D" style="max-width:480px;width:100%;background:#16161D;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:34px 36px 26px 36px;text-align:center;background-color:#16161D;background-image:url('${HEXBG}');background-repeat:repeat;">
                <img src="cid:${LOGO_CID}" alt="CINE PACK" height="30" style="height:30px;width:auto;display:inline-block;" />
                <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a95;margin-top:22px;">
                  Te han invitado a un proyecto
                </div>
                <div style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.25;color:#F4F4F6;margin-top:10px;">
                  ${inv.proyecto_nombre}
                </div>
                <div style="margin-top:16px;">
                  <span style="display:inline-block;border:1px solid ${acento};color:${acento};font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;background:#16161D;">
                    ${rol}
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:28px 36px 0 36px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#c8cad4;">
                <p style="margin:0 0 14px;color:#F4F4F6;font-weight:700;text-align:center;">Hola ${nombrePila}, ¡enhorabuena!</p>
                <p style="margin:0;text-align:center;">Ya tienes un lugar reservado en el equipo. Crea tu cuenta con un clic y encontrarás tu departamento, tus tareas y todo lo que el equipo ya haya ido cargando, listo para trabajar.</p>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:30px 36px 6px 36px;text-align:center;background-color:#16161D;">
                <a href="${link}" style="display:inline-block;background:${CYAN};color:#0D0D12;text-decoration:none;font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;padding:15px 30px;">
                  Crear mi cuenta →
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:16px 36px 0 36px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#6f6f7a;">
                Al crear tu cuenta aceptas nuestra <a href="${APP_URL}/legal/privacidad" style="color:#8a8a95;">política de privacidad</a>.
              </td>
            </tr>
            <tr>
              <td class="cp-bg-card" bgcolor="#16161D" style="padding:22px 36px 0 36px;background-color:#16161D;">
                <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:18px 36px 32px 36px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#6f6f7a;">
                Si el botón no funciona, copia este enlace en tu navegador:<br />
                <a href="${link}" style="color:#8a8a95;word-break:break-all;">${link}</a>
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

  try {
    const { error: sendError } = await resend.emails.send({
      from: REMITENTE,
      to: inv.email,
      subject: `Te han invitado al proyecto «${inv.proyecto_nombre}» en CINE PACK`,
      html: emailHtml(inv, link),
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
