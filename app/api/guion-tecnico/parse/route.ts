import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 300;

const PROMPT = `Eres un asistente especializado en desglosar guiones técnicos de cine (también llamados "planos" o "desglose de cámara").

Te paso el PDF de un guion técnico. Leé todas las páginas e identificá cada plano/shot por escena.

Tu tarea: extraer todos los planos y devolver SOLO un array JSON (sin texto adicional, sin markdown) con esta estructura exacta:

[
  {
    "escena": "número o identificador de la escena (ej: '1', '3B', '12')",
    "plano": "número o código del plano dentro de la escena (ej: '1', '1A', '1B', '2')",
    "tipo": "tipo de plano según la convención estándar: PG (Plano General), PA (Plano Americano), PE (Plano Entero), PM (Plano Medio), PMC (Plano Medio Corto), PP (Primer Plano), PPP (Primerísimo Primer Plano), DET (Detalle), PC (Plano de Conjunto), INSERT — o null si no se especifica",
    "eje": "ángulo o eje de cámara: frontal, lateral, contrapicado, picado, cenital, nadir, holandés, subjetiva — o null",
    "mov_camara": "movimiento de cámara: fijo, panorámica H, panorámica V, travelling in, travelling out, travelling lateral, steadicam, handheld, grúa, drone, zoom in, zoom out — o null",
    "lente": "focal o lente: '24mm', '35mm', '50mm', '85mm', '135mm', 'gran angular', 'teleobjetivo' — o null",
    "descripcion": "descripción del encuadre y acción que ocurre en el plano (lo que se ve en cámara)",
    "personajes": ["NOMBRE1", "NOMBRE2"],
    "notas": "notas técnicas adicionales: iluminación especial, efectos, audio, extras, maquillaje, VFX — o null",
    "duracion_seg": número estimado de segundos de duración del plano, o null si no se indica,
    "pagina_pdf": número de página del PDF donde aparece el plano
  }
]

Reglas:
- Si el documento es un guion literario con descripción de cámara incluida (no un guion técnico puro), extrae igualmente cada plano que puedas inferir.
- Si no hay información sobre tipo/eje/lente/etc., usa null en esos campos.
- "personajes" deben estar en mayúsculas tal como aparecen.
- Si hay varias columnas (como en una tabla de planos), leelas correctamente de izquierda a derecha.
- Devolvé el JSON completo sin truncar, sin comentarios, sin texto antes ni después.

Guion técnico:
`;

export async function POST(req: Request) {
  const { guionTecnicoId } = await req.json();
  if (!guionTecnicoId) {
    return NextResponse.json({ error: "Falta guionTecnicoId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: guion, error: guionError } = await supabase
    .from("guiones_tecnicos")
    .select("*")
    .eq("id", guionTecnicoId)
    .single();

  if (guionError || !guion) {
    return NextResponse.json({ error: "Guion técnico no encontrado" }, { status: 404 });
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
    if (!text) throw new Error("La IA no devolvió texto");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido");

    type PlanoIA = {
      escena?: string;
      plano?: string;
      tipo?: string | null;
      eje?: string | null;
      mov_camara?: string | null;
      lente?: string | null;
      descripcion?: string;
      personajes?: string[];
      notas?: string | null;
      duracion_seg?: number | null;
      pagina_pdf?: number | null;
    };

    const planos: PlanoIA[] = JSON.parse(jsonMatch[0]);

    const rows = planos.map((p, i) => ({
      project_id: guion.project_id,
      guion_tecnico_id: guion.id,
      escena: p.escena ?? "",
      plano: p.plano ?? String(i + 1),
      tipo: p.tipo ?? null,
      eje: p.eje ?? null,
      mov_camara: p.mov_camara ?? null,
      lente: p.lente ?? null,
      descripcion: p.descripcion ?? "",
      personajes: p.personajes ?? [],
      notas: p.notas ?? null,
      duracion_seg: p.duracion_seg ?? null,
      pagina_pdf: p.pagina_pdf ?? null,
      orden: i,
      estado: "borrador",
      autor_id: auth.user.id,
    }));

    const { error: insertError } = await supabase.from("planos").insert(rows);
    if (insertError) throw new Error(insertError.message);

    await supabase.from("guiones_tecnicos").update({ estado: "listo" }).eq("id", guion.id);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase.from("guiones_tecnicos").update({ estado: "error", error_msg: message }).eq("id", guion.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
