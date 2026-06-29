import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { JERARQUIA_POR_DEPARTAMENTO, DOCUMENTOS_POR_DEPARTAMENTO } from "@/app/constants";
import mensajesEs from "@/messages/es.json";

// Texto en español del catálogo de documentos, solo para armar el contexto del asistente IA.
const DOCUMENTOS_CATALOGO_ES = (
  mensajesEs as { documentosCatalogo: Record<string, Record<string, { titulo: string; docs: Record<string, { nombre: string }> }>> }
).documentosCatalogo;

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const { messages, projectId, departamento, cargo, fullName } = (await req.json()) as {
    messages: ChatMessage[];
    projectId?: string | null;
    departamento?: string | null;
    cargo?: string | null;
    fullName?: string | null;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let contexto = `Usuario: ${fullName ?? "sin nombre"}. Departamento: ${departamento ?? "sin departamento"}. Cargo: ${cargo ?? "sin cargo"}.`;

  if (projectId) {
    const [{ data: proyecto }, { data: tareas }, { data: alertas }] = await Promise.all([
      supabase.from("proyectos").select("nombre, tipo").eq("id", projectId).maybeSingle(),
      supabase
        .from("tareas")
        .select("titulo, para_departamento")
        .eq("project_id", projectId)
        .eq("completada", false)
        .limit(30),
      supabase
        .from("alertas")
        .select("texto, para_departamento")
        .eq("project_id", projectId)
        .eq("leida", false)
        .limit(30),
    ]);

    if (proyecto) {
      contexto += `\nProyecto: "${proyecto.nombre}" (tipo: ${proyecto.tipo}).`;
    }

    const tareasDelDepto = (tareas ?? []).filter((t) => !t.para_departamento || t.para_departamento === departamento);
    const alertasDelDepto = (alertas ?? []).filter((a) => !a.para_departamento || a.para_departamento === departamento);

    contexto += `\nTareas pendientes del proyecto: ${tareas?.length ?? 0} (de tu departamento: ${tareasDelDepto.length}).`;
    if (tareasDelDepto.length > 0) {
      contexto += `\nAlgunas tareas pendientes de tu departamento: ${tareasDelDepto.slice(0, 8).map((t) => t.titulo).join("; ")}.`;
    }
    contexto += `\nAlertas activas del proyecto: ${alertas?.length ?? 0} (de tu departamento: ${alertasDelDepto.length}).`;
    if (alertasDelDepto.length > 0) {
      contexto += `\nAlgunas alertas activas de tu departamento: ${alertasDelDepto.slice(0, 8).map((a) => a.texto).join("; ")}.`;
    }
  }

  if (departamento) {
    const jerarquia = JERARQUIA_POR_DEPARTAMENTO[departamento];
    if (jerarquia) {
      contexto += `\nJerarquía de cargos del departamento "${departamento}": ${jerarquia.join(" > ")}.`;
    }
    const docs = DOCUMENTOS_POR_DEPARTAMENTO[departamento];
    const docsTextos = DOCUMENTOS_CATALOGO_ES[departamento];
    if (docs && docsTextos) {
      const resumenDocs = docs
        .map((g) => `${docsTextos[g.id]?.titulo ?? g.id}: ${g.docs.map((d) => docsTextos[g.id]?.docs[d.id]?.nombre ?? d.id).join(", ")}`)
        .join(" | ");
      contexto += `\nDocumentos y herramientas disponibles para "${departamento}": ${resumenDocs}.`;
    }
  }

  if (projectId && departamento) {
    const { data: bloques } = await supabase
      .from("workspace_blocks")
      .select("herramienta_id, datos")
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .limit(120);

    if (bloques && bloques.length > 0) {
      const agrupados: Record<string, string[]> = {};
      for (const b of bloques) {
        const id = b.herramienta_id as string;
        const datos = b.datos as Record<string, unknown>;
        if (!datos) continue;
        if (!agrupados[id]) agrupados[id] = [];
        const valores = Object.entries(datos)
          .filter(([k]) => !k.startsWith("_"))
          .map(([k, v]) => `${k}: ${String(v ?? "").slice(0, 200)}`)
          .join(", ");
        if (valores) agrupados[id].push(valores);
      }
      const resumenBloques = Object.entries(agrupados)
        .map(([id, filas]) => `[${id}] ${filas.slice(0, 10).join(" | ")}`)
        .join("\n");
      contexto += `\n\nDATOS REALES cargados en las herramientas del departamento "${departamento}":\n${resumenBloques}`;
    }
  }

  const system = `Eres el asistente de IA de CINE PACK, una webapp de gestión de producción audiovisual. Ayudás a un miembro del equipo a entender el estado de su proyecto, sus tareas pendientes y a usar las herramientas de la app. Respondé siempre en español, de forma breve y concreta. Si te preguntan por documentos o herramientas, mencioná los nombres exactos del catálogo del departamento. No inventes datos que no estén en el contexto.

Contexto actual:
${contexto}`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const ultimo = messages[messages.length - 1];

  try {
    let response;
    const maxTries = 4;
    for (let i = 0; i < maxTries; i++) {
      try {
        const chat = ai.chats.create({
          model: "gemini-2.5-flash",
          config: { systemInstruction: system },
          history,
        });
        response = await chat.sendMessage({ message: ultimo.content });
        break;
      } catch (e) {
        const status = (e as { status?: number })?.status;
        if ((status === 503 || status === 429) && i < maxTries - 1) {
          await new Promise((r) => setTimeout(r, (i + 1) * 1500));
          continue;
        }
        throw e;
      }
    }

    const text = response?.text;
    if (!text) throw new Error("La IA no devolvió texto");

    return NextResponse.json({ reply: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
