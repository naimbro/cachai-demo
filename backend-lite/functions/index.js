/**
 * Backend Lite - Only Commission Transcripts Analysis
 * Deterministic approach without embeddings
 */

const { onRequest } = require('firebase-functions/v2/https');
const OpenAI = require('openai');

// Import transcript analysis modules
const intentParser = require('./transcripts/intentParser');
const deterministicSearch = require('./transcripts/deterministicSearch');
const narrativePrompts = require('./transcripts/narrativePrompts');

// Lazy load transcript data (light version without embeddings)
let transcriptsData = null;
function getTranscriptsData() {
  if (!transcriptsData) {
    transcriptsData = require('./data/commission_transcripts_light.json');
  }
  return transcriptsData;
}

function getChunks() {
  const data = getTranscriptsData();
  return data.chunks || [];
}

// Lazy initialization of OpenAI client
let client = null;
function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

/**
 * Analyze Commission Transcripts - Deterministic Approach
 *
 * Query examples:
 * - "posición de Félix González sobre rompientes"
 * - "qué dijo Romero sobre medio ambiente"
 * - "resume sesión 67"
 * - "compara argumentos sobre protección ambiental"
 */
exports.analyzeCommissionTranscripts = onRequest({
  cors: true,
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
        example: 'posición de Félix González sobre rompientes',
      });
    }

    console.log('📝 Query received:', query);

    // Load transcript data
    const chunks = getChunks();

    // STEP 1: Parse intent (deterministic)
    const intent = intentParser.parseIntent(query);
    console.log('🎯 Intent parsed:', intent.type);

    // STEP 2: Deterministic search (filter-based, no embeddings)
    const searchResults = deterministicSearch.searchChunks(chunks, intent.filters);
    console.log(`🔍 Found ${searchResults.length} chunks`);

    // STEP 3: Build structured data (no LLM involved yet)
    let structuredData;
    switch (intent.type) {
      case 'position': {
        structuredData = deterministicSearch.buildPositionData(intent, searchResults);
        break;
      }
      case 'quote': {
        structuredData = deterministicSearch.buildQuoteData(intent, searchResults);
        break;
      }
      case 'briefing': {
        const sessionChunks = deterministicSearch.getSessionChunks(chunks, intent.session);
        structuredData = deterministicSearch.buildBriefingData(intent, sessionChunks);
        break;
      }
      case 'comparison': {
        structuredData = deterministicSearch.buildComparisonData(intent, searchResults);
        break;
      }
      case 'session_search': {
        const sessionChunks = deterministicSearch.getSessionChunks(chunks, intent.session);
        structuredData = {
          found: sessionChunks.length > 0,
          session: intent.session,
          chunks: sessionChunks,
          total: sessionChunks.length,
        };
        break;
      }
      default: {
        structuredData = {
          found: searchResults.length > 0,
          results: searchResults,
          total: searchResults.length,
        };
      }
    }

    // STEP 4: LLM formats narrative (optional, only for presentation)
    let narrative = null;
    if (structuredData.found && intent.type !== 'session_search' && intent.type !== 'search') {
      let narrativePrompt;
      switch (intent.type) {
        case 'position':
          narrativePrompt = narrativePrompts.positionNarrativePrompt(structuredData);
          break;
        case 'quote':
          narrativePrompt = narrativePrompts.quoteNarrativePrompt(structuredData);
          break;
        case 'briefing':
          narrativePrompt = narrativePrompts.briefingNarrativePrompt(structuredData);
          break;
        case 'comparison':
          narrativePrompt = narrativePrompts.comparisonNarrativePrompt(structuredData);
          break;
        default:
          narrativePrompt = null;
      }

      if (narrativePrompt) {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: narrativePrompt }],
          temperature: 0.2, // Low temperature for consistent formatting
          response_format: { type: 'json_object' },
        });

        const rawResponse = completion.choices[0].message.content;
        console.log('✨ Narrative generated');

        try {
          narrative = JSON.parse(rawResponse);
        } catch (parseError) {
          console.warn('Failed to parse LLM response as JSON, returning raw text');
          narrative = { text: rawResponse };
        }
      }
    }

    // Return comprehensive response
    return res.json({
      success: true,
      query,
      intent: {
        type: intent.type,
        deputy: intent.deputy,
        topic: intent.topic,
        session: intent.session,
      },
      structured_data: structuredData,
      narrative,
      metadata: {
        method: 'deterministic_filter',
        llm_used: !!narrative,
        total_chunks_searched: chunks.length,
        results_found: searchResults.length,
        available_sessions: [67, 70, 72, 73],
      },
    });
  } catch (error) {
    console.error('❌ Error in analyzeCommissionTranscripts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
exports.healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend-lite',
    timestamp: new Date().toISOString(),
    available_endpoints: [
      '/analyzeCommissionTranscripts',
      '/healthCheck',
    ],
  });
});
