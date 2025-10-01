import { wdqsClient } from './wdqsClient'

/**
 * Expand a class to include all its subclasses
 * Uses wdt:P279* (subclass of, transitive)
 */
export async function expandSubclasses(classQid: string): Promise<string[]> {
  const query = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

SELECT DISTINCT ?class WHERE {
  ?class wdt:P279* wd:${classQid} .
}
LIMIT 1000
`

  try {
    console.log(`Expanding subclasses of ${classQid}...`)
    const response = await wdqsClient.select(query)
    
    const classes = response.results.bindings.map(binding => {
      const uri = binding.class.value
      const match = uri.match(/Q\d+$/)
      return match ? match[0] : null
    }).filter((qid): qid is string => qid !== null)
    
    console.log(`Found ${classes.length} classes (including ${classQid})`)
    return classes
  } catch (error) {
    console.error(`Failed to expand subclasses: ${error}`)
    // Return just the original class if expansion fails
    return [classQid]
  }
}

/**
 * Get direct subclasses only (non-transitive)
 */
export async function getDirectSubclasses(classQid: string): Promise<string[]> {
  const query = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

SELECT DISTINCT ?class WHERE {
  ?class wdt:P279 wd:${classQid} .
}
LIMIT 100
`

  try {
    const response = await wdqsClient.select(query)
    
    const classes = response.results.bindings.map(binding => {
      const uri = binding.class.value
      const match = uri.match(/Q\d+$/)
      return match ? match[0] : null
    }).filter((qid): qid is string => qid !== null)
    
    return classes
  } catch (error) {
    console.error(`Failed to get direct subclasses: ${error}`)
    return []
  }
}
