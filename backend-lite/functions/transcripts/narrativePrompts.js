/**
 * Narrative Prompts - LLM only formats structured data into natural language
 * NO decision-making, NO filtering, NO analysis
 */

/**
 * Format position data into narrative
 */
function positionNarrativePrompt(structuredData) {
  return `Eres un asistente que convierte datos estructurados en texto natural.

DATOS ESTRUCTURADOS:
${JSON.stringify(structuredData, null, 2)}

TAREA:
Convierte estos datos en una respuesta natural y presentable.

REGLAS ESTRICTAS:
1. USA SOLO la información en los datos estructurados
2. NO inventes ni agregues información
3. Si position es "A FAVOR", explica por qué basándote en main_arguments
4. Si position es "EN CONTRA", explica por qué basándote en main_arguments
5. Incluye la key_quote si existe
6. Menciona en qué sesión habló

FORMATO DE RESPUESTA (JSON):
{
  "deputy": "nombre del diputado",
  "topic": "tema",
  "position": "A FAVOR" | "EN CONTRA" | "MIXTO" | "NEUTRO",
  "conviction_level": "débil" | "moderado" | "fuerte",
  "main_arguments": ["arg1", "arg2", "arg3"],
  "key_quote": "cita textual del diputado",
  "session": "número de sesión",
  "nuance": "matices o condiciones que expresa (si aplica)"
}`;
}

/**
 * Format quote data into narrative
 */
function quoteNarrativePrompt(structuredData) {
  return `Eres un asistente que convierte datos estructurados en texto natural.

DATOS ESTRUCTURADOS:
${JSON.stringify(structuredData, null, 2)}

TAREA:
Convierte estos datos en una respuesta natural presentando las citas encontradas.

REGLAS ESTRICTAS:
1. USA SOLO las citas en los datos estructurados
2. NO modifiques el texto de las citas
3. Presenta cada cita con su contexto (sesión)
4. Si hay múltiples citas, ordénalas por relevancia (las más largas primero)

FORMATO DE RESPUESTA (JSON):
{
  "found": true,
  "quotes": [
    {
      "text": "cita textual exacta",
      "session": "número de sesión",
      "context": "breve contexto de 1 frase",
      "relevance": "por qué es relevante en 1 frase"
    }
  ],
  "summary": "resumen de la posición general del diputado basado en las citas"
}`;
}

/**
 * Format briefing data into narrative
 */
function briefingNarrativePrompt(structuredData) {
  return `Eres un asistente que convierte datos estructurados en texto natural.

DATOS ESTRUCTURADOS:
${JSON.stringify(structuredData, null, 2)}

TAREA:
Genera un Smart Briefing de la sesión basándote SOLO en los datos proporcionados.

REGLAS ESTRICTAS:
1. USA SOLO la información en all_interventions
2. Identifica el tema principal leyendo las intervenciones
3. Agrupa diputados por posición (a favor / en contra) según sus intervenciones
4. Resume argumentos principales de cada lado
5. Menciona diputados clave (top_speakers)

FORMATO DE RESPUESTA (JSON):
{
  "session": "número",
  "date": "si se menciona en transcripciones",
  "main_topic": "tema principal identificado",
  "project_id": "boletín si se menciona",
  "key_deputies": ["lista de 3-5 diputados más activos"],
  "positions": {
    "a_favor": [
      {"deputy": "nombre", "main_argument": "argumento principal"}
    ],
    "en_contra": [
      {"deputy": "nombre", "main_argument": "argumento principal"}
    ]
  },
  "key_moments": ["momento 1", "momento 2"],
  "outcome": "resultado si hubo votación",
  "executive_summary": "resumen de 2-3 oraciones"
}`;
}

/**
 * Format comparison data into narrative
 */
function comparisonNarrativePrompt(structuredData) {
  return `Eres un asistente que convierte datos estructurados en texto natural.

DATOS ESTRUCTURADOS:
${JSON.stringify(structuredData, null, 2)}

TAREA:
Presenta los argumentos A FAVOR vs EN CONTRA basándote en las posiciones detectadas.

REGLAS ESTRICTAS:
1. USA SOLO la información en positions y all_chunks
2. Agrupa argumentos por categoría (económico, social, ambiental, etc)
3. Presenta ambos lados de forma equilibrada
4. Incluye citas representativas de cada posición

FORMATO DE RESPUESTA (JSON):
{
  "topic": "tema",
  "a_favor": {
    "deputies": ["nombres"],
    "arguments": [
      {
        "category": "económico/social/ambiental",
        "argument": "descripción",
        "quote": "cita textual",
        "deputy": "quien lo dijo"
      }
    ]
  },
  "en_contra": {
    "deputies": ["nombres"],
    "arguments": [
      {
        "category": "económico/social/ambiental",
        "argument": "descripción",
        "quote": "cita textual",
        "deputy": "quien lo dijo"
      }
    ]
  },
  "synthesis": "síntesis del debate"
}`;
}

module.exports = {
  positionNarrativePrompt,
  quoteNarrativePrompt,
  briefingNarrativePrompt,
  comparisonNarrativePrompt,
};
