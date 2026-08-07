import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 300;

// Guiones largos (60+ páginas) fallan de dos formas independientes si se
// mandan enteros en un solo pedido: (1) el filtro de contenido de Gemini
// analiza el PDF COMPLETO como una unidad — si una sola escena dispara el
// bloqueo, se pierde el guion entero, no solo esa escena; (2) la respuesta
// JSON de un guion largo puede superar maxOutputTokens y cortarse a mitad.
// Partir en tandas de páginas aísla ambos problemas a la tanda que falla.
const PAGINAS_POR_TANDA = 15;

const PROMPT = `Eres un asistente especializado en desglosar guiones de cine en escenas, en formato de guion estándar (Courier).

Te paso un fragmento de un guion (puede empezar o terminar a mitad de una escena si el fragmento es parte de un documento más largo). Leé todas las páginas y detectá cada escena según los encabezados de escena (INT./EXT.).

Tu tarea: dividir el fragmento en escenas y devolver SOLO un array JSON (sin texto adicional, sin markdown) con esta forma exacta:

[
  {
    "numero": 1,
    "int_ext": "INT" | "EXT" | "INT/EXT" | null,
    "lugar": "nombre del lugar tal como aparece en el encabezado de escena",
    "dia_noche": "DÍA" | "NOCHE" | "ATARDECER" | etc, o null si no se especifica,
    "encabezado": "texto completo del encabezado de la escena tal como aparece en el guion",
    "personajes": ["NOMBRE1", "NOMBRE2"],
    "elementos": [
      { "tipo": "accion", "texto": "bloque de acción/descripción tal como aparece" },
      { "tipo": "dialogo", "personaje": "NOMBRE", "parentetico": "texto entre paréntesis bajo el nombre, o null si no hay", "texto": "línea de diálogo" }
    ],
    "pagina_pdf": numero de página de ESTE FRAGMENTO (1 = primera página del fragmento) donde empieza la escena
  }
]

Reglas:
- Numerá las escenas según el número que ya traen en su propio encabezado si el guion tiene numeración impresa (ej. "14 INT. ..." → numero: 14). Si el fragmento no tiene escenas numeradas, numéralas correlativamente empezando en 1.
- "elementos" es la secuencia REAL de la escena, en el ORDEN EXACTO en que aparece en el guion: si hay acción, luego diálogo, luego más acción, luego más diálogo, así debe quedar reflejado — NUNCA agrupes toda la acción al principio ni todo el diálogo al final si en el guion original están intercalados.
- "personajes" debe listar a todos los personajes que aparecen en la escena (con diálogo o mencionados como presentes).
- Para elementos de tipo "dialogo", el campo "parentetico" es la acotación entre paréntesis que aparece debajo del nombre del personaje (ej. "(O.S.)", "(en voz baja)", "(CONT'D)"). Si no hay, usar null. NUNCA mezcles el paréntesis dentro de "texto". Los elementos de tipo "accion" no llevan "personaje" ni "parentetico".
- "pagina_pdf" es relativo a ESTE FRAGMENTO, no al guion completo (no lo tenés).
- Si una escena empieza antes de este fragmento (el fragmento arranca a mitad de escena), incluí igual el contenido de la escena que sí está en el fragmento, con el encabezado que puedas inferir o "(continuación)" si no hay encabezado visible.
- Devolvé el JSON completo, sin truncar, sin comentarios, sin texto antes ni después.

Fragmento del guion:
`;

type ElementoIA =
  | { tipo: "accion"; texto: string }
  | { tipo: "dialogo"; personaje: string; parentetico: string | null; texto: string };

type EscenaIA = {
  numero?: number;
  int_ext?: string | null;
  lugar?: string | null;
  dia_noche?: string | null;
  encabezado?: string;
  personajes?: string[];
  elementos?: ElementoIA[];
  pagina_pdf?: number | null;
};

type Tanda = { bytes: Uint8Array; paginaInicio: number; paginaFin: number };

async function partirEnTandas(buffer: Buffer): Promise<Tanda[]> {
  const src = await PDFDocument.load(buffer);
  const total = src.getPageCount();
  const tandas: Tanda[] = [];
  for (let inicio = 0; inicio < total; inicio += PAGINAS_POR_TANDA) {
    const fin = Math.min(inicio + PAGINAS_POR_TANDA, total);
    const doc = await PDFDocument.create();
    const indices = Array.from({ length: fin - inicio }, (_, i) => inicio + i);
    const paginas = await doc.copyPages(src, indices);
    paginas.forEach((p) => doc.addPage(p));
    const bytes = await doc.save();
    tandas.push({ bytes, paginaInicio: inicio + 1, paginaFin: fin });
  }
  return tandas.length > 0 ? tandas : [];
}

