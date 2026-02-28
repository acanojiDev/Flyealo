import {
  AngularNodeAppEngine,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { environment } from './environments/environment.prod';
import { SEO_PAGES } from './app/features/seo-page/seo-pages';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  res.header('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const getPublicOrigin = (req: Request): string => {
  if (SITE_URL) {
    return SITE_URL.replace(/\/+$/, '');
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (forwardedProto || req.protocol);
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : (forwardedHost || req.get('host'));

  if (!host) return '';
  return `${proto}://${host}`;
};

// ===== VARIABLES DE ENTORNO =====
const GEMINI_API_KEY = environment.GEMINI_KEY;
const SUPABASE_URL = environment.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = environment.SUPABASE_KEY;
const GOOGLE_MAPS_KEY = environment.GOOGLE_MAPS_KEY;
const SITE_URL = environment.SITE_URL || '';

// ===== INICIALIZAR SUPABASE =====
const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

// ===== INICIALIZAR GEMINI =====
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `
Eres Flyealo, un asistente de viajes experto. Tu objetivo es crear itinerarios PRECISOS y VERIFICABLES.

RECIBIRÁS datos en este formato:
- cities: array con las ciudades a visitar
- interests: array con los intereses del usuario
- days: número de días totales
- budget: presupuesto disponible
- about: detalles adicionales

⚠️ REGLA CRÍTICA - SOLO LUGARES REALES:
- SOLO recomienda lugares que EXISTEN AL 100% y que puedas encontrar en Google Maps
- NO inventes lugares, NO combines nombres, NO uses nombres aproximados
- Si no estás 100% seguro de que un lugar existe, NO lo incluyas
- Usa el NOMBRE OFICIAL EXACTO como aparece en Google Maps

📍 RESTRICCIONES GEOGRÁFICAS:
- TODOS los lugares deben estar DENTRO de la ciudad especificada
- NO recomiendes lugares en otras ciudades, países o continentes
- Radio máximo: 50km del centro de la ciudad

🏷️ NOMBRES DE LUGARES:
- Para ciudades NO hispanohablantes: usa nombres EN INGLÉS
  ✓ "Tower Bridge" (NO "Puente de la Torre")
  ✓ "British Museum" (NO "Museo Británico")
  ✓ "Buckingham Palace" (NO "Palacio de Buckingham")
  ✓ "Eiffel Tower" (NO "Torre Eiffel")
  ✓ "Colosseum" (NO "Coliseo")
- Para ciudades españolas: usa nombres EN ESPAÑOL
  ✓ "Museo del Prado"
  ✓ "Sagrada Familia"

📋 FORMATO JSON REQUERIDO:
{
  "summary": "Resumen breve del itinerario",
  "days": [
    {
      "day": 1,
      "city": "Nombre de la ciudad (ej: London)",
      "title": "Título descriptivo del día",
      "places": [
        {
          "name": "NOMBRE OFICIAL EXACTO del lugar (como aparece en Google Maps)",
          "type": "museo|monumento|restaurante|parque|plaza|iglesia|mercado|otro",
          "history": "Historia breve del lugar (2-3 frases) EN ESPAÑOL",
          "tips": ["Consejo 1", "Consejo 2"],
          "duration": "Tiempo de visita (ej: 2 horas)",
          "visit_time": "Hora recomendada (ej: 10:00 - 12:00)"
        }
      ],
      "meals": {
        "breakfast": "Lugar específico para desayunar",
        "lunch": "Lugar específico para comer",
        "dinner": "Lugar específico para cenar"
      },
      "daily_cost_estimate": {
        "min": 50,
        "max": 100,
        "currency": "EUR"
      }
    }
  ],
  "recommendations": {
    "best_time": "Mejor época para visitar",
    "budget_tips": ["Consejo de ahorro 1", "Consejo 2"],
    "local_food": ["Comida típica 1", "Comida típica 2"],
    "transport": "Recomendaciones de transporte",
    "packing_list": ["Item esencial 1", "Item esencial 2"]
  },
  "total_estimated_cost": {
    "min": 200,
    "max": 400,
    "currency": "EUR",
    "breakdown": {
      "accommodation": "100-200€",
      "food": "50-100€",
      "transport": "30-50€",
      "activities": "20-50€"
    }
  }
}

⚠️ IMPORTANTE:
- NO incluyas "coordinates" ni "address" en el JSON (se obtendrán automáticamente)
- Incluye SIEMPRE el campo "city" en cada día
- Mínimo 5 lugares por día
- El JSON debe ser válido y parseable
- NO incluyas texto fuera del JSON, SOLO el JSON
- Las descripciones pueden ser EN ESPAÑOL
- Los nombres de lugares (place.name) deben ser EXACTOS como en Google Maps`;

const MAX_CITY_RADIUS_KM = 50;
const STREET_TYPES = new Set(['route', 'street_address', 'intersection', 'plus_code']);
const PLACES_CONCURRENCY = 8;

// ===== TIPOS =====
type CityGeo = {
  lng: number;
  lat: number;
  bbox?: [number, number, number, number];
  text?: string;
  placeName?: string;
  countryCode?: string;
};

// ===== CACHES =====
const cityCoordinatesCache: Map<string, CityGeo | null> = new Map();
const placeCache: Map<string, any> = new Map();

// ===== MAPEOS Y ALIAS =====
const CITY_ALIASES: Record<string, string> = {
  'londres': 'London, United Kingdom',
  'paris': 'Paris, France',
  'roma': 'Rome, Italy',
  'nueva york': 'New York City, USA',
  'pekin': 'Beijing, China',
  'moscu': 'Moscow, Russia',
  'viena': 'Vienna, Austria',
  'praga': 'Prague, Czech Republic',
  'atenas': 'Athens, Greece',
  'estocolmo': 'Stockholm, Sweden',
  'copenhague': 'Copenhagen, Denmark',
  'bruselas': 'Brussels, Belgium',
  'varsovia': 'Warsaw, Poland',
  'budapest': 'Budapest, Hungary',
  'cracovia': 'Krakow, Poland',
  'florencia': 'Florence, Italy',
  'venecia': 'Venice, Italy',
  'napoles': 'Naples, Italy',
  'colonia': 'Cologne, Germany',
  'ginebra': 'Geneva, Switzerland',
  'estambul': 'Istanbul, Turkey',
  'el cairo': 'Cairo, Egypt',
  'tokio': 'Tokyo, Japan',
  'seul': 'Seoul, South Korea',
  'singapur': 'Singapore',
};

const GOOGLE_TYPE_MAP: Record<string, string> = {
  'museo': 'museum',
  'monumento': 'tourist_attraction',
  'restaurante': 'restaurant',
  'parque': 'park',
  'iglesia': 'church',
};

// ===== FUNCIONES HELPER =====

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCityVariants(value: string): string[] {
  const normalized = normalizeText(value);
  const variants = new Set<string>();
  variants.add(normalized);
  const alias = CITY_ALIASES[normalized];
  if (alias) {
    variants.add(normalizeText(alias));
  }
  return Array.from(variants);
}

function resolveDayCity(dayCity: string | undefined, cities: string[]): string {
  if (!cities || cities.length === 0) return dayCity || '';
  if (!dayCity) return cities[0];

  const dayVariants = buildCityVariants(dayCity);
  for (let i = 0; i < cities.length; i++) {
    const cityVariants = buildCityVariants(cities[i]);
    const matches = dayVariants.some((d) =>
      cityVariants.some((c) => d === c || d.includes(c) || c.includes(d))
    );
    if (matches) return cities[i];
  }

  return cities[0];
}

function mapPlaceType(type?: string): string | undefined {
  if (!type) return undefined;
  const normalized = normalizeText(type);
  return GOOGLE_TYPE_MAP[normalized];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildRadiusBbox(
  lat: number,
  lng: number,
  radiusKm: number
): [number, number, number, number] {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

function extractCityComponentStrings(components: any[]): string[] {
  if (!Array.isArray(components)) return [];
  const cityTypes = new Set([
    'locality',
    'postal_town',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
    'sublocality_level_5',
    'neighborhood',
    'administrative_area_level_2',
    'administrative_area_level_3',
  ]);
  const values: string[] = [];
  for (const comp of components) {
    if (!comp || !Array.isArray(comp.types)) continue;
    if (comp.types.some((t: string) => cityTypes.has(t))) {
      if (comp.long_name) values.push(normalizeText(comp.long_name));
      if (comp.short_name) values.push(normalizeText(comp.short_name));
    }
  }
  return values;
}

function isWithinBbox(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number]
): boolean {
  if (!bbox) return true;
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function isStreetLike(types: any[]): boolean {
  return Array.isArray(types) && types.some((t) => STREET_TYPES.has(t));
}

function getTypeScore(types: any[]): number {
  if (!Array.isArray(types)) return 0;
  let score = 0;
  if (
    types.some((t) =>
      [
        'tourist_attraction',
        'museum',
        'park',
        'art_gallery',
        'place_of_worship',
        'church',
        'aquarium',
        'zoo',
        'amusement_park',
        'stadium',
        'natural_feature',
      ].includes(t)
    )
  ) {
    score += 2;
  }
  if (types.some((t) => ['point_of_interest', 'establishment'].includes(t))) {
    score += 1;
  }
  if (
    types.some((t) =>
      ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'food'].includes(t)
    )
  ) {
    score += 1;
  }
  return score;
}

function isFeatureInCity(feature: any, cityNames: string[]): boolean {
  const tokens = cityNames.map(normalizeText).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystacks: string[] = [];
  if (feature?.place_name) haystacks.push(normalizeText(feature.place_name));
  if (feature?.formatted_address) haystacks.push(normalizeText(feature.formatted_address));
  if (feature?.address_components)
    haystacks.push(...extractCityComponentStrings(feature.address_components));
  if (feature?.vicinity) haystacks.push(normalizeText(feature.vicinity));
  if (feature?.text) haystacks.push(normalizeText(feature.text));
  if (feature?.name) haystacks.push(normalizeText(feature.name));
  if (Array.isArray(feature?.context)) {
    for (const ctx of feature.context) {
      if (ctx?.text) haystacks.push(normalizeText(ctx.text));
    }
  }

  return tokens.some((token) => haystacks.some((hay) => hay.includes(token)));
}

function isNameMatch(query: string, feature: any): boolean {
  const q = normalizeText(query);
  const t = normalizeText(feature?.text || feature?.name || '');
  if (!q || !t) return false;
  return q === t || q.includes(t) || t.includes(q);
}

function getRelevanceScore(feature: any): number {
  if (typeof feature?.relevance === 'number') return feature.relevance;
  const rating = typeof feature?.rating === 'number' ? feature.rating : 0;
  const total =
    typeof feature?.user_ratings_total === 'number' ? feature.user_ratings_total : 0;
  return rating * Math.log10(total + 1);
}

function getAddressComponent(components: any[], type: string): string | undefined {
  if (!Array.isArray(components)) return undefined;
  const match = components.find(
    (c) => Array.isArray(c.types) && c.types.includes(type)
  );
  return match?.long_name;
}

function getCountryCode(components: any[]): string | undefined {
  if (!Array.isArray(components)) return undefined;
  const match = components.find(
    (c) => Array.isArray(c.types) && c.types.includes('country')
  );
  return match?.short_name?.toLowerCase();
}

// ===== GOOGLE PLACES FUNCTIONS =====

async function fetchTextSearchResults(
  query: string,
  cityGeo: CityGeo | null,
  placeType?: string
): Promise<any[]> {
  if (!GOOGLE_MAPS_KEY) return [];

  let url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}` +
    `&key=${GOOGLE_MAPS_KEY}` +
    `&language=es`;

  if (cityGeo?.lat != null && cityGeo?.lng != null) {
    url += `&location=${cityGeo.lat},${cityGeo.lng}`;
    url += `&radius=${MAX_CITY_RADIUS_KM * 1000}`;
  }
  if (cityGeo?.countryCode) {
    url += `&region=${cityGeo.countryCode}`;
  }

  const mappedType = mapPlaceType(placeType);
  if (mappedType) {
    url += `&type=${mappedType}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Google TextSearch HTTP ${response.status} → ${query}`);
    return [];
  }

  const data = await response.json();
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(
      `Google TextSearch status ${data.status} → ${query} ${data.error_message || ''}`.trim()
    );
    return [];
  }
  return Array.isArray(data.results) ? data.results : [];
}

/**
 * Obtiene las coordenadas del centro de una ciudad usando Google Geocoding
 */
async function getCityCoordinates(city: string): Promise<CityGeo | null> {
  const cacheKey = city.toLowerCase().trim();

  if (cityCoordinatesCache.has(cacheKey)) {
    return cityCoordinatesCache.get(cacheKey)!;
  }

  const searchCity = CITY_ALIASES[cacheKey] || city;

  try {
    if (!GOOGLE_MAPS_KEY) {
      console.error('GOOGLE_MAPS_KEY no configurado');
      cityCoordinatesCache.set(cacheKey, null);
      return null;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(searchCity)}` +
        `&key=${GOOGLE_MAPS_KEY}`
    );

    if (!response.ok) {
      console.error(`Google Geocoding HTTP ${response.status} geocoding city: ${city}`);
      cityCoordinatesCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`Ciudad no encontrada: ${city}`);
      cityCoordinatesCache.set(cacheKey, null);
      return null;
    }

    const bestResult =
      data.results.find(
        (r: any) => Array.isArray(r.types) && r.types.includes('locality')
      ) || data.results[0];

    const geometry = bestResult.geometry || {};
    const location = geometry.location || {};
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      console.log(`Ciudad sin coordenadas válidas: ${city}`);
      cityCoordinatesCache.set(cacheKey, null);
      return null;
    }

    const bounds = geometry.bounds || geometry.viewport;
    const bbox = bounds
      ? ([
          bounds.southwest.lng,
          bounds.southwest.lat,
          bounds.northeast.lng,
          bounds.northeast.lat,
        ] as [number, number, number, number])
      : buildRadiusBbox(location.lat, location.lng, MAX_CITY_RADIUS_KM);

    const coords: CityGeo = {
      lng: location.lng,
      lat: location.lat,
      bbox,
      text:
        getAddressComponent(bestResult.address_components, 'locality') ||
        getAddressComponent(bestResult.address_components, 'postal_town') ||
        getAddressComponent(bestResult.address_components, 'administrative_area_level_1') ||
        bestResult.formatted_address,
      placeName: bestResult.formatted_address,
      countryCode: getCountryCode(bestResult.address_components),
    };

    console.log(
      `📍 Ciudad geocodificada (Google): ${city} → ${coords.placeName} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
    );
    cityCoordinatesCache.set(cacheKey, coords);
    return coords;
  } catch (error) {
    console.error(`Error geocoding city: ${city}`, error);
    cityCoordinatesCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Busca un lugar en Google Places — optimizado: una sola llamada TextSearch
 * en lugar de FindPlace + TextSearch + Details (3 llamadas).
 */
async function enrichPlaceWithGoogle(
  placeName: string,
  city: string,
  placeType?: string
): Promise<any> {
  // Cache check
  const cacheKey = `${normalizeText(placeName)}:${normalizeText(city)}`;
  if (placeCache.has(cacheKey)) {
    return placeCache.get(cacheKey);
  }

  try {
    const cityGeo = await getCityCoordinates(city);
    const canonicalCity = cityGeo?.text || city;
    const query = `${placeName}, ${canonicalCity}`;

    if (!GOOGLE_MAPS_KEY) {
      console.error('GOOGLE_MAPS_KEY no configurado');
      return null;
    }

    // Una sola llamada TextSearch (devuelve suficientes campos sin necesidad de Details)
    const results = await fetchTextSearchResults(query, cityGeo, placeType);

    if (results.length === 0) {
      console.log(`No encontrado en Google Places: ${placeName}`);
      placeCache.set(cacheKey, null);
      return null;
    }

    const cityNames = [canonicalCity, city, cityGeo?.placeName].filter(
      Boolean
    ) as string[];

    // Filtrar y ordenar candidatos
    const candidates = results
      .slice(0, 10)
      .map((feature: any) => {
        const location = feature?.geometry?.location;
        if (
          !location ||
          typeof location.lat !== 'number' ||
          typeof location.lng !== 'number'
        ) {
          return null;
        }

        const types = Array.isArray(feature?.types) ? feature.types : [];
        if (isStreetLike(types)) return null;

        const distanceKm = cityGeo
          ? haversineKm(cityGeo.lat, cityGeo.lng, location.lat, location.lng)
          : null;

        if (distanceKm != null && distanceKm > MAX_CITY_RADIUS_KM) return null;

        return { feature, distanceKm };
      })
      .filter(Boolean) as { feature: any; distanceKm: number | null }[];

    // Preferir resultados dentro de la ciudad
    const inCity = candidates.filter((c) => isFeatureInCity(c.feature, cityNames));
    const pool = inCity.length > 0 ? inCity : candidates;

    if (pool.length === 0) {
      console.log(`No encontrado en Google Places (filtrado por ciudad): ${placeName}`);
      placeCache.set(cacheKey, null);
      return null;
    }

    // Ordenar por relevancia
    pool.sort((a, b) => {
      const aMatch = isNameMatch(placeName, a.feature);
      const bMatch = isNameMatch(placeName, b.feature);
      if (aMatch !== bMatch) return aMatch ? -1 : 1;

      const aType = getTypeScore(a.feature?.types);
      const bType = getTypeScore(b.feature?.types);
      if (bType !== aType) return bType - aType;

      const aRel = getRelevanceScore(a.feature);
      const bRel = getRelevanceScore(b.feature);
      if (bRel !== aRel) return bRel - aRel;

      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });

    const best = pool[0].feature;
    const loc = best.geometry?.location;

    const result = {
      address: best.formatted_address || best.name,
      coordinates: {
        lat: loc.lat,
        lng: loc.lng,
      },
      relevance: getRelevanceScore(best),
    };

    placeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error buscando en Google Places: ${placeName}`, error);
    placeCache.set(cacheKey, null);
    return null;
  }
}

