import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOGO_CP_DARK_BASE64 } from "../../invitaciones/enviar/logo";

export const runtime = "nodejs";

const APP_URL = "https://app.cinepack.es";
const REMITENTE = "CINE PACK <notificaciones@cinepack.es>";
const LOGO_CID = "logo-cinepack";

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

const HEXBG =
  "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2790%27 height=%2778%27 viewBox=%270 0 120 104%27%3E%3Cpolygon points=%2730,0 90,0 120,52 90,104 30,104 0,52%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.09)%27 stroke-width=%271.5%27/%3E%3C/svg%3E";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Recipient = { email: string; full_name: string; departamento: string };

function emailHtml(opts: {
  proyectoNombre: string;
  titulo: string;
  texto: string;
  esPrivada: boolean;
  deDepartamento: string;
  autorNombre: string;
  destinatarioNombre: string;
  destinatarioAcc: string;
}) {
  const emisorAcc = ACENTO_DEPTO[opts.deDepartamento] ?? "#9EEE6A";
  const nombrePila = opts.destinatarioNombre.split(" ")[0];
  const textoHtml = escapeHtml(opts.texto).replace(/\n/g, "<br />");
  const eyebrow = opts.esPrivada
    ? `Consulta privada en «${opts.proyectoNombre}»`
    : `Nueva consulta en «${opts.proyectoNombre}»`;
  const introLinea = opts.esPrivada
    ? `Hola ${nombrePila}, ${opts.autorNombre} te hizo una consulta privada:`
    : `Hola ${nombrePila}, ${opts.deDepartamento} te hizo una consulta:`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Nueva consulta en CINE PACK</title>
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
      ${opts.autorNombre} te hizo una consulta en «${opts.proyectoNombre}»: ${opts.titulo}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="cp-bg-outer" bgcolor="#0D0D12" style="background:#0D0D12;padding:48px 20px;">
      <tr>
        <td align="center" class="cp-bg-outer" bgcolor="#0D0D12">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" class="cp-bg-card" bgcolor="#16161D" style="max-width:480px;width:100%;background:#16161D;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:26px 30px 20px;text-align:center;background-color:#16161D;background-image:url('${HEXBG}');background-repeat:repeat;">
                <img src="cid:${LOGO_CID}" alt="CINE PACK" height="30" style="height:30px;width:auto;display:inline-block;" />
                <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a95;margin-top:16px;">
                  ${eyebrow}
                </div>
                <div style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:800;font-size:20px;line-height:1.25;color:#F4F4F6;margin-top:8px;">
                  ${opts.titulo}
                </div>
                ${
                  opts.esPrivada
                    ? ""
                    : `<div style="margin-top:12px;">
                  <span style="display:inline-block;border:1px solid ${emisorAcc};color:${emisorAcc};font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:700;font-size:10.5px;letter-spacing:0.06em;text-transform:uppercase;padding:5px 12px;background:#16161D;">
                    De: ${opts.deDepartamento}
                  </span>
                </div>`
                }
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:20px 30px 0;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#c8cad4;">
                <p style="margin:0;">${introLinea}</p>
              </td>
            </tr>
            <tr>
              <td class="cp-bg-card" bgcolor="#16161D" style="padding:16px 30px 0;background-color:#16161D;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${emisorAcc};background:rgba(255,255,255,0.03);">
                  <tr>
                    <td style="padding:14px 16px;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.55;color:#F4F4F6;font-style:italic;text-align:left;">
                      &ldquo;${textoHtml}&rdquo;
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:22px 30px 6px;text-align:center;background-color:#16161D;">
                <a href="${APP_URL}/hoy" style="display:inline-block;background:${opts.destinatarioAcc};color:#0D0D12;text-decoration:none;font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;padding:13px 26px;">
                  Responder &rarr;
                </a>
              </td>
            </tr>
            <tr>
              <td class="cp-bg-card" bgcolor="#16161D" style="padding:22px 30px 0;background-color:#16161D;">
                <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
              </td>
            </tr>
            <tr>
              <td align="center" class="cp-bg-card" bgcolor="#16161D" style="padding:18px 30px 32px;text-align:center;background-color:#16161D;font-family:Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.6;color:#6f6f7a;">
                ${
                  opts.esPrivada
                    ? "Esta consulta es privada: solo la ven el emisor y vos."
                    : `Recibiste este correo porque ${opts.deDepartamento} te dirigió esta consulta en CINE PACK.`
                }
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
  const { consulta_id } = (await req.json().catch(() => ({}))) as { consulta_id?: string };
  if (!consulta_id) {
    return NextResponse.json({ error: "Falta consulta_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: consulta } = await supabase
    .from("consultas")
    .select("id, project_id, titulo, texto, de_departamento, autor_nombre, para_departamentos, is_private, private_recipient_id")
    .eq("id", consulta_id)
    .single();

  if (!consulta) {
    return NextResponse.json({ error: "Consulta no encontrada o sin acceso" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: proyecto } = await admin.from("proyectos").select("nombre").eq("id", consulta.project_id).single();
  const proyectoNombre = proyecto?.nombre ?? "tu proyecto";

  let destinatarios: { user_id: string; departamento: string; full_name: string }[] = [];

  if (consulta.is_private) {
    if (!consulta.private_recipient_id) {
      return NextResponse.json({ ok: true, sent: 0 });
    }
    const { data: miembro } = await admin
      .from("project_members")
      .select("user_id, rol, profiles(full_name)")
      .eq("project_id", consulta.project_id)
      .eq("user_id", consulta.private_recipient_id)
      .single();
    const p = miembro?.profiles as unknown as { full_name: string } | null;
    if (miembro && p) {
      destinatarios = [{ user_id: miembro.user_id as string, departamento: miembro.rol as string, full_name: p.full_name }];
    }
  } else {
    const { data: miembros } = await admin
      .from("project_members")
      .select("user_id, rol, profiles(full_name)")
      .eq("project_id", consulta.project_id)
      .in("rol", consulta.para_departamentos ?? []);
    destinatarios = (miembros ?? [])
      .map((m) => {
        const p = m.profiles as unknown as { full_name: string } | null;
        if (!p) return null;
        return { user_id: m.user_id as string, departamento: m.rol as string, full_name: p.full_name };
      })
      .filter((m): m is { user_id: string; departamento: string; full_name: string } => m !== null);
  }

  if (destinatarios.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const conEmail: Recipient[] = [];
  await Promise.all(
    destinatarios.map(async (d) => {
      const { data } = await admin.auth.admin.getUserById(d.user_id);
      if (data?.user?.email) {
        conEmail.push({ email: data.user.email, full_name: d.full_name, departamento: d.departamento });
      }
    })
  );

  if (conEmail.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Uno por uno: batch.send de Resend no soporta adjuntos (el logo va
  // embebido como cid). Un fallo individual no aborta el resto.
  let enviados = 0;
  await Promise.all(
    conEmail.map(async (r) => {
      try {
        await resend.emails.send({
          from: REMITENTE,
          to: r.email,
          subject: consulta.is_private ? `Consulta privada: ${consulta.titulo}` : `Nueva consulta: ${consulta.titulo}`,
          html: emailHtml({
            proyectoNombre,
            titulo: consulta.titulo,
            texto: consulta.texto,
            esPrivada: consulta.is_private,
            deDepartamento: consulta.de_departamento,
            autorNombre: consulta.autor_nombre,
            destinatarioNombre: r.full_name,
            destinatarioAcc: ACENTO_DEPTO[r.departamento] ?? "#9EEE6A",
          }),
          attachments: [
            {
              filename: "logo-cp-dark.png",
              content: Buffer.from(LOGO_CP_DARK_BASE64, "base64"),
              contentId: LOGO_CID,
            },
          ],
        });
        enviados++;
      } catch {
        // Se ignora el fallo individual: la consulta ya quedó creada.
      }
    })
  );

  return NextResponse.json({ ok: true, sent: enviados });
}
