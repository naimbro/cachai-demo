/**
 * API Service for ParlamentoAI Demo
 * Connects frontend to Firebase Functions backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://us-central1-diputados-demo.cloudfunctions.net';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get list of parlamentarios
 * @param {string} search - Optional search term
 * @returns {Promise<{parlamentarios: Array, total: number}>}
 */
export async function getParlamentarios(search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchAPI(`getParlamentarios${params}`);
}

/**
 * Get single parlamentario details
 * @param {number} id - Parlamentario ID
 * @returns {Promise<{parlamentario: Object}>}
 */
export async function getParlamentario(id) {
  return fetchAPI(`getParlamentario?id=${id}`);
}

/**
 * Query the digital twin
 * @param {number} parlamentarioId - Parlamentario ID
 * @param {string} pregunta - Question to ask
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<{respuesta: string, referencias: Array}>}
 */
export async function digitalTwinQuery(parlamentarioId, pregunta, conversationHistory = []) {
  return fetchAPI('digitalTwinQuery', {
    method: 'POST',
    body: JSON.stringify({ parlamentarioId, pregunta, conversationHistory }),
  });
}

/**
 * Predict votes for a bill text
 * @param {string} textoProyecto - Bill text
 * @param {Array<number>} parlamentarioIds - Optional specific parlamentario IDs
 * @returns {Promise<{predicciones: Array, resumen: string, proyectosSimilares: Array}>}
 */
export async function predictVote(textoProyecto, parlamentarioIds = []) {
  return fetchAPI('predictVote', {
    method: 'POST',
    body: JSON.stringify({ textoProyecto, parlamentarioIds }),
  });
}

/**
 * Search bills by semantic similarity
 * @param {string} query - Search query
 * @returns {Promise<{results: Array, total: number}>}
 */
export async function searchBills(query) {
  return fetchAPI('searchBills', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

/**
 * Health check
 * @returns {Promise<{status: string, dataLoaded: Object}>}
 */
export async function healthCheck() {
  return fetchAPI('healthCheck');
}

// ============================================
// NETWORK EXPLORER API
// ============================================

/**
 * Query the network graph with natural language
 * @param {string} query - Natural language query
 * @returns {Promise<{graph: {nodes: Array, links: Array}, cypher: string, stats: Object}>}
 */
export async function queryNetwork(query) {
  return fetchAPI('queryNetwork', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

/**
 * Execute direct Cypher query
 * @param {string} cypher - Cypher query string
 * @returns {Promise<{graph: {nodes: Array, links: Array}, stats: Object}>}
 */
export async function queryNetworkCypher(cypher) {
  return fetchAPI('queryNetwork', {
    method: 'POST',
    body: JSON.stringify({ cypherDirect: cypher }),
  });
}

/**
 * Get network statistics
 * @returns {Promise<{politicians: number, interactions: number, bySign: Object}>}
 */
export async function getNetworkStats() {
  return fetchAPI('getNetworkStats');
}

/**
 * Get top connected politicians
 * @param {number} limit - Max number of results
 * @returns {Promise<{politicians: Array}>}
 */
export async function getTopPoliticians(limit = 20) {
  return fetchAPI(`getTopPoliticians?limit=${limit}`);
}

export default {
  getParlamentarios,
  getParlamentario,
  digitalTwinQuery,
  predictVote,
  searchBills,
  healthCheck,
  queryNetwork,
  queryNetworkCypher,
  getNetworkStats,
  getTopPoliticians,
};
