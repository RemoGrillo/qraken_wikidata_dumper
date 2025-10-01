import { SearchResult } from '@/lib/types'
import { exponentialBackoff, sleep } from '@/lib/utils'

const WIKIMEDIA_API = process.env.WIKIMEDIA_API || 'https://www.wikidata.org/w/api.php'
const AGENT_NAME = process.env.AGENT_NAME || 'QrakenWDRadius/0.1 (contact: you@example.com)'
const BATCH_SIZE = 50 // Max items per request

interface MediaWikiSearchResponse {
  batchcomplete?: string
  continue?: {
    sroffset: number
    continue: string
  }
  query?: {
    searchinfo?: {
      totalhits: number
    }
    search?: Array<{
      title: string
      pageid: number
    }>
  }
}

export class MediaWikiApi {
  /**
   * Search for entities with a specific statement using haswbstatement
   * This avoids expensive SPARQL queries with OFFSET/LIMIT
   */
  async searchHasStatement(
    property: string = 'P31',
    value: string,
    continueToken?: string
  ): Promise<SearchResult> {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: `haswbstatement:${property}=${value}`,
      srnamespace: '0', // Main namespace (items)
      srlimit: BATCH_SIZE.toString(),
      format: 'json',
      formatversion: '2',
    })

    if (continueToken) {
      params.append('sroffset', continueToken)
    }

    const url = `${WIKIMEDIA_API}?${params.toString()}`

    return exponentialBackoff(async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': AGENT_NAME,
          'Api-User-Agent': AGENT_NAME,
        },
      })

      if (!response.ok) {
        throw new Error(`MediaWiki API error: ${response.status}`)
      }

      const data: MediaWikiSearchResponse = await response.json()

      if (!data.query?.search) {
        return {
          ids: [],
          totalHits: 0,
        }
      }

      const ids = data.query.search.map(item => item.title)
      const totalHits = data.query.searchinfo?.totalhits || 0
      const result: SearchResult = {
        ids,
        totalHits,
      }

      if (data.continue) {
        result.continueToken = data.continue.sroffset.toString()
      }

      return result
    })
  }

  /**
   * Enumerate all instances of a class (or multiple classes)
   */
  async *enumerateInstances(
    classQids: string[],
    maxInstances?: number
  ): AsyncGenerator<string, void, unknown> {
    let totalYielded = 0

    for (const classQid of classQids) {
      console.log(`Enumerating instances of ${classQid}...`)
      let continueToken: string | undefined

      while (true) {
        if (maxInstances && totalYielded >= maxInstances) {
          return
        }

        const result = await this.searchHasStatement('P31', classQid, continueToken)
        
        for (const qid of result.ids) {
          if (maxInstances && totalYielded >= maxInstances) {
            return
          }
          yield qid
          totalYielded++
        }

        if (!result.continueToken) {
          break
        }

        continueToken = result.continueToken
        
        // Small delay to be nice to the API
        await sleep(100)
      }
    }
  }

  /**
   * Count total instances across multiple classes
   */
  async countInstances(classQids: string[]): Promise<number> {
    let total = 0

    for (const classQid of classQids) {
      const result = await this.searchHasStatement('P31', classQid)
      total += result.totalHits
      console.log(`Class ${classQid}: ${result.totalHits} instances`)
    }

    return total
  }
}

// Singleton instance
export const mwApi = new MediaWikiApi()
