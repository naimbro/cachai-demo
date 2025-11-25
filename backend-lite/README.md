# Backend Lite - Commission Transcripts Analysis

Lightweight backend with **only** the deterministic commission transcripts analysis function.

## Size Comparison

- **backend-lite**: 115MB (this project)
- **backend (original)**: 406MB
- **Reduction**: 71% smaller

## What's Included

- ✅ `analyzeCommissionTranscripts` - Deterministic transcript analysis
- ✅ `commission_transcripts_light.json` - 560KB (no embeddings)
- ✅ Minimal dependencies (no @xenova/transformers)
- ✅ Lazy loading for fast cold starts

## What's NOT Included

- ❌ Digital twin queries
- ❌ Embeddings-based search
- ❌ Bill search
- ❌ Neo4j network queries

## Deployment

### Option 1: Windows Native (Recommended)

From PowerShell:

```powershell
cd C:\Users\naim.bro.k\claude_projects\diputados_chatbot\demo_github\backend-lite
.\deploy-windows.ps1
```

Or manually:

```powershell
cd C:\Users\naim.bro.k\claude_projects\diputados_chatbot\demo_github\backend-lite
firebase deploy --only functions
```

### Option 2: WSL (May have timeout issues)

```bash
cd /mnt/c/Users/naim.bro.k/claude_projects/diputados_chatbot/demo_github/backend-lite
firebase deploy --only functions
```

## Testing

Test queries:

```bash
curl -X POST https://YOUR-PROJECT.cloudfunctions.net/analyzeCommissionTranscripts \
  -H "Content-Type: application/json" \
  -d '{"query": "posición de Félix González sobre rompientes"}'
```

## Architecture

```
backend-lite/
├── functions/
│   ├── index.js                    # Main entry point (2 functions)
│   ├── transcripts/
│   │   ├── intentParser.js         # Query → structured filters
│   │   ├── deterministicSearch.js  # Filter-based search
│   │   └── narrativePrompts.js     # LLM formatting only
│   ├── data/
│   │   └── commission_transcripts_light.json  # 560KB
│   └── package.json                # Minimal dependencies
└── firebase.json
```

## Features

1. **Smart Briefing**: `"resume sesión 67"`
2. **Posicionómetro**: `"posición de Félix González sobre rompientes"`
3. **Quote Finder**: `"qué dijo Romero sobre medio ambiente"`
4. **Comparison**: `"compara argumentos sobre protección ambiental"`
