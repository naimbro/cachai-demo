/**
 * Neo4j Import Script for CachAI Network Explorer
 *
 * This script reads the CSV edgelist and generates Cypher queries
 * to import data into Neo4j Aura Free.
 *
 * Usage:
 * 1. Create a Neo4j Aura Free instance at https://neo4j.com/cloud/aura-free/
 * 2. Set environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 * 3. Run: node scripts/neo4j-import.js
 */

const fs = require('fs');
const path = require('path');

// Path to CSV file (adjust as needed)
const CSV_PATH = path.join(__dirname, '../../../../edgelist_politicos_231125.csv');

function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || '';
    });
    data.push(row);
  }
  return data;
}

function extractUniqueNodes(edges) {
  const nodes = new Map();

  edges.forEach(edge => {
    const fromName = edge.from_node;
    const toName = edge.to_node;
    const fromCluster = parseFloat(edge.from_cluster) || 0;
    const toCluster = parseFloat(edge.to_cluster) || 0;

    if (fromName && !nodes.has(fromName)) {
      nodes.set(fromName, {
        name: fromName,
        cluster: fromCluster,
        coalition: fromCluster < 0 ? 'Izquierda' : fromCluster > 0 ? 'Derecha' : 'Centro',
      });
    }
    if (toName && !nodes.has(toName)) {
      nodes.set(toName, {
        name: toName,
        cluster: toCluster,
        coalition: toCluster < 0 ? 'Izquierda' : toCluster > 0 ? 'Derecha' : 'Centro',
      });
    }
  });

  return Array.from(nodes.values());
}

// eslint-disable-next-line no-unused-vars
function generateCypherStatements(edges, nodes) {
  const statements = [];

  // Create constraint
  statements.push('CREATE CONSTRAINT politician_name IF NOT EXISTS FOR (p:Politician) REQUIRE p.name IS UNIQUE;');

  // Create index on cluster
  statements.push('CREATE INDEX politician_cluster IF NOT EXISTS FOR (p:Politician) ON (p.cluster);');

  // Generate node creation statements (in batches)
  const nodeBatchSize = 100;
  for (let i = 0; i < nodes.length; i += nodeBatchSize) {
    const batch = nodes.slice(i, i + nodeBatchSize);
    const nodeStatements = batch.map(n => {
      const escapedName = n.name.replace(/'/g, '\\\'');
      return `(:Politician {name: '${escapedName}', cluster: ${n.cluster}, coalition: '${n.coalition}'})`;
    }).join(', ');
    statements.push(`CREATE ${nodeStatements};`);
  }

  // Generate relationship creation statements (in batches)
  // Using MERGE to avoid duplicates
  const edgeBatchSize = 500;
  for (let i = 0; i < edges.length; i += edgeBatchSize) {
    const batch = edges.slice(i, i + edgeBatchSize);
    const relStatements = batch.map(e => {
      const fromEscaped = e.from_node.replace(/'/g, '\\\'');
      const toEscaped = e.to_node.replace(/'/g, '\\\'');
      const date = e.publish_date || '2020-01-01';
      return `MATCH (a:Politician {name: '${fromEscaped}'}), (b:Politician {name: '${toEscaped}'})
MERGE (a)-[:INTERACTED {sign: '${e.sign}', date: date('${date}')}]->(b)`;
    }).join(';\n');
    statements.push(relStatements + ';');
  }

  return statements;
}