async function procesarTanda(ai: GoogleGenAI, tanda: Tanda): Promise<{ escenas: EscenaIA[] } | { error: string }> {
  const base64Pdf = Buffer.from(tanda.bytes).toString("base64");
  const maxTries = 4;
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await ai.models.generateContent({
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

      const bloqueada = response.promptFeedback?.blockReason;
      if (bloqueada) {
        return { error: `bloqueado por el filtro de contenido de la IA (${bloqueada})` };
      }

      const text = response.text;
      if (!text) return { error: "la IA no devolvió texto" };

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return { error: "la IA no devolvió un JSON válido" };

      const escenas: EscenaIA[] = JSON.parse(jsonMatch[0]);
      // pagina_pdf viene relativo a la tanda recortada; se corrige al número
      // de página real del PDF original antes de guardar.
      for (const e of escenas) {
        if (e.pagina_pdf != null) e.pagina_pdf = tanda.paginaInicio - 1 + e.pagina_pdf;
      }
      return { escenas };
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if ((status === 503 || status === 429) && i < maxTries - 1) {
        await new Promise((r) => setTimeout(r, (i + 1) * 3000));
        continue;
      }
      const message = e instanceof Error ? e.message : "error desconocido";
      return { error: message };
    }
  }
  return { error: "no se pudo generar tras varios reintentos" };
}

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
    const tandas = await partirEnTandas(buffer);
    if (tandas.length === 0) {
      throw new Error("El PDF no tiene páginas legibles");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const todasLasEscenas: EscenaIA[] = [];
    const tandasFallidas: { paginaInicio: number; paginaFin: number; error: string }[] = [];

    for (const tanda of tandas) {
      const resultado = await procesarTanda(ai, tanda);
      if ("error" in resultado) {
        tandasFallidas.push({ paginaInicio: tanda.paginaInicio, paginaFin: tanda.paginaFin, error: resultado.error });
      } else {
        todasLasEscenas.push(...resultado.escenas);
      }
    }

    if (todasLasEscenas.length === 0) {
      const detalle = tandasFallidas.map((f) => `págs. ${f.paginaInicio}-${f.paginaFin}: ${f.error}`).join(" · ");
      throw new Error(`No se pudo procesar ninguna página del guion (${detalle})`);
    }

    const rows = todasLasEscenas.map((e, i) => {
      const elementos = e.elementos ?? [];
      // descripcion/dialogo se derivan de elementos para las pantallas que
      // todavía no necesitan el orden exacto (Escenas, Plan de rodaje) — la
      // fuente de verdad del orden real es "elementos".
      const descripcion = elementos.filter((el) => el.tipo === "accion").map((el) => el.texto).join("\n\n") || null;
      const dialogo = elementos.filter((el): el is Extract<ElementoIA, { tipo: "dialogo" }> => el.tipo === "dialogo")
        .map((el) => ({ personaje: el.personaje, parentetico: el.parentetico, texto: el.texto }));
      return {
        project_id: guion.project_id,
        guion_id: guion.id,
        numero: e.numero ?? i + 1,
        int_ext: e.int_ext ?? null,
        lugar: e.lugar ?? null,
        dia_noche: e.dia_noche ?? null,
        encabezado: e.encabezado ?? "",
        descripcion,
        personajes: e.personajes ?? [],
        dialogo,
        elementos,
        pagina_pdf: e.pagina_pdf ?? null,
        orden: i,
        estado: "borrador",
      };
    });

    const { error: insertError } = await supabase.from("escenas").insert(rows);
    if (insertError) throw new Error(insertError.message);

    // Éxito parcial: el guion queda "listo" con las escenas que sí se
    // pudieron leer, y error_msg pasa a ser una advertencia (no un fallo)
    // con las páginas que hay que cargar a mano — se muestra en el pill
    // "Listo" de GuionPanel.tsx en vez de bloquear todo el guion.
    const advertencia = tandasFallidas.length > 0
      ? `Advertencia: no se pudieron leer las páginas ${tandasFallidas.map((f) => `${f.paginaInicio}-${f.paginaFin}`).join(", ")} (${tandasFallidas[0].error}). Cargá esas escenas manualmente.`
      : null;

    await supabase.from("guiones").update({ estado: "listo", error_msg: advertencia }).eq("id", guion.id);

    return NextResponse.json({ ok: true, count: rows.length, tandasFallidas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase.from("guiones").update({ estado: "error", error_msg: message }).eq("id", guion.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
