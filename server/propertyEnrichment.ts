/**
 * Property enrichment functions for fetching comprehensive property metadata
 */

/**
 * Build a CONSTRUCT query to fetch property metadata
 * Includes labels, descriptions, aliases, and property types
 * Also adds connections between wdt: predicates and their wd: property entities
 */
export function constructPropertyMetadata(propertyIds: string[], language: string = 'en'): string {
  const valuesClause = propertyIds.map(pid => `wd:${pid}`).join(' ')
  
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX bd: <http://www.bigdata.com/rdf#>

CONSTRUCT {
  # Metadata for the property entity (wd:P31)
  ?prop rdfs:label ?propLabel .
  ?prop schema:description ?propDesc .
  ?prop wikibase:propertyType ?propType .
  ?prop skos:altLabel ?propAltLabel .
  ?prop wikibase:directClaim ?directClaim .
  
  # Connection from direct claim (wdt:P31) to property entity (wd:P31)
  ?directClaim wikibase:property ?prop .
  ?directClaim rdfs:label ?directClaimLabel .
}
WHERE {
  VALUES ?prop { ${valuesClause} }
  
  # Get the wdt: form
  ?prop wikibase:directClaim ?directClaim .
  
  # Use label service for simpler fetching
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${language},en" .
    ?prop rdfs:label ?propLabel .
    ?prop schema:description ?propDesc .
  }
  
  # Fetch altLabels separately with explicit language filter
  OPTIONAL {
    ?prop skos:altLabel ?propAltLabel .
    FILTER(LANG(?propAltLabel) = "${language}" || LANG(?propAltLabel) = "en")
  }
  
  # Create label for the wdt: property (same as wd: property)
  BIND(?propLabel AS ?directClaimLabel)
  
  # Property type
  OPTIONAL { 
    ?prop wikibase:propertyType ?propType 
  }
}
`
}

/**
 * Extract property IDs from N-Triples
 * Returns unique property IDs (P123 format) used in the data
 */
export function extractPropertyIds(ntriples: string): Set<string> {
  const propertyIds = new Set<string>()
  const lines = ntriples.split('\n')
  
  // Pattern to match Wikidata property URIs
  const propertyPatterns = [
    /http:\/\/www\.wikidata\.org\/prop\/direct\/P\d+/g,
    /http:\/\/www\.wikidata\.org\/entity\/P\d+/g,
    /http:\/\/www\.wikidata\.org\/prop\/P\d+/g,
  ]
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    for (const pattern of propertyPatterns) {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        // Extract P123 from the URI
        const pid = match[0].match(/P\d+/)
        if (pid) {
          propertyIds.add(pid[0])
        }
      }
    }
  }
  
  return propertyIds
}

/**
 * Build a query to fetch entity labels and descriptions
 * More comprehensive than the basic label service
 */
export function constructEntityEnrichment(entityIds: string[], language: string = 'en'): string {
  const valuesClause = entityIds.map(qid => `wd:${qid}`).join(' ')
  
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

CONSTRUCT {
  ?entity rdfs:label ?label .
  ?entity schema:description ?desc .
  ?entity skos:altLabel ?altLabel .
}
WHERE {
  VALUES ?entity { ${valuesClause} }
  
  # Main label
  OPTIONAL { 
    ?entity rdfs:label ?label 
    FILTER(LANG(?label) = "${language}" || LANG(?label) = "en") 
  }
  
  # Description
  OPTIONAL { 
    ?entity schema:description ?desc 
    FILTER(LANG(?desc) = "${language}" || LANG(?desc) = "en") 
  }
  
  # Alternative labels
  OPTIONAL { 
    ?entity skos:altLabel ?altLabel 
    FILTER(LANG(?altLabel) = "${language}" || LANG(?altLabel) = "en") 
  }
}
`
}
