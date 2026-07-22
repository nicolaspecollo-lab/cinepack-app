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
import Hcard from "./Hcard";
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

const TIPO_TAG_KEY: Record<Herramienta["tipo"], string> = {
  tabla: "tipoTabla",
  nota: "tipoDoc",
  checklist: "tipoChecklist",
  ficha: "tipoFicha",
  galeria: "tipoGaleria",
  accesos: "tipoAccesos",
};

// Ícono del sello hexagonal según el tipo de herramienta — ver Hcard.tsx.
const TIPO_ICON: Record<Herramienta["tipo"], React.ComponentProps<typeof Icon>["name"]> = {
  tabla: "table",
  nota: "file-text",
  checklist: "checklist",
  ficha: "id-card",
  galeria: "image",
  accesos: "key",
};

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
  const tNav = useTranslations("nav");
  const tEsp = useTranslations("espacio");
  const nombreDe = useNombreHerramienta();
  const esModuloBeta = MODULOS_BETA_ACTIVOS.includes(departamento);
  const bloqueado = !esModuloBeta && !isAdmin;
  const proximamente = !esModuloBeta;
  const [abierta, setAbierta] = useState<Herramienta | null>(null);
  const [vista, setVista] = useState<"tabla" | "personajes">("tabla");
  const [conteos, setConteos] = useState<Record<string, number>>({});
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

      // Conteos de filas para herramientas estáticas
      const allTools = [
        ...deptTools(departamento),
        ...cargoGroups(departamento).flatMap((g) => g.tools),
      ];
      const ids = allTools.map((h) => h.id);
      if (ids.length > 0) {
        const { data } = await supabase
          .from("herramienta_filas")
          .select("herramienta_id")
          .eq("project_id", projectId)
          .in("herramienta_id", ids);
        if (data) {
          const c: Record<string, number> = {};
          for (const r of data) c[r.herramienta_id] = (c[r.herramienta_id] ?? 0) + 1;
          setConteos(c);
        }
      }

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
    localStorage.setItem(openKey(departamento, seccion), h.id);
  }

  function cerrar() {
    setAbierta(null);
    setVista("tabla");
    localStorage.removeItem(openKey(departamento, seccion));
  }

  function abrirPersonal(pt: PersonalTool) {
    setAbiertaPersonal(pt);
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

  // Restaura la herramienta que estaba abierta en esta pestaña (Departamento/Exclusivas)
  // al volver a ella, leyendo de localStorage por departamento + seccion.
  useEffect(() => {
    if (bloqueado) return;
    const id = localStorage.getItem(openKey(departamento, seccion));
    if (!id) return;
    const candidatos =
      seccion === "departamento"
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

  // Personal tool abierta
  if (abiertaPersonal) {
    const h = personalToHerramienta(abiertaPersonal);
    return (
      <div className="hp-open">
        <div className="hp-open-head">
          <button className="btn" onClick={cerrarPersonal}><Icon name="arrow-left" size={14} /> {tNav("back")}</button>
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
          <span className="hp-open-tag">{t(TIPO_TAG_KEY[h.tipo])}</span>
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
        <div className="hp-open-head">
          <button className="btn" onClick={cerrar}><Icon name="arrow-left" size={14} /> {tNav("back")}</button>
          <h3><span className="hex"></span> {nombreDe(abierta)}</h3>
          <span className="hp-open-tag">{t(TIPO_TAG_KEY[abierta.tipo])}</span>
          {/* HerramientaPanel porta acá el toggle Tablero/Tabla/Archivos —
              antes vivía debajo del hint, en su propia fila, dejando todo el
              lado derecho de esta cabecera vacío. */}
          <div className="hp-open-head-tabs" id="hp-open-head-tabs" />
        </div>
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
    // Panorama completo del departamento (visionado): las herramientas
    // compartidas + las de CADA cargo, subdivididas por cargo, para que
    // cualquier integrante VEA todo. Solo lectura — la edición vive en
    // Exclusivas (tu cargo).
    const shared = deptTools(departamento).filter((h) => !ocultas.has(h.id) && h.tipo !== "accesos");
    const groups = cargoGroups(departamento)
      .map((g) => ({ ...g, tools: g.tools.filter((h) => !ocultas.has(h.id) && h.tipo !== "accesos") }))
      .filter((g) => g.tools.length > 0);
    if (shared.length === 0 && groups.length === 0) {
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
    return (
      <div className="hp-index hp-index-cols">
        <div className="hp-vista-note"><span className="hex"></span>{t("deptViewNote")}</div>
        {shared.length > 0 && (
          <section className="hp-group">
            <span className="hp-group-label">
              <span className="hex" style={{ width: "8px", height: "7px" }} />
              {t("sharedGroup")}
            </span>
            <div className="hp-cards">
              {shared.map((h) => (
                <ToolCard key={`shared-${h.id}`} h={h} onClick={() => abrir(h)} conteo={conteos[h.id]} bloqueada={bloqueado} proximamente={proximamente} />
              ))}
            </div>
          </section>
        )}
        {groups.map((g) => {
          const esMio = !!cargo && g.cargo === cargo;
          return (
            <section className="hp-group" key={g.cargo}>
              <span className="hp-group-label">
                <span className="hex" style={{ width: "8px", height: "7px" }} />
                {g.cargo}
                {esMio && <span className="hp-mine">{t("yourRole")}</span>}
              </span>
              <div className="hp-cards">
                {g.tools.map((h) => (
                  <ToolCard key={`${g.cargo}-${h.id}`} h={h} onClick={() => abrir(h)} conteo={conteos[h.id]} bloqueada={bloqueado} proximamente={proximamente} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // seccion === "cargo" (Exclusivas): el espacio EDITABLE del usuario. Incluye
  // (1) las herramientas COMPARTIDAS del departamento —editables por cualquier
  // integrante—, (2) las de SU cargo y (3) sus herramientas personales. Las de
  // OTROS cargos siguen viéndose en modo visionado en la pestaña Departamento.
  const compartidasEditables = deptTools(departamento).filter((h) => !ocultas.has(h.id) && h.tipo !== "accesos");
  const miGrupo = cargo ? cargoGroups(departamento).find((g) => g.cargo === cargo) : undefined;
  const misCargoTools = (miGrupo?.tools ?? []).filter((h) => !ocultas.has(h.id));
  if (compartidasEditables.length === 0 && misCargoTools.length === 0 && personalTools.length === 0 && !creandoEspacio) {
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

  return (
    <div className="hp-index hp-index-cols">
      {creandoEspacio && (
        <EspacioTrabajoCreator
          departamento={departamento}
          fullName={fullName}
          onCreated={async () => { setCreandoEspacio(false); await recargarPersonalTools(); }}
        />
      )}
      <section className="hp-group hp-group-personal">
        <span className="hp-group-label">
          <span className="hex" style={{ width: "8px", height: "7px" }} />
          {t("myTools")}
          <span className="hp-mine">{t("personalBadge")}</span>
        </span>
        <div className="hp-cards">
          <Hcard
            icon="layout"
            title={t("workspaceCardTitle")}
            desc={t("workspaceCardDesc")}
            onClick={() => setCreandoEspacio((v) => !v)}
            footer={<span className="hcard-badge">{creandoEspacio ? t("closeWorkspace") : t("openWorkspace")}</span>}
          />
          {personalTools.map((pt) => (
              <Hcard
                key={pt.id}
                icon={pt.tipo === "tabla" ? "table" : "file-text"}
                title={pt.titulo}
                personal
                onClick={() => abrirPersonal(pt)}
                footer={<span className="hcard-badge">{pt.tipo === "tabla" ? tEsp("typeTable") : tEsp("typeDoc")}</span>}
              />
            ))}
        </div>
      </section>
      {compartidasEditables.length > 0 && (
        <section className="hp-group">
          <span className="hp-group-label">
            <span className="hex" style={{ width: "8px", height: "7px" }} />
            {t("sharedGroup")}
          </span>
          <div className="hp-cards">
            {compartidasEditables.map((h) => (
              <ToolCard key={`shared-edit-${h.id}`} h={h} onClick={() => abrir(h)} conteo={conteos[h.id]} bloqueada={bloqueado} proximamente={proximamente} />
            ))}
          </div>
        </section>
      )}
      {misCargoTools.length > 0 && (
        <section className="hp-group">
          <span className="hp-group-label">
            <span className="hex" style={{ width: "8px", height: "7px" }} />
            {cargo}
            <span className="hp-mine">{t("yourRole")}</span>
          </span>
          <div className="hp-cards">
            {misCargoTools.map((h) => (
              <ToolCard key={`mine-${h.id}`} h={h} onClick={() => abrir(h)} conteo={conteos[h.id]} bloqueada={bloqueado} proximamente={proximamente} />
            ))}
          </div>
        </section>
      )}
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

function ToolCard({
  h,
  onClick,
  conteo,
  bloqueada,
  proximamente,
}: {
  h: Herramienta;
  onClick: () => void;
  cargo?: boolean;
  conteo?: number;
  bloqueada?: boolean;
  proximamente?: boolean;
}) {
  const t = useTranslations("hp");
  const nombreDe = useNombreHerramienta();
  const unidad = t(h.tipo === "checklist" ? "unitItems" : h.tipo === "galeria" ? "unitPhotos" : "unitRows");
  return (
    <Hcard
      icon={TIPO_ICON[h.tipo]}
      title={nombreDe(h)}
      desc={h.hint}
      locked={bloqueada}
      soonLabel={(bloqueada || proximamente) ? t("comingSoon") : undefined}
      onClick={onClick}
      footerSplit
      footer={
        <>
          <span className="hcard-tipo-tag">{t(TIPO_TAG_KEY[h.tipo])}</span>
          {conteo != null && conteo > 0 && (
            <span className="hcard-count">{conteo} {unidad}</span>
          )}
          {(conteo == null || conteo === 0) && h.tipo === "tabla" && (
            <span className="hcard-badge">{t("emptyBadge")}</span>
          )}
        </>
      }
    />
  );
}
