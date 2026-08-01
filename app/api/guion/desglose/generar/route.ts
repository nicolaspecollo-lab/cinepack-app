import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const HERRAMIENTA_ID = "guion-desglose-escenas";
const DEPARTAMENTO = "Guion";

const PROMPT = `Sos asistente de desglose de producción de cine. Te paso el contenido de UNA escena de guion (encabezado, personajes y su secuencia de acción/diálogo en orden). Tu tarea es generar un desglose breve para el equipo de producción.

Devolvé SOLO un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:

{
  "resumen": "1-2 frases contando qué pasa en la escena, en tono neutro de logline",
  "atrezzo": "lista breve de objetos, atrezzo o necesidades técnicas concretas que se mencionan o se infieren de la acción (separados por coma). Si no hay ninguna necesidad especial, string vacío",
  "tiempo_estimado_min": número de minutos que ocuparía la escena en pantalla (estimá por cantidad de diálogo y acción; una escena corta de 1 página ronda 1 minuto),
  "planos_estimados": número entero de planos que razonablemente necesitaría cubrir la escena (por su cantidad de acción, personajes y cambios de foco dramático)
}

Reglas:
- No inventes objetos ni personajes que no estén sugeridos por el texto.
- Si la escena es muy corta o simple, los números pueden ser bajos (incluso tiempo_estimado_min menor a 1, planos_estimados 1 o 2).
- Devolvé el JSON solo, sin comentarios.

Escena:
`;

type ElementoEsc =
  | { tipo: "accion"; texto: string }
  | { tipo: "dialogo"; personaje: string; parentetico: string | null; texto: string };

// Escenas parseadas antes de que existiera "elementos" (ver migración
// 20260730000000) no lo tienen — mismo fallback que elementosDe() en
// GuionPanel.tsx, para que el desglose funcione también con guiones viejos.
function elementosDe(e: { elementos: unknown; descripcion: string | null; dialogo: unknown }): ElementoEsc[] {
  const elementos = (e.elementos ?? []) as ElementoEsc[];
  if (elementos.length > 0) return elementos;
  const out: ElementoEsc[] = [];
  if (e.descripcion) out.push({ tipo: "accion", texto: e.descripcion });
  const dialogo = (e.dialogo ?? []) as Array<{ personaje: string; parentetico: string | null; texto: string }>;
  for (const d of dialogo) out.push({ tipo: "dialogo", ...d });
  return out;
}

function textoEscena(e: {
  encabezado: string;
  int_ext: string | null;
  lugar: string | null;
  dia_noche: string | null;
  personajes: string[];
  elementos: unknown;
  descripcion: string | null;
  dialogo: unknown;
}): string {
  const cuerpo = elementosDe(e)
    .map((el) => (el.tipo === "accion" ? el.texto : `${el.personaje}${el.parentetico ? ` (${el.parentetico})` : ""}: ${el.texto}`))
    .join("\n");
  return `${e.encabezado}\nPersonajes: ${e.personajes.join(", ") || "—"}\n\n${cuerpo}`;
}

export async function POST(req: Request) {
  const { escenaId } = await req.json();
  if (!escenaId) {
    return NextResponse.json({ error: "Falta escenaId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: escena, error: escenaError } = await supabase
    .from("escenas")
    .select("*, guiones(project_id)")
    .eq("id", escenaId)
    .single();
  if (escenaError || !escena) {
    return NextResponse.json({ error: "Escena no encontrada" }, { status: 404 });
  }
  const projectId = (escena as { guiones: { project_id: string } }).guiones?.project_id;
  if (!projectId) {
    return NextResponse.json({ error: "La escena no tiene proyecto asociado" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let response;
    const maxTries = 3;
    for (let i = 0; i < maxTries; i++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: PROMPT + textoEscena(escena) }] }],
          config: { responseMimeType: "application/json", maxOutputTokens: 1000, thinkingConfig: { thinkingBudget: 0 } },
        });
        break;
      } catch (e) {
        const status = (e as { status?: number })?.status;
        if ((status === 503 || status === 429) && i < maxTries - 1) {
          await new Promise((r) => setTimeout(r, (i + 1) * 2000));
          continue;
        }
        throw e;
      }
    }

    const text = response?.text;
    if (!text) throw new Error("La IA no devolvió texto");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido");
    const ia = JSON.parse(jsonMatch[0]) as {
      resumen?: string;
      atrezzo?: string;
      tiempo_estimado_min?: number;
      planos_estimados?: number;
    };

    const { data: existentes } = await supabase
      .from("herramienta_filas")
      .select("*")
      .eq("project_id", projectId)
      .eq("departamento", DEPARTAMENTO)
      .eq("herramienta_id", HERRAMIENTA_ID);
    const filaExistente = (existentes ?? []).find((f) => (f.datos as Record<string, string>)?.escena_id === escenaId);

    const datosGenerados = {
      escena_id: escenaId,
      escena: String(escena.numero ?? ""),
      escena_int_ext: escena.int_ext ?? "",
      escena_dia_noche: escena.dia_noche ?? "",
      loc: escena.lugar ?? "",
      resumen: ia.resumen ?? "",
      atrezzo: ia.atrezzo ?? "",
      tiempo_estimado: ia.tiempo_estimado_min != null ? `${ia.tiempo_estimado_min} min` : "",
      planos_estimados: ia.planos_estimados != null ? String(ia.planos_estimados) : "",
      personajes: (escena.personajes ?? []).join(", "),
    };

    if (filaExistente) {
      const datos = { ...filaExistente.datos, ...datosGenerados };
      const { error: updError } = await supabase.from("herramienta_filas").update({ datos }).eq("id", filaExistente.id);
      if (updError) throw new Error(updError.message);
      return NextResponse.json({ ok: true, id: filaExistente.id, datos });
    }

    const { data: todasFilas } = await supabase
      .from("herramienta_filas")
      .select("orden")
      .eq("project_id", projectId)
      .eq("departamento", DEPARTAMENTO)
      .eq("herramienta_id", HERRAMIENTA_ID);
    const orden = todasFilas && todasFilas.length ? Math.max(...todasFilas.map((f) => f.orden ?? 0)) + 1 : 0;

    const { data: nueva, error: insError } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento: DEPARTAMENTO,
        herramienta_id: HERRAMIENTA_ID,
        datos: datosGenerados,
        orden,
        registro: [{ accion: "crea", usuario: "IA (desglose automático)", fecha: new Date().toISOString() }],
        visionado_por: [],
        created_by: auth.user.id,
        autor_nombre: "IA (desglose automático)",
        editor_nombre: "IA (desglose automático)",
      })
      .select("*")
      .single();
    if (insError) throw new Error(insError.message);

    return NextResponse.json({ ok: true, id: nueva.id, datos: datosGenerados });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
