# prod-checklist-vehiculos — Ronda 3: rediseño "tarjeta por matrícula"

Addendum al dossier original de este expediente (secciones 1-5, 7, 8, 10 y 11
siguen vigentes en `dossier.md` / `dossier.pdf` de las rondas anteriores — este
archivo cubre únicamente lo que cambió en la ronda 3, por el rebote explícito
de Nico sobre la versión en tabla de celdas agrupada por vehículo).

## Motivo del rebote (ronda 3)

> "Muy lejos de lo esperado, quiero una propuesta de diseño real. Basta de
> cuadro de celdas. Quiero una que esta herramienta esté presentada por
> tarjeta; según matrícula. Y cuando entrés a la matrícula, puedas ver el
> historial. Y agregar información. Fotografías periódicas de kilometraje,
> fotos de tickets de combustibles y otros gastos, (también ingresados de
> forma manual), carnet y responsable de conducción del vehículo."

## 6. Propuesta (rediseño)

### Patrón de interacción elegido y por qué

Se evaluaron tres patrones antes de elegir:

1. **Lista + detalle (bandeja)** — descartado: un Driver no "archiva" vehículos
   como quien archiva correos, tiene un número chico de matrículas (2-6) que
   revisa todos los días; una bandeja angosta desperdicia la pantalla.
2. **Línea de tiempo única cruzando todos los vehículos** — descartado: mezcla
   kilometraje/gastos/mantenimiento de matrículas distintas en un solo eje
   temporal, que es exactamente lo que Nico pidió evitar ("según matrícula").
3. **Mapa de tarjetas navegables, una por matrícula, con historial cronológico
   al abrir cada una** — elegido. Es como el Driver piensa el problema de
   verdad: "¿qué vehículos tengo a cargo, cuál necesita atención hoy, y cuál
   es la historia de ESTE vehículo en particular?" Cada tarjeta es la unidad
   real de trabajo.

Se implementó reutilizando `EntidadTabsBoard` (`app/hoy/HerramientaPanel.tsx`),
el motor de "tarjeta → modal con pestañas" ya aprobado por el comité en
`rrhh-plan-bienestar` y otras 7 herramientas — **no** la tabla/grilla genérica
de celdas que Nico rebotó. Se documenta explícitamente por qué no se construyó
un componente 100% nuevo desde cero: el patrón de interacción (tarjeta cerrada
con badges de estado → abrir → pestañas de categoría) es exactamente el que
Nico pidió, y ya tiene pulido real (animaciones, estados vacíos, mobile-first)
verificado en otras 8 herramientas; reinventarlo habría significado menos
tiempo en lo específico del cargo (alertas de vencimiento, variedad del
historial) y más en reconstruir infraestructura ya resuelta. Lo específico de
este expediente — la rama de alerta `vehiculo-alerta`, las tarjetas con acento
índigo y badges de vencimiento, los 5 tabs del Driver, los datos de ejemplo —
sí es 100% a medida de este cargo, no genérico.

### Nivel 1 — Mapa de tarjetas por matrícula

Cada tarjeta muestra, sin abrirla:
- Matrícula (título) y modelo (subtítulo).
- Responsable de conducción actual (o "Sin responsable asignado").
- Próxima revisión técnica y vencimiento del carnet del responsable, como
  chips de color: verde si están vigentes, rojo si ya vencieron.
- Kilometraje actual.
- Badge de alerta roja con el número de problemas críticos (carnet vencido /
  revisión vencida / algún punto de mantenimiento "Urgente"), visible sin
  tener que entrar — exactamente el "de un vistazo" que pidió Nico.

### Nivel 2 — Historial al abrir la matrícula (5 pestañas)

1. **Resumen** — matrícula, modelo, año, responsable actual, kilometraje
   actual, próxima revisión técnica, vencimiento del carnet.
2. **Kilometraje** — registros cronológicos (fecha + km + foto del odómetro +
   nota), se agregan uno a uno conforme pasa el tiempo.
3. **Combustible y gastos** — tickets con fecha, tipo (Combustible / Peaje /
   Parking / Lavado / Taller / Otro), monto ingresado a mano y foto del
   ticket adjunta.
4. **Carnet y responsable** — historial completo de quién fue responsable de
   conducción de ese vehículo a lo largo del tiempo (no solo el actual), cada
   entrada con su fecha de inicio, foto del carnet de conducir y vencimiento
   propio — así se sabe quién respondía por el vehículo en cualquier fecha
   pasada, no solo hoy.
5. **Mantenimiento** — se preserva el checklist técnico real que ya existía
   (aceite y filtros, frenos, neumáticos, luces, batería, líquido
   refrigerante, correa de distribución, aire acondicionado, otro), ahora con
   fecha y estado (OK / Revisar / Urgente) por cada intervención, en vez de un
   sí/no plano — un punto "Urgente" dispara la alerta de la tarjeta cerrada.

