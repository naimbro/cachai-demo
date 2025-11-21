/**
 * Embedding utility using HuggingFace Inference API
 * Uses the same model as stored embeddings: all-MiniLM-L6-v2
 */

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generate embedding for text using HuggingFace Inference API
 * @param {string} text - Text to embed
 * @param {string} hfApiKey - HuggingFace API key
 * @returns {Promise<number[]>} - 384-dimensional embedding vector
 */
async function generateEmbedding(text, hfApiKey) {
  const response = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace API error: ${error}`);
  }

  const result = await response.json();

  // The API returns the embedding directly as an array
  // For sentence-transformers, it might be nested
  if (Array.isArray(result) && Array.isArray(result[0])) {
    // Mean pooling if we get token embeddings
    return meanPool(result);
  }

  return result;
}

/**
 * Mean pooling for token embeddings
 * @param {number[][]} tokenEmbeddings
 * @returns {number[]}
 */
function meanPool(tokenEmbeddings) {
  const dim = tokenEmbeddings[0].length;
  const result = new Array(dim).fill(0);

  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dim; i++) {
      result[i] += token[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    result[i] /= tokenEmbeddings.length;
  }

  return result;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar bills to a query
 * @param {string} query - Search query
 * @param {Array} billEmbeddings - Array of {billId, embedding}
 * @param {Array} bills - Array of bill objects
 * @param {string} hfApiKey - HuggingFace API key
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} - Similar bills with similarity scores
 */
async function findSimilarBills(query, billEmbeddings, bills, hfApiKey, topK = 10) {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, hfApiKey);

  // Create bills lookup
  const billsMap = new Map(bills.map(b => [b.id, b]));

  // Calculate similarities
  const similarities = billEmbeddings.map(be => ({
    billId: be.billId,
    similarity: cosineSimilarity(queryEmbedding, be.embedding),
  }));

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Get top K results with bill details
  const results = similarities.slice(0, topK).map(s => {
    const bill = billsMap.get(s.billId);
    return {
      ...bill,
      similitud: s.similarity,
    };
  });

  return results;
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  findSimilarBills,
};
