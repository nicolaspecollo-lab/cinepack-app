import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const PROMPT = `Eres un experto en planificación de rodajes cinematográficos.

Te paso la lista de escenas confirmadas de un guion, con su información de locación, INT/EXT, DÍA/NOCHE, personajes y descripción.

Tu tarea: crear un Plan de Rodaje optimizado, agrupando las escenas por jornada de rodaje según estos criterios de eficiencia:
1. Agrupar escenas de la misma locación para minimizar traslados
2. Dentro de una locación, agrupar primero INT DÍA, luego EXT DÍA, luego INT NOCHE, luego EXT NOCHE
3. Ordenar las jornadas de manera lógica (locaciones principales primero, exteriores en función del clima estimado)
4. Estimar páginas de guion por jornada (total de escenas dividido 8 = páginas de 1/8)
5. Las jornadas suelen tener entre 3 y 5 páginas de guion (1/8) o entre 8 y 15 escenas cortas

Devolvé SOLO un array JSON (sin texto adicional, sin markdown) con esta estructura:

[
  {
    "dia": 1,
    "escenas": "1, 3, 5, 7 (lista de números de escena separados por coma)",
    "locacion": "nombre de la locación principal de esa jornada",
    "set": "INT o EXT o INT/EXT, DÍA o NOCHE",
    "paginas": "estimación en formato '3 4/8' (páginas y octavos)",
    "notas": "observaciones breves: personajes principales del día, necesidades especiales, efectos, animales, etc."
  }
]

Escenas del guion:
`;

export async function POST(req: Request) {
  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "Falta projectId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Cargar escenas confirmadas del proyecto
  const { data: escenas, error: escError } = await supabase
    .from("escenas")
    .select("numero, int_ext, lugar, dia_noche, encabezado, descripcion, personajes")
    .eq("project_id", projectId)
    .eq("estado", "confirmada")
    .order("numero", { ascending: true });

  if (escError) {
    return NextResponse.json({ error: escError.message }, { status: 500 });
  }
  if (!escenas || escenas.length === 0) {
    return NextResponse.json({ error: "No hay escenas confirmadas en este proyecto" }, { status: 400 });
  }

  const resumenEscenas = escenas
    .map(
      (e) =>
        `Escena ${e.numero}: ${e.encabezado} | ${e.int_ext ?? "?"} ${e.dia_noche ?? "?"} | ` +
        `Lugar: ${e.lugar ?? "sin especificar"} | ` +
        `Personajes: ${Array.isArray(e.personajes) && e.personajes.length > 0 ? e.personajes.join(", ") : "ninguno"} | ` +
        `Descripción: ${(e.descripcion ?? "").slice(0, 120)}`
    )
    .join("\n");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let response;
  const maxTries = 4;
  for (let i = 0; i < maxTries; i++) {
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: PROMPT + resumenEscenas,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 16000,
          thinkingConfig: { thinkingBudget: 0 },
        },
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

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido");

  type JornadaIA = {
    dia?: number;
    escenas?: string;
    locacion?: string;
    set?: string;
    paginas?: string;
    notas?: string;
  };

  const jornadas: JornadaIA[] = JSON.parse(jsonMatch[0]);

  // Eliminar filas anteriores del plan generado por IA (las que tienen _ia_generated = true)
  await supabase
    .from("workspace_blocks")
    .delete()
    .eq("project_id", projectId)
    .eq("departamento", "General")
    .eq("herramienta_id", "gen-plan-rodaje")
    .filter("datos->>_ia_generated", "eq", "true");

  // Insertar jornadas como workspace_blocks
  const rows = jornadas.map((j, idx) => ({
    project_id: projectId,
    departamento: "General",
    herramienta_id: "gen-plan-rodaje",
    datos: {
      dia: String(j.dia ?? idx + 1),
      fecha: "",
      escenas: j.escenas ?? "",
      locacion: j.locacion ?? "",
      set: j.set ?? "",
      paginas: j.paginas ?? "",
      notas: j.notas ?? "",
      _ia_generated: "true",
    },
    creado_por: auth.user.id,
  }));

  const { error: insertError } = await supabase.from("workspace_blocks").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, jornadas: jornadas.length });
}
