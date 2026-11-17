# Registro de acciones sobre CINEPACK real — bitácora de auditoría

Toda acción que efectivamente se ejecutó contra el proyecto/repo real de CINEPACK (deploys, migraciones aplicadas, merges a `main`). Append-only: nunca se edita ni borra una fila ya escrita, solo se agregan nuevas. Esta sesión solo toca lo real cuando Nico da Corte explícito por el botón del panel (ver `oficina/CLAUDE.md`, sección "Corte") — nunca por su cuenta fuera de eso.

| Fecha | Qué se hizo | Quién lo autorizó |
|---|---|---|
| 2026-11-17 | Merge a `main` (commit `887aa77`) de "Notas de dirección por escena" (dir-notas-escena): tabla estructurada de 8 columnas + notificación real de "Pendiente para" (reutiliza tabla `consultas` existente, sin migración nueva). Aislado del resto de la rama de oficina — solo los 2 archivos de este cambio (`app/herramientas.ts`, `app/hoy/HerramientaPanel.tsx`), build/typecheck reales OK contra el main real antes de mergear. Migraciones: ninguna nueva, no aplica. Deploy: push a `main` hecho; si Vercel está conectado vía GitHub se dispara solo — esta sesión no tiene acceso directo a Vercel para confirmarlo o forzarlo. | Nico — botón Corte del panel, alcance main=true/migraciones=true/deploy=true |
