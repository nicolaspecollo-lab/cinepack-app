# Plantilla de informe — identidad CINEPACK

Uso obligatorio para **todo PDF que se entregue a Nico** (dossiers de la Oficina de Desarrollo, informes de la Oficina de Marketing, cualquier entrega futura). Nunca un volcado de markdown crudo ni un PDF con el estilo por defecto de pandoc/LaTeX — eso es exactamente lo que Nico pidió dejar de ver.

Tokens de marca reales (de `/oficina/sistema-diseno.md`): fondo oscuro `#0D0D12`/`#16161D`, texto `#F4F4F6`, títulos en **Poppins 800** (igual que `h1-h4` de `cp-theme.css`), acento ámbar `#E8A330` (Desarrollo) o violeta `#C98AF2` (Marketing) — usar el acento de cada oficina para dar identidad propia sin salirse de la paleta con nombre ya definida en `sistema-diseno.md`.

## Cómo generar un PDF

```bash
node oficina/plantilla-informe/build.js <archivo.md> <salida.pdf> <meta.json>
```

`meta.json`:
```json
{
  "kicker": "Oficina de Desarrollo de App · Expediente aprobado",
  "title": "Nombre de la herramienta",
  "subtitle": "Una o dos líneas de contexto.",
  "badge": "<span class=\"badge badge-ok\">Aprobado · Ronda 2</span>",
  "metaItems": [["Fecha", "16 nov 2026"], ["PR", "#5"], ["Librería", "Univer"], ["Oficina", "Desarrollo"]],
  "logoPath": "/home/user/cinepack-app/app/apple-icon.png",
  "footerNote": "pendiente de tu aprobación final",
  "accent": "#E8A330"
}
```

Clases de badge disponibles: `badge-supera` (verde-dorado degradé, "Supera las expectativas" — calificación distinta de "Cumple", no sinónimo), `badge-ok` (verde, cumple/aprobado), `badge-warn` (ámbar, pendiente), `badge-danger` (rojo, archivado/objeciones).

Requiere `pandoc` y Playwright (ambos ya disponibles en el entorno de esta oficina).

## Qué NO hacer
- No mostrar el markdown crudo en ningún lado (ni en el panel en vivo ni como archivo adjunto) — siempre pasa por esta plantilla antes de llegar a Nico.
- No usar el CSS por defecto de pandoc/LaTeX.
- No inventar una paleta o tipografía nueva "para el informe" — son los mismos tokens que `sistema-diseno.md`.