// ===== GEMINI — Generación de itinerario =====

/**
 * Genera itinerario usando Gemini 2.0 Flash (reemplaza Groq/Llama)
 * - Respuesta JSON nativa (responseMimeType)
 * - Más rápido que Groq con Llama 3.3 70B
 */
async function generateItineraryWithGemini(
  cities: string[],
  interests: string[],
  days: number,
  budget?: string,
  about?: string
): Promise<any> {
  const userPrompt = `Estos son los datos del viaje en formato JSON:
{
  "cities": ${JSON.stringify(cities)},
  "interests": ${JSON.stringify(interests || [])},
  "days": ${days},
  "budget": ${budget || '"no especificado"'},
  "about": "${about || 'sin información adicional'}"
}

Por favor, genera un itinerario detallado. Recuerda:
- Incluir el campo "city" en cada día
- Usar nombres OFICIALES y COMPLETOS de lugares reales
- NO incluir direcciones ni coordenadas (se obtendrán automáticamente)`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 6000,
    },
  });

  const rawText = response.text ?? '{}';

  // Gemini con responseMimeType: 'application/json' debería devolver JSON limpio,
  // pero por seguridad limpiamos posibles fences
  const jsonText = rawText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(jsonText);
}

// ===== ENRIQUECIMIENTO PARALELO =====

