const { onRequest } = require('firebase-functions/v2/https');

// Lazy-loaded modules
let OpenAI;
let openai;
let diputados;
let bills;
let embeddings;
let metadata;

// Transformers.js pipeline (cached)
let embeddingPipeline = null;

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function initializeData() {
  if (!diputados) {
    diputados = require('./parliamentdata/diputados.json');
    bills = require('./parliamentdata/bills.json');
    embeddings = require('./parliamentdata/embeddings.json');
    metadata = require('./parliamentdata/metadata.json');
  }
}

function getOpenAI() {
  if (!openai && OPENAI_API_KEY) {
    OpenAI = require('openai').OpenAI;
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get or initialize the embedding pipeline (lazy loading with caching)
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log('Initializing transformers.js pipeline...');
    const { pipeline } = await import('@xenova/transformers');
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for faster inference
    });
    console.log('Pipeline initialized successfully');
  }
  return embeddingPipeline;
}

/**
 * Generate embedding using transformers.js (local, same model as stored embeddings)
 */
async function getEmbedding(text) {
  try {
    const extractor = await getEmbeddingPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // Convert to regular array
    return Array.from(output.data);
  } catch (error) {
    console.error('Transformers.js embedding error:', error.message);
    // Fallback: deterministic pseudo-random embedding based on text hash
    console.log('Using fallback embedding');
    const hash = text.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    const embedding = [];
    let seed = Math.abs(hash);
    for (let i = 0; i < 384; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      embedding.push((seed / 233280) * 2 - 1);
    }
    return embedding;
  }
}

/**
 * Find similar bills by embedding similarity
 */
