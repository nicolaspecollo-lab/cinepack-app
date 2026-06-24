"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RodajePresentacion from "./RodajePresentacion";
import { diaDeRodaje, diasFaltanRodaje } from "./cicloVida";

type Jornada = {
  dia_numero: number;
  dia_total: number;
  fecha: string | null;
  ubicacion: string | null;
  citacion: string | null;
  escenas_dia: string | null;
  visionado: string | null;
};

type Previa = {
  diaTotal: number | null;
  locaciones: string[];
  departamentos: number;
  escenas: number;
};

const fmtFecha = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

export default function ModoRodajePanel({ onVerOrden }: { onVerOrden: () => void }) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [fechaInicioRodaje, setFechaInicioRodaje] = useState<string | null>(null);
  const [nombreProyecto, setNombreProyecto] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [presentacion, setPresentacion] = useState(false);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const [{ data: jornadaData }, { data: proyectoData }, { data: jornadasData }, { data: escenasData }, { data: miembrosData }] =
        await Promise.all([
          supabase
            .from("jornadas")
            .select("dia_numero, dia_total, fecha, ubicacion, citacion, escenas_dia, visionado")
            .eq("project_id", projectId)
            .eq("activa", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("proyectos").select("fase_rodaje_inicio, nombre").eq("id", projectId).single(),
          supabase.from("jornadas").select("dia_total, ubicacion").eq("project_id", projectId),
          supabase.from("escenas").select("id").eq("project_id", projectId),
          supabase.from("project_members").select("profiles(departamento)").eq("project_id", projectId),
        ]);

      setJornada(jornadaData ?? null);
      setFechaInicioRodaje(proyectoData?.fase_rodaje_inicio ?? null);
      setNombreProyecto(proyectoData?.nombre ?? null);

      const diaTotal = jornadasData?.find((j) => j.dia_total)?.dia_total ?? null;
      const locaciones = [...new Set((jornadasData ?? []).map((j) => j.ubicacion).filter((u): u is string => !!u))];
      const departamentos = new Set(
        (miembrosData ?? [])
          .map((m) => (m.profiles as unknown as { departamento: string } | null)?.departamento)
          .filter((d): d is string => !!d)
      ).size;
      setPrevia({ diaTotal, locaciones, departamentos, escenas: escenasData?.length ?? 0 });
    })();
  }, []);

  const faltan = diasFaltanRodaje(fechaInicioRodaje);

  if (faltan !== null && previa) {
    return (
      <div className="rodaje-banner">
        <div className="rodaje-banner-head">
          <span className="rodaje-live"><span className="hex"></span>Cuenta atrás</span>
          <div className="rodaje-day">
            Faltan {faltan} día{faltan === 1 ? "" : "s"}{" "}
            <small>para el largometraje de ficción{nombreProyecto ? `: ${nombreProyecto}` : ""}</small>
          </div>
        </div>
        <div className="rodaje-grid">
          {previa.diaTotal != null && (
            <div className="rodaje-item"><span>Días de rodaje confirmados</span><b>{previa.diaTotal}</b></div>
          )}
          {previa.locaciones.length > 0 && (
            <div className="rodaje-item"><span>Locaciones</span><b>{previa.locaciones.join(", ")}</b></div>
          )}
          {previa.departamentos > 0 && (
            <div className="rodaje-item"><span>Departamentos involucrados</span><b>{previa.departamentos}</b></div>
          )}
          <div className="rodaje-item"><span>Escenas a rodar</span><b>{previa.escenas}</b></div>
        </div>
        <div className="rodaje-ctas">
          <button className="btn acc rodaje-cta" onClick={onVerOrden}>Ver orden de rodaje completo →</button>
        </div>
      </div>
    );
  }

  if (!jornada) return null;

  const diaMostrado = diaDeRodaje(fechaInicioRodaje) === 0 ? 0 : jornada.dia_numero;

  return (
    <div className="rodaje-banner">
      <div className="rodaje-banner-head">
        <span className="rodaje-live"><span className="hex"></span>Modo día de rodaje</span>
        <div className="rodaje-day">
          Día {diaMostrado} <small>de {jornada.dia_total}</small>
        </div>
        {jornada.fecha && <span className="rodaje-fecha">{fmtFecha(jornada.fecha)}</span>}
      </div>
      <div className="rodaje-grid">
        {jornada.ubicacion && (
          <div className="rodaje-item"><span>Ubicación</span><b>{jornada.ubicacion}</b></div>
        )}
        {jornada.citacion && (
          <div className="rodaje-item"><span>Citación</span><b>{jornada.citacion}</b></div>
        )}
        {jornada.escenas_dia && (
          <div className="rodaje-item"><span>Escenas del día</span><b>{jornada.escenas_dia}</b></div>
        )}
        {jornada.visionado && (
          <div className="rodaje-item"><span>Visionado dailies</span><b>{jornada.visionado}</b></div>
        )}
      </div>
      <div className="rodaje-ctas">
        <button className="btn acc rodaje-cta" onClick={onVerOrden}>Ver orden de rodaje completo →</button>
        <button className="btn rodaje-cta" onClick={() => setPresentacion(true)}>Modo presentación ⛶</button>
      </div>
      {presentacion && <RodajePresentacion jornada={jornada} onClose={() => setPresentacion(false)} />}
    </div>
  );
}
