-- Carga inicial del cortometraje "127" (22'24", España, drama psicológico).
-- Idempotente: borra y reinserta el bloque del proyecto "127".
delete from public.festival_submissions where proyecto = '127';

insert into public.festival_submissions
  (proyecto, festival, pais, clase, plataforma, fee, anios_activo, categoria, estado, fecha_registro, nota)
values
  -- ── Clase A · Oscar-qualifying ────────────────────────────────────────────
  ('127', 'Clermont-Ferrand Int''l Short Film Festival', 'Francia', 'A', 'Web propia / Festhome', 'Gratis-bajo, verificar', null, null, 'pendiente', null, 'El más prestigioso de cortos en Europa'),
  ('127', 'Palm Springs ShortFest', 'EE. UU.', 'A', 'FilmFreeway', 'Early ~$45', null, null, 'pendiente', null, 'Uno de los mayores de EE. UU.'),
  ('127', 'HollyShorts Film Festival', 'EE. UU.', 'A', 'FilmFreeway', 'Early $55', null, null, 'pendiente', null, 'Qualifying en 4 categorías'),
  ('127', 'Aspen Shorts Fest', 'EE. UU.', 'A', 'FilmFreeway', 'Verificar', '~36', null, 'pendiente', null, 'Muy selectivo'),
  ('127', 'Rhode Island Int''l Film Festival', 'EE. UU.', 'A', 'FilmFreeway', 'Verificar', null, null, 'pendiente', null, 'Uno de los más antiguos de EE. UU.'),
  ('127', 'Tampere Film Festival', 'Finlandia', 'A', 'FilmFreeway', 'Verificar', null, null, 'pendiente', null, 'Muy prestigioso en el circuito europeo'),
  ('127', 'Uppsala Short Film Festival', 'Suecia', 'A', 'FilmFreeway', 'Verificar', null, null, 'pendiente', null, 'Referencia nórdica'),

  -- ── Clase B · No calificador, +10 años ────────────────────────────────────
  ('127', 'ZINEBI (Bilbao)', 'España', 'B', 'Web propia', 'De pago, verificar', '~65', null, 'pendiente', null, 'Mayor peso institucional en España. No es Oscar-qualifying'),
  ('127', 'Festival de Cine de Huesca', 'España', 'B', 'Festhome', 'Verificar', '~53', null, 'pendiente', null, '~1000 cortos/año de 80 países'),
  ('127', 'Alcalá de Henares (ALCINE)', 'España', 'B', 'Festhome', 'Gratis (nac./europea)', '~55', null, 'cerrado', null, 'Inscripción cerrada esta edición'),
  ('127', 'Curtas Vila do Conde', 'Portugal', 'B', 'FilmFreeway / Festhome', 'Escalonado', '~34', null, 'pendiente', null, 'Referencia ibérica'),
  ('127', 'Interfilm Berlin', 'Alemania', 'B', 'FilmFreeway', 'Verificar', '~40', null, 'pendiente', null, 'Uno de los mayores de cortos en Europa'),
  ('127', 'London Short Film Festival', 'Reino Unido', 'B', 'FilmFreeway', 'Verificar', '~23', null, 'pendiente', null, 'Buen perfil para drama de autor'),
  ('127', 'BOGOSHORTS', 'Colombia', 'B', 'FilmFreeway', 'Verificar', '~23', null, 'pendiente', null, 'Uno de los mayores de Latinoamérica'),
  ('127', 'Portobello Film Festival', 'Reino Unido', 'B', 'FilmFreeway', 'Gratis', '~30', null, 'pendiente', null, 'Independiente, sin restricción de nacionalidad'),
  ('127', 'Int''l Kurzfilmtage Winterthur', 'Suiza', 'B', 'Verificar', 'Verificar', '~29', null, 'pendiente', null, 'Festival de cortos histórico'),
  ('127', 'Brno Sixteen', 'Chequia', 'B', 'FilmFreeway', 'Gratis', '+60', null, 'pendiente', null, 'Activo desde 1960'),
  ('127', 'GRAND OFF World Independent Film Awards', 'Polonia', 'B', 'FilmFreeway', 'Gratis', '~20', null, 'pendiente', null, 'Cine independiente general'),
  ('127', 'Giffoni Film Festival', 'Italia', 'B', 'Verificar', 'Verificar', '~55', null, 'pendiente', null, 'Histórico, jurado joven'),
  ('127', 'Hawaii Int''l Film Festival (HIFF)', 'EE. UU.', 'B', 'FilmFreeway', 'Gratis', '~45', null, 'pendiente', null, 'Narrativa general'),
  ('127', 'Caminhos do Cinema Português', 'Portugal', 'B', 'Verificar', 'Verificar', '~33', null, 'pendiente', null, 'Confirmar elegibilidad no-portugués'),
  ('127', 'Festival Int''l de Cine de Cartagena de Indias', 'Colombia', 'B', 'Verificar', 'Verificar', '~65', null, 'pendiente', null, 'El más antiguo de Latinoamérica'),
  ('127', 'Mecal (Barcelona)', 'España', 'B', 'Festhome', 'Verificar', '~26', null, 'registrado', '2026-07-31', 'Circuito clasificatorio a los Goya'),
  ('127', 'Festival Jóvenes Realizadores — Granada Film Fest', 'España', 'B', 'FilmFreeway', 'Verificar', '~32', 'Jóvenes Realizadores', 'registrado', '2026-07-31', null),
  ('127', 'Mostra de Cinema Llatinoamericà de Catalunya', 'España', 'B', 'Verificar', 'Verificar', '~30', null, 'pendiente', null, 'Foco latinoamericano'),
  ('127', 'Cinema Jove (Valencia)', 'España', 'B', 'Verificar', 'Verificar', '~40', null, 'pendiente', null, 'Circuito clasificatorio a los Goya'),
  ('127', 'Curtocircuíto (Santiago de Compostela)', 'España', 'B', 'Verificar', 'Verificar', '~21', null, 'pendiente', null, 'Buena reputación de autor'),
  ('127', 'ABYCINE (Albacete)', 'España', 'B', 'Verificar', 'Verificar', '~29', null, 'pendiente', null, 'Circuito clasificatorio a los Goya'),
  ('127', 'Semana de Cine de Medina del Campo', 'España', 'B', 'Festhome', 'Verificar', '~68', null, 'cerrado', null, 'Inscripción cerrada esta edición'),
  ('127', 'Torre en Corto (ALCINE)', 'España', 'B', 'Festhome', 'Verificar', '~55', null, 'cerrado', null, 'Inscripción cerrada esta edición'),

  -- ── Clase C · No calificador, joven/indie ─────────────────────────────────
  ('127', 'EMIFF (Mallorca)', 'España', 'C', 'Directo', 'Verificar', 'Joven', 'Estreno Mundial', 'registrado', '2026-07-31', 'Local: rodado en Mallorca con equipo de Mallorca'),
  ('127', 'Rodinia (18ª ed.)', 'España', 'C', 'Festhome', 'Gratis', '18', null, 'registrado', '2026-07-31', '<30 min · premio 1.100€'),
  ('127', 'Cortogenia', 'España', 'C', 'Festhome', 'Gratis (nac.), 2€ (int.)', 'Verificar', null, 'registrado', '2026-07-31', 'Nacional gratis'),
  ('127', 'Cortos con Ñ', 'España', 'C', 'FilmFreeway', 'Parece gratis', 'Verificar', null, 'registrado', '2026-07-31', 'El cobro de 4€ es entrada al público, no fee'),
  ('127', 'Pettineo Short Movie Fest', 'Italia', 'C', 'Directo', 'Verificar', 'Verificar', null, 'registrado', '2026-07-31', 'Sicilia'),
  ('127', 'Festival Villa del Cine', 'Colombia', 'C', 'Directo', 'Verificar', 'Verificar', null, 'registrado', '2026-07-31', 'Bogotá'),
  ('127', 'Festival Reloncaví', 'Chile', 'C', 'Directo', 'Verificar', 'Verificar', null, 'registrado', '2026-07-31', null),
  ('127', 'Festival u22', 'España', 'C', 'Festhome', 'Bajo costo', 'Joven', null, 'pendiente', null, 'Barcelona · cualquier idioma'),
  ('127', 'Calella Shorts Film Fest', 'España', 'C', 'Festhome', 'Bajo costo', 'Verificar', null, 'pendiente', null, 'Acepta subtítulos es/en/ca'),
  ('127', '¡Tú Cuentas! Cine Youth Fest', 'EE. UU.', 'C', 'FilmFreeway', 'Gratis early, luego $10', '~5', null, 'pendiente', null, 'Foco latino: alineado por idioma y temática'),
  ('127', 'Notodofilmfest', 'España', 'C', 'Propia plataforma', 'Verificar', 'Verificar', null, 'pendiente', null, 'Plataforma española de referencia'),
  ('127', 'Short of the Year', 'Internacional', 'C', 'Verificar', 'Gratis', 'Joven', null, 'pendiente', null, 'Cortos <30 min'),
  ('127', 'REEL 13', 'EE. UU.', 'C', 'Verificar', 'Gratis', 'Joven', null, 'pendiente', null, 'Concurso online'),
  ('127', 'Cinevo Short Film Grant Contest', 'Internacional', 'C', 'Verificar', 'Gratis', 'Joven', null, 'pendiente', null, 'Premio de hasta $20.000'),
  ('127', 'Baku Int''l Short Film Festival (BISFF)', 'Azerbaiyán', 'C', 'FilmFreeway', 'Gratis', 'Verificar', null, 'pendiente', null, null),
  ('127', 'Universal Film Festival (Kansas City)', 'EE. UU.', 'C', 'FilmFreeway', 'Gratis', 'Verificar', null, 'pendiente', null, null),
  ('127', 'The Northern Wave Int''l Film Festival', 'Islandia', 'C', 'FilmFreeway', 'Gratis', 'Verificar', null, 'pendiente', null, null),
  ('127', 'Semana del Cortometraje de Madrid', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Circuito Goya, años sin confirmar'),
  ('127', 'Festival Int''l de Lanzarote', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Circuito Goya, años sin confirmar'),
  ('127', 'Festival de Alicante', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Circuito Goya, años sin confirmar'),
  ('127', 'Festival de L''Alfàs del Pi', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Circuito Goya, años sin confirmar'),
  ('127', 'Festival Independiente de Elche', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Circuito Goya, años sin confirmar'),
  ('127', 'Festival Ibérico de Badajoz', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Foco ibérico/luso-español'),
  ('127', 'FESCIGU (Guadalajara)', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'pendiente', null, 'Circuito Goya, años sin confirmar'),
  ('127', 'Festival de Comedia de Tarazona', 'España', 'C', 'Verificar', 'Verificar', 'Verificar', null, 'descartado', null, 'Género comedia: "127" es drama, no encaja'),
  ('127', 'Los Angeles Short Film Festival', 'EE. UU.', 'C', 'FilmFreeway', 'Fee elevado', 'Verificar', null, 'descartado', null, 'Descartado por coste');