/**
 * Enriquece itinerario con coordenadas de Google Places
 * OPTIMIZADO: ejecución paralela con concurrencia controlada
 */
async function enrichItineraryWithCoordinates(
  itinerary: any,
  cities: string[]
): Promise<any> {
  let enrichedCount = 0;
  let notFoundCount = 0;

  // Paso 1: Pre-cachear todas las ciudades en paralelo
  const uniqueCities = [
    ...new Set(
      itinerary.days.map((d: any) => resolveDayCity(d.city, cities))
    ),
  ];
  await Promise.all(uniqueCities.map((c) => getCityCoordinates(c as string)));

  // Paso 2: Construir lista de jobs (sin ejecutar todavía)
  const jobs: { place: any; cityName: string }[] = [];
  for (const day of itinerary.days) {
    const cityName = resolveDayCity(day.city, cities);
    day.city = cityName;
    for (const place of day.places) {
      jobs.push({ place, cityName });
    }
  }

  // Paso 3: Ejecutar con worker pool (concurrencia controlada)
  let jobIndex = 0;

  async function worker() {
    while (jobIndex < jobs.length) {
      const currentIndex = jobIndex++;
      const { place, cityName } = jobs[currentIndex];
      try {
        const data = await enrichPlaceWithGoogle(place.name, cityName, place.type);
        if (data) {
          place.address = data.address;
          place.coordinates = data.coordinates;
          enrichedCount++;
        } else {
          place.address = `${place.name}, ${cityName} (no encontrado en Google Places)`;
          place.coordinates = { lat: 0, lng: 0 };
          place.address_status = 'not_found';
          notFoundCount++;
        }
      } catch {
        place.address = `${place.name}, ${cityName} (error)`;
        place.coordinates = { lat: 0, lng: 0 };
        place.address_status = 'error';
        notFoundCount++;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(PLACES_CONCURRENCY, jobs.length) }, () => worker())
  );

  return { itinerary, enrichedCount, notFoundCount };
}

