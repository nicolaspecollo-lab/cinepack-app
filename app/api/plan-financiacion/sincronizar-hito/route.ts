import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { payloadEventoDesdeFila, PULSO_EVT_KEY } from "@/lib/planFinanciacionSync";

export const runtime = "nodejs";

// Sincroniza el hito de Pulso/Calendario (tabla eventos_proyecto) a partir de
// una fila del Plan de financiación (herramienta_filas, ej-plan-financiacion).
// Se llama después de guardar una convocatoria (o al borrarla) para que el
// deadline no se tenga que duplicar a mano en el calendario.
//
// Un solo hito por convocatoria (fecha = presentación/deadline, ver
// lib/planFinanciacionSync.ts) — antes se creaban 2 (presentación+resolución)
// y se pisaban en la línea de tiempo sin aportar nada que el usuario pidiera.
//
// Por qué admin client: la RLS de escritura de eventos_proyecto solo deja
// editar al jefe de Ejecutivo (o super_admin) — más restrictiva que la de
// herramienta_filas ("mismo depto o Ejecutivo", cualquier miembro). Cualquier
// miembro de Ejecutivo que edite una convocatoria debe poder generar su hito,
// así que este endpoint verifica acceso a la FILA con el cliente del usuario
// (RLS normal) y recién ahí usa el admin client para tocar eventos_proyecto.
//
// Vínculo fila↔hito: datos._pulso_evt_presentacion en la fila (id del evento),
// datos._plan_fila_id en el evento (id de la fila) — mutuo, para que el sync
// inverso (app/api/plan-financiacion/sincronizar-desde-evento) sepa que ese
// evento ya está ligado a una convocatoria y no cree una fila duplicada.

const OLD_RESOLUCION_KEY = "_pulso_evt_resolucion"; // modelo viejo (2 hitos) — se limpia si aparece

export async function POST(req: Request) {
  const { fila_id, eliminar } = (await req.json().catch(() => ({}))) as { fila_id?: string; eliminar?: boolean };
  if (!fila_id) {
    return NextResponse.json({ error: "Falta fila_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // La RLS de herramienta_filas ("ver = cualquier miembro del proyecto")
  // asegura que si esto devuelve una fila, el usuario tiene acceso real.
  const { data: fila } = await supabase
    .from("herramienta_filas")
    .select("id, project_id, datos")
    .eq("id", fila_id)
    .eq("herramienta_id", "ej-plan-financiacion")
    .single();

  if (!fila) {
    return NextResponse.json({ error: "Convocatoria no encontrada o sin acceso" }, { status: 404 });
  }

  const admin = createAdminClient();
  const datos = (fila.datos ?? {}) as Record<string, string>;
  const nuevosDatos = { ...datos };
  let cambiado = false;

  // Limpieza del modelo viejo: si esta fila tiene un hito de "resolución"
  // separado (de antes de este cambio), se borra — ya no aplica.
  if (datos[OLD_RESOLUCION_KEY]) {
    await admin.from("eventos_proyecto").delete().eq("id", datos[OLD_RESOLUCION_KEY]);
    delete nuevosDatos[OLD_RESOLUCION_KEY];
    cambiado = true;
  }

  const fecha = eliminar ? "" : datos.presentacion;
  const eventoId = datos[PULSO_EVT_KEY];

  if (fecha) {
    const payload = { ...payloadEventoDesdeFila({ id: fila.id, project_id: fila.project_id, datos }), updated_at: new Date().toISOString() };
    if (eventoId) {
      const { data: actualizado } = await admin.from("eventos_proyecto").update(payload).eq("id", eventoId).select("id");
      if (!actualizado || actualizado.length === 0) {
        // El hito fue borrado a mano en Pulso — se recrea para no perder el deadline.
        const { data: nuevo } = await admin.from("eventos_proyecto").insert({ ...payload, creado_por: "Plan de financiación" }).select("id").single();
        if (nuevo) { nuevosDatos[PULSO_EVT_KEY] = nuevo.id; cambiado = true; }
      }
    } else {
      const { data: nuevo } = await admin.from("eventos_proyecto").insert({ ...payload, creado_por: "Plan de financiación" }).select("id").single();
      if (nuevo) { nuevosDatos[PULSO_EVT_KEY] = nuevo.id; cambiado = true; }
    }
  } else if (eventoId) {
    await admin.from("eventos_proyecto").delete().eq("id", eventoId);
    delete nuevosDatos[PULSO_EVT_KEY];
    cambiado = true;
  }

  if (cambiado && !eliminar) {
    await supabase.from("herramienta_filas").update({ datos: nuevosDatos }).eq("id", fila_id);
  }

  return NextResponse.json({ ok: true, datos: cambiado ? nuevosDatos : undefined });
}
