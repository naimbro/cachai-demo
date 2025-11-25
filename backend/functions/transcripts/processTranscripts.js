/**
 * Script to process commission transcripts
 * - Reads JSON files from comisiones_diarizadas
 * - Creates chunks (one per speaker intervention)
 * - Generates embeddings using OpenAI
 * - Saves processed data with embeddings
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Paths
const TRANSCRIPTS_DIR = path.join(__dirname, '../../../../comisiones_diarizadas');
const OUTPUT_FILE = path.join(__dirname, '../parliamentdata/commission_transcripts_embedded.json');

/**
 * Read all transcript JSON files
 */
function loadTranscripts() {
  const files = [
    'transcripcion_sesion_67.json',
    'transcripcion_sesion_70.json',
    'transcripcion_sesion_72.json',
    'transcripcion_sesion_73.json',
  ];

  const transcripts = [];

  for (const file of files) {
    const filePath = path.join(TRANSCRIPTS_DIR, file);
    console.log(`📄 Reading ${file}...`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const sessionNumber = file.match(/sesion_(\d+)/)[1];

    transcripts.push({
      session: sessionNumber,
      file,
      data,
    });
  }

  return transcripts;
}

/**
 * Create chunks from transcripts
 * Each speaker intervention = 1 chunk
 */
function createChunks(transcripts) {
  const chunks = [];
  let chunkId = 0;

  for (const transcript of transcripts) {
    console.log(`\n📋 Processing Session ${transcript.session} (${transcript.data.length} interventions)...`);

    for (let i = 0; i < transcript.data.length; i++) {
      const intervention = transcript.data[i];

      // Skip very short interventions (< 20 chars)
      if (!intervention.text || intervention.text.length < 20) {
        continue;
      }

      chunks.push({
        id: `chunk_${chunkId}`,
        session: transcript.session,
        speaker: intervention.speaker,
        text: intervention.text,
        index: i, // Position in session
        char_count: intervention.text.length,
      });

      chunkId++;
    }
  }

  console.log(`\n✅ Created ${chunks.length} chunks from ${transcripts.length} sessions`);
  return chunks;
}

/**
 * Generate embeddings for chunks in batches
 */
async function generateEmbeddings(chunks) {
  console.log(`\n🔮 Generating embeddings for ${chunks.length} chunks...`);

  const BATCH_SIZE = 50; // OpenAI allows batch requests
  const batches = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Processing ${batches.length} batches of up to ${BATCH_SIZE} chunks each...`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    console.log(`  Batch ${batchIdx + 1}/${batches.length} (${batch.length} chunks)...`);

    try {
      // Prepare texts for embedding
      const texts = batch.map(chunk => `${chunk.speaker}: ${chunk.text}`);

      // Call OpenAI embeddings API
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 512, // Smaller dimension for efficiency
      });

      // Attach embeddings to chunks
      for (let i = 0; i < batch.length; i++) {
        batch[i].embedding = response.data[i].embedding;
      }

      console.log(`    ✓ Generated ${batch.length} embeddings`);

    } catch (error) {
      console.error(`    ✗ Error in batch ${batchIdx + 1}:`, error.message);
      throw error;
    }
  }

  console.log(`\n✅ All embeddings generated successfully!`);
  return chunks;
}

/**
 * Save processed data to file
 */
function saveProcessedData(chunks) {
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create summary stats
  const stats = {
    total_chunks: chunks.length,
    sessions: [...new Set(chunks.map(c => c.session))].sort(),
    unique_speakers: [...new Set(chunks.map(c => c.speaker))].length,
    avg_chars_per_chunk: Math.round(
      chunks.reduce((sum, c) => sum + c.char_count, 0) / chunks.length,
    ),
  };

  const output = {
    metadata: {
      generated_at: new Date().toISOString(),
      embedding_model: 'text-embedding-3-small',
      embedding_dimensions: 512,
      stats,
    },
    chunks,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n💾 Saved to: ${OUTPUT_FILE}`);
  console.log('\n📊 Statistics:');
  console.log(`   Total chunks: ${stats.total_chunks}`);
  console.log(`   Sessions: ${stats.sessions.join(', ')}`);
  console.log(`   Unique speakers: ${stats.unique_speakers}`);
  console.log(`   Avg chars/chunk: ${stats.avg_chars_per_chunk}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting transcript processing...\n');

  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    // Step 1: Load transcripts
    const transcripts = loadTranscripts();

    // Step 2: Create chunks
    const chunks = createChunks(transcripts);

    // Step 3: Generate embeddings
    const chunksWithEmbeddings = await generateEmbeddings(chunks);

    // Step 4: Save processed data
    saveProcessedData(chunksWithEmbeddings);

    console.log('\n🎉 Processing complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { loadTranscripts, createChunks, generateEmbeddings };
