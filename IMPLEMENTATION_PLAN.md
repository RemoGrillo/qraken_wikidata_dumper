# Wikidata Radius Dumper - Implementation Plan

## Project Overview
A Next.js-based application that safely crawls Wikidata through WDQS (Wikidata Query Service) and exports RDF data in N-Triples (.nt) and Turtle (.ttl) formats.

## Status: ✅ Complete with Enhanced Features

### ✅ Completed Tasks
- [x] Create implementation plan document
- [x] Initialize Next.js project with TypeScript
- [x] Set up environment configuration
- [x] Create WDQS client with safety features
- [x] Implement MediaWiki API client
- [x] Build CONSTRUCT query generators
- [x] Create dump orchestration logic
- [x] Set up API routes
- [x] Build React UI components
- [x] Add documentation
- [x] Implement persistent dumps storage with timestamps
- [x] Add dump history management API
- [x] Create interactive RDF graph visualization
- [x] Add TTL parser for graph data extraction

### 🎉 New Features Added
1. **Persistent Dumps Storage**: All dumps are now saved in timestamped directories under `/dumps` with metadata tracking
2. **Dump History API**: Browse and manage previous dumps through `/api/history` endpoint
3. **Interactive Graph Visualization**: View TTL files as interactive graphs using Cytoscape.js with node expansion and filtering

### 📋 Next Steps
- Run `npm run dev` to start the development server
- Test with a small class (e.g., Q7889 for video games with max 10 instances)
- Dumps are now saved in `/dumps` folder with timestamps
- Use the graph visualization feature to explore RDF data interactively

---

## Architecture Overview

**Tech Stack:**
- **Next.js 14** (App Router) with TypeScript
- **Server-side crawling** to avoid CORS issues
- **Streaming exports** to handle large datasets
- **Rate-limited WDQS queries** with proper User-Agent headers
- **MediaWiki API** for efficient instance enumeration (avoiding SPARQL pagination)

## Key Features

1. **Safe WDQS Usage:**
   - Custom User-Agent headers per Wikimedia policy
   - Rate limiting (1-2 concurrent queries max)
   - Exponential backoff on 429/503 errors
   - 60-second query timeout enforcement
   - Retry-After header respect

2. **Efficient Crawling Strategy:**
   - Use MediaWiki's `haswbstatement` search instead of SPARQL OFFSET
   - Batch CONSTRUCT queries with VALUES clauses
   - Stream results directly to .nt files
   - Convert to .ttl at the end

3. **Radius Semantics:**
   - R=1: All truthy edges from instances + labels
   - R=2: All truthy edges from R=1 neighbors
   - Optional subclass expansion via P279*

## Project Structure

```
Wikidata_dumper/
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.local
├── .gitignore
├── README.md
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── start/route.ts      # Start dump job
│       ├── progress/route.ts   # SSE progress stream
│       ├── download/route.ts   # File downloads
│       ├── history/route.ts    # Dump history management
│       └── visualize/route.ts  # TTL to graph conversion
├── server/
│   ├── wdqsClient.ts          # SPARQL client with safety features
│   ├── mwapi.ts               # MediaWiki API for instance enumeration
│   ├── construct.ts           # CONSTRUCT query builders
│   ├── subclasses.ts          # Subclass expansion
│   ├── dump.ts                # Main orchestration logic
│   └── jobManager.ts          # Job queue management
├── lib/
│   ├── types.ts               # TypeScript interfaces
│   ├── schemas.ts             # Zod validation schemas
│   └── utils.ts               # Helper functions
├── components/
│   ├── DumpForm.tsx           # Configuration form
│   ├── ProgressDisplay.tsx    # Live progress with ETA
│   ├── DownloadLinks.tsx      # Result downloads
│   └── GraphViewer.tsx        # Interactive RDF visualization
├── types/
│   └── cytoscape-fcose.d.ts  # Type declarations
└── dumps/                     # Timestamped dump directories (git-ignored)
    └── 2025-09-26T13-45-00_Q3305213/
        ├── metadata.json      # Dump configuration and status
        ├── dump.nt           # N-Triples format
        └── dump.ttl          # Turtle format
```

