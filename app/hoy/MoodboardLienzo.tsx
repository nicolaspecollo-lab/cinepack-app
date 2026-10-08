"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import type { ElementoMoodboard } from "./moodboardFilas";

type Props = {
  elementos: ElementoMoodboard[];
  editable: boolean;
};

// Alto fijo del tablero; el ancho se adapta al contenedor.
const ALTO_TABLERO = 560;

// Lienzo del moodboard. Se carga solo en el cliente (Konva necesita el navegador).
export default function MoodboardLienzo({ elementos }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);

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

  return (
    <div ref={contenedorRef} className="mb-lienzo">
      {ancho > 0 && (
        <Stage width={ancho} height={ALTO_TABLERO}>
          <Layer>
            <Rect x={0} y={0} width={ancho} height={ALTO_TABLERO} fill="#15151c" />
            <Text
              x={16}
              y={16}
              text={`Elementos: ${elementos.length}`}
              fontSize={13}
              fill="#8a8a99"
            />
          </Layer>
        </Stage>
      )}
    </div>
  );
}