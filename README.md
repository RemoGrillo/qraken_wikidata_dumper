# Wikidata Radius Dumper

A Next.js application for safely and efficiently crawling Wikidata through WDQS (Wikidata Query Service) and exporting RDF data in N-Triples (.nt) and Turtle (.ttl) formats.

## Features

- **Safe WDQS Usage**: Respects rate limits, handles 429/503 errors, and uses proper User-Agent headers
- **Efficient Crawling**: Uses MediaWiki API's `haswbstatement` search instead of expensive SPARQL pagination
- **Radius-based Dumps**: Configurable radius (1-3) for including related entities
- **Multiple Formats**: Exports to both N-Triples and Turtle formats
- **Real-time Progress**: Live progress updates with ETA calculation
- **Subclass Expansion**: Optional expansion to include all subclasses of a given class

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create exports directory
mkdir exports
```

### Configuration

Edit `.env.local` to customize endpoints and user agent:

```env
WDQS_ENDPOINT=https://query.wikidata.org/sparql
WIKIMEDIA_API=https://www.wikidata.org/w/api.php
AGENT_NAME=YourApp/1.0 (contact: your-email@example.com)
DEFAULT_LANG=en
```

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Configure the dump**:
   - **Class QID**: The Wikidata class to dump (e.g., Q3305213 for paintings)
   - **Radius**: How many hops from instances to include
     - 1: Direct properties only
     - 2: Include properties of neighbor entities
     - 3: Two hops from instances
   - **Max Instances**: Limit the number of instances (1-100,000)
   - **Language**: Language code for labels (en, fr, de, etc.)
   - **Include Subclasses**: Expand to all subclasses using P279*

2. **Start the dump**: Click "Start Dump" to begin the crawling process

3. **Monitor progress**: Real-time updates show:
   - Current phase
   - Items processed
   - Triples written
   - Estimated time remaining

4. **Download results**: Once complete, download in either:
   - **N-Triples (.nt)**: Simple line-based format
   - **Turtle (.ttl)**: Compact format with prefixes

## Architecture

### Key Components

- **WDQS Client** (`server/wdqsClient.ts`): Handles SPARQL queries with rate limiting and retry logic
- **MediaWiki API** (`server/mwapi.ts`): Enumerates instances efficiently using search API
- **CONSTRUCT Queries** (`server/construct.ts`): Builds optimized SPARQL CONSTRUCT queries
- **Dump Orchestrator** (`server/dump.ts`): Manages the entire dump process
- **Job Manager** (`server/jobManager.ts`): Handles multiple concurrent jobs

### Dump Process

1. **Subclass Expansion**: Optionally expand the class to include all subclasses
2. **Instance Enumeration**: Use MediaWiki API to find all instances
3. **Triple Estimation**: Sample instances to estimate total triples
4. **R=1 Fetching**: Get all truthy edges from instances
5. **R=2 Fetching**: Get properties of neighbor entities (if radius > 1)
6. **Format Conversion**: Convert N-Triples to Turtle

### Safety Features

- **Rate Limiting**: Max 2 concurrent queries, 200ms minimum delay
- **Exponential Backoff**: Automatic retry with increasing delays
- **Timeout Protection**: 55-second query timeout (below WDQS 60s limit)
- **User-Agent Headers**: Proper identification per Wikimedia policy
- **Retry-After Respect**: Honors server-specified retry delays

## SPARQL Semantics

### Truthy vs Full Statements

This tool uses the **truthy graph** (`wdt:` predicates) by default:
- Fast and compact
- Contains main statements without qualifiers
- Suitable for most use cases

The full statement graph (`p:/ps:/pq:`) with qualifiers and references is not included by default but can be added if needed.

### Label Service

Uses `SERVICE wikibase:label` for efficient label fetching in the specified language.

### Instance Type Mapping

Maps `wdt:P31` (instance of) to `rdf:type` for standard RDF compatibility.

## API Endpoints

- `POST /api/start`: Start a new dump job
- `GET /api/progress?id={jobId}`: Server-sent events for progress updates
- `GET /api/download?id={jobId}&format={nt|ttl}`: Download completed dumps

## Limitations

- Maximum 100,000 instances per dump
- 60-second timeout per SPARQL query (WDQS limit)
- Truthy statements only (no qualifiers/references by default)
- Single language for labels per dump

## Development

### Project Structure

```
Wikidata_dumper/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── page.tsx           # Main UI page
├── components/            # React components
├── lib/                   # Shared utilities and types
├── server/                # Server-side logic
│   ├── wdqsClient.ts     # SPARQL client
│   ├── mwapi.ts          # MediaWiki API
│   ├── construct.ts      # Query builders
│   ├── subclasses.ts     # Subclass expansion
│   ├── dump.ts           # Dump orchestration
│   └── jobManager.ts     # Job management
└── exports/              # Generated dump files
```

### Testing

To test with a small dataset:
1. Use a specific class with few instances (e.g., Q7889 for video games)
2. Set max instances to 10-100
3. Use radius 1 for faster testing

## Contributing

Contributions are welcome! Please ensure:
- Proper error handling
- Rate limit compliance
- User-Agent headers on all requests
- TypeScript types for all functions

## License

MIT

## Acknowledgments

- Wikidata Query Service for SPARQL endpoint
- MediaWiki API for efficient instance enumeration
- N3.js for RDF serialization
