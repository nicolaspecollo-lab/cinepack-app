"use client";

// ===========================================================================
// Editor real de hoja de cálculo en blanco (Univer, núcleo Apache-2.0).
// ---------------------------------------------------------------------------
// Panel A MEDIDA (no cabe en HerramientaPanel genérico): es un lienzo de
// edición completo tipo Excel (celdas, fórmulas, formato, filas/columnas),
// no una tabla con columnas tipadas — mismo criterio ya aplicado a
// MoodboardFotoLienzo/PlanSonidoPanel para interacciones que no caben en
// tabla/nota/checklist/ficha/galería (ver sistema-diseno.md).
//
// Mobile (390px, requisito inviolable): la toolbar nativa de Univer está
// pensada para escritorio (arquitectura.md, riesgo #2). Se la deja montada
// (cubre fórmulas/formato reales) pero envuelta en un contenedor con scroll
// horizontal propio y una altura fija, en vez de intentar "comprimir" sus
// botones — así no se rompe ningún control nativo, y en pantallas chicas el
// usuario desliza la barra en vez de perder funciones.
// ===========================================================================

import { useEffect, useRef } from "react";
import { createUniver, defaultTheme, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsCoreEsES from "@univerjs/preset-sheets-core/locales/es-ES";
import "@univerjs/preset-sheets-core/lib/index.css";
import type { IWorkbookData } from "@univerjs/core";

export default function UniverHojaEditor({
  nombre,
  snapshot,
  onGuardar,
}: {
  nombre: string;
  snapshot: Record<string, unknown>;
  onGuardar: (snapshot: Record<string, unknown>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReturnType<typeof createUniver>["univerAPI"] | null>(null);
  const univerRef = useRef<ReturnType<typeof createUniver>["univer"] | null>(null);
  const onGuardarRef = useRef(onGuardar);
  useEffect(() => {
    onGuardarRef.current = onGuardar;
  }, [onGuardar]);

  useEffect(() => {
    if (!containerRef.current) return;

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.ES_ES,
      locales: { [LocaleType.ES_ES]: mergeLocales(sheetsCoreEsES) },
      theme: defaultTheme,
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
        }),
      ],
    });
    univerRef.current = univer;
    apiRef.current = univerAPI;

    const hayDatos = snapshot && Object.keys(snapshot).length > 0;
    univerAPI.createWorkbook(
      hayDatos ? (snapshot as unknown as Partial<IWorkbookData>) : { name: nombre }
    );

    // Autoguardado por debounce ante cualquier cambio de comando (celdas,
    // formato, filas/columnas, fórmulas) — no hay botón "Guardar" aparte,
    // igual criterio que el resto de herramientas de CINEPACK (autoguardado).
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const disposable = univerAPI.addEvent(univerAPI.Event.CommandExecuted, () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const wb = univerAPI.getActiveWorkbook();
        if (wb) onGuardarRef.current(wb.save() as unknown as Record<string, unknown>);
      }, 600);
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      disposable?.dispose?.();
      univer.dispose();
    };
    // Se monta una sola vez por documento abierto (el id vive en la `key` que
    // pone el padre); no se re-crea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="docb-hoja-wrap">
      <div className="docb-hoja-scroll" ref={containerRef} />
    </div>
  );
}