### Flujo de uso paso a paso (Driver, jornada típica)

1. Abre "Checklist de vehículos" → ve el mapa de tarjetas de todos los
   vehículos a su cargo, con los badges rojos resaltando los que necesitan
   atención hoy (ej. "9014-TZX" con 3 alertas).
2. Toca la tarjeta con alerta → entra directo a la pestaña Resumen, confirma
   qué venció (carnet, revisión, o un punto de mantenimiento urgente).
3. Antes de salir con el vehículo, abre la pestaña Kilometraje y agrega un
   registro con la foto del odómetro tomada en el momento.
4. Al cargar combustible, abre Combustible y gastos, agrega el ticket con el
   monto y la foto.
5. Si cambia el responsable de conducción (otro miembro del equipo toma el
   vehículo por unos días), agrega una entrada nueva en Carnet y responsable
   sin perder el historial de quién lo condujo antes.

### Contenido precargado

4 vehículos de ejemplo, variados y con historiales reales de varias entradas
cada uno (furgón de producción Mercedes Sprinter al día; pickup Toyota Hilux
con neumático urgente y carnet vencido; furgón Renault Master al día; van
Citroën Jumpy con fuga de refrigerante urgente, carnet vencido y sin
responsable asignado) — dos de los cuatro muestran el estado de alerta real
para que el comité y Nico vean la tarjeta "en problema" sin tener que
imaginarla.

## 9. Especificación técnica (parte de componentes)

- **Tipo de herramienta**: `tabla` con vista bespoke vía `ENTIDAD_TABS_IDS` /
  `ENTIDAD_TABS_CONFIG["prod-checklist-vehiculos"]` (no el motor genérico de
  tabla/grilla de celdas).
- **Componente de render**: `EntidadTabsBoard` (`app/hoy/HerramientaPanel.tsx`),
  con una rama de personalización `isVehiculo` (misma técnica que `isRrhh`
  para `rrhh-plan-bienestar`): tarjeta con acento índigo, icono `car`, badge
  de alertas (`vehiculoAlertas()`), chips de fecha ok/bad por vencimiento, y
  kilometraje con icono `gauge`.
- **Columnas** (`app/herramientas.ts`, `Herramienta.columnas`): `matricula`,
  `modelo`, `anio`, `responsable_actual`, `km_actual`, `revision_tecnica`,
  `carnet_vencimiento` (simples) + `historial_km`, `historial_gastos`,
  `historial_responsables`, `mantenimiento` (tipo `repetible`, con
  sub-columnas que incluyen `archivo` para las fotos).
- **Fotos**: mecanismo `archivo` existente (`ArchivoCell`, Supabase Storage,
  bucket `documentos`, ruta `{proyecto}/{departamento}/herramientas/{herramienta}/{fila}/{sub-col}/...`),
  mismo que ya usan `foto-checklist-descarga` y `dir-continuidad-foto` dentro
  de columnas `repetible` — no se introdujo ningún mecanismo de subida nuevo.
- **Iconos nuevos** (`app/components/Icon.tsx`, mismo trazo 1.75px que el
  resto del set): `car`, `fuel`, `gauge`, `wrench`.
- **CSS** (`app/hoy/dashboard.css`): bloque `.hp-veh-*` (tarjeta, badges,
  chips de fecha, cuerpo) + `.hp-etb-list-grid` (grilla que envuelve en vez de
  rail horizontal, pensada para pocas matrículas en vez de muchas entidades).
- **Sin librerías nuevas**: 100% componentes/CSS/infra ya existentes y
  aprobados.

## Verificación QA (ronda 3)

Playwright real, `qa.prod-driver2@mailinator.com` contra `cinepack-dev`, en
390/820/1440px: sin scroll horizontal en ningún ancho, las 4 tarjetas de
ejemplo se ven y abren correctamente, se creó una fila real
("TEST-QA1"), se completó la matrícula, se agregó un registro de kilometraje
con foto real (`odometro-test.png`) y se confirmó que la foto (miniatura +
nombre de archivo) sigue presente después de recargar la página — persistencia
real contra Supabase Storage, no solo estado en memoria. La fila de prueba se
eliminó al final para dejar `cinepack-dev` solo con los 4 ejemplos.

Pendiente para QA formal: repetir el mismo flujo también en Combustible y
gastos / Carnet y responsable (mismo mecanismo `ArchivoCell`, ya verificado en
Kilometraje) y confirmar con el comité que el hint (ahora excluido del render
para este id) no reaparece en ninguna vista.
