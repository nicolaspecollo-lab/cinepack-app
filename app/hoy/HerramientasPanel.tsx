"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { deptTools, cargoGroups, type Herramienta } from "../herramientas";
import { MODULOS_BETA_ACTIVOS } from "../constants";
import HerramientaPanel from "./HerramientaPanel";
import CandidatosPorPersonajePanel from "./CandidatosPorPersonajePanel";
import EspacioTrabajoPanel from "./EspacioTrabajoPanel";
import { PLANTILLAS_DOCUMENTO, PLANTILLAS_TABLA } from "./plantillasEspacio";
import { createClient } from "@/lib/supabase/client";
import Icon from "../components/Icon";
import PlantillaCuadro from "./PlantillaCuadro";
import { asegurarTareasPersonales } from "./tareasPersonales";

// Plantillas de cuadro con vista propia (no la grilla genérica de HerramientaPanel).
const VISTAS_CUADRO = new Set(["kanban", "timeline", "mosaico", "checklist-tabla", "storyboard"]);

type PersonalTool = {
  id: string;
  titulo: string;
  tipo: "tabla" | "nota";
  plantilla_id: string | null;
  created_at: string;
};

function personalToHerramienta(pt: PersonalTool): Herramienta {
  if (pt.tipo === "tabla") {
    const plantilla = PLANTILLAS_TABLA.find((p) => p.id === pt.plantilla_id);
    return { id: pt.id, nombre: pt.titulo, tipo: pt.tipo, columnas: plantilla?.columnas ?? [] };
  }
  const plantilla = PLANTILLAS_DOCUMENTO.find((p) => p.id === pt.plantilla_id);
  return { id: pt.id, nombre: pt.titulo, tipo: pt.tipo, estiloDoc: plantilla?.estiloDoc };
}

const openKey = (dept: string, seccion: string) => `cinepack-open-tool-${dept}-${seccion}`;
const openPersonalKey = (dept: string) => `cinepack-open-personal-${dept}`;

// Nombre de herramienta ESTÁTICA (catálogo herramientas.ts) traducido por id,
// con fallback al español si todavía no tiene entrada (herramienta nueva).
// Las herramientas PERSONALES (Espacio de trabajo) no pasan por acá: su
// nombre lo escribe el usuario y se muestra literal.
export function useNombreHerramienta() {
  const tHerr = useTranslations("herr");
  return (h: Herramienta) => (tHerr.has(h.id) ? tHerr(h.id) : h.nombre);
}

