/**
 * Deterministic Search - Filter-based search without embeddings
 * Returns exact, reproducible results
 */

/**
 * Check if text contains any of the keywords
 */
function containsKeywords(text, keywords) {
  if (!keywords || keywords.length === 0) return true;

  const textLower = text.toLowerCase();
  return keywords.some(keyword => textLower.includes(keyword.toLowerCase()));
}

/**
 * Fuzzy match for speaker names
 */
function matchesSpeaker(chunkSpeaker, targetSpeaker, partialMatch = null) {
  const chunkLower = chunkSpeaker.toLowerCase();
  const targetLower = targetSpeaker.toLowerCase();

  // Exact match
  if (chunkLower === targetLower) return true;

  // Contains match
  if (chunkLower.includes(targetLower) || targetLower.includes(chunkLower)) return true;

  // Partial match if provided
  if (partialMatch) {
    const partialLower = partialMatch.toLowerCase();
    if (chunkLower.includes(partialLower)) return true;
  }

  // Last name match
  const chunkLastName = chunkSpeaker.split(' ').pop().toLowerCase();
  const targetLastName = targetSpeaker.split(' ').pop().toLowerCase();
  if (chunkLastName === targetLastName) return true;

  return false;
}

/**
 * Search chunks by filters
 */
function searchChunks(chunks, filters) {
  let results = [...chunks];

  // Filter by session
  if (filters.session) {
    results = results.filter(chunk => chunk.session === filters.session.toString());
  }

  // Filter by speaker
  if (filters.speaker) {
    results = results.filter(chunk =>
      matchesSpeaker(chunk.speaker, filters.speaker, filters.speakerPartial),
    );
  }

  // Filter by keywords
  if (filters.keywords && filters.keywords.length > 0) {
    results = results.filter(chunk =>
      containsKeywords(chunk.text, filters.keywords),
    );
  }

  // Sort by session and index (chronological order)
  results.sort((a, b) => {
    if (a.session !== b.session) {
      return parseInt(a.session) - parseInt(b.session);
    }
    return a.index - b.index;
  });

  return results;
}

/**
 * Get all chunks from a specific session
 */
function getSessionChunks(chunks, sessionNumber) {
  return chunks
    .filter(c => c.session === sessionNumber.toString())
    .sort((a, b) => a.index - b.index);
}

/**
 * Group chunks by speaker
 */
function groupBySpeaker(chunks) {
  const grouped = {};

  for (const chunk of chunks) {
    if (!grouped[chunk.speaker]) {
      grouped[chunk.speaker] = [];
    }
    grouped[chunk.speaker].push(chunk);
  }

  return grouped;
}

/**
 * Analyze position based on keyword sentiment
 */
function analyzePosition(chunks, topic) {
  // Simple heuristic based on positive/negative keywords
  const positiveKeywords = ['favor', 'apoyo', 'importante', 'beneficio', 'proteger', 'cuidar', 'valorar'];
  const negativeKeywords = ['contra', 'problema', 'traba', 'burocracia', 'impedir', 'frenar', 'paralizar'];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const chunk of chunks) {
    const text = chunk.text.toLowerCase();
    positiveCount += positiveKeywords.filter(kw => text.includes(kw)).length;
    negativeCount += negativeKeywords.filter(kw => text.includes(kw)).length;
  }

  if (positiveCount > negativeCount * 1.5) return 'A FAVOR';
  if (negativeCount > positiveCount * 1.5) return 'EN CONTRA';
  if (positiveCount > 0 || negativeCount > 0) return 'MIXTO';
  return 'NEUTRO';
}

/**
 * Extract main arguments from chunks
 */
function extractArguments(chunks, maxArguments = 3) {
  // Group by paragraph/idea (chunks that are close together)
  const mainArgs = [];

  for (const chunk of chunks) {
    // Split by sentence markers
    const sentences = chunk.text.split(/[.!?]\s+/).filter(s => s.length > 50);

    for (const sentence of sentences) {
      if (mainArgs.length < maxArguments) {
        mainArgs.push({
          text: sentence.trim(),
          session: chunk.session,
          speaker: chunk.speaker,
        });
      }
    }
  }

  return mainArgs.slice(0, maxArguments);
}

/**
 * Find best quote (longest meaningful intervention)
 */
