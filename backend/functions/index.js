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

function initializeData() {
  if (!diputados) {
    diputados = require('./parliamentdata/diputados.json');
    bills = require('./parliamentdata/bills.json');
    embeddings = require('./parliamentdata/embeddings.json');
    metadata = require('./parliamentdata/metadata.json');
  }
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!openai && apiKey) {
    OpenAI = require('openai').OpenAI;
    openai = new OpenAI({ apiKey });
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
 * Digital Twin Query - with conversation history, voting info, and topic redirection
 */
exports.digitalTwinQuery = onRequest({
  cors: true,
  secrets: ['OPENAI_API_KEY'],
  memory: '1GiB',
  timeoutSeconds: 120,
}, async (req, res) => {
  initializeData();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { parlamentarioId, pregunta, conversationHistory = [] } = req.body;

    if (!parlamentarioId || !pregunta) {
      return res.status(400).json({ error: 'Missing parlamentarioId or pregunta' });
    }

    const parlamentario = diputados.find(p => p.id === parseInt(parlamentarioId));
    if (!parlamentario) {
      return res.status(404).json({ error: 'Parlamentario not found' });
    }

    // Get parlamentario's voting history
    const recentVotes = parlamentario.votaciones_recientes || [];

    // Find similar bills to the question
    const queryEmbedding = await getEmbedding(pregunta);
    const similarBills = findSimilarBills(queryEmbedding, 5);

    // Check similarity threshold - if no relevant bills found
    const hasRelevantBills = similarBills.length > 0 && similarBills[0].similitud > 0.3;

    // Look up parlamentario's votes on similar bills
    const billsWithVotes = similarBills.slice(0, 3).map(bill => {
      const vote = recentVotes.find(v => v.bill_id === bill.id);
      return {
        id: bill.id,
        titulo: bill.titulo,
        estado: bill.estado,
        fecha: bill.fecha,
        relevancia: Math.round(bill.similitud * 100) / 100,
        voto: vote ? vote.voto : null,
        fechaVoto: vote ? vote.fecha : null,
      };
    });

    // Check if parlamentario voted on any similar bill
    const hasVotedOnSimilar = billsWithVotes.some(b => b.voto !== null);

    // Get sample of bills where parlamentario DID vote (for topic suggestions)
    const votedBillsSample = recentVotes
      .filter(v => v.voto && v.voto !== 'no vota')
      .slice(0, 6)
      .map(v => ({
        titulo: v.titulo,
        voto: v.voto,
        fecha: v.fecha,
      }));

    // Build context
    const context = buildParlamentarioContext(parlamentario);

    // Build bills context for the prompt
    const billsContext = hasRelevantBills
      ? billsWithVotes.map(b => {
        const voteInfo = b.voto ? ` - MI VOTO: ${b.voto}` : ' - (en tramitacion, no he votado)';
        return `- ${b.titulo} (${b.estado})${voteInfo}`;
      }).join('\n')
      : 'No se encontraron proyectos de ley directamente relacionados con esta consulta.';

    // Build voted topics context
    const votedTopicsContext = votedBillsSample.map(v =>
      `- ${v.titulo} (vote ${v.voto})`,
    ).join('\n');

    let respuesta;

    try {
      const client = getOpenAI();
      if (client) {
        // Build system prompt with conversation rules
        const systemPrompt = `Eres el gemelo digital de ${parlamentario.nombre}, diputado/a del ${parlamentario.partido} en Chile.
Responde en primera persona, de manera conversacional pero informada.
IMPORTANTE: Se BREVE y CONCISO. Responde en 2-3 oraciones maximo, a menos que el usuario pida mas detalles.

Tu perfil y contexto:
${context}

REGLAS DE CONVERSACION (MUY IMPORTANTES):

1. SI hay proyectos relevantes donde YO VOTE (marcados con "MI VOTO"):
   → Responde con tu posicion basada en como votaste, explicando tus razones.

2. SI hay proyectos relevantes pero NO vote en ninguno (marcados como "en tramitacion"):
   → Menciona que esos proyectos estan en tramitacion y aun no has formado una posicion oficial.
   → Sugiere hablar sobre temas donde SI has votado.
   → Pregunta al usuario si le interesa alguno de esos temas.

3. SI no hay proyectos relevantes (saludos, preguntas generales):
   → Responde de manera natural y amable.
   → Presentate brevemente si es el inicio de la conversacion.
   → Menciona algunos temas en los que has votado para guiar la conversacion.

4. SI el usuario insiste en un tema donde no has votado:
   → Mantén: "Aun no tengo una posicion oficial formada sobre esto."
   → Puedes dar una opinion muy general basada en los valores de tu partido, pero deja claro que es especulativo.

PROYECTOS EN LOS QUE HE VOTADO (usa estos para sugerir temas):
${votedTopicsContext}`;

        // Build messages array with conversation history
        const messages = [{ role: 'system', content: systemPrompt }];

        // Add conversation history (limit to last 10 exchanges)
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }

        // Add current question with context
        const userMessage = hasRelevantBills
          ? `Proyectos de ley relacionados con mi pregunta:\n${billsContext}\n\nMi pregunta: ${pregunta}`
          : `Mi pregunta: ${pregunta}\n\n(Nota: No se encontraron proyectos de ley directamente relacionados con esta consulta)`;

        messages.push({ role: 'user', content: userMessage });

        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 300,
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
      respuesta = `Como ${parlamentario.nombre} del ${parlamentario.partido}, mi posicion sobre este tema refleja mi trayectoria legislativa. Con ${stats.total} votaciones en mi historial, he mantenido una postura ${tendency} hacia iniciativas de este tipo.`;
    }

    return res.json({
      respuesta,
      referencias: hasRelevantBills ? billsWithVotes : [],
      temasVotados: votedBillsSample.slice(0, 3),
      hasVotedOnSimilar,
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
      openai: 'configured via secret',
      embeddings: 'transformers.js (all-MiniLM-L6-v2)',
      neo4j: 'configured via secrets',
    },
  });
});

