"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type Konva from "konva";
import { Stage, Layer, Rect, Text, Group, Transformer } from "react-konva";
import type { ElementoMoodboard, ElementoNota } from "./moodboardFilas";

type Props = {
  elementos: ElementoMoodboard[];
  editable: boolean;
  guardar: (elementos: ElementoMoodboard[]) => Promise<void>;
};

// Alto fijo del tablero; el ancho se adapta al contenedor.
const ALTO_TABLERO = 560;
// Tamaño mínimo de un elemento al redimensionarlo.
const MINIMO = 60;
// Colores del lienzo (van dentro del <canvas>, el CSS no llega).
const COLOR_FONDO = "#15151c";
const COLOR_NOTA = "#f2d16b";
const COLOR_TEXTO_NOTA = "#15151c";

type Geometria = Partial<Pick<ElementoMoodboard, "x" | "y" | "ancho" | "alto" | "rotacion">>;

// Lienzo del moodboard. Se carga solo en el cliente (Konva necesita el navegador).
export default function MoodboardLienzo({ elementos, editable, guardar }: Props) {
  const t = useTranslations("moodboard");
  const contenedorRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodos = useRef<Record<string, Konva.Group | null>>({});

  const [ancho, setAncho] = useState(0);
  // Copia local: todo lo que se hace en el tablero cambia esto; GUARDAR lo envía a la base de datos.
  const [items, setItems] = useState<ElementoMoodboard[]>(elementos);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Medimos el contenedor y lo seguimos si la ventana cambia de tamaño.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // El transformador (tiradores de tamaño y giro) se engancha a la nota seleccionada.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodo = seleccion && editable ? nodos.current[seleccion] : null;
    tr.nodes(nodo ? [nodo] : []);
    tr.getLayer()?.batchDraw();
  }, [seleccion, editable, items, ancho]);

  function anadirNota() {
    const desplazamiento = (items.length % 6) * 24;
    const nueva: ElementoNota = {
      id: crypto.randomUUID(),
      tipo: "nota",
      x: 40 + desplazamiento,
      y: 40 + desplazamiento,
      ancho: 200,
      alto: 140,
      rotacion: 0,
      texto: t("noteDefault"),
    };
    setItems([...items, nueva]);
    setSeleccion(nueva.id);
  }

  function cambiarGeometria(id: string, cambios: Geometria) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  function cambiarTexto(id: string, texto: string) {
    setItems((prev) => prev.map((e) => (e.id === id && e.tipo === "nota" ? { ...e, texto } : e)));
  }

  function eliminar() {
    if (!seleccion) return;
    setItems((prev) => prev.filter((e) => e.id !== seleccion));
    setSeleccion(null);
  }

  async function guardarTablero() {
    setGuardando(true);
    await guardar(items);
    setGuardando(false);
  }

  const notaSeleccionada = items.find((e): e is ElementoNota => e.id === seleccion && e.tipo === "nota");

  return (
    <>
      {editable && (
        <div className="mb-barra">
          <button className="cp-btn" onClick={anadirNota}>
            + {t("addNote")}
          </button>
          <button className="cp-btn" onClick={eliminar} disabled={!seleccion}>
            {t("delete")}
          </button>
          <button className="cp-btn cp-btn-acc" onClick={guardarTablero} disabled={guardando}>
            {t("save")}
          </button>
        </div>
      )}

      {editable && notaSeleccionada && (
        <div className="mb-barra">
          <label className="hp-gfield">
            <span>{t("noteText")}</span>
            <textarea
              value={notaSeleccionada.texto}
              onChange={(ev) => cambiarTexto(notaSeleccionada.id, ev.target.value)}
              rows={3}
            />
          </label>
        </div>
      )}

      <div ref={contenedorRef} className="mb-lienzo">
        {ancho > 0 && (
          <Stage
            width={ancho}
            height={ALTO_TABLERO}
            onMouseDown={(ev) => {
              // Clic en el fondo vacío: se deselecciona.
              if (ev.target === ev.target.getStage()) setSeleccion(null);
            }}
            onTouchStart={(ev) => {
              if (ev.target === ev.target.getStage()) setSeleccion(null);
            }}
          >
            <Layer>
              <Rect x={0} y={0} width={ancho} height={ALTO_TABLERO} fill={COLOR_FONDO} listening={false} />

              {items.map((e) =>
                e.tipo === "nota" ? (
                  <Group
                    key={e.id}
                    ref={(nodo) => {
                      nodos.current[e.id] = nodo;
                    }}
                    x={e.x}
                    y={e.y}
                    rotation={e.rotacion}
                    draggable={editable}
                    onClick={() => editable && setSeleccion(e.id)}
                    onTap={() => editable && setSeleccion(e.id)}
                    onDragEnd={(ev) => cambiarGeometria(e.id, { x: ev.target.x(), y: ev.target.y() })}
                    onTransformEnd={(ev) => {
                      // Konva escala el grupo; lo convertimos a ancho/alto reales y reseteamos la escala.
                      const nodo = ev.target;
                      const sx = nodo.scaleX();
                      const sy = nodo.scaleY();
                      nodo.scaleX(1);
                      nodo.scaleY(1);
                      cambiarGeometria(e.id, {
                        x: nodo.x(),
                        y: nodo.y(),
                        rotacion: nodo.rotation(),
                        ancho: Math.max(MINIMO, e.ancho * sx),
                        alto: Math.max(MINIMO, e.alto * sy),
                      });
                    }}
                  >
                    <Rect width={e.ancho} height={e.alto} fill={COLOR_NOTA} />
                    <Text
                      width={e.ancho}
                      height={e.alto}
                      padding={10}
                      text={e.texto}
                      fontSize={14}
                      fill={COLOR_TEXTO_NOTA}
                    />
                  </Group>
                ) : null,
              )}

              {editable && (
                <Transformer
                  ref={transformerRef}
                  keepRatio={false}
                  boundBoxFunc={(anterior, nuevo) =>
                    nuevo.width < MINIMO || nuevo.height < MINIMO ? anterior : nuevo
                  }
                />
              )}
            </Layer>
          </Stage>
        )}
      </div>
    </>
  );
}