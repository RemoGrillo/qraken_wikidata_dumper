import { extractQidFromUri, qidToUri } from '@/lib/utils'

/**
 * Build a CONSTRUCT query for R=1 (first radius)
 * Fetches all truthy edges from instances, plus labels
 */
export function constructR1(qids: string[], language: string = 'en'): string {
  const valuesClause = qids.map(qid => `wd:${qid}`).join(' ')
  
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

CONSTRUCT {
  ?s ?p ?o .
  ?s rdf:type ?class .
  ?s rdfs:label ?sLabel .
  ?p rdfs:label ?pLabel .
  ?o rdfs:label ?oLabel .
  ?class rdfs:label ?classLabel .
}
WHERE {
  VALUES ?s { ${valuesClause} }
  
  {
    # All truthy outgoing edges
    ?s ?p ?o .
    FILTER(STRSTARTS(STR(?p), STR(wdt:)))
  }
  UNION {
    # Instance of (P31) mapped to rdf:type
    ?s wdt:P31 ?class .
  }
  
  # Labels for all entities
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${language}" .
  }
}
`
}

/**
 * Build a CONSTRUCT query for R=2 (second radius)
 * Fetches all truthy edges from neighbor entities
 */
export function constructR2(qids: string[], language: string = 'en'): string {
  const valuesClause = qids.map(qid => `wd:${qid}`).join(' ')
  
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

CONSTRUCT {
  ?s ?p ?o .
  ?s rdf:type ?class .
  ?s rdfs:label ?sLabel .
  ?p rdfs:label ?pLabel .
  ?o rdfs:label ?oLabel .
  ?class rdfs:label ?classLabel .
}
WHERE {
  VALUES ?s { ${valuesClause} }
  
  {
    # All truthy outgoing edges
    ?s ?p ?o .
    FILTER(STRSTARTS(STR(?p), STR(wdt:)))
  }
  UNION {
    # Instance of (P31) mapped to rdf:type
    ?s wdt:P31 ?class .
  }
  
  # Labels for all entities
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${language}" .
  }
}
`
}

/**
 * Build a query to estimate the number of triples for a set of entities
 */
export function constructEstimate(qids: string[]): string {
  const valuesClause = qids.map(qid => `wd:${qid}`).join(' ')
  
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

SELECT ?s (COUNT(?p) AS ?count)
WHERE {
  VALUES ?s { ${valuesClause} }
  ?s ?p ?o .
  FILTER(STRSTARTS(STR(?p), STR(wdt:)))
}
GROUP BY ?s
`
}

/**
 * Extract neighbor QIDs from N-Triples
 * Returns only Wikidata entity URIs (wd:Q...)
 */
export function extractNeighbors(ntriples: string): Set<string> {
  const neighbors = new Set<string>()
  const lines = ntriples.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    // N-Triples format: <subject> <predicate> <object> .
    const parts = line.split(' ')
    if (parts.length < 3) continue
    
    // Check object (third part)
    const object = parts[2]
    if (object.startsWith('<http://www.wikidata.org/entity/Q')) {
      const qid = extractQidFromUri(object.slice(1, -1)) // Remove < >
      if (qid) {
        neighbors.add(qid)
      }
    }
  }
  
  return neighbors
}

/**
 * Build a simple CONSTRUCT without labels (for estimation)
 */
export function constructSimple(qids: string[]): string {
  const valuesClause = qids.map(qid => `wd:${qid}`).join(' ')
  
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

CONSTRUCT {
  ?s ?p ?o .
}
WHERE {
  VALUES ?s { ${valuesClause} }
  ?s ?p ?o .
  FILTER(STRSTARTS(STR(?p), STR(wdt:)))
}
`
}