// ============================================
// NETWORK EXPLORER FUNCTIONS - DISABLED
// ============================================
// NOTE: Network functions temporarily removed due to deployment timeout
// The neo4j-driver package causes Firebase Functions deployment to timeout
// during code analysis phase. See backend/scripts/neo4j-import.js for import script.
// Frontend components ready at: src/components/NetworkExplorer.jsx

// Neo4j driver (lazy loaded with dynamic require to avoid deployment timeouts)
let neo4jDriver = null;
let neo4jModule = null;

function getNeo4jModule() {
  if (!neo4jModule) {
    try {
      neo4jModule = require('neo4j-driver');
    } catch (err) {
      console.error('Failed to load neo4j-driver:', err.message);
      return null;
    }
  }
  return neo4jModule;
}

function getNeo4jDriver() {
  const neo4j = getNeo4jModule();
  if (!neo4j) return null;

  if (!neo4jDriver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      console.error('Missing NEO4J_URI or NEO4J_PASSWORD');
      return null;
    }

    neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return neo4jDriver;
}

/**
 * Convert natural language query to Cypher using OpenAI
 */
async function nlToCypher(query, client) {
  const systemPrompt = `Eres un experto en Neo4j y Cypher. Convierte la consulta del usuario a una query Cypher valida.

SCHEMA DE LA BASE DE DATOS:
- Nodos: (:Politician {name: STRING, cluster: FLOAT, coalition: STRING})
  - cluster: -1.0 = izquierda, 1.0 = derecha
  - coalition: "Izquierda", "Derecha", o "Centro"
- Relaciones: [:INTERACTED {sign: STRING, date: DATE}]
  - sign: "positive", "negative", o "neutral"
  - Las interacciones son direccionales (desde -> hacia)

REGLAS:
1. Siempre limita resultados con LIMIT (max 100 para nodos, 500 para relaciones)
2. Para nombres de politicos, usa CONTAINS o =~ '(?i).*nombre.*' para busquedas flexibles
3. Retorna datos en formato que incluya: nodes (con id, name, cluster, coalition) y links (con source, target, sign)
4. Si la consulta es ambigua, asume que quieren ver las relaciones/interacciones

EJEMPLOS:
- "red de Boric" -> MATCH (p:Politician)-[r:INTERACTED]-(other) WHERE p.name CONTAINS 'Boric' RETURN p, r, other LIMIT 50
- "aliados de Kast" -> MATCH (p:Politician)<-[r:INTERACTED {sign: 'positive'}]-(ally) WHERE p.name CONTAINS 'Kast' RETURN p, r, ally LIMIT 50
- "conflictos entre izquierda y derecha" -> MATCH (a:Politician {coalition: 'Izquierda'})-[r:INTERACTED {sign: 'negative'}]->(b:Politician {coalition: 'Derecha'}) RETURN a, r, b LIMIT 100

Responde SOLO con la query Cypher, sin explicaciones ni markdown.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Process Neo4j results into graph format for visualization
 */
function processGraphResults(records) {
  const nodesMap = new Map();
  const links = [];

  records.forEach(record => {
    record.keys.forEach(key => {
      const value = record.get(key);

      if (!value) return;

      // Handle nodes
      if (value.labels && value.properties) {
        const node = {
          id: value.properties.name,
          name: value.properties.name,
          cluster: value.properties.cluster?.toNumber?.() ?? value.properties.cluster ?? 0,
          coalition: value.properties.coalition || 'Centro',
        };
        nodesMap.set(node.id, node);
      }

      // Handle relationships
      if (value.type && value.start && value.end) {
        // We need to find the actual node names from the record
        const startNode = record._fields.find(f => f?.identity?.equals?.(value.start));
        const endNode = record._fields.find(f => f?.identity?.equals?.(value.end));

        if (startNode && endNode) {
          links.push({
            source: startNode.properties.name,
            target: endNode.properties.name,
            sign: value.properties.sign || 'neutral',
            date: value.properties.date?.toString() || null,
          });
        }
      }
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}

/**
 * Query Network - Natural language to Neo4j graph query
 */
exports.queryNetwork = onRequest({
  cors: true,
  secrets: ['OPENAI_API_KEY', 'NEO4J_URI', 'NEO4J_PASSWORD'],
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, cypherDirect } = req.body;

    if (!query && !cypherDirect) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const driver = getNeo4jDriver();
    if (!driver) {
      return res.status(500).json({ error: 'Neo4j not configured' });
    }

    let cypherQuery;

    if (cypherDirect) {
      // Direct Cypher query (for advanced users)
      cypherQuery = cypherDirect;
    } else {
      // Convert natural language to Cypher
      const openaiClient = getOpenAI();
      if (!openaiClient) {
        return res.status(500).json({ error: 'OpenAI not configured' });
      }
      cypherQuery = await nlToCypher(query, openaiClient);
    }

    console.log('Executing Cypher:', cypherQuery);

    const session = driver.session({ database: 'neo4j' });
    try {
      const result = await session.run(cypherQuery);
      const graphData = processGraphResults(result.records);

      return res.json({
        success: true,
        query: query || '(direct cypher)',
        cypher: cypherQuery,
        graph: graphData,
        stats: {
          nodes: graphData.nodes.length,
          links: graphData.links.length,
        },
      });
    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error in queryNetwork:', error);
    return res.status(500).json({
      error: 'Query failed',
      message: error.message,
    });
  }
});

/**
 * Get Network Stats - Basic statistics about the network
 */
exports.getNetworkStats = onRequest({
  cors: true,
  secrets: ['NEO4J_URI', 'NEO4J_PASSWORD'],
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (req, res) => {
  try {
    const driver = getNeo4jDriver();
    if (!driver) {
      return res.status(500).json({ error: 'Neo4j not configured' });
    }

    const session = driver.session({ database: 'neo4j' });
    try {
      const result = await session.run(`
        MATCH (p:Politician)
        WITH count(p) as totalPoliticians
        MATCH ()-[r:INTERACTED]->()
        WITH totalPoliticians, count(r) as totalInteractions,
             sum(CASE WHEN r.sign = 'positive' THEN 1 ELSE 0 END) as positive,
             sum(CASE WHEN r.sign = 'negative' THEN 1 ELSE 0 END) as negative,
             sum(CASE WHEN r.sign = 'neutral' THEN 1 ELSE 0 END) as neutral
        MATCH (izq:Politician {coalition: 'Izquierda'})
        WITH totalPoliticians, totalInteractions, positive, negative, neutral, count(izq) as leftCount
        MATCH (der:Politician {coalition: 'Derecha'})
        RETURN totalPoliticians, totalInteractions, positive, negative, neutral, leftCount, count(der) as rightCount
      `);

      const stats = result.records[0];
      return res.json({
        politicians: stats.get('totalPoliticians').toNumber(),
        interactions: stats.get('totalInteractions').toNumber(),
        bySign: {
          positive: stats.get('positive').toNumber(),
          negative: stats.get('negative').toNumber(),
          neutral: stats.get('neutral').toNumber(),
        },
        byCoalition: {
          left: stats.get('leftCount').toNumber(),
          right: stats.get('rightCount').toNumber(),
        },
      });
    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error in getNetworkStats:', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Get Top Politicians - Most connected politicians
 */
exports.getTopPoliticians = onRequest({
  cors: true,
  secrets: ['NEO4J_URI', 'NEO4J_PASSWORD'],
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const driver = getNeo4jDriver();
    if (!driver) {
      return res.status(500).json({ error: 'Neo4j not configured' });
    }

    const session = driver.session({ database: 'neo4j' });
    try {
      const result = await session.run(`
        MATCH (p:Politician)-[r:INTERACTED]-()
        WITH p, count(r) as connections,
             sum(CASE WHEN r.sign = 'positive' THEN 1 ELSE 0 END) as positive,
             sum(CASE WHEN r.sign = 'negative' THEN 1 ELSE 0 END) as negative
        RETURN p.name as name, p.coalition as coalition, connections, positive, negative
        ORDER BY connections DESC
        LIMIT $limit
      `, { limit: getNeo4jModule().int(limit) });

      const politicians = result.records.map(record => ({
        name: record.get('name'),
        coalition: record.get('coalition'),
        connections: record.get('connections').toNumber(),
        positive: record.get('positive').toNumber(),
        negative: record.get('negative').toNumber(),
      }));

      return res.json({ politicians });
    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error in getTopPoliticians:', error);
    return res.status(500).json({ error: 'Failed to get top politicians' });
  }
});

// ========================================
// Commission Transcript Analysis (Deterministic)
// ========================================

let commissionTranscripts;
const intentParser = require('./transcripts/intentParser');
const deterministicSearch = require('./transcripts/deterministicSearch');
const narrativePrompts = require('./transcripts/narrativePrompts');

function loadCommissionTranscripts() {
  if (!commissionTranscripts) {
    // Use light version without embeddings (deterministic approach doesn't need them)
    commissionTranscripts = require('./parliamentdata/commission_transcripts_light.json');
  }
  return commissionTranscripts;
}

/**
 * Main Cloud Function for commission transcript analysis (Deterministic approach)
 */
exports.analyzeCommissionTranscripts = onRequest({
  cors: true,
  secrets: ['OPENAI_API_KEY'],
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('📋 Analyzing query:', query);

    // STEP 1: Parse intent (deterministic)
    const intent = intentParser.parseIntent(query);
    console.log('🔍 Parsed intent:', JSON.stringify(intent, null, 2));

    // Load transcript data (light version without embeddings)
    const data = loadCommissionTranscripts();
    const chunks = data.chunks;

    // STEP 2: Deterministic search based on filters
    const searchResults = deterministicSearch.searchChunks(chunks, intent.filters);
    console.log(`📄 Found ${searchResults.length} matching chunks`);

    // STEP 3: Build structured data (no LLM yet)
    let structuredData;

    switch (intent.type) {
    case 'position':
      structuredData = deterministicSearch.buildPositionData(intent, searchResults);
      break;

    case 'quote':
      structuredData = deterministicSearch.buildQuoteData(intent, searchResults);
      break;

    case 'briefing': {
      const sessionChunks = deterministicSearch.getSessionChunks(chunks, intent.session);
      structuredData = deterministicSearch.buildBriefingData(intent, sessionChunks);
      break;
    }

    case 'comparison':
      structuredData = deterministicSearch.buildComparisonData(intent, searchResults);
      break;

    case 'search':
    case 'session_search':
    default:
      // Return raw results for generic search
      return res.json({
        feature: intent.type,
        query,
        intent,
        chunks: searchResults.slice(0, 10).map(c => ({
          speaker: c.speaker,
          session: c.session,
          text: c.text,
          index: c.index,
        })),
        metadata: {
          total_results: searchResults.length,
          method: 'deterministic_filter',
        },
      });
    }

    // Check if data was found
    if (!structuredData.found) {
      return res.json({
        feature: intent.type,
        query,
        intent,
        response: structuredData,
        metadata: {
          method: 'deterministic_filter',
          chunks_found: 0,
        },
      });
    }

    console.log('📊 Structured data built:', Object.keys(structuredData));

    // STEP 4: LLM formats structured data into narrative (optional)
    const client = getOpenAI();
    if (!client) {
      // Return structured data without narrative formatting
      return res.json({
        feature: intent.type,
        query,
        intent,
        response: structuredData,
        metadata: {
          method: 'deterministic_filter',
          chunks_analyzed: searchResults.length,
          llm_used: false,
        },
      });
    }

    // Generate narrative prompt based on type
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
      // No narrative needed
      return res.json({
        feature: intent.type,
        query,
        intent,
        response: structuredData,
        metadata: {
          method: 'deterministic_filter',
          chunks_analyzed: searchResults.length,
        },
      });
    }

    // Call LLM to format narrative
    console.log('🤖 Calling LLM for narrative formatting...');
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: narrativePrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent formatting
    });

    const narrative = JSON.parse(completion.choices[0].message.content);

    console.log('✅ Analysis complete');

    return res.json({
      feature: intent.type,
      query,
      intent,
      structured_data: structuredData, // Include raw data for transparency
      response: narrative, // Formatted narrative
      metadata: {
        method: 'deterministic_filter',
        chunks_analyzed: searchResults.length,
        llm_used: true,
        model: 'gpt-4o-mini',
      },
    });

  } catch (error) {
    console.error('❌ Error in analyzeCommissionTranscripts:', error);
    return res.status(500).json({
      error: 'Failed to analyze transcripts',
      details: error.message,
      stack: error.stack,
    });
  }
});
