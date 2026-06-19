"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RodajePresentacion from "./RodajePresentacion";

type Jornada = {
  dia_numero: number;
  dia_total: number;
  fecha: string | null;
  ubicacion: string | null;
  citacion: string | null;
  escenas_dia: string | null;
  visionado: string | null;
};

const fmtFecha = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

export default function ModoRodajePanel({ onVerOrden }: { onVerOrden: () => void }) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [presentacion, setPresentacion] = useState(false);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("jornadas")
        .select("dia_numero, dia_total, fecha, ubicacion, citacion, escenas_dia, visionado")
        .eq("project_id", projectId)
        .eq("activa", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setJornada(data ?? null);
    })();
  }, []);

  if (!jornada) return null;

  return (
    <div className="rodaje-banner">
      <div className="rodaje-banner-head">
        <span className="rodaje-live"><span className="hex"></span>Modo día de rodaje</span>
        <div className="rodaje-day">
          Día {jornada.dia_numero} <small>de {jornada.dia_total}</small>
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
