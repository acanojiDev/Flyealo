import {
  AngularNodeAppEngine,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { environment } from './environments/environment.prod';

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

// ===== VARIABLES DE ENTORNO =====
const GROQ_API_KEY = environment.GROQ_KEY;
const SUPABASE_URL = environment.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = environment.SUPABASE_KEY;

// ===== INICIALIZAR SUPABASE =====
const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

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


// ===== FUNCIONES HELPER =====

// Cache para coordenadas de ciudades (evita llamadas repetidas)
const cityCoordinatesCache: Map<string, { lng: number; lat: number; country?: string } | null> = new Map();

/**
 * Mapeo de ciudades conocidas para evitar ambigüedades
 * (Londres → London, UK en lugar de Londres, Argentina)
 */
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

/**
 * Obtiene las coordenadas del centro de una ciudad usando Mapbox
 */
async function getCityCoordinates(city: string): Promise<{ lng: number; lat: number } | null> {
  const cacheKey = city.toLowerCase().trim();

  // Revisar cache primero
  if (cityCoordinatesCache.has(cacheKey)) {
    return cityCoordinatesCache.get(cacheKey)!;
  }

  // Usar alias si existe (evita ambigüedades como Londres → Argentina)
  const searchCity = CITY_ALIASES[cacheKey] || city;

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchCity)}.json` +
      `?access_token=${environment.MAP_KEY}` +
      `&types=place,locality,region` +
      `&limit=5` // Obtener varios para elegir el mejor
    );

    if (!response.ok) {
      console.error(`Mapbox HTTP ${response.status} geocoding city: ${city}`);
      cityCoordinatesCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.log(`⚠️ Ciudad no encontrada: ${city}`);
      cityCoordinatesCache.set(cacheKey, null);
      return null;
    }

    // Elegir el resultado con mayor relevancia (ciudades grandes tienen más relevancia)
    const bestResult = data.features.reduce((best: any, current: any) => {
      return (current.relevance > best.relevance) ? current : best;
    }, data.features[0]);

    const coords = {
      lng: bestResult.center[0],
      lat: bestResult.center[1]
    };

    console.log(`📍 Ciudad geocodificada: ${city} → ${bestResult.place_name} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    cityCoordinatesCache.set(cacheKey, coords);
    return coords;

  } catch (error) {
    console.error(`Error geocoding city: ${city}`, error);
    cityCoordinatesCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Busca un lugar en Mapbox con precisión mejorada usando proximity
 */
async function enrichPlaceWithMapbox(
  placeName: string,
  city: string
): Promise<any> {
  try {
    // Paso 1: Obtener coordenadas del centro de la ciudad
    const cityCoords = await getCityCoordinates(city);

    const query = `${placeName}, ${city}`;

    // Paso 2: Construir URL con parámetros de precisión
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${environment.MAP_KEY}` +
      `&limit=1` +
      `&language=es,en` +
      `&types=poi,address,place`; // Solo POIs y direcciones

    // Si tenemos coordenadas de la ciudad, añadir proximity
    if (cityCoords) {
      url += `&proximity=${cityCoords.lng},${cityCoords.lat}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Mapbox HTTP ${response.status} → ${placeName}`);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.log(`❌ No encontrado en Mapbox: ${placeName}`);
      return null;
    }

    const feature = data.features[0];

    return {
      address: feature.place_name,
      coordinates: {
        lat: feature.center[1],
        lng: feature.center[0],
      },
      relevance: feature.relevance,
    };

  } catch (error) {
    console.error(`Error buscando en Mapbox: ${placeName}`, error);
    return null;
  }
}

/**
 * Genera itinerario usando Groq API
 */
async function generateItineraryWithGroq(
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

  const groqResponse = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
      }),
    }
  );

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    throw new Error(`Error de Groq API ${groqResponse.status}: ${errorText}`);
  }

  const groqData = await groqResponse.json();

  const rawText = groqData.choices[0].message.content;
  const jsonText = rawText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(jsonText);
}

/**
 * Enriquece itinerario con coordenadas de Nominatim
 */
async function enrichItineraryWithCoordinates(itinerary: any, cities: string[]): Promise<any> {
  let enrichedCount = 0;
  let notFoundCount = 0;

  for (const day of itinerary.days) {
    const cityName = day.city || cities[0];

    for (const place of day.places) {
      const mapboxData = await enrichPlaceWithMapbox(
        place.name,
        cityName
      );

      if (mapboxData) {
        place.address = mapboxData.address;
        place.coordinates = mapboxData.coordinates;
        enrichedCount++;
      } else {
        place.address = `${place.name}, ${cityName} (no encontrado en Mapbox)`;
        place.coordinates = { lat: 0, lng: 0 };
        place.address_status = 'not_found';
        notFoundCount++;
      }
    }
  }

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

    console.log(`📝 Creating itinerary for user ${userId}: ${cities.join(', ')} (${days} days)`);

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
        created_at: new Date().toISOString()
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
      message: 'Generando tu itinerario...'
    });

    // 3. Procesar Groq en BACKGROUND (sin await)
    (async () => {
      try {
        console.log(`🤖 Groq processing started for ${itinerary.id}...`);

        // Actualizar estado a "processing"
        await supabase
          .from('travel')
          .update({ groqStatus: 'processing' })
          .eq('id', itinerary.id);

        // Generar itinerario con Groq
        const generatedItinerary = await generateItineraryWithGroq(
          cities,
          interests,
          days,
          budget,
          about
        );

        console.log(`📊 Groq response received for ${itinerary.id}`);

        // Enriquecer con coordenadas de Nominatim
        const { itinerary: enrichedItinerary, enrichedCount, notFoundCount } =
          await enrichItineraryWithCoordinates(generatedItinerary, cities);

        console.log(`📍 Enriched with coordinates: ${enrichedCount} found, ${notFoundCount} not found`);

        // Guardar resultado
        const { error: updateError } = await supabase
          .from('travel')
          .update({
            itinerary: enrichedItinerary,
            groqStatus: 'completed',
            updated_at: new Date().toISOString()
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
            // No es fatal, continuar
          }
        }

        console.log(`✅ Itinerary ${itinerary.id} completed and saved`);

      } catch (error: any) {
        console.error(`❌ Error processing ${itinerary.id}:`, error.message);

        // Guardar error en BD
        try {
          await supabase
            .from('travel')
            .update({
              groqStatus: 'error',
              error_message: error.message,
              updated_at: new Date().toISOString()
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

// ===== ANGULAR SSR - STATIC FILES =====

// Serve static files from /browser
app.use(express.static(browserDistFolder, { maxAge: '1y' }));

// ===== ANGULAR SSR - RENDER =====
// All other routes use Angular SSR
app.use(async (req, res, next) => {
  // Skip API and health routes - let them fall through
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

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
