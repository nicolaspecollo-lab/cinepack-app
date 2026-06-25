// Base de datos local de países y provincias/regiones (Europa + América).
// Reemplaza una API de mapas externa: gratis, sin clave, sin límite de uso,
// y suficiente para evitar inconsistencias de texto libre en el perfil.
export const PAISES_PROVINCIAS: Record<string, string[]> = {
  "España": [
    "A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila",
    "Badajoz", "Baleares", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria",
    "Castellón", "Ciudad Real", "Córdoba", "Cuenca", "Gerona", "Granada",
    "Guadalajara", "Guipúzcoa", "Huelva", "Huesca", "Jaén", "La Rioja", "Las Palmas",
    "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Orense",
    "Palencia", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia",
    "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
    "Vizcaya", "Zamora", "Zaragoza", "Ceuta", "Melilla",
  ],
  "Francia": [
    "Île-de-France", "Auvergne-Ródano-Alpes", "Nueva Aquitania", "Occitania",
    "Provenza-Alpes-Costa Azul", "Países del Loira", "Bretaña", "Normandía",
    "Hauts-de-France", "Gran Este", "Borgoña-Franco Condado", "Centro-Valle del Loira",
    "Córcega",
  ],
  "Italia": [
    "Lombardía", "Lacio", "Campania", "Sicilia", "Véneto", "Emilia-Romaña",
    "Piamonte", "Apulia", "Toscana", "Calabria", "Cerdeña", "Liguria",
    "Marcas", "Abruzos", "Friul-Venecia Julia", "Trentino-Alto Adigio",
    "Umbría", "Basilicata", "Molise", "Valle de Aosta",
  ],
  "Portugal": [
    "Lisboa", "Oporto", "Braga", "Setúbal", "Aveiro", "Coímbra", "Faro",
    "Leiria", "Santarém", "Viseu", "Madeira", "Azores",
  ],
  "Alemania": [
    "Baviera", "Berlín", "Hamburgo", "Hesse", "Renania del Norte-Westfalia",
    "Baden-Wurtemberg", "Sajonia", "Baja Sajonia", "Brandeburgo",
    "Renania-Palatinado", "Turingia", "Schleswig-Holstein",
  ],
  "Reino Unido": [
    "Inglaterra", "Escocia", "Gales", "Irlanda del Norte",
  ],
  "Irlanda": ["Leinster", "Munster", "Connacht", "Ulster"],
  "Países Bajos": ["Holanda del Norte", "Holanda del Sur", "Utrecht", "Brabante del Norte", "Güeldres"],
  "Bélgica": ["Flandes", "Valonia", "Bruselas"],
  "Suiza": ["Zúrich", "Berna", "Ginebra", "Vaud", "Tesino"],
  "Austria": ["Viena", "Salzburgo", "Tirol", "Estiria", "Alta Austria"],
  "Grecia": ["Ática", "Macedonia Central", "Creta", "Tesalia", "Peloponeso"],
  "Polonia": ["Mazovia", "Pequeña Polonia", "Silesia", "Gran Polonia"],
  "Rumanía": ["Bucarest", "Cluj", "Transilvania", "Moldavia"],
  "Suecia": ["Estocolmo", "Gotemburgo", "Malmö"],
  "Noruega": ["Oslo", "Bergen", "Trondheim"],
  "Dinamarca": ["Hovedstaden", "Midtjylland", "Syddanmark"],

  "Argentina": [
    "Buenos Aires (Ciudad)", "Buenos Aires (Provincia)", "Córdoba", "Santa Fe",
    "Mendoza", "Tucumán", "Entre Ríos", "Salta", "Misiones", "Chaco",
    "Corrientes", "Santiago del Estero", "San Juan", "Jujuy", "Río Negro",
    "Neuquén", "Formosa", "Chubut", "San Luis", "Catamarca", "La Rioja",
    "La Pampa", "Santa Cruz", "Tierra del Fuego",
  ],
  "México": [
    "Ciudad de México", "Jalisco", "Nuevo León", "Estado de México", "Puebla",
    "Guanajuato", "Veracruz", "Yucatán", "Quintana Roo", "Baja California",
    "Sonora", "Chihuahua", "Coahuila", "Oaxaca", "Michoacán", "Querétaro",
  ],
  "Colombia": [
    "Bogotá D.C.", "Antioquia", "Valle del Cauca", "Cundinamarca", "Santander",
    "Atlántico", "Bolívar", "Risaralda", "Caldas", "Tolima", "Nariño",
  ],
  "Chile": [
    "Región Metropolitana", "Valparaíso", "Biobío", "Maule", "Araucanía",
    "Coquimbo", "Los Lagos", "O'Higgins", "Antofagasta", "Atacama",
  ],
  "Perú": [
    "Lima", "Arequipa", "Cusco", "La Libertad", "Piura", "Lambayeque",
    "Junín", "Áncash", "Loreto", "Cajamarca",
  ],
  "Uruguay": [
    "Montevideo", "Canelones", "Maldonado", "Colonia", "Salto", "Paysandú",
  ],
  "Paraguay": ["Asunción", "Central", "Alto Paraná", "Itapúa"],
  "Bolivia": ["La Paz", "Santa Cruz", "Cochabamba", "Sucre/Chuquisaca"],
  "Ecuador": ["Quito/Pichincha", "Guayas", "Azuay", "Manabí"],
  "Venezuela": ["Caracas/Distrito Capital", "Zulia", "Miranda", "Carabobo"],
  "Cuba": ["La Habana", "Santiago de Cuba", "Holguín", "Camagüey"],
  "República Dominicana": ["Santo Domingo", "Distrito Nacional", "Santiago"],
  "Panamá": ["Panamá", "Colón", "Chiriquí"],
  "Costa Rica": ["San José", "Alajuela", "Heredia", "Puntarenas"],
  "Guatemala": ["Guatemala", "Quetzaltenango", "Sacatepéquez"],
  "Honduras": ["Francisco Morazán", "Cortés"],
  "El Salvador": ["San Salvador", "Santa Ana"],
  "Nicaragua": ["Managua", "León"],

  "Estados Unidos": [
    "California", "Nueva York", "Texas", "Florida", "Georgia", "Illinois",
    "Luisiana", "Nuevo México", "Carolina del Norte", "Massachusetts",
    "Pensilvania", "Arizona", "Nevada", "Washington", "Colorado",
  ],
  "Canadá": [
    "Ontario", "Quebec", "Columbia Británica", "Alberta", "Manitoba",
    "Nueva Escocia",
  ],
  "Brasil": [
    "São Paulo", "Río de Janeiro", "Minas Gerais", "Bahía", "Paraná",
    "Rio Grande do Sul", "Pernambuco", "Ceará", "Distrito Federal",
  ],
};

export const PAISES = Object.keys(PAISES_PROVINCIAS).sort((a, b) => a.localeCompare(b, "es"));

export function provinciasDe(pais: string): string[] {
  return PAISES_PROVINCIAS[pais] ?? [];
}