function findSimilarBills(queryEmbedding, topK = 10) {
  const similarities = embeddings.map(item => ({
    billId: item.billId,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK).map(s => {
    const bill = bills.find(b => b.id === s.billId);
    return {
      ...bill,
      similitud: s.similarity,
    };
  }).filter(b => b.id); // Filter out nulls
}

/**
 * Build context for a parlamentario for the digital twin
 */
function buildParlamentarioContext(parlamentario) {
  const stats = parlamentario.estadisticas_voto;
  const recentVotes = parlamentario.votaciones_recientes || [];

  return `
Parlamentario: ${parlamentario.nombre}
Partido: ${parlamentario.partido}
Profesion: ${parlamentario.profesion}

Estadisticas de votacion (total ${stats.total} votos):
- A favor: ${stats.a_favor} (${Math.round(stats.a_favor/stats.total*100)}%)
- En contra: ${stats.en_contra} (${Math.round(stats.en_contra/stats.total*100)}%)
- Abstencion: ${stats.abstencion} (${Math.round(stats.abstencion/stats.total*100)}%)

Votaciones recientes:
${recentVotes.slice(0, 10).map(v => `- ${v.titulo}: ${v.voto} (${v.fecha})`).join('\n')}
  `.trim();
}

// ============================================
// CLOUD FUNCTIONS
// ============================================

/**
 * Get Parlamentarios List (for frontend)
 */
exports.getParlamentarios = onRequest({ cors: true }, async (req, res) => {
  initializeData();

  // Support both GET and POST
  const search = req.query.search || req.body?.search || '';

  let results = diputados;

  // Filter by search term if provided
  if (search) {
    const searchLower = search.toLowerCase();
    results = diputados.filter(p =>
      p.nombre.toLowerCase().includes(searchLower) ||
      p.partido.toLowerCase().includes(searchLower),
    );
  }

  // Return simplified list for selector
  return res.json({
    parlamentarios: results.map(p => ({
      id: p.id,
      nombre: p.nombre,
      partido: p.partido,
      foto: p.foto,
    })),
    total: results.length,
  });
});

/**
 * Get Single Parlamentario Details
 */
exports.getParlamentario = onRequest({ cors: true }, async (req, res) => {
  initializeData();

  const id = parseInt(req.query.id || req.body?.id);

  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const parlamentario = diputados.find(p => p.id === id);

  if (!parlamentario) {
    return res.status(404).json({ error: 'Parlamentario not found' });
  }

  return res.json({ parlamentario });
});

/**
 * Digital Twin Query
 */
exports.digitalTwinQuery = onRequest({ cors: true }, async (req, res) => {
  initializeData();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { parlamentarioId, pregunta } = req.body;

    if (!parlamentarioId || !pregunta) {
      return res.status(400).json({ error: 'Missing parlamentarioId or pregunta' });
    }

    const parlamentario = diputados.find(p => p.id === parseInt(parlamentarioId));
    if (!parlamentario) {
      return res.status(404).json({ error: 'Parlamentario not found' });
    }

    // Find similar bills to the question
    const queryEmbedding = await getEmbedding(pregunta);
    const similarBills = findSimilarBills(queryEmbedding, 5);

    // Build context
    const context = buildParlamentarioContext(parlamentario);

    // Add relevant bills context
    const billsContext = similarBills.slice(0, 3).map(b =>
      `- ${b.titulo} (${b.estado})`,
    ).join('\n');

    let respuesta;

    try {
      const client = getOpenAI();
      if (client) {
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Eres el gemelo digital de ${parlamentario.nombre}, diputado/a del ${parlamentario.partido} en Chile.
Responde en primera persona, de manera conversacional pero informada.
Basa tus respuestas en tu historial de votaciones y posiciones politicas.
Se coherente con tu perfil partidario y tu historial de votaciones.`,
            },
            {
              role: 'user',
              content: `Mi perfil y contexto:\n${context}\n\nProyectos relacionados con la pregunta:\n${billsContext}\n\nPregunta del ciudadano: ${pregunta}`,
            },
          ],
          max_tokens: 600,
          temperature: 0.7,
        });
        respuesta = completion.choices[0].message.content;
      } else {
        throw new Error('OpenAI not configured');
      }
    } catch (err) {
      console.error('OpenAI error:', err.message);
      // Fallback response
      const stats = parlamentario.estadisticas_voto;
      const tendency = stats.a_favor > stats.en_contra ? 'favorable' : 'critica';
      respuesta = `Como ${parlamentario.nombre} del ${parlamentario.partido}, mi posicion sobre este tema refleja mi trayectoria legislativa. Con ${stats.total} votaciones en mi historial, he mantenido una postura ${tendency} hacia iniciativas de este tipo. Mi compromiso es representar los intereses de mis electores y los valores de mi partido.`;
    }

    return res.json({
      respuesta,
      referencias: similarBills.slice(0, 3).map(b => ({
        titulo: b.titulo,
        relevancia: Math.round(b.similitud * 100) / 100,
      })),
    });

  } catch (error) {
    console.error('Error in digitalTwinQuery:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Predict Vote
 */
exports.predictVote = onRequest({ cors: true }, async (req, res) => {
  initializeData();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { textoProyecto, parlamentarioIds } = req.body;

    if (!textoProyecto) {
      return res.status(400).json({ error: 'Missing textoProyecto' });
    }

    // Find similar bills
    const queryEmbedding = await getEmbedding(textoProyecto);
    const similarBills = findSimilarBills(queryEmbedding, 10);
    const similarBillIds = similarBills.map(b => b.id);

    // Filter parlamentarios if specific IDs provided
    let targetParlamentarios = diputados;
    if (parlamentarioIds && parlamentarioIds.length > 0) {
      targetParlamentarios = diputados.filter(p => parlamentarioIds.includes(p.id));
    } else {
      // Default to first 20 for demo
      targetParlamentarios = diputados.slice(0, 20);
    }

    const predicciones = [];

    for (const parlamentario of targetParlamentarios) {
      const recentVotes = parlamentario.votaciones_recientes || [];
      const stats = parlamentario.estadisticas_voto;

      // Check votes on similar bills
      const relevantVotes = recentVotes.filter(v => similarBillIds.includes(v.bill_id));

      let aFavor = 0, enContra = 0, abstencion = 0;

      if (relevantVotes.length > 0) {
        // Use relevant votes if available
        relevantVotes.forEach(v => {
          if (v.voto === 'a favor') aFavor++;
          else if (v.voto === 'en contra') enContra++;
          else abstencion++;
        });
      } else {
        // Fall back to overall statistics
        aFavor = stats.a_favor;
        enContra = stats.en_contra;
        abstencion = stats.abstencion;
      }

      const total = aFavor + enContra + abstencion || 1;

      // Calculate probabilities with some normalization
      let probAFavor = aFavor / total;
      let probEnContra = enContra / total;
      let probAbstencion = abstencion / total;

      // Add some randomness for demo variety
      const noise = 0.1;
      probAFavor = Math.max(0, Math.min(1, probAFavor + (Math.random() - 0.5) * noise));
      probEnContra = Math.max(0, Math.min(1, probEnContra + (Math.random() - 0.5) * noise));
      probAbstencion = Math.max(0, Math.min(1, probAbstencion + (Math.random() - 0.5) * noise));

      // Normalize
      const probTotal = probAFavor + probEnContra + probAbstencion;
      probAFavor /= probTotal;
      probEnContra /= probTotal;
      probAbstencion /= probTotal;

      predicciones.push({
        parlamentario: {
          id: parlamentario.id,
          nombre: parlamentario.nombre,
          partido: parlamentario.partido,
        },
        probabilidadAFavor: Math.round(probAFavor * 100) / 100,
        probabilidadEnContra: Math.round(probEnContra * 100) / 100,
        probabilidadAbstencion: Math.round(probAbstencion * 100) / 100,
        razonamiento: relevantVotes.length > 0
          ? `Basado en ${relevantVotes.length} votaciones similares`
          : `Basado en historial general (${stats.total} votos)`,
      });
    }

    // Sort by probability a favor
    predicciones.sort((a, b) => b.probabilidadAFavor - a.probabilidadAFavor);

    return res.json({
      predicciones,
      resumen: `Analisis basado en ${similarBills.length} proyectos similares encontrados. Las predicciones consideran el historial de votaciones de cada parlamentario.`,
      proyectosSimilares: similarBills.slice(0, 5).map(b => ({
        titulo: b.titulo,
        similitud: Math.round(b.similitud * 100) / 100,
      })),
    });

  } catch (error) {
    console.error('Error in predictVote:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Search Bills
 */
exports.searchBills = onRequest({ cors: true }, async (req, res) => {
  initializeData();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const queryEmbedding = await getEmbedding(query);
    const results = findSimilarBills(queryEmbedding, 15);

    return res.json({
      results: results.map(b => ({
        id: b.id,
        titulo: b.titulo,
        resumen: b.resumen,
        fecha: b.fecha,
        estado: b.estado,
        materias: b.materias || [],
        similitud: Math.round(b.similitud * 100) / 100,
      })),
      query,
      total: results.length,
    });

  } catch (error) {
    console.error('Error in searchBills:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health Check
 */
exports.healthCheck = onRequest({ cors: true }, (req, res) => {
  initializeData();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dataLoaded: {
      diputados: diputados.length,
      bills: bills.length,
      embeddings: embeddings.length,
    },
    config: {
      openai: !!OPENAI_API_KEY,
      embeddings: 'transformers.js (all-MiniLM-L6-v2)',
    },
  });
});
