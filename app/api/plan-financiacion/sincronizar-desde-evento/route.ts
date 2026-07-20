import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { datosFilaDesdeEvento, PULSO_EVT_KEY, PLAN_FILA_KEY } from "@/lib/planFinanciacionSync";

export const runtime = "nodejs";

// Sentido inverso de app/api/plan-financiacion/sincronizar-hito: cuando se
// registra o edita un evento tipo "financiacion" directamente desde Pulso
// (CalendarioProyecto/DossierConvocatoria), crea o actualiza — nunca
// duplica — la fila correspondiente en el Plan de financiación
// (herramienta_filas, ej-plan-financiacion). La fecha del evento se mapea a
// "presentación" (el deadline, ver lib/planFinanciacionSync.ts).
//
// Vínculo mutuo: datos._plan_fila_id en el evento ↔ datos._pulso_evt_presentacion
// en la fila. Si el evento ya trae el vínculo, se actualiza esa misma fila
// (o se recrea si fue borrada del lado del Plan). Si no lo trae, se crea una
// fila nueva y se escribe el vínculo en el evento.
//
// Admin client (bypassa RLS) para que también funcione si quien registra el
// evento es super_admin (puede no ser project_member del proyecto, RLS de
// herramienta_filas exigiría "mismo depto o Ejecutivo" contra ese proyecto).

export async function POST(req: Request) {
  const { evento_id, eliminar } = (await req.json().catch(() => ({}))) as { evento_id?: string; eliminar?: boolean };
  if (!evento_id) {
    return NextResponse.json({ error: "Falta evento_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // "Ver = cualquier miembro del proyecto" en eventos_proyecto asegura que si
  // esto devuelve algo, el usuario al menos pertenece al proyecto.
  const { data: evento } = await supabase
    .from("eventos_proyecto")
    .select("id, project_id, fecha, tipo, datos")
    .eq("id", evento_id)
    .eq("tipo", "financiacion")
    .single();

  if (!evento) {
    return NextResponse.json({ error: "Evento no encontrado o sin acceso" }, { status: 404 });
  }

  const admin = createAdminClient();
  const datosEvento = (evento.datos ?? {}) as Record<string, string>;
  const filaId = datosEvento[PLAN_FILA_KEY];

  if (eliminar) {
    // El evento se borró: si estaba ligado, solo se limpia la fecha de
    // presentación y el vínculo de esa fila — la convocatoria puede seguir
    // teniendo otros datos cargados, no se borra entera por esto.
    if (filaId) {
      const { data: fila } = await admin.from("herramienta_filas").select("id, datos").eq("id", filaId).single();
      if (fila && fila.datos?.[PULSO_EVT_KEY] === evento_id) {
        const nuevosDatos = { ...fila.datos };
        delete nuevosDatos.presentacion;
        delete nuevosDatos[PULSO_EVT_KEY];
        await admin.from("herramienta_filas").update({ datos: nuevosDatos }).eq("id", filaId);
      }
    }
    return NextResponse.json({ ok: true });
  }

  const camposFila = datosFilaDesdeEvento(evento);

  if (filaId) {
    const { data: fila } = await admin.from("herramienta_filas").select("id, datos").eq("id", filaId).eq("herramienta_id", "ej-plan-financiacion").single();
    if (fila) {
      const nuevosDatos = { ...fila.datos, ...camposFila, [PULSO_EVT_KEY]: evento_id };
      await admin.from("herramienta_filas").update({ datos: nuevosDatos }).eq("id", filaId);
      return NextResponse.json({ ok: true, fila_id: filaId });
    }
    // La fila fue borrada del lado del Plan de financiación — se recrea abajo.
  }

  const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", user.id).single();
  const nombre = perfil?.full_name || "Pulso";

  const { data: ultima } = await admin
    .from("herramienta_filas")
    .select("orden")
    .eq("project_id", evento.project_id)
    .eq("herramienta_id", "ej-plan-financiacion")
    .neq("orden", -1)
    .order("orden", { ascending: false })
    .limit(1);
  const orden = ultima && ultima.length > 0 ? ultima[0].orden + 1 : 0;

  const { data: nuevaFila } = await admin
    .from("herramienta_filas")
    .insert({
      project_id: evento.project_id,
      departamento: "Ejecutivo",
      herramienta_id: "ej-plan-financiacion",
      datos: { ...camposFila, [PULSO_EVT_KEY]: evento_id },
      orden,
      registro: [{ accion: "crea", usuario: nombre, fecha: new Date().toISOString() }],
      visionado_por: [],
      autor_nombre: nombre,
      editor_nombre: nombre,
    })
    .select("id")
    .single();

  if (nuevaFila) {
    await admin.from("eventos_proyecto").update({ datos: { ...datosEvento, [PLAN_FILA_KEY]: nuevaFila.id } }).eq("id", evento_id);
  }

  return NextResponse.json({ ok: true, fila_id: nuevaFila?.id });
}