async function importToNeo4j(edges, nodes) {
  const neo4j = require('neo4j-driver');

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !password) {
    console.error('Missing NEO4J_URI or NEO4J_PASSWORD environment variables');
    console.log('\nAlternatively, use the generated Cypher file to import manually.');
    return;
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    console.log('Connected to Neo4j. Starting import...');

    // Create constraints and indexes
    console.log('Creating constraints and indexes...');
    await session.run('CREATE CONSTRAINT politician_name IF NOT EXISTS FOR (p:Politician) REQUIRE p.name IS UNIQUE');
    await session.run('CREATE INDEX politician_cluster IF NOT EXISTS FOR (p:Politician) ON (p.cluster)');

    // Import nodes in batches
    console.log(`Importing ${nodes.length} politicians...`);
    const nodeBatchSize = 100;
    for (let i = 0; i < nodes.length; i += nodeBatchSize) {
      const batch = nodes.slice(i, i + nodeBatchSize);
      await session.run(
        `UNWIND $nodes AS node
         MERGE (p:Politician {name: node.name})
         SET p.cluster = node.cluster, p.coalition = node.coalition`,
        { nodes: batch },
      );
      process.stdout.write(`\r  Progress: ${Math.min(i + nodeBatchSize, nodes.length)}/${nodes.length}`);
    }
    console.log('\n  Nodes imported successfully.');

    // Import relationships in batches
    console.log(`Importing ${edges.length} interactions...`);
    const edgeBatchSize = 1000;
    for (let i = 0; i < edges.length; i += edgeBatchSize) {
      const batch = edges.slice(i, i + edgeBatchSize).map(e => ({
        from: e.from_node,
        to: e.to_node,
        sign: e.sign,
        date: e.publish_date || '2020-01-01',
      }));
      await session.run(
        `UNWIND $edges AS edge
         MATCH (a:Politician {name: edge.from})
         MATCH (b:Politician {name: edge.to})
         MERGE (a)-[r:INTERACTED]->(b)
         ON CREATE SET r.sign = edge.sign, r.date = date(edge.date)
         ON MATCH SET r.sign = edge.sign, r.date = date(edge.date)`,
        { edges: batch },
      );
      process.stdout.write(`\r  Progress: ${Math.min(i + edgeBatchSize, edges.length)}/${edges.length}`);
    }
    console.log('\n  Relationships imported successfully.');

    // Get stats
    const result = await session.run(`
      MATCH (p:Politician) WITH count(p) as politicians
      MATCH ()-[r:INTERACTED]->() WITH politicians, count(r) as interactions
      RETURN politicians, interactions
    `);
    const stats = result.records[0];
    console.log(`\nImport complete!`);
    console.log(`  Politicians: ${stats.get('politicians')}`);
    console.log(`  Interactions: ${stats.get('interactions')}`);

  } catch (error) {
    console.error('Import error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

async function main() {
  console.log('CachAI Neo4j Import Script');
  console.log('==========================\n');

  // Parse CSV
  console.log(`Reading CSV from: ${CSV_PATH}`);
  const edges = parseCSV(CSV_PATH);
  console.log(`  Found ${edges.length} interactions`);

  // Extract unique nodes
  const nodes = extractUniqueNodes(edges);
  console.log(`  Found ${nodes.length} unique politicians\n`);

  // Show sample
  console.log('Sample data:');
  console.log('  Politicians:', nodes.slice(0, 3).map(n => n.name).join(', '));
  console.log('  First interaction:', edges[0]);
  console.log('');

  // Check if we should import directly or generate file
  if (process.env.NEO4J_URI) {
    await importToNeo4j(edges, nodes);
  } else {
    // Generate Cypher file for manual import
    console.log('Generating Cypher import file (no NEO4J_URI provided)...');

    // Create a simpler import file using LOAD CSV approach
    const cypherContent = `// CachAI Network Import Script
// ==============================
//
// To import into Neo4j Aura:
// 1. Upload edgelist_politicos_231125.csv to a public URL or Neo4j import folder
// 2. Run these queries in the Neo4j Browser

// Step 1: Create constraint for unique politician names
CREATE CONSTRAINT politician_name IF NOT EXISTS FOR (p:Politician) REQUIRE p.name IS UNIQUE;

// Step 2: Create index for faster cluster queries
CREATE INDEX politician_cluster IF NOT EXISTS FOR (p:Politician) ON (p.cluster);

// Step 3: Load politicians from CSV (extracts unique names from both columns)
// Replace FILE_URL with your CSV location
LOAD CSV WITH HEADERS FROM 'FILE_URL' AS row
MERGE (p1:Politician {name: row.from_node})
ON CREATE SET p1.cluster = toFloat(row.from_cluster),
              p1.coalition = CASE
                WHEN toFloat(row.from_cluster) < 0 THEN 'Izquierda'
                WHEN toFloat(row.from_cluster) > 0 THEN 'Derecha'
                ELSE 'Centro' END;

LOAD CSV WITH HEADERS FROM 'FILE_URL' AS row
MERGE (p2:Politician {name: row.to_node})
ON CREATE SET p2.cluster = toFloat(row.to_cluster),
              p2.coalition = CASE
                WHEN toFloat(row.to_cluster) < 0 THEN 'Izquierda'
                WHEN toFloat(row.to_cluster) > 0 THEN 'Derecha'
                ELSE 'Centro' END;

// Step 4: Create interactions (relationships)
LOAD CSV WITH HEADERS FROM 'FILE_URL' AS row
MATCH (a:Politician {name: row.from_node})
MATCH (b:Politician {name: row.to_node})
MERGE (a)-[r:INTERACTED]->(b)
SET r.sign = row.sign, r.date = date(row.publish_date);

// Verify import
MATCH (p:Politician) RETURN count(p) as politicians;
MATCH ()-[r:INTERACTED]->() RETURN count(r) as interactions;
`;

    const outputPath = path.join(__dirname, 'neo4j-import.cypher');
    fs.writeFileSync(outputPath, cypherContent);
    console.log(`  Generated: ${outputPath}`);
    console.log('\nTo import directly, set environment variables and run again:');
    console.log('  NEO4J_URI=neo4j+s://xxx.databases.neo4j.io');
    console.log('  NEO4J_USER=neo4j');
    console.log('  NEO4J_PASSWORD=your-password');
  }
}

// Only run if executed directly (not when required by Firebase)
if (require.main === module) {
  main().catch(console.error);
}
