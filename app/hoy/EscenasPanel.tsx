"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HERRAMIENTA_POR_ID } from "../herramientas";

type DialogoLinea = { personaje: string; parentetico?: string; texto: string };

type Propuesta = {
  departamento: string;
  herramienta_id: string;
  datos: Record<string, string>;
};

const CAMPOS_ESCENA = ["escena", "escenas", "secuencia"];

function tokensNumericos(s: string): string[] {
  return s.match(/\d+/g) ?? [];
}

function propuestaDeEscena(datos: Record<string, string>, numero: number): boolean {
  const refs = CAMPOS_ESCENA.map((k) => datos[k] ?? "").join(" ");
  return tokensNumericos(refs).includes(String(numero));
}

function resumenPropuesta(p: Propuesta): string {
  const h = HERRAMIENTA_POR_ID[p.herramienta_id];
  const cols = h?.columnas ?? [];
  const partes = cols
    .filter((c) => !CAMPOS_ESCENA.includes(c.key))
    .map((c) => (p.datos[c.key] ?? "").trim())
    .filter(Boolean);
  return partes.slice(0, 3).join(" · ");
}

type Escena = {
  id: string;
  numero: number;
  int_ext: string | null;
  lugar: string | null;
  dia_noche: string | null;
  encabezado: string;
  descripcion: string | null;
  personajes: string[];
  dialogo: DialogoLinea[];
  estado: string;
};

type Plano = {
  id: string;
  escena: string;
  plano: string;
  tipo: string | null;
  mov_camara: string | null;
  lente: string | null;
  descripcion: string;
  notas: string | null;
};