## Implementation Phases

### Phase 1: Project Setup ✅
- [x] Initialize Next.js with TypeScript
- [x] Install dependencies: `p-queue`, `n3`, `zod`, `date-fns`
- [x] Configure environment variables
- [x] Set up exports directory

### Phase 2: Server Modules ✅
- [x] WDQS client with proper headers and rate limiting
- [x] MediaWiki API client for haswbstatement search
- [x] CONSTRUCT query builders for R=1 and R=2
- [x] Subclass expansion query

### Phase 3: Dump Orchestration ✅
- [x] Job manager with progress tracking
- [x] Phase A: Enumerate instances via MediaWiki API
- [x] Phase B: Estimate total triples (sampling)
- [x] Phase C: Fetch R=1 data in batches
- [x] Phase D: Fetch R=2 data from neighbors
- [x] Phase E: Convert .nt to .ttl

### Phase 4: API Routes ✅
- [x] POST /api/start - Start dump job
- [x] GET /api/progress - SSE stream for live updates
- [x] GET /api/download - Serve generated files

### Phase 5: UI Components ✅
- [x] Configuration form with sensible defaults
- [x] Live progress display with ETA
- [x] Download links for .nt and .ttl

## SPARQL Query Templates

### Subclass Expansion
```sparql
SELECT ?c WHERE { ?c wdt:P279* wd:Q3305213 }
```

### R=1 CONSTRUCT (truthy edges + labels)
```sparql
PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
  ?s ?p ?o .
  ?s rdf:type ?class .
  ?s rdfs:label ?sLabel .
  ?p rdfs:label ?pLabel .
  ?o rdfs:label ?oLabel .
  ?class rdfs:label ?classLabel .
}
WHERE {
  VALUES ?s { wd:Q42 wd:Q571 ... }
  {
    ?s ?p ?o .
    FILTER(STRSTARTS(STR(?p), STR(wdt:)))
  }
  UNION { ?s wdt:P31 ?class . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

### R=2 CONSTRUCT (neighbors)
Same as R=1 but VALUES gets first-hop object QIDs

## Safety Measures

1. **Rate Limiting:**
   - Max 2 concurrent WDQS queries
   - 200ms minimum delay between requests
   - Exponential backoff on errors

2. **Error Handling:**
   - Graceful timeout handling
   - Retry logic with backoff
   - Progress persistence for resume capability

3. **Resource Management:**
   - Stream processing for large datasets
   - Chunked file writing
   - Memory-efficient neighbor tracking

## Default Configuration

- **Class:** Q3305213 (painting)
- **Radius:** 2
- **Max Instances:** 10,000 (configurable)
- **Language:** English
- **Include Subclasses:** true
- **Graph:** Truthy (wdt:) by default

## Environment Variables

```env
WDQS_ENDPOINT=https://query.wikidata.org/sparql
WIKIMEDIA_API=https://www.wikidata.org/w/api.php
AGENT_NAME=QrakenWDRadius/0.1 (contact: you@example.com)
DEFAULT_LANG=en
```

## Dependencies

- **next**: ^14.0.0
- **react**: ^18.0.0
- **typescript**: ^5.0.0
- **p-queue**: ^8.0.0 (rate limiting)
- **n3**: ^1.17.0 (RDF serialization)
- **zod**: ^3.22.0 (input validation)
- **date-fns**: ^3.0.0 (date utilities)

## Notes

- WDQS truthy graph uses `wdt:` predicates (fast & compact)
- Full statement graph (`p:/ps:/pq:`) available but not default
- Labels fetched via SERVICE wikibase:label
- Paintings live in main graph (query.wikidata.org)
- No scholarly articles needed (post-split endpoint)
