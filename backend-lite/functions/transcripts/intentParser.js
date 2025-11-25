/**
 * Intent Parser - Extracts structured information from natural language queries
 * Returns deterministic search parameters
 */

// Common deputy name variations for normalization
const DEPUTY_ALIASES = {
  'félix gonzález': 'Félix González Gatica',
  'felix gonzalez': 'Félix González Gatica',
  'gonzález': 'Félix González Gatica',
  'agustín romero': 'Agustín Romero Leiva',
  'agustin romero': 'Agustín Romero Leiva',
  'romero': 'Agustín Romero Leiva',
  'carolina tello': 'Carolina Tello Rojas',
  'tello': 'Carolina Tello Rojas',
  'matías ramírez': 'Matías Ramírez Pascal',
  'matias ramirez': 'Matías Ramírez Pascal',
  'ramírez': 'Matías Ramírez Pascal',
  'luis sánchez': 'Luis Sánchez Ossa',
  'luis sanchez': 'Luis Sánchez Ossa',
  'sánchez': 'Luis Sánchez Ossa',
  'jorge alessandri': 'Jorge Alessandri Vergara',
  'alessandri': 'Jorge Alessandri Vergara',
  'danisa astudillo': 'Danisa Astudillo Peiretti',
  'astudillo': 'Danisa Astudillo Peiretti',
  'marisela santibáñez': 'Marisela Santibáñez Novoa',
  'santibáñez': 'Marisela Santibáñez Novoa',
  'camila rojas': 'Camila Rojas Valderrama',
  'cristián araya': 'Cristián Araya Lerdo de Tejada',
  'cristian araya': 'Cristián Araya Lerdo de Tejada',
  'araya': 'Cristián Araya Lerdo de Tejada',
};

// Topic keywords mapping
const TOPIC_KEYWORDS = {
  'rompientes': ['rompiente', 'rompientes', 'ola', 'olas', 'surf', 'cerf'],
  'burocracia': ['burocracia', 'burocr', 'traba', 'trabas', 'permiso', 'permisos'],
  'desarrollo': ['desarrollo', 'inversión', 'inversion', 'proyecto', 'obra'],
  'medio ambiente': ['medio ambiente', 'ambiental', 'protección', 'proteccion', 'ecosistema'],
  'economía': ['economía', 'economia', 'económico', 'economico', 'turismo'],
  'deporte': ['deporte', 'deportivo', 'deportista', 'surf', 'cerf'],
};

/**
 * Normalize deputy name
 */
function normalizeDeputyName(rawName) {
  const normalized = rawName.toLowerCase().trim();

  // Check direct aliases
  if (DEPUTY_ALIASES[normalized]) {
    return DEPUTY_ALIASES[normalized];
  }

  // Check partial matches
  for (const [alias, fullName] of Object.entries(DEPUTY_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return fullName;
    }
  }

  // Return capitalized version if no match
  return rawName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract keywords from topic
 */
function extractKeywords(topic) {
  const topicLower = topic.toLowerCase();
  const keywords = [];

  // Check known topic mappings
  for (const [topicName, topicKeywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (topicLower.includes(topicName)) {
      keywords.push(...topicKeywords);
    }
  }

  // Add topic words themselves
  const words = topic.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !['sobre', 'para', 'como', 'esta', 'esto'].includes(w));

  keywords.push(...words);

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Parse intent from natural language query
 */
function parseIntent(query) {
  const lowerQuery = query.toLowerCase();

  // Pattern 1: Smart Briefing - "resume sesión X" or "briefing sesión X"
  const sessionMatch = lowerQuery.match(/(?:resume?|resumen|briefing|sumari[oz])\s+(?:de\s+)?(?:la\s+)?sesi[oó]n\s*(\d+)/);
  if (sessionMatch) {
    return {
      type: 'briefing',
      session: sessionMatch[1],
      filters: {
        session: sessionMatch[1],
      },
    };
  }

  // Pattern 2: Position - "posición de X sobre Y" or "qué piensa X sobre Y"
  const positionMatch = lowerQuery.match(/(?:cu[áa]l es (?:la )?posici[óo]n|posici[óo]n|qu[ée] piensa|piensa|opina|postura|qu[ée] opina)\s+(?:de\s+)?([^sobre]+?)\s+sobre\s+(.+)/i);
  if (positionMatch) {
    const deputyRaw = positionMatch[1].trim();
    const topic = positionMatch[2].trim();
    const deputy = normalizeDeputyName(deputyRaw);
    const keywords = extractKeywords(topic);

    return {
      type: 'position',
      deputy,
      topic,
      filters: {
        speaker: deputy,
        keywords,
        speakerPartial: deputyRaw, // Keep original for fuzzy match
      },
    };
  }

  // Pattern 3: Quote Finder - "citas de X sobre Y" or "qué dijo X sobre Y"
  const quoteMatch = lowerQuery.match(/(?:citas?|dijo|mencion[óo]|habl[óo])\s+(?:de\s+)?([^sobre]+?)\s+sobre\s+(.+)/i);
  if (quoteMatch) {
    const deputyRaw = quoteMatch[1].trim();
    const topic = quoteMatch[2].trim();
    const deputy = normalizeDeputyName(deputyRaw);
    const keywords = extractKeywords(topic);

    return {
      type: 'quote',
      deputy,
      topic,
      filters: {
        speaker: deputy,
        keywords,
        speakerPartial: deputyRaw,
      },
    };
  }

  // Pattern 4: Comparison - "compara" or "a favor vs en contra"
  const comparisonMatch = lowerQuery.match(/(?:compar[ae]|versus|vs|a\s+favor.*en\s+contra)\s+(?:argumentos?\s+)?(?:sobre\s+)?(.+)/i);
  if (comparisonMatch) {
    const topic = comparisonMatch[1].trim();
    const keywords = extractKeywords(topic);

    return {
      type: 'comparison',
      topic,
      filters: {
        keywords,
      },
    };
  }

  // Pattern 5: Specific session search - "sesión 67" or "en la sesión 70"
  const sessionSearchMatch = lowerQuery.match(/(?:en\s+)?(?:la\s+)?sesi[óo]n\s*(\d+)/);
  if (sessionSearchMatch) {
    return {
      type: 'session_search',
      session: sessionSearchMatch[1],
      filters: {
        session: sessionSearchMatch[1],
      },
    };
  }

  // Default: keyword search
  const keywords = query.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !['sobre', 'para', 'como', 'esta', 'esto', 'cual', 'cuál'].includes(w));

  return {
    type: 'search',
    keywords,
    filters: {
      keywords,
    },
  };
}

module.exports = {
  parseIntent,
  normalizeDeputyName,
  extractKeywords,
};