function findBestQuote(chunks) {
  if (chunks.length === 0) return null;

  // Sort by text length (longer = more substantive)
  const sorted = [...chunks].sort((a, b) => b.text.length - a.text.length);

  // Return the longest one that's not too long
  for (const chunk of sorted) {
    if (chunk.text.length > 100 && chunk.text.length < 1000) {
      return {
        text: chunk.text,
        session: chunk.session,
        speaker: chunk.speaker,
      };
    }
  }

  return {
    text: sorted[0].text,
    session: sorted[0].session,
    speaker: sorted[0].speaker,
  };
}

/**
 * Build structured data for position analysis
 */
function buildPositionData(intent, chunks) {
  if (chunks.length === 0) {
    return {
      found: false,
      deputy: intent.deputy,
      topic: intent.topic,
      message: `No se encontraron intervenciones de ${intent.deputy} sobre "${intent.topic}"`,
    };
  }

  const position = analyzePosition(chunks, intent.topic);
  const mainArgs = extractArguments(chunks);
  const bestQuote = findBestQuote(chunks);

  return {
    found: true,
    deputy: chunks[0].speaker, // Use actual name from data
    topic: intent.topic,
    position,
    session: chunks[0].session,
    interventions_count: chunks.length,
    main_arguments: mainArgs,
    key_quote: bestQuote,
    all_interventions: chunks.map(c => ({
      session: c.session,
      text: c.text,
      index: c.index,
    })),
  };
}

/**
 * Build structured data for quote finding
 */
function buildQuoteData(intent, chunks) {
  if (chunks.length === 0) {
    return {
      found: false,
      deputy: intent.deputy,
      topic: intent.topic,
      message: `No se encontraron citas de ${intent.deputy} sobre "${intent.topic}"`,
    };
  }

  const quotes = chunks.map(chunk => ({
    text: chunk.text,
    session: chunk.session,
    speaker: chunk.speaker,
    char_count: chunk.text.length,
  }));

  return {
    found: true,
    deputy: chunks[0].speaker,
    topic: intent.topic,
    quotes,
    total_interventions: chunks.length,
  };
}

/**
 * Build structured data for session briefing
 */
function buildBriefingData(intent, chunks) {
  if (chunks.length === 0) {
    return {
      found: false,
      session: intent.session,
      message: `No se encontró la Sesión ${intent.session}. Sesiones disponibles: 67, 70, 72, 73`,
    };
  }

  const speakerGroups = groupBySpeaker(chunks);
  const speakers = Object.keys(speakerGroups);

  // Find most active speakers
  const speakerStats = speakers.map(speaker => ({
    name: speaker,
    interventions: speakerGroups[speaker].length,
    total_chars: speakerGroups[speaker].reduce((sum, c) => sum + c.text.length, 0),
  })).sort((a, b) => b.interventions - a.interventions);

  return {
    found: true,
    session: intent.session,
    total_interventions: chunks.length,
    unique_speakers: speakers.length,
    top_speakers: speakerStats.slice(0, 5),
    all_interventions: chunks.map(c => ({
      speaker: c.speaker,
      text: c.text.substring(0, 500), // Truncate for briefing
      index: c.index,
    })),
  };
}

/**
 * Build structured data for comparison
 */
function buildComparisonData(intent, chunks) {
  if (chunks.length === 0) {
    return {
      found: false,
      topic: intent.topic,
      message: `No se encontraron argumentos sobre "${intent.topic}"`,
    };
  }

  const speakerGroups = groupBySpeaker(chunks);
  const positions = {};

  // Analyze each speaker's position
  for (const [speaker, speakerChunks] of Object.entries(speakerGroups)) {
    const position = analyzePosition(speakerChunks, intent.topic);
    if (!positions[position]) {
      positions[position] = [];
    }
    positions[position].push({
      speaker,
      interventions: speakerChunks,
      sample_quote: speakerChunks[0].text.substring(0, 200),
    });
  }

  return {
    found: true,
    topic: intent.topic,
    total_interventions: chunks.length,
    positions,
    all_chunks: chunks,
  };
}

module.exports = {
  searchChunks,
  getSessionChunks,
  groupBySpeaker,
  analyzePosition,
  extractArguments,
  findBestQuote,
  buildPositionData,
  buildQuoteData,
  buildBriefingData,
  buildComparisonData,
};