export default function HerramientasPanel({
  departamento,
  cargo,
  fullName,
  seccion,
  isAdmin,
}: {
  departamento: string;
  cargo?: string | null;
  fullName: string;
  seccion: "departamento" | "cargo";
  isAdmin?: boolean;
}) {
  const t = useTranslations("hp");
  const tEsp = useTranslations("espacio");
  const nombreDe = useNombreHerramienta();
  const esModuloBeta = MODULOS_BETA_ACTIVOS.includes(departamento);
  const bloqueado = !esModuloBeta && !isAdmin;
  const [abierta, setAbierta] = useState<Herramienta | null>(null);
  const [vista, setVista] = useState<"tabla" | "personajes">("tabla");
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [personalTools, setPersonalTools] = useState<PersonalTool[]>([]);
  const [abiertaPersonal, setAbiertaPersonal] = useState<PersonalTool | null>(null);
  const [creandoEspacio, setCreandoEspacio] = useState(false);

  async function recargarPersonalTools() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Solo LAS PROPIAS herramientas personales de ESTE departamento — antes
    // no filtraba por owner_id ni departamento y mostraba las de cualquier
    // usuario del proyecto (bug real de aislamiento, encontrado 14-jul-2026).
    const { data: pts } = await supabase
      .from("personal_tools")
      .select("id, titulo, tipo, plantilla_id, created_at")
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .eq("departamento", departamento)
      .order("created_at", { ascending: false });
    setPersonalTools((pts ?? []) as PersonalTool[]);
  }

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();

      // Herramientas ocultadas por la cabeza del departamento (ver /control-depto)
      const { data: ocultasData } = await supabase
        .from("herramienta_visibilidad")
        .select("herramienta")
        .eq("project_id", projectId)
        .eq("departamento", departamento)
        .eq("oculta", true);
      setOcultas(new Set((ocultasData ?? []).map((r) => r.herramienta)));

      // En Exclusivas, "Tareas" (el tablero personal kanban) siempre debe
      // existir como primera tarjeta — se crea sola si todavía no la tiene
      // (mismo helper que usa el acceso directo del Pulso).
      if (seccion === "cargo") {
        await asegurarTareasPersonales(departamento);
      }

      // Herramientas personales del usuario (visibles en Departamento y Exclusivas)
      await recargarPersonalTools();
    })();
  }, [departamento, seccion]);

  function abrir(h: Herramienta) {
    if (bloqueado) return;
    setAbierta(h);
    setAbiertaPersonal(null);
    setCreandoEspacio(false);
    localStorage.setItem(openKey(departamento, seccion), h.id);
  }

  function abrirPersonal(pt: PersonalTool) {
    setAbiertaPersonal(pt);
    setAbierta(null);
    setCreandoEspacio(false);
    localStorage.setItem(openPersonalKey(departamento), pt.id);
  }

  function cerrarPersonal() {
    setAbiertaPersonal(null);
    localStorage.removeItem(openPersonalKey(departamento));
  }

  async function renombrarPersonal(id: string, nuevo: string) {
    const titulo = nuevo.trim();
    if (!titulo) return;
    const supabase = createClient();
    await supabase.from("personal_tools").update({ titulo }).eq("id", id);
    setPersonalTools((prev) => prev.map((p) => (p.id === id ? { ...p, titulo } : p)));
    setAbiertaPersonal((prev) => (prev && prev.id === id ? { ...prev, titulo } : prev));
  }

  // Departamento (solo lectura): igual que Generales, se listan TODAS las
  // herramientas (compartidas + de cada cargo) como sub-pestañas siempre
  // visibles, sin pantalla de índice — pedido explícito de Nicolás, mismo
  // patrón ya aplicado en GeneralesPanel.tsx.
  const deptSubTools =
    seccion === "departamento"
      ? Array.from(
          new Map(
            [
              ...deptTools(departamento).filter((h) => !ocultas.has(h.id) && h.tipo !== "accesos"),
              ...cargoGroups(departamento).flatMap((g) => g.tools.filter((h) => !ocultas.has(h.id) && h.tipo !== "accesos")),
            ].map((h) => [h.id, h]) // dedupe: una herramienta puede vivir en "compartidas" y en un cargo a la vez
          ).values()
        )
      : [];

  useEffect(() => {
    if (seccion !== "departamento" || abierta) return;
    if (deptSubTools.length > 0) setAbierta(deptSubTools[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, departamento, ocultas]);

  // Exclusivas: herramientas COMPARTIDAS del depto (editables por cualquiera),
  // las de SU cargo, y — si es admin — las de los demás cargos (supervisión).
  const compartidasEditables = seccion === "cargo" ? deptTools(departamento).filter((h) => !ocultas.has(h.id) && h.tipo !== "accesos") : [];
  const miGrupo = seccion === "cargo" && cargo ? cargoGroups(departamento).find((g) => g.cargo === cargo) : undefined;
  const misCargoTools = seccion === "cargo" ? (miGrupo?.tools ?? []).filter((h) => !ocultas.has(h.id)) : [];
  const otrosCargoGrupos =
    seccion === "cargo" && isAdmin
      ? cargoGroups(departamento)
          .filter((g) => g.cargo !== cargo)
          .map((g) => ({ ...g, tools: g.tools.filter((h) => !ocultas.has(h.id)) }))
          .filter((g) => g.tools.length > 0)
      : [];
  // Igual que Departamento: se aplana todo en una sola barra de sub-pestañas,
  // deduplicada por id (una herramienta puede ser compartida Y de tu cargo).
  const cargoSubTools =
    seccion === "cargo"
      ? Array.from(
          new Map(
            [...compartidasEditables, ...misCargoTools, ...otrosCargoGrupos.flatMap((g) => g.tools)].map((h) => [h.id, h])
          ).values()
        )
      : [];

  function abrirCreador() {
    setCreandoEspacio(true);
    setAbierta(null);
    setAbiertaPersonal(null);
  }

  useEffect(() => {
    if (seccion !== "cargo" || abierta || abiertaPersonal || creandoEspacio) return;
    if (personalTools.length > 0) { abrirPersonal(personalTools[0]); return; }
    if (cargoSubTools.length > 0) abrir(cargoSubTools[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, departamento, ocultas, personalTools]);

  // Restaura la herramienta que estaba abierta en esta pestaña (Departamento/Exclusivas)
  // al volver a ella, leyendo de localStorage por departamento + seccion.
  useEffect(() => {
    if (bloqueado) return;
    const id = localStorage.getItem(openKey(departamento, seccion));
    if (!id) return;
    const candidatos =
      seccion === "departamento" || isAdmin
        ? [...deptTools(departamento), ...cargoGroups(departamento).flatMap((g) => g.tools)]
        : [
            ...deptTools(departamento),
            ...(cargo ? cargoGroups(departamento).find((g) => g.cargo === cargo)?.tools ?? [] : []),
          ];
    const h = candidatos.find((t) => t.id === id);
    if (h) setAbierta(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamento, seccion]);

  // Restaura la herramienta personal abierta (solo aplica en Exclusivas).
  useEffect(() => {
    if (seccion !== "cargo" || personalTools.length === 0) return;
    const id = localStorage.getItem(openPersonalKey(departamento));
    if (!id) return;
    const pt = personalTools.find((p) => p.id === id);
    if (pt) setAbiertaPersonal(pt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamento, seccion, personalTools]);

  // Barra de sub-pestañas de Exclusivas: personales primero (con "Tareas"
  // siempre de primera, ver arriba), después el toggle "+ Espacio de
  // trabajo", después las herramientas estáticas — mismo patrón que
  // Departamento/Generales, reusa .gen-subtabs/.gen-subtab.
  const cargoSubtabsBar = (
    <div className="gen-subtabs">
      {personalTools.map((pt) => (
        <button
          key={`p-${pt.id}`}
          className={`gen-subtab ${abiertaPersonal?.id === pt.id ? "on" : ""}`}
          onClick={() => abrirPersonal(pt)}
        >
          {pt.titulo}
        </button>
      ))}
      <button className={`gen-subtab ${creandoEspacio ? "on" : ""}`} onClick={abrirCreador}>
        + {t("workspaceCardTitle")}
      </button>
      {cargoSubTools.map((h) => (
        <button
          key={h.id}
          className={`gen-subtab ${abierta?.id === h.id ? "on" : ""}`}
          onClick={() => abrir(h)}
        >
          {nombreDe(h)}
        </button>
      ))}
    </div>
  );

  if (seccion === "cargo" && creandoEspacio) {
    return (
      <div className="hp-open">
        {cargoSubtabsBar}
        <EspacioTrabajoCreator
          departamento={departamento}
          fullName={fullName}
          onCreated={async () => { setCreandoEspacio(false); await recargarPersonalTools(); }}
        />
      </div>
    );
  }

  // Personal tool abierta
  if (abiertaPersonal) {
    const h = personalToHerramienta(abiertaPersonal);
    return (
      <div className="hp-open">
        {cargoSubtabsBar}
        <div className="hp-open-head">
          <h3 className="hp-open-title-edit">
            <span className="hex"></span>
            <input
              key={abiertaPersonal.id}
              className="hp-open-title-input"
              defaultValue={abiertaPersonal.titulo}
              placeholder={h.tipo === "tabla" ? tEsp("untitledTable") : tEsp("untitledDoc")}
              onBlur={(e) => renombrarPersonal(abiertaPersonal.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            />
          </h3>
          <button
            className="btn hp-btn-danger"
            style={{ marginLeft: "auto" }}
            onClick={async () => {
              if (!confirm(t("confirmDeletePersonal"))) return;
              const supabase = createClient();
              await supabase.from("personal_tools").delete().eq("id", abiertaPersonal.id);
              setPersonalTools((prev) => prev.filter((p) => p.id !== abiertaPersonal.id));
              cerrarPersonal();
            }}
          >
            <Icon name="trash" size={13} /> {t("delete")}
          </button>
        </div>
        {abiertaPersonal.tipo === "tabla" && abiertaPersonal.plantilla_id && VISTAS_CUADRO.has(abiertaPersonal.plantilla_id) ? (
          <PlantillaCuadro
            herramientaId={abiertaPersonal.id}
            plantillaId={abiertaPersonal.plantilla_id}
            departamento={departamento}
            fullName={fullName}
            editable
          />
        ) : (
          <HerramientaPanel departamento={departamento} herramienta={h} fullName={fullName} editable />
        )}
      </div>
    );
  }

  if (abierta) {
    const esCasting = abierta.id === "cast-candidatos";
    return (
      <div className="hp-open">
        {seccion === "departamento" ? (
          <div className="gen-subtabs">
            {deptSubTools.map((h) => (
              <button
                key={h.id}
                className={`gen-subtab ${h.id === abierta.id ? "on" : ""}`}
                onClick={() => setAbierta(h)}
              >
                {nombreDe(h)}
              </button>
            ))}
          </div>
        ) : (
          cargoSubtabsBar
        )}
        <div className="hp-open-head-tabs" id="hp-open-head-tabs" />
        {esCasting && (
          <div className="dsubtabs">
            <button className={`dsubtab ${vista === "tabla" ? "active" : ""}`} onClick={() => setVista("tabla")}>
              {t("table")}
            </button>
            <button className={`dsubtab ${vista === "personajes" ? "active" : ""}`} onClick={() => setVista("personajes")}>
              {t("byCharacter")}
            </button>
          </div>
        )}
        {seccion === "departamento" && (
          <div className="hp-vista-note"><span className="hex"></span>{t("deptViewNote")}</div>
        )}
        {esCasting && vista === "personajes" ? (
          <CandidatosPorPersonajePanel departamento={departamento} />
        ) : (
          <HerramientaPanel departamento={departamento} herramienta={abierta} fullName={fullName} editable={seccion === "cargo"} />
        )}
      </div>
    );
  }

  if (seccion === "departamento") {
    // Sin herramientas visibles (o todavía cargando ocultas/deptSubTools):
    // única situación en la que Departamento no tiene una pestaña abierta.
    return (
      <div className="hp-index">
        <div className="hp-vista-note"><span className="hex"></span>{t("deptViewNote")}</div>
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("noDeptTools")}</h4>
          <p>{t("noDeptToolsDesc")}</p>
        </div>
      </div>
    );
  }

  // seccion === "cargo" (Exclusivas), sin nada visible todavía (o cargando):
  // única situación en la que no hay una pestaña abierta.
  return (
    <div className="hp-index">
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("noExclusiveTools")}</h4>
        <p>{t("noExclusiveToolsDesc")}</p>
      </div>
    </div>
  );
}

function EspacioTrabajoCreator({
  departamento,
  fullName,
  onCreated,
}: {
  departamento: string;
  fullName: string;
  onCreated: () => void;
}) {
  // flush: hp-index (el padre) ya aporta el gutter lateral, así que el panel
  // no agrega el suyo y no se duplica el padding (clave en mobile).
  return (
    <div style={{ marginBottom: 4 }}>
      <EspacioTrabajoPanel departamento={departamento} fullName={fullName} onCreated={onCreated} flush />
    </div>
  );
}