export default function EscenasPanel({ departamento }: { departamento: string }) {
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<number | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const [{ data: esc }, { data: pl }, { data: prop }] = await Promise.all([
      supabase
        .from("escenas")
        .select("*")
        .eq("project_id", projectId)
        .order("orden", { ascending: true })
        .order("numero", { ascending: true }),
      supabase.from("planos").select("*").eq("project_id", projectId),
      supabase.from("herramienta_filas").select("departamento, herramienta_id, datos").eq("project_id", projectId),
    ]);
    setEscenas(esc ?? []);
    setPlanos(pl ?? []);
    setPropuestas((prop ?? []) as Propuesta[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="cons-text">Cargando escenas…</p>;

  if (escenas.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin escenas todavía</h4>
        <p>
          <b>Escena 3D</b> es la vista donde, sobre cada escena, se reúnen las propuestas de todos los
          departamentos. En cuanto se suba y confirme un guion en <b>Guion</b>, las escenas aparecerán aquí y
          {" "}{departamento} verá cómo conecta su trabajo con el resto, escena por escena.
        </p>
      </div>
    );
  }

  const escenaAbierta = escenas.find((e) => e.numero === abierta);
  const planosAbierta = escenaAbierta ? planos.filter((p) => p.escena === String(escenaAbierta.numero)) : [];

  // Propuestas de todos los departamentos cuyas filas referencian esta escena.
  const propuestasAbierta = escenaAbierta
    ? propuestas.filter((p) => propuestaDeEscena(p.datos ?? {}, escenaAbierta.numero))
    : [];
  const propuestasPorDepto = propuestasAbierta.reduce<Record<string, Propuesta[]>>((acc, p) => {
    (acc[p.departamento] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="tools">
      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>Índice de escenas</h3>
          <div className="right">{escenas.length} escenas</div>
        </div>
        <div className="twrap">
          <table className="t">
            <tbody>
              <tr>
                <th>Esc.</th>
                <th>Encabezado</th>
                <th>Lugar</th>
                <th>Personajes</th>
                <th>Estado</th>
                <th></th>
              </tr>
              {escenas.map((e) => (
                <tr key={e.id} style={abierta === e.numero ? { background: "rgba(255,255,255,0.04)" } : {}}>
                  <td className="mono">
                    <b>{e.numero}</b>
                  </td>
                  <td>{e.encabezado}</td>
                  <td>{e.lugar ?? "—"}</td>
                  <td>{e.personajes?.length ? e.personajes.join(", ") : "—"}</td>
                  <td>
                    <span className={`pill ${e.estado === "confirmada" ? "p-ok" : "p-warn"}`}>
                      {e.estado === "confirmada" ? "Confirmada" : "Borrador"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="chip"
                      style={{ cursor: "pointer", borderColor: "var(--acc)", color: "var(--acc)" }}
                      onClick={() => setAbierta(abierta === e.numero ? null : e.numero)}
                    >
                      {abierta === e.numero ? "Cerrar ↑" : "Ficha completa ↓"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {escenaAbierta && (
        <div className="tool" style={{ borderColor: "var(--acc)" }}>
          <div className="tool-head">
            <span className="hex"></span>
            <h3>
              Ficha de Escena — Esc. {escenaAbierta.numero} · {escenaAbierta.encabezado}
            </h3>
            <span className="tag">
              {[escenaAbierta.int_ext, escenaAbierta.dia_noche].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
          {escenaAbierta.descripcion && <p className="tool-sub">{escenaAbierta.descripcion}</p>}
          <div className="grid2">
            <div className="mini">
              <h4>
                <span className="hex"></span>Personajes
              </h4>
              <ul>
                {escenaAbierta.personajes?.length ? (
                  escenaAbierta.personajes.map((p) => (
                    <li key={p}>
                      <span>{p}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Sin personajes asignados</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="mini">
              <h4>
                <span className="hex"></span>Planos técnicos ({planosAbierta.length})
              </h4>
              <ul>
                {planosAbierta.length ? (
                  planosAbierta.map((p) => (
                    <li key={p.id}>
                      <span>
                        {p.plano} · {p.tipo || "—"}
                        {p.mov_camara ? ` · ${p.mov_camara}` : ""}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Sin desglose técnico todavía — pendiente de Guion Técnico</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="mini" style={{ marginTop: "12px" }}>
            <h4>
              <span className="hex"></span>Propuestas de los departamentos para esta escena ({propuestasAbierta.length})
            </h4>
            {propuestasAbierta.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                Todavía ningún departamento cargó propuestas para la Esc. {escenaAbierta.numero}. Cuando
                Fotografía, Arte, Sonido u otros agreguen filas con esta escena en sus herramientas, aparecerán
                acá reunidas — esta es la vista 3D de la escena.
              </p>
            ) : (
              <ul>
                {Object.entries(propuestasPorDepto).map(([depto, lista]) => (
                  <li key={depto} style={{ display: "block" }}>
                    <span style={{ color: "var(--acc)", fontWeight: 700 }}>{depto}</span>
                    <ul style={{ margin: "4px 0 8px", paddingLeft: 0 }}>
                      {lista.map((p, i) => {
                        const h = HERRAMIENTA_POR_ID[p.herramienta_id];
                        const resumen = resumenPropuesta(p);
                        return (
                          <li key={i} style={{ display: "block", fontSize: "12px", color: "var(--muted)", padding: "2px 0" }}>
                            <b style={{ color: "var(--text)" }}>{h?.nombre ?? p.herramienta_id}</b>
                            {resumen ? ` — ${resumen}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {escenaAbierta.dialogo?.length > 0 && (
            <div className="mini" style={{ marginTop: "12px" }}>
              <h4>
                <span className="hex"></span>Diálogo
              </h4>
              <ul>
                {escenaAbierta.dialogo.map((d, i) => (
                  <li key={i}>
                    <span>
                      <b>{d.personaje}</b>
                      {d.parentetico ? ` (${d.parentetico})` : ""}: {d.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="note">
        <b>Esta vista es compartida</b> por los 13 departamentos: las escenas vienen del desglose de{" "}
        <b>Guion</b> y los planos técnicos de <b>Guion Técnico</b>. Cada escena confirmada queda disponible aquí
        para {departamento}.
      </div>
    </div>
  );
}