// ===== API ROUTES =====

// POST /api/itineraries - Crear itinerario
app.post('/api/itineraries', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cities, interests, days, budget, about, userId } = req.body;

    // Validar
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      res.status(400).json({ error: 'cities must be a non-empty array' });
      return;
    }
    if (!days || days < 1) {
      res.status(400).json({ error: 'days must be at least 1' });
      return;
    }
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      res.status(400).json({ error: 'interests must be a non-empty array' });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    console.log(
      `📝 Creating itinerary for user ${userId}: ${cities.join(', ')} (${days} days)`
    );

    // 1. Guardar en BD (rápido)
    const { data: itinerary, error: dbError } = await supabase
      .from('travel')
      .insert({
        userInfo: userId,
        cities,
        days,
        interests,
        budget: budget || null,
        about: about || null,
        groqStatus: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'Failed to create itinerary' });
      return;
    }

    console.log(`✅ Record created: ${itinerary.id}`);

    // 2. RESPUESTA INMEDIATA al usuario (<100ms)
    res.status(201).json({
      id: itinerary.id,
      status: 'pending',
      message: 'Generando tu itinerario...',
    });

    // 3. Procesar en BACKGROUND (sin await)
    (async () => {
      try {
        console.log(`🤖 Gemini processing started for ${itinerary.id}...`);

        // Actualizar estado a "processing"
        await supabase
          .from('travel')
          .update({ groqStatus: 'processing' })
          .eq('id', itinerary.id);

        // Generar itinerario con Gemini 2.0 Flash
        const generatedItinerary = await generateItineraryWithGemini(
          cities,
          interests,
          days,
          budget,
          about
        );

        console.log(`📊 Gemini response received for ${itinerary.id}`);

        // Enriquecer con coordenadas (PARALELO)
        const { itinerary: enrichedItinerary, enrichedCount, notFoundCount } =
          await enrichItineraryWithCoordinates(generatedItinerary, cities);

        console.log(
          `📍 Enriched with coordinates: ${enrichedCount} found, ${notFoundCount} not found`
        );

        // Guardar resultado
        const { error: updateError } = await supabase
          .from('travel')
          .update({
            itinerary: enrichedItinerary,
            groqStatus: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', itinerary.id);

        if (updateError) {
          throw updateError;
        }

        // Decrementar token si existe función RPC
        if (userId) {
          try {
            await supabase.rpc('decrement_token', { user_id: userId });
          } catch (tokenError) {
            console.error('Error decrementing token:', tokenError);
          }
        }

        console.log(`✅ Itinerary ${itinerary.id} completed and saved`);
      } catch (error: any) {
        console.error(`❌ Error processing ${itinerary.id}:`, error.message);

        try {
          await supabase
            .from('travel')
            .update({
              groqStatus: 'error',
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itinerary.id);
        } catch (saveError) {
          console.error('Failed to save error status:', saveError);
        }
      }
    })(); // Fire and forget
  } catch (error: any) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/itineraries/:id
app.get('/api/itineraries/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('travel')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ error: 'Itinerary not found' });
      return;
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/itineraries?userId=...
app.get('/api/itineraries', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query['userId'] as string;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }

    const { data, error } = await supabase
      .from('travel')
      .select('*')
      .eq('userInfo', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Robots + Sitemap
app.get('/robots.txt', (req: Request, res: Response): void => {
  const origin = getPublicOrigin(req);
  const lines = [
    'User-agent: *',
    'Allow: /',
    origin ? `Sitemap: ${origin}/sitemap.xml` : 'Sitemap: /sitemap.xml',
  ];
  res.type('text/plain').send(lines.join('\n'));
});

app.get('/sitemap.xml', (req: Request, res: Response): void => {
  const origin = getPublicOrigin(req) || 'https://flyealo.com';
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    {
      loc: `${origin}/`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '1.0',
    },
    ...SEO_PAGES.map((page) => ({
      loc: `${origin}/${page.path}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) =>
      [
        '  <url>',
        `    <loc>${url.loc}</loc>`,
        `    <lastmod>${url.lastmod}</lastmod>`,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        '  </url>',
      ].join('\n')
    ),
    '</urlset>',
  ].join('\n');

  res.type('application/xml').send(xml);
});

// ===== ANGULAR SSR - STATIC FILES =====
app.use(express.static(browserDistFolder, { maxAge: '1y' }));

// ===== ANGULAR SSR - RENDER =====
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }

  try {
    const response = await angularApp.handle(req);
    if (response) {
      writeResponseToNodeResponse(response, res);
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
});

// ===== ERROR HANDLING =====
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    console.error('Error:', err);
    res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
);

// ===== START SERVER =====
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  const server = app.listen(port, () => {
    console.log(`🚀 Backend SSR running on http://localhost:${port}`);
    console.log(`📡 API endpoint: http://localhost:${port}/api/itineraries`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
  });
}

export { app as reqHandler };
