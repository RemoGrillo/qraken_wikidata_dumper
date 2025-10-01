import { format, formatDistanceToNow } from 'date-fns'

export function generateJobId(): string {
  return crypto.randomUUID()
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  return `${Math.round(seconds / 86400)}d ${Math.round((seconds % 86400) / 3600)}h`
}

export function calculateEta(
  itemsProcessed: number,
  totalItems: number,
  startTime: Date
): string | undefined {
  if (itemsProcessed === 0 || totalItems === 0) return undefined
  
  const elapsedMs = Date.now() - startTime.getTime()
  const itemsPerMs = itemsProcessed / elapsedMs
  const remainingItems = totalItems - itemsProcessed
  const remainingMs = remainingItems / itemsPerMs
  
  return formatEta(remainingMs / 1000)
}

export function extractQidFromUri(uri: string): string | null {
  const match = uri.match(/\/Q(\d+)$/)
  return match ? `Q${match[1]}` : null
}

export function qidToUri(qid: string): string {
  return `http://www.wikidata.org/entity/${qid}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const delay = baseDelay * Math.pow(2, i)
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`)
      await sleep(delay)
    }
  }
  
  throw lastError
}

export function parseRetryAfter(retryAfter: string | null): number {
  if (!retryAfter) return 5000 // Default 5 seconds
  
  // Check if it's a number (seconds)
  const seconds = parseInt(retryAfter, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000
  }
  
  // Check if it's a date
  const retryDate = new Date(retryAfter)
  if (!isNaN(retryDate.getTime())) {
    return Math.max(0, retryDate.getTime() - Date.now())
  }
  
  return 5000 // Default fallback
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
