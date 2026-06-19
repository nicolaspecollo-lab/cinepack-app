import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 300;

const PROMPT = `Eres un asistente especializado en desglosar guiones de cine en escenas, en formato de guion estándar (Courier).

Te paso el PDF completo del guion. Leé todas las páginas y detectá cada escena según los encabezados de escena (INT./EXT.).

Tu tarea: dividir el guion en escenas y devolver SOLO un array JSON (sin texto adicional, sin markdown) con esta forma exacta:

[
  {
    "numero": 1,
    "int_ext": "INT" | "EXT" | "INT/EXT" | null,
    "lugar": "nombre del lugar tal como aparece en el encabezado de escena",
    "dia_noche": "DÍA" | "NOCHE" | "ATARDECER" | etc, o null si no se especifica,
    "encabezado": "texto completo del encabezado de la escena tal como aparece en el guion",
    "descripcion": "texto de acción/descripción de la escena (sin diálogos)",
    "personajes": ["NOMBRE1", "NOMBRE2"],
    "dialogo": [
      { "personaje": "NOMBRE", "parentetico": "texto entre paréntesis bajo el nombre, o null si no hay", "texto": "línea de diálogo" }
    ],
    "pagina_pdf": numero de página del PDF original donde empieza la escena
  }
]

Reglas:
- Numerá las escenas en orden correlativo empezando en 1, según como aparezcan en el guion (si el guion ya tiene numeración de escenas, respetala).
- "personajes" debe listar a todos los personajes que aparecen en la escena (con diálogo o mencionados como presentes).
- En "dialogo", el campo "parentetico" es la acotación entre paréntesis que aparece debajo del nombre del personaje (ej. "(O.S.)", "(en voz baja)", "(CONT'D)"). Si no hay, usar null. NUNCA mezcles el paréntesis dentro de "texto".
- "pagina_pdf" es el número de página (según los marcadores "--- PÁGINA N ---") donde comienza la escena.
- Si una escena ocupa varias páginas, "pagina_pdf" es la página donde empieza.
- Devolvé el JSON completo, sin truncar, sin comentarios, sin texto antes ni después.

Texto del guion:
`;

export async function POST(req: Request) {
  const { guionId } = await req.json();
  if (!guionId) {
    return NextResponse.json({ error: "Falta guionId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: guion, error: guionError } = await supabase
    .from("guiones")
    .select("*")
    .eq("id", guionId)
    .single();

  if (guionError || !guion) {
    return NextResponse.json({ error: "Guion no encontrado" }, { status: 404 });
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("guiones")
      .download(guion.archivo_path);

    if (downloadError || !file) {
      throw new Error(downloadError?.message || "No se pudo descargar el PDF");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Pdf = buffer.toString("base64");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Gemini puede devolver 503 (UNAVAILABLE) o 429 en picos de demanda; reintentamos con backoff.
    let response;
    const maxTries = 4;
    for (let i = 0; i < maxTries; i++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
                { text: PROMPT },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 65000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        break;
      } catch (e) {
        const status = (e as { status?: number })?.status;
        if ((status === 503 || status === 429) && i < maxTries - 1) {
          await new Promise((r) => setTimeout(r, (i + 1) * 3000));
          continue;
        }
        throw e;
      }
    }

    const text = response?.text;
    if (!text) {
      throw new Error("La IA no devolvió texto");
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("La IA no devolvió un JSON válido");
    }

    type EscenaIA = {
      numero?: number;
      int_ext?: string | null;
      lugar?: string | null;
      dia_noche?: string | null;
      encabezado?: string;
      descripcion?: string | null;
      personajes?: string[];
      dialogo?: { personaje: string; parentetico: string | null; texto: string }[];
      pagina_pdf?: number | null;
    };

    const escenas: EscenaIA[] = JSON.parse(jsonMatch[0]);

    const rows = escenas.map((e, i) => ({
      project_id: guion.project_id,
      guion_id: guion.id,
      numero: e.numero ?? i + 1,
      int_ext: e.int_ext ?? null,
      lugar: e.lugar ?? null,
      dia_noche: e.dia_noche ?? null,
      encabezado: e.encabezado ?? "",
      descripcion: e.descripcion ?? null,
      personajes: e.personajes ?? [],
      dialogo: e.dialogo ?? [],
      pagina_pdf: e.pagina_pdf ?? null,
      orden: i,
      estado: "borrador",
    }));

    const { error: insertError } = await supabase.from("escenas").insert(rows);
    if (insertError) throw new Error(insertError.message);

    await supabase.from("guiones").update({ estado: "listo" }).eq("id", guion.id);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase.from("guiones").update({ estado: "error", error_msg: message }).eq("id", guion.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
