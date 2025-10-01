import { SparqlResponse } from '@/lib/types'
import { exponentialBackoff, parseRetryAfter, sleep } from '@/lib/utils'

const WDQS_ENDPOINT = process.env.WDQS_ENDPOINT || 'https://query.wikidata.org/sparql'
const AGENT_NAME = process.env.AGENT_NAME || 'QrakenWDRadius/0.1 (contact: you@example.com)'
const QUERY_TIMEOUT = 55000 // 55 seconds (below WDQS 60s limit)
const MIN_DELAY_MS = 200 // Minimum delay between requests

interface FetchSparqlOptions {
  accept?: string
  method?: 'GET' | 'POST'
  timeout?: number
}

export class WdqsClient {
  private lastRequestTime: number = 0

  /**
   * Execute a SPARQL query against WDQS with proper headers and rate limiting
   */
  async fetchSparql(
    query: string,
    options: FetchSparqlOptions = {}
  ): Promise<Response> {
    const {
      accept = 'application/sparql-results+json',
      method = 'POST',
      timeout = QUERY_TIMEOUT
    } = options

    // Rate limiting
    await this.enforceRateLimit()

    // Prepare request
    const headers: HeadersInit = {
      'User-Agent': AGENT_NAME,
      'Api-User-Agent': AGENT_NAME,
      'Accept': accept,
      'Accept-Encoding': 'gzip, deflate',
    }

    let url = WDQS_ENDPOINT
    let body: string | undefined

    if (method === 'GET') {
      const params = new URLSearchParams({ query })
      url = `${WDQS_ENDPOINT}?${params.toString()}`
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams({ query }).toString()
    }

    // Execute with timeout and retry logic
    return exponentialBackoff(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = parseRetryAfter(retryAfter)
          console.log(`Rate limited. Waiting ${delay}ms...`)
          await sleep(delay)
          throw new Error('Rate limited')
        }

        // Handle server errors
        if (response.status === 503) {
          throw new Error('Service temporarily unavailable')
        }

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`WDQS error ${response.status}: ${text}`)
        }

        return response
      } catch (error: any) {
        clearTimeout(timeoutId)
        
        if (error.name === 'AbortError') {
          throw new Error(`Query timeout after ${timeout}ms`)
        }
        
        throw error
      }
    })
  }

  /**
   * Execute a SELECT query and parse JSON results
   */
  async select(query: string): Promise<SparqlResponse> {
    const response = await this.fetchSparql(query, {
      accept: 'application/sparql-results+json',
      method: 'POST'
    })
    
    return response.json()
  }

  /**
   * Execute a CONSTRUCT query and return N-Triples
   */
  async construct(query: string): Promise<string> {
    const response = await this.fetchSparql(query, {
      accept: 'application/n-triples',
      method: 'POST'
    })
    
    return response.text()
  }

  /**
   * Enforce minimum delay between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < MIN_DELAY_MS) {
      await sleep(MIN_DELAY_MS - timeSinceLastRequest)
    }
    
    this.lastRequestTime = Date.now()
  }
}

// Singleton instance
export const wdqsClient = new WdqsClient()
